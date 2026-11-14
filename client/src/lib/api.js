export async function postJSON(path, body, timeoutMs = 45000) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return response.json();
}
