// 관리자 세션 쿠키 서명·검증 (Node built-in만 사용)
//
// 세션 토큰 포맷: base64url(payload).base64url(hmac)
// payload: { exp: number (unix ms), v: string (password hash prefix) }
// hmac: HMAC-SHA256(payload, ADMIN_SESSION_SECRET)
//
// 비밀번호가 바뀌면 password hash prefix가 달라져서 기존 세션 자동 무효화.
// ADMIN_SESSION_SECRET이 바뀌어도 기존 세션 자동 무효화.

import crypto from 'node:crypto';

const COOKIE_NAME = 'itcl_admin';
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24시간

function passwordVersion() {
  const p = (process.env.ADMIN_PASSWORD || '').trim();
  return crypto.createHash('sha256').update(p).digest('hex').slice(0, 8);
}

export function createSession() {
  const secret = process.env.ADMIN_SESSION_SECRET || '';
  if (!secret) throw new Error('ADMIN_SESSION_SECRET not set');

  const payload = { exp: Date.now() + SESSION_DURATION_MS, v: passwordVersion() };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const hmac = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');
  return `${payloadB64}.${hmac}`;
}

export function verifySession(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const secret = process.env.ADMIN_SESSION_SECRET || '';
  if (!secret) return null;

  const [payloadB64, hmac] = parts;
  const expected = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');

  // Timing-safe compare
  if (hmac.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expected))) return null;

  let payload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8'));
  } catch {
    return null;
  }

  if (!payload.exp || payload.exp < Date.now()) return null;
  if (payload.v !== passwordVersion()) return null; // 비밀번호 바뀜 → 무효

  return payload;
}

export function setSessionCookie(res, token) {
  const maxAgeSec = Math.floor(SESSION_DURATION_MS / 1000);
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAgeSec}`);
}

export function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`);
}

export function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  header.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx < 0) return;
    const k = pair.slice(0, idx).trim();
    const v = pair.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  });
  return out;
}

// 공통 미들웨어: 인증 실패 시 401 응답하고 null 반환
export function requireAdminSession(req, res) {
  const cookies = parseCookies(req);
  const token = cookies[COOKIE_NAME];
  const session = verifySession(token);
  if (!session) {
    res.status(401).json({ error: '인증이 필요합니다. 로그인 페이지로 이동하세요.' });
    return null;
  }
  return session;
}

// 상수 시간 비밀번호 비교 (timing attack 방지)
export function comparePassword(input, expected) {
  if (!input || !expected) return false;
  if (input.length !== expected.length) {
    // 길이가 달라도 시간 소모는 비슷하게 만들기
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(expected));
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(input), Buffer.from(expected));
}
// deploy trigger 1776780554
// redeploy after public 1776811678
