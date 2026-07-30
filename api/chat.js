export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed')

  const { message, url, secret } = req.body ?? {}
  if (!message) return res.status(400).json({ error: 'message is required' })

  const target = (url || process.env.HERMES_URL || '').trim()
  const key    = secret || process.env.HERMES_SECRET || ''

  if (!target) return res.status(400).json({ error: 'No server URL set. Use /url in the app.' })
  if (!key)    return res.status(401).json({ error: 'No webhook secret set. Use /secret in the app.' })

  try {
    const upstream = await fetch(target, {
      method: 'POST',
      headers: {
        'Content-Type':    'application/json',
        'X-Webhook-Secret': key
      },
      body: JSON.stringify({ message })
    })

    const ct = upstream.headers.get('content-type') || ''
    const body = ct.includes('application/json')
      ? await upstream.json()
      : { response: await upstream.text() }

    return res.status(upstream.status).json(body)
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
