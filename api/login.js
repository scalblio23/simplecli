import crypto from 'crypto'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed')

  const { email, password } = req.body ?? {}
  const validEmail = process.env.CLI_EMAIL
  const validPass  = process.env.CLI_PASSWORD
  const secret     = process.env.CLI_SECRET || 'hermes-cli-fallback-secret'

  if (!validEmail || !validPass) {
    return res.status(500).json({ error: 'Auth not configured — set CLI_EMAIL and CLI_PASSWORD in Vercel environment variables.' })
  }

  if (email !== validEmail || password !== validPass) {
    return res.status(401).json({ error: 'Invalid email or password.' })
  }

  const exp     = Date.now() + 30 * 24 * 60 * 60 * 1000
  const payload = Buffer.from(JSON.stringify({ email, exp })).toString('base64')
  const sig     = crypto.createHmac('sha256', secret).update(payload).digest('hex')

  return res.status(200).json({ token: `${payload}.${sig}`, exp })
}
