// Supabase REST API를 service_role로 호출하는 간단한 래퍼
// RLS를 우회하므로 반드시 서버사이드에서만 사용.

const SUPABASE_URL = 'https://sxvhyrubjzqebmpeeqws.supabase.co';

function getSecret() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error('SUPABASE_SECRET_KEY not set');
  return key;
}

function headers(extra = {}) {
  const key = getSecret();
  return {
    'Content-Type': 'application/json; charset=utf-8',
    apikey: key,
    Authorization: `Bearer ${key}`,
    ...extra,
  };
}

// URL-safe JSON body as Buffer (UTF-8 보존)
function body(obj) {
  return Buffer.from(JSON.stringify(obj), 'utf-8');
}

export async function sbSelect(table, { filter = '', select = '*', order = '', limit } = {}) {
  const params = new URLSearchParams();
  params.set('select', select);
  if (order) params.set('order', order);
  if (limit) params.set('limit', String(limit));
  const qs = params.toString();
  const url = `${SUPABASE_URL}/rest/v1/${table}?${qs}${filter ? '&' + filter : ''}`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase SELECT ${table} ${res.status}: ${text}`);
  }
  return res.json();
}

export async function sbInsert(table, data, { returning = 'representation' } = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: headers({ Prefer: `return=${returning}` }),
    body: body(data),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase INSERT ${table} ${res.status}: ${text}`);
  }
  if (returning === 'minimal') return null;
  return res.json();
}

export async function sbUpdate(table, filter, data, { returning = 'representation' } = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${filter}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: headers({ Prefer: `return=${returning}` }),
    body: body(data),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase UPDATE ${table} ${res.status}: ${text}`);
  }
  if (returning === 'minimal') return null;
  return res.json();
}

export async function sbUpsert(table, data, { onConflict, returning = 'representation' } = {}) {
  const params = new URLSearchParams();
  if (onConflict) params.set('on_conflict', onConflict);
  const qs = params.toString();
  const url = `${SUPABASE_URL}/rest/v1/${table}${qs ? '?' + qs : ''}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: headers({ Prefer: `resolution=merge-duplicates,return=${returning}` }),
    body: body(data),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase UPSERT ${table} ${res.status}: ${text}`);
  }
  if (returning === 'minimal') return null;
  return res.json();
}

export async function sbDelete(table, filter) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${filter}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: headers({ Prefer: 'return=minimal' }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase DELETE ${table} ${res.status}: ${text}`);
  }
  return null;
}

// 테이블 존재 여부 체크 (헬스체크용)
export async function sbTableExists(table) {
  try {
    await sbSelect(table, { select: 'count', limit: 1 });
    return true;
  } catch (e) {
    if (String(e.message).includes('404') || String(e.message).includes('does not exist')) {
      return false;
    }
    return false;
  }
}
