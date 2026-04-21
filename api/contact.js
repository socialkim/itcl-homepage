// ITCL · Vercel Serverless Function — 문의 폼 프록시 + 이메일 알림
//
// 흐름:
//   1) 입력 검증
//   2) Supabase에 insert (service_role, 서버사이드)
//   3) Resend로 이메일 2통 전송 (관리자 알림 + 문의자 확인)
//   4) 이메일 실패해도 요청은 성공으로 처리 (DB는 이미 저장됨)

const ADMIN_EMAILS_FALLBACK = ['itcl_sns@itcl.kr', 'kimdukjin@itcl.kr'];
const FROM_ADDRESS = 'ITCL 연구소 <noreply@itcl.kr>';

// 관리자 이메일을 DB(admin_emails 테이블)에서 동적으로 읽어옴.
// DB 조회 실패하거나 활성 이메일이 없으면 하드코딩 fallback 사용.
async function getAdminEmails() {
  try {
    const secret = process.env.SUPABASE_SECRET_KEY;
    if (!secret) return ADMIN_EMAILS_FALLBACK;
    const res = await fetch('https://sxvhyrubjzqebmpeeqws.supabase.co/rest/v1/admin_emails?select=email&is_active=eq.true&order=display_order.asc', {
      headers: { apikey: secret, Authorization: `Bearer ${secret}` },
    });
    if (!res.ok) return ADMIN_EMAILS_FALLBACK;
    const rows = await res.json();
    const list = rows.map((r) => r.email).filter(Boolean);
    return list.length ? list : ADMIN_EMAILS_FALLBACK;
  } catch {
    return ADMIN_EMAILS_FALLBACK;
  }
}
// Resend 대시보드에서 itcl.kr 도메인 verified 상태 (2026-04-19)

const SITE_URL = 'https://itcl-7q3164g9o-socialkim0211-3722s-projects.vercel.app';
// TODO(도메인 연결 후): 커스텀 도메인으로 교체

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // URL은 공개 값이라 하드코딩 OK. 시크릿은 반드시 환경변수에서만.
  const SUPABASE_URL = 'https://sxvhyrubjzqebmpeeqws.supabase.co';
  const SUPABASE_SECRET = process.env.SUPABASE_SECRET_KEY;
  const RESEND_KEY = process.env.RESEND_API_KEY;

  if (!SUPABASE_SECRET) {
    console.error('[contact] Missing env var: SUPABASE_SECRET_KEY');
    return res.status(500).json({ error: '서버 설정 오류. 관리자에게 문의해주세요.' });
  }

  const data = req.body || {};

  // 필수 필드 검증
  const required = ['topic', 'name', 'company', 'email', 'message'];
  for (const f of required) {
    if (!data[f] || typeof data[f] !== 'string' || !data[f].trim()) {
      return res.status(400).json({ error: `필수 항목 누락: ${f}` });
    }
  }

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email)) {
    return res.status(400).json({ error: '이메일 형식이 올바르지 않습니다.' });
  }

  if (data.message.length > 5000 || data.name.length > 200 || data.company.length > 200) {
    return res.status(400).json({ error: '입력이 너무 깁니다.' });
  }

  // --- STEP 1: Supabase에 insert ---
  const receivedAtISO = new Date().toISOString();

  try {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/contact_submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_SECRET,
        Authorization: `Bearer ${SUPABASE_SECRET}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        topic: data.topic,
        name: data.name,
        company: data.company,
        email: data.email,
        phone: data.phone || null,
        audience: data.audience || null,
        headcount: data.headcount || null,
        message: data.message,
        submitted_at: receivedAtISO,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error('[contact] Supabase insert failed:', resp.status, text);
      return res.status(502).json({ error: '저장에 실패했습니다. 잠시 후 다시 시도해주세요.' });
    }
  } catch (err) {
    console.error('[contact] Supabase error:', err);
    return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }

  // --- STEP 2: 이메일 2통 병렬 전송 (실패해도 요청은 성공) ---
  if (RESEND_KEY) {
    const receivedAtKST = new Date(receivedAtISO).toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const adminEmails = await getAdminEmails();

    const emailTasks = await Promise.allSettled([
      // 관리자 알림
      sendEmail(RESEND_KEY, {
        from: FROM_ADDRESS,
        to: adminEmails,
        reply_to: data.email,
        subject: `[ITCL 문의] ${data.topic} · ${data.name} · ${data.company}`,
        html: adminEmailHtml(data, receivedAtKST),
      }),
      // 문의자 확인 (답장 시 운영팀 메일로 연결)
      sendEmail(RESEND_KEY, {
        from: FROM_ADDRESS,
        to: [data.email],
        reply_to: 'itcl_sns@itcl.kr',
        subject: '[ITCL] 문의가 정상 접수되었습니다',
        html: userEmailHtml(data, receivedAtKST),
      }),
    ]);

    const failed = emailTasks.filter(r => r.status === 'rejected');
    if (failed.length) {
      console.error('[contact] Some emails failed:', failed.map(f => f.reason?.message || f.reason));
    }
  } else {
    console.warn('[contact] RESEND_API_KEY not set — skipping email notifications');
  }

  return res.status(200).json({ ok: true });
}

// ============================================================
// Resend helpers
// ============================================================

async function sendEmail(apiKey, payload) {
  // UTF-8 인코딩 명시: JSON.stringify 결과를 Buffer로 변환해 바이트 순서를 고정하고
  // Content-Type에 charset=utf-8을 추가해 Resend/PostOffice가 Latin-1로 오해하지 않도록 함.
  const body = Buffer.from(JSON.stringify(payload), 'utf-8');
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': body.length.toString(),
    },
    body,
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Resend ${resp.status}: ${text}`);
  }
  return resp.json();
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function nl2br(s) {
  return s.replace(/\n/g, '<br>');
}

// ============================================================
// 이메일 HTML 템플릿 — 인라인 CSS (메일 클라이언트 호환성)
// ============================================================

function adminEmailHtml(d, when) {
  const topic = escapeHtml(d.topic);
  const name = escapeHtml(d.name);
  const company = escapeHtml(d.company);
  const email = escapeHtml(d.email);
  const phone = escapeHtml(d.phone || '-');
  const audience = escapeHtml(d.audience || '-');
  const headcount = escapeHtml(d.headcount || '-');
  const message = nl2br(escapeHtml(d.message));

  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,'Segoe UI',Pretendard,Roboto,sans-serif;color:#0a0e1a;background:#f7f8fc;margin:0;padding:24px;">
  <div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #e6e8ef;border-radius:12px;overflow:hidden;">
    <div style="padding:28px 32px;background:linear-gradient(135deg,#635bff 0%,#00d4b4 100%);color:#fff;">
      <div style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;opacity:0.92;">New Inquiry · ITCL</div>
      <div style="font-size:22px;font-weight:700;margin-top:8px;letter-spacing:-0.01em;">새 문의가 접수되었습니다</div>
    </div>
    <div style="padding:28px 32px;">
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tbody>
          <tr><td style="padding:10px 0;color:#5b6074;width:96px;">주제</td><td style="padding:10px 0;font-weight:600;color:#0a0e1a;">${topic}</td></tr>
          <tr><td style="padding:10px 0;color:#5b6074;">담당자</td><td style="padding:10px 0;color:#2e3140;">${name}</td></tr>
          <tr><td style="padding:10px 0;color:#5b6074;">소속</td><td style="padding:10px 0;color:#2e3140;">${company}</td></tr>
          <tr><td style="padding:10px 0;color:#5b6074;">이메일</td><td style="padding:10px 0;"><a href="mailto:${email}" style="color:#635bff;text-decoration:none;">${email}</a></td></tr>
          <tr><td style="padding:10px 0;color:#5b6074;">연락처</td><td style="padding:10px 0;color:#2e3140;">${phone}</td></tr>
          <tr><td style="padding:10px 0;color:#5b6074;">교육 대상</td><td style="padding:10px 0;color:#2e3140;">${audience}</td></tr>
          <tr><td style="padding:10px 0;color:#5b6074;">인원 규모</td><td style="padding:10px 0;color:#2e3140;">${headcount}</td></tr>
          <tr><td style="padding:10px 0;color:#5b6074;">접수 시간</td><td style="padding:10px 0;color:#2e3140;">${escapeHtml(when)} KST</td></tr>
        </tbody>
      </table>
      <div style="margin-top:24px;padding:18px 22px;background:#f7f8fc;border-left:3px solid #635bff;border-radius:6px;">
        <div style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:0.18em;color:#635bff;text-transform:uppercase;font-weight:700;margin-bottom:10px;">문의 내용</div>
        <div style="font-size:14px;line-height:1.7;color:#2e3140;">${message}</div>
      </div>
      <div style="margin-top:28px;text-align:center;">
        <a href="mailto:${email}" style="display:inline-block;padding:13px 30px;background:#0a0e1a;color:#fff;text-decoration:none;font-size:14px;font-weight:600;border-radius:999px;">답장하기 →</a>
      </div>
      <div style="margin-top:16px;text-align:center;font-size:12px;color:#8a90a3;">
        이 메일의 답장 버튼은 문의자(<span style="color:#635bff;">${email}</span>)에게 직접 연결됩니다.
      </div>
    </div>
    <div style="padding:18px 32px;background:#fbfbfd;border-top:1px solid #eff1f6;color:#8a90a3;font-size:12px;text-align:center;">
      ITCL · IT커뮤니케이션연구소 문의 알림 시스템
    </div>
  </div>
</body></html>`;
}

function userEmailHtml(d, when) {
  const name = escapeHtml(d.name);
  const topic = escapeHtml(d.topic);
  const message = nl2br(escapeHtml(d.message));

  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,'Segoe UI',Pretendard,Roboto,sans-serif;color:#0a0e1a;background:#f7f8fc;margin:0;padding:24px;">
  <div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #e6e8ef;border-radius:12px;overflow:hidden;">
    <div style="padding:28px 32px;background:#0a0e1a;color:#fff;">
      <div style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#00d4b4;">Thank You · ITCL</div>
      <div style="font-size:22px;font-weight:700;margin-top:8px;letter-spacing:-0.01em;">문의가 정상 접수되었습니다</div>
    </div>
    <div style="padding:32px;">
      <div style="font-size:16px;line-height:1.7;color:#2e3140;">
        <strong style="color:#0a0e1a;">${name}</strong> 님, 안녕하세요.<br>
        <span style="color:#424657;">IT커뮤니케이션연구소(ITCL)에 문의해주셔서 감사합니다.</span>
      </div>
      <div style="margin-top:20px;font-size:15px;line-height:1.7;color:#424657;">
        아래 내용으로 문의가 접수되었으며, 담당자 확인 후 <strong style="color:#635bff;">2영업일 이내</strong>로 회신드리겠습니다.
      </div>
      <div style="margin-top:28px;padding:20px 22px;background:#f7f8fc;border-radius:8px;border:1px solid #eff1f6;">
        <div style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:0.18em;color:#635bff;text-transform:uppercase;font-weight:700;">접수 확인</div>
        <table style="width:100%;margin-top:14px;border-collapse:collapse;font-size:14px;">
          <tr><td style="padding:6px 0;color:#5b6074;width:80px;vertical-align:top;">주제</td><td style="padding:6px 0;color:#0a0e1a;font-weight:600;">${topic}</td></tr>
          <tr><td style="padding:6px 0;color:#5b6074;vertical-align:top;">내용</td><td style="padding:6px 0;color:#2e3140;line-height:1.7;">${message}</td></tr>
        </table>
        <div style="margin-top:14px;padding-top:14px;border-top:1px solid #eff1f6;color:#8a90a3;font-size:12px;">접수 시간: ${escapeHtml(when)} KST</div>
      </div>
      <div style="margin-top:24px;padding:18px 22px;background:#f7f8fc;border-left:3px solid #00d4b4;border-radius:6px;font-size:14px;color:#2e3140;line-height:1.7;">
        💡 <strong>급한 문의</strong>는 전화로 직접 연락 주세요.<br>
        <a href="tel:0269533379" style="color:#635bff;text-decoration:none;font-weight:600;font-size:16px;">02-6953-3379</a>
        <span style="color:#8a90a3;font-size:13px;">(평일 09:00~18:00)</span>
      </div>
    </div>
    <div style="padding:24px 32px;background:#06080f;color:rgba(255,255,255,0.55);font-size:12px;">
      <div style="color:#fff;font-weight:700;font-size:14px;margin-bottom:8px;">ITCL · IT커뮤니케이션연구소</div>
      <div style="line-height:1.8;">
        사람과 AI의 연결을 만드는 전문 교육 파트너.<br>
        IT커뮤니케이터 김덕진이 설립한, 생성형 AI 교육 전문 연구소입니다.<br>
        서울 마포구 월드컵로 190, 이안상암2 12층 1205호<br>
        <a href="${SITE_URL}" style="color:#00d4b4;text-decoration:none;">${SITE_URL.replace(/^https?:\/\//,'')}</a>
      </div>
    </div>
  </div>
</body></html>`;
}
