"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function SpotifyCallback() {
  const router = useRouter()
  const [message, setMessage] = useState("Connecting to Spotify...")
  const [details, setDetails] = useState<string | null>(null)
  const [retryUrl, setRetryUrl] = useState<string | null>(null)

  useEffect(() => {
    const handleImplicit = () => {
      const hash = window.location.hash
      if (hash) {
        const params = new URLSearchParams(hash.substring(1))
        const token = params.get("access_token")
        if (token) {
          localStorage.setItem("spotify_token", token)
          router.push("/editor")
          return
        }
      }
      setMessage("Missing access token")
    }

    const handlePkce = async () => {
      const search = window.location.search
      const params = new URLSearchParams(search)
      const code = params.get('code')
      const stateParam = params.get('state')
      const error = params.get('error')
      if (error) {
        setMessage("Authorization failed")
        setDetails(error)
        return
      }
      if (!code) {
        setMessage("No authorization code")
        const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID
        let redirectUri = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI || `${window.location.origin}/spotify/callback`
        if (window.location.hostname === 'localhost') {
          const port = window.location.port || '3000'
          redirectUri = `http://127.0.0.1:${port}/spotify/callback`
        }
        const scopes = [
          "streaming",
          "user-read-email",
          "user-read-private",
          "user-modify-playback-state",
          "user-read-playback-state",
        ]
        if (clientId && redirectUri) {
          const authorize = new URLSearchParams({
            response_type: 'code',
            client_id: clientId,
            redirect_uri: redirectUri,
            scope: scopes.join(' '),
          })
          setRetryUrl(`https://accounts.spotify.com/authorize?${authorize.toString()}`)
        }
        return
      }
      let verifier = sessionStorage.getItem('spotify_code_verifier')
      if (!verifier && stateParam) {
        try {
          const json = JSON.parse(atob(stateParam.replace(/-/g, '+').replace(/_/g, '/')))
          if (json?.v && typeof json.v === 'string') verifier = json.v
        } catch {}
      }
      const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID
      let redirectUri = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI || `${window.location.origin}/spotify/callback`
      if (window.location.hostname === 'localhost') {
        const port = window.location.port || '3000'
        redirectUri = `http://127.0.0.1:${port}/spotify/callback`
      }
      if (!clientId || !verifier) {
        setMessage("Missing verifier or client id")
        return
      }
      try {
        const resp = await fetch('/api/spotify/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, code_verifier: verifier, redirect_uri: redirectUri, client_id: clientId }),
        })
        const data = await resp.json()
        const token = data.access_token as string | undefined
        if (token) {
          localStorage.setItem('spotify_token', token)
          router.push('/editor')
        } else {
          setMessage("Token exchange failed")
          setDetails(typeof data === 'string' ? data : JSON.stringify(data))
          const authorize = new URLSearchParams({
            response_type: 'code',
            client_id: clientId,
            redirect_uri: redirectUri,
          })
          setRetryUrl(`https://accounts.spotify.com/authorize?${authorize.toString()}`)
        }
      } catch {}
    }

    handleImplicit()
    handlePkce()
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-black text-white">
      <div className="flex flex-col items-center gap-3">
        <p>{message}</p>
        {details ? <p className="text-white/60 text-xs max-w-md text-center">{details}</p> : null}
        <div className="flex items-center gap-2">
          {retryUrl ? (
            <a href={retryUrl} className="px-3 py-1 rounded bg-green-600 text-white text-xs">Try Again</a>
          ) : null}
          <button onClick={() => router.push('/editor')} className="px-3 py-1 rounded bg-white/10 text-white text-xs">Back to Editor</button>
        </div>
      </div>
    </div>
  )
}
