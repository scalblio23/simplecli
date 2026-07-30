export async function sendMessage(baseUrl, message) {
  const url = baseUrl.replace(/\/$/, '') + '/chat'
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message })
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`)
  }
  const data = await res.json()
  return (
    typeof data === 'string'                       ? data :
    data.response                                  ?? data.message ??
    data.text                                      ?? data.content ??
    data.choices?.[0]?.message?.content            ??
    JSON.stringify(data)
  )
}
