export async function readApiResponse(response) {
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    if (response.status === 429) throw new Error('Too many requests. Please wait a minute and try again.');
    throw new Error(`The refund service is unavailable (HTTP ${response.status}). Please try again later. For the local Docker app, open http://localhost:8080.`);
  }
  if (!response.ok) throw new Error(data?.error || `Request failed (HTTP ${response.status}).`);
  return data;
}
