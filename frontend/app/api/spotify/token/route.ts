export async function POST(req: Request) {
  try {
    const { code, code_verifier, redirect_uri, client_id } = await req.json()
    const clientId = (client_id as string | undefined) || (process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID as string | undefined)
    let redirectUri = (redirect_uri as string | undefined) || (process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI as string | undefined)
    if (!redirectUri) {
      // Fallback: default to 127.0.0.1 callback
      redirectUri = 'http://127.0.0.1:3000/spotify/callback'
    }
    if (!clientId || !code || !code_verifier) {
      return new Response(JSON.stringify({ error: 'missing_params' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    }

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      code_verifier,
    })

    const resp = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })

    const data = await resp.text()
    const isJson = (() => { try { JSON.parse(data); return true } catch { return false } })()
    return new Response(isJson ? data : JSON.stringify({ raw: data }), {
      status: resp.status,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: 'unknown_error' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}
