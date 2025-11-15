export async function fetchJSON(path, { method = "GET", body, headers } = {}) {
  let url = path;

  // Si no es URL absoluta, normalizamos y preprendemos /api una sola vez
  if (!/^https?:\/\//i.test(path)) {
    const p = path.startsWith("/") ? path : `/${path}`;
    url = p.startsWith("/api/") ? p : `/api${p}`; // evita /api/api/...
  }

  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json", ...(headers || {}) },
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {}
  if (!res.ok) {
    const msg =
      data?.error || data?.message || res.statusText || "Request error";
    throw new Error(msg);
  }
  return data;
}
