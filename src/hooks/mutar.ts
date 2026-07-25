/**
 * Helper de mutação: fetch com método + corpo JSON, erro amigável do backend
 * (`{ error }`) virando `Error`. O projeto não usa `useMutation` — o padrão é
 * chamar isto e invalidar a query no sucesso (ver `queryClient.invalidateQueries`).
 */
export async function mutar<T = unknown>(
  url: string,
  method: "POST" | "PATCH" | "PUT" | "DELETE",
  body?: unknown
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { "content-type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let msg = `Erro ${res.status}`;
    try {
      const b = await res.json();
      if (b?.error) msg = b.error;
    } catch {}
    throw new Error(msg);
  }
  return res.json().catch(() => ({}) as T);
}
