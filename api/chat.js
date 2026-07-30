export const config = { runtime: 'edge' }

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })

  let body
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

  const { message, history, url, apiKey, modelName, metaToken, notionToken, calendlyToken } = body ?? {}
  if (!message) return json({ error: 'message is required' }, 400)

  const base = (url || process.env.HERMES_URL || '').trim().replace(/\/$/, '')
  const key  = apiKey || process.env.HERMES_API_KEY || ''

  if (!base) return json({ error: 'No server URL set. Use /url.' }, 400)
  if (!key)  return json({ error: 'No API key set. Use /apikey.' }, 401)

  const systemMessages = [
    ...(metaToken     ? [{ role: 'system', content: `Meta Access Token: ${metaToken}` }]       : []),
    ...(notionToken   ? [{ role: 'system', content: `Notion API Key: ${notionToken}` }]         : []),
    ...(calendlyToken ? [{ role: 'system', content: `Calendly API Token: ${calendlyToken}` }]   : []),
  ]

  const messages = [
    ...systemMessages,
    ...(Array.isArray(history) ? history : []),
    { role: 'user', content: message }
  ]

  try {
    const upstream = await fetch(`${base}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({ model: modelName || process.env.HERMES_MODEL || 'hermes', messages, stream: true })
    })

    const ct = upstream.headers.get('content-type') || ''
    if (ct.includes('text/html'))
      return json({ error: `Got HTML from upstream (${upstream.status}) — check URL or API key.` }, 502)

    if (!upstream.ok) {
      const t = await upstream.text().catch(() => '')
      return json({ error: `HTTP ${upstream.status} from upstream: ${t || upstream.statusText}` }, upstream.status)
    }

    return new Response(upstream.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      }
    })
  } catch (e) {
    return json({ error: e.message }, 500)
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } })
}
