export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed')

  const { url, apiKey } = req.body ?? {}
  const base = (url || process.env.HERMES_URL || '').trim().replace(/\/$/, '')
  const key  = apiKey || process.env.HERMES_API_KEY || ''

  if (!base || !key) return res.status(400).json({ error: 'missing url or apiKey' })

  const headers = { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }

  async function tryGet(path) {
    try {
      const r = await fetch(`${base}${path}`, { headers })
      const ct = r.headers.get('content-type') || ''
      if (!r.ok || ct.includes('text/html')) return null
      return await r.json()
    } catch { return null }
  }

  const [models, tools, skills] = await Promise.all([
    tryGet('/v1/models'),
    tryGet('/v1/tools'),
    tryGet('/v1/skills'),
  ])

  return res.status(200).json({ models, tools, skills })
}
