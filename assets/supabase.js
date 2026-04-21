// ITCL · 문의 폼 어댑터
//
// 클라이언트는 Supabase를 직접 호출하지 않는다. 대신 Vercel Serverless Function
// `/api/contact` 에 POST 하고, 서버가 service_role 키로 Supabase에 insert 한다.
//
// 장점:
// - service_role 키가 프론트에 노출되지 않음
// - publishable key + RLS의 role 매핑 문제를 우회
// - 서버 측에서 입력 검증, rate limit, email 알림 등 확장 가능

window.ITCL_SUBMIT_CONTACT = async function(data){
  try{
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      // 로컬 dev 서버(python http.server)에선 /api/contact 가 404 → fallback
      if (res.status === 404) {
        console.warn('[ITCL] /api/contact not found (local dev). Submission logged only:', data);
        return { ok: true, dev: true };
      }
      const err = await res.json().catch(() => ({}));
      return { ok: false, error: err.error || `HTTP ${res.status}` };
    }

    return { ok: true };
  } catch(err) {
    return { ok: false, error: err.message };
  }
};
