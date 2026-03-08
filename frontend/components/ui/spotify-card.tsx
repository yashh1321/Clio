"use client"

import * as React from "react"
import Image from "next/image"

type Song = {
  title: string
  artists: string
  duration: number
  albumArt: string
  audioUrl?: string
  uri?: string
}

export function SpotifyCard() {
  const [playing, setPlaying] = React.useState(false)
  const [progress, setProgress] = React.useState(0)
  const [deviceId, setDeviceId] = React.useState<string | null>(null)
  const [token, setToken] = React.useState<string | null>(null)
  const playerRef = React.useRef<unknown>(null)
  const [spTrack, setSpTrack] = React.useState<Song | null>(null)
  const [playlists, setPlaylists] = React.useState<Array<{ id: string; name: string; image: string; uri: string }>>([])
  const [loadingPlaylists, setLoadingPlaylists] = React.useState(false)


  // Load token and initialize Spotify Web Playback SDK if available
  React.useEffect(() => {
    try {
      const t = localStorage.getItem("spotify_token")
      if (t) setToken(t)
    } catch { }
  }, [])

  React.useEffect(() => {
    if (!token) return
    const scriptId = "spotify-sdk"
    if (!document.getElementById(scriptId)) {
      const s = document.createElement("script")
      s.id = scriptId
      s.src = "https://sdk.scdn.co/spotify-player.js"
      s.async = true
      document.body.appendChild(s)
    }
    // @ts-expect-error Spotify SDK is global
    window.onSpotifyWebPlaybackSDKReady = () => {
      // @ts-expect-error Spotify SDK is global
      const player = new window.Spotify.Player({
        name: "Clio Player",
        getOAuthToken: (cb: (t: string) => void) => cb(token),
        volume: 0.7,
      })
      playerRef.current = player
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      player.addListener('ready', ({ device_id }: any) => {
        setDeviceId(device_id)
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      player.addListener('player_state_changed', (state: any) => {
        const track = state?.track_window?.current_track
        if (track) {
          setSpTrack({
            title: track.name,
            artists: (track.artists || []).map((a: { name: string }) => a.name).join(", "),
            duration: Math.round((track.duration_ms || 0) / 1000),
            albumArt: track.album?.images?.[0]?.url || "",
            uri: track.uri,
          })
        } else {
          setSpTrack(null)
        }
        setPlaying(!state?.paused)
        setProgress(Math.round((state?.position || 0) / 1000))
      })
      player.connect()
    }

    return () => {
      if (playerRef.current) {
        // @ts-expect-error Spotify SDK player
        playerRef.current.disconnect()
        playerRef.current = null
      }
    }
  }, [token])

  React.useEffect(() => {
    if (!token) return
    setLoadingPlaylists(true)
    fetch('https://api.spotify.com/v1/me/playlists?limit=10', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async r => {
        const d = await r.json()
        const fetched = (d?.items || [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const firstTwo = fetched.slice(0, 2).map((p: any) => ({
          id: p.id,
          name: p.name,
          image: p.images?.[0]?.url || '',
          uri: p.uri,
        }))
        const liked = { id: 'liked', name: 'Liked Songs', image: 'https://misc.scdn.co/liked-songs/liked-songs-64.png', uri: 'spotify:collection:tracks' }
        setPlaylists([liked, ...firstTwo])
      })
      .catch(() => setPlaylists([{ id: 'liked', name: 'Liked Songs', image: 'https://misc.scdn.co/liked-songs/liked-songs-64.png', uri: 'spotify:collection:tracks' }]))
      .finally(() => setLoadingPlaylists(false))
  }, [token])

  React.useEffect(() => {
    if (!token || !deviceId) return
    fetch('https://api.spotify.com/v1/me/player', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ device_ids: [deviceId], play: false }),
    }).catch(() => { })
  }, [deviceId, token])

  const toggle = async () => {
    if (!token || !deviceId) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    try { (playerRef.current as any)?.activateElement?.() } catch { }
    await fetch(`https://api.spotify.com/v1/me/player/${playing ? 'pause' : 'play'}?device_id=${deviceId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: playing ? undefined : (spTrack?.uri ? JSON.stringify({ uris: [spTrack.uri] }) : undefined),
    }).catch(() => { })
    setPlaying(p => !p)
  }

  const next = async () => {
    if (!token || !deviceId) return
    await fetch(`https://api.spotify.com/v1/me/player/next?device_id=${deviceId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => { })
    setPlaying(true)
    await new Promise(r => setTimeout(r, 250))
    await refreshNow()
  }

  const prev = async () => {
    if (!token || !deviceId) return
    await fetch(`https://api.spotify.com/v1/me/player/previous?device_id=${deviceId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => { })
    setPlaying(true)
    await new Promise(r => setTimeout(r, 250))
    await refreshNow()
  }

  const duration = spTrack?.duration || 0
  const pct = Math.min(100, Math.round((progress / Math.max(1, duration)) * 100))

  const refreshNow = async () => {
    if (!token) return
    try {
      const r = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (r.status === 200) {
        const d = await r.json()
        const item = d?.item
        if (item) {
          setSpTrack({
            title: item.name,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            artists: (item.artists || []).map((a: any) => a.name).join(", "),
            duration: Math.round((item.duration_ms || 0) / 1000),
            albumArt: item.album?.images?.[0]?.url || "",
            uri: item.uri,
          })
        }
        setPlaying(!!d?.is_playing)
        setProgress(Math.round((d?.progress_ms || 0) / 1000))
      }
    } catch { }
  }

  const seekTo = async (ms: number) => {
    if (!token || !deviceId || !spTrack) return
    await fetch(`https://api.spotify.com/v1/me/player/seek?position_ms=${ms}&device_id=${deviceId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => { })
    await new Promise(r => setTimeout(r, 150))
    await refreshNow()
  }

  const playPlaylist = async (contextUri: string) => {
    if (!token || !deviceId) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    try { (playerRef.current as any)?.activateElement?.() } catch { }
    await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ context_uri: contextUri }),
    }).catch(() => { })
    setPlaying(true)
    await new Promise(r => setTimeout(r, 250))
    await refreshNow()
  }

  // Spotify Auth Helpers
  async function getSpotifyAuthUrl() {
    const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID
    let redirectUri = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI || (typeof window !== "undefined" ? `${window.location.origin}/spotify/callback` : "")
    if (typeof window !== 'undefined') {
      const host = window.location.hostname
      if (host === 'localhost') {
        const port = window.location.port || '3000'
        redirectUri = `http://127.0.0.1:${port}/spotify/callback`
      }
    }
    const scopes = [
      "streaming",
      "user-read-email",
      "user-read-private",
      "user-modify-playback-state",
      "user-read-playback-state",
      "user-library-read",
    ]
    if (!clientId || !redirectUri) return null

    const webCrypto = typeof window !== 'undefined' ? window.crypto : undefined
    const supportsPkce = !!webCrypto?.subtle && !!webCrypto?.getRandomValues

    if (supportsPkce) {
      const generateRandomString = (length: number) => {
        const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
        let result = ''
        const values = new Uint8Array(length)
        webCrypto!.getRandomValues(values)
        for (let i = 0; i < length; i++) {
          result += charset[values[i] % charset.length]
        }
        return result
      }

      const codeVerifier = generateRandomString(128)
      const encoder = new TextEncoder()
      const data = encoder.encode(codeVerifier)
      const digest = await webCrypto!.subtle!.digest('SHA-256', data)
      const base64 = btoa(String.fromCharCode(...Array.from(new Uint8Array(digest))))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+/g, '')
      const codeChallenge = base64
      sessionStorage.setItem('spotify_code_verifier', codeVerifier)
      const rawState = JSON.stringify({ v: codeVerifier })
      const state = btoa(rawState).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+/g, '')

      const params = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: scopes.join(' '),
        code_challenge_method: 'S256',
        code_challenge: codeChallenge,
        state,
        show_dialog: 'true',
      })
      return `https://accounts.spotify.com/authorize?${params.toString()}`
    }

    const params = new URLSearchParams({
      response_type: 'token',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scopes.join(' '),
      show_dialog: 'true',
    })
    return `https://accounts.spotify.com/authorize?${params.toString()}`
  }

  const onConnect = async () => {
    const url = await getSpotifyAuthUrl()
    if (!url) return alert("Spotify not configured. Set NEXT_PUBLIC_SPOTIFY_CLIENT_ID and NEXT_PUBLIC_SPOTIFY_REDIRECT_URI.")
    window.location.href = url
  }

  return (
    <div className="rounded-xl border border-border bg-accent/20 p-4 backdrop-blur-md">
      {token ? (
        <div className="mb-3">
          <div className="text-[10px] text-muted-foreground mb-1">Playlists</div>
          <div className="grid grid-cols-3 gap-2">
            {(loadingPlaylists && playlists.length === 0) ? (
              <div className="col-span-3 text-[10px] text-muted-foreground">Loading...</div>
            ) : (
              playlists.map(p => (
                <button
                  key={p.id}
                  onClick={() => playPlaylist(p.uri)}
                  disabled={!deviceId}
                  className="flex items-center gap-2 rounded-md border border-border bg-background/40 px-2 py-1 hover:bg-background/60 disabled:opacity-50"
                >
                  <Image src={p.image} alt="cover" width={24} height={24} unoptimized className="h-6 w-6 rounded object-cover" />
                  <span className="text-[10px] text-foreground/80 truncate">{p.name}</span>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
      {token && spTrack ? (
        <div className="flex items-center gap-3">
          <Image src={spTrack.albumArt} alt="album" width={56} height={56} unoptimized className="h-14 w-14 rounded-md object-cover" />
          <div className="flex-1">
            <div className="text-sm font-semibold text-foreground">{spTrack.title}</div>
            <div className="text-xs text-muted-foreground">{spTrack.artists}</div>
          </div>
          <div className="flex items-center gap-2">
            <button className="h-8 w-8 rounded-full bg-accent text-foreground hover:bg-accent/80" onClick={prev}>⟨</button>
            <button className="h-8 w-8 rounded-full bg-foreground text-background hover:bg-foreground/90" onClick={toggle}>{playing ? "❚❚" : "►"}</button>
            <button className="h-8 w-8 rounded-full bg-accent text-foreground hover:bg-accent/80" onClick={next}>⟩</button>
          </div>
        </div>
      ) : (
        <div className="h-20 w-full rounded-md bg-background/50 border border-border flex items-center justify-between px-3">
          <span className="text-xs text-muted-foreground">Not connected</span>
          <button onClick={onConnect} className="px-2 py-1 rounded bg-green-600 text-white text-xs">+ Connect Spotify</button>
        </div>
      )}
      <div className="mt-3">
        <div
          className="h-2 w-full rounded-full bg-accent/30 cursor-pointer"
          onClick={(e) => {
            const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
            const x = e.clientX - rect.left
            const ratio = Math.max(0, Math.min(1, x / rect.width))
            const ms = Math.round(ratio * duration * 1000)
            seekTo(ms)
          }}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="mt-2 flex justify-between items-center">
        {!token ? (
          <button
            onClick={onConnect}
            className="text-[10px] font-medium text-green-400 hover:text-green-300 flex items-center gap-1 uppercase tracking-wide"
          >
            <span>+ Connect Spotify</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-green-500 font-medium">Spotify Connected</span>
            <button onClick={() => { try { localStorage.removeItem('spotify_token') } catch { }; setToken(null); setDeviceId(null); setSpTrack(null); }} className="text-[10px] font-medium text-red-400 hover:text-red-300">Logout</button>
          </div>
        )}
        <span className="text-[10px] text-muted-foreground">{pct}%</span>
      </div>
    </div>
  )
}

export default SpotifyCard
