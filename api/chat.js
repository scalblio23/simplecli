export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed')

  const { message, url } = req.body ?? {}
  if (!message) return res.status(400).json({ error: 'message is required' })

  const target = (url || process.env.HERMES_URL || '').trim()
  if (!target) {
    return res.status(400).json({
      error: 'No server URL set. Use /url in the app or set HERMES_URL in Vercel environment variables.'
    })
  }

  try {
    const upstream = await fetch(target, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    })

    const contentType = upstream.headers.get('content-type') || ''
    const body = contentType.includes('application/json')
      ? await upstream.json()
      : { response: await upstream.text() }

    return res.status(upstream.status).json(body)
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
