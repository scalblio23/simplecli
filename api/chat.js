export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed')

  const { message, url, username, password } = req.body ?? {}
  if (!message) return res.status(400).json({ error: 'message is required' })

  const target = (url || process.env.HERMES_URL || '').trim()
  const user   = username || process.env.HERMES_USERNAME || ''
  const pass   = password || process.env.HERMES_PASSWORD || ''

  if (!target) return res.status(400).json({ error: 'No server URL set. Use /url.' })
  if (!user || !pass) return res.status(401).json({ error: 'No credentials set. Use /login.' })

  const base = new URL(target).origin
  const path = new URL(target).pathname

  // Step 1 — log in to get a session cookie
  let cookie = ''
  try {
    const authRes = await fetch(`${base}/auth/password-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'basic', username: user, password: pass, next: path })
    })
    if (!authRes.ok) {
      return res.status(401).json({ error: 'Login failed — check your username and password.' })
    }
    const raw = authRes.headers.get('set-cookie') || ''
    cookie = raw.split(',').map(c => c.split(';')[0].trim()).filter(Boolean).join('; ')
  } catch (e) {
    return res.status(500).json({ error: `Auth error: ${e.message}` })
  }

  // Step 2 — POST to the webhook with the session cookie
  try {
    const upstream = await fetch(target, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cookie ? { Cookie: cookie } : {})
      },
      body: JSON.stringify({ message })
    })

    const ct = upstream.headers.get('content-type') || ''
    if (ct.includes('text/html')) {
      return res.status(401).json({ error: 'Session auth failed — still getting the login page.' })
    }

    const body = ct.includes('application/json')
      ? await upstream.json()
      : { response: await upstream.text() }

    return res.status(upstream.status).json(body)
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
