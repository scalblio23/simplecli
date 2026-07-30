export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed')

  const { message, url, apiKey, modelName } = req.body ?? {}
  if (!message) return res.status(400).json({ error: 'message is required' })

  const base = (url || process.env.HERMES_URL || '').trim().replace(/\/$/, '')
  const key  = apiKey || process.env.HERMES_API_KEY || ''

  if (!base) return res.status(400).json({ error: 'No server URL set. Use /url.' })
  if (!key)  return res.status(401).json({ error: 'No API key set. Use /apikey.' })

  try {
    const upstream = await fetch(`${base}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: modelName || process.env.HERMES_MODEL || 'hermes',
        messages: [{ role: 'user', content: message }],
        stream: false
      })
    })

    const ct = upstream.headers.get('content-type') || ''
    if (ct.includes('text/html')) {
      return res.status(401).json({ error: 'Auth failed — check your API key.' })
    }

    if (!upstream.ok) {
      const t = await upstream.text().catch(() => '')
      return res.status(upstream.status).json({ error: `Upstream error ${upstream.status}: ${t || upstream.statusText}` })
    }

    const data = await upstream.json()
    const reply = data?.choices?.[0]?.message?.content ?? JSON.stringify(data)
    return res.status(200).json({ response: reply })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
