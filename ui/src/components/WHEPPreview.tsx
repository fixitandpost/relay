import { useEffect, useRef, useState, useCallback } from 'react'

interface WHEPPreviewProps {
  path: string
  active: boolean
}

const WHEP_PORT = 8889 // mediamtx WebRTC port (from mediamtx.yml)

export function WHEPPreview({ path, active }: WHEPPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const resourceUrlRef = useRef<string | null>(null)
  const retryRef = useRef<ReturnType<typeof setTimeout>>()
  const mountedRef = useRef(true)
  const [status, setStatus] = useState<'waiting' | 'connecting' | 'playing' | 'error'>('waiting')

  const cleanup = useCallback(async () => {
    if (retryRef.current) {
      clearTimeout(retryRef.current)
      retryRef.current = undefined
    }

    if (pcRef.current) {
      pcRef.current.close()
      pcRef.current = null
    }

    // Tell mediamtx to tear down the WHEP session
    if (resourceUrlRef.current) {
      try {
        await fetch(resourceUrlRef.current, { method: 'DELETE' })
      } catch {
        // ignore cleanup errors
      }
      resourceUrlRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  const connect = useCallback(async () => {
    await cleanup()
    if (!mountedRef.current) return
    setStatus('connecting')

    try {
      const pc = new RTCPeerConnection({
        iceServers: [], // localhost — no STUN/TURN needed
      })
      pcRef.current = pc

      // Receive-only video
      pc.addTransceiver('video', { direction: 'recvonly' })

      // Wire up tracks to the video element
      pc.ontrack = (event) => {
        if (videoRef.current && event.streams[0]) {
          videoRef.current.srcObject = event.streams[0]
        }
      }

      pc.onconnectionstatechange = () => {
        if (!mountedRef.current) return
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          setStatus('error')
          // Auto-retry after disconnect
          retryRef.current = setTimeout(() => {
            if (mountedRef.current) connect()
          }, 2000)
        }
      }

      // Create offer and wait for ICE gathering to complete (fast on localhost)
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      await new Promise<void>((resolve) => {
        if (pc.iceGatheringState === 'complete') {
          resolve()
          return
        }
        const check = () => {
          if (pc.iceGatheringState === 'complete') {
            pc.removeEventListener('icegatheringstatechange', check)
            resolve()
          }
        }
        pc.addEventListener('icegatheringstatechange', check)
        // Safety timeout — don't wait forever
        setTimeout(resolve, 2000)
      })

      // POST offer to mediamtx WHEP endpoint
      const whepUrl = `http://localhost:${WHEP_PORT}/${path}/whep`
      const resp = await fetch(whepUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/sdp' },
        body: pc.localDescription!.sdp,
      })

      // 404 = stream not published yet → retry
      if (resp.status === 404) {
        pc.close()
        pcRef.current = null
        if (mountedRef.current) {
          setStatus('waiting')
          retryRef.current = setTimeout(() => {
            if (mountedRef.current) connect()
          }, 1500)
        }
        return
      }

      if (!resp.ok) {
        throw new Error(`WHEP responded ${resp.status}`)
      }

      // Save resource URL for cleanup DELETE
      const location = resp.headers.get('Location')
      if (location) {
        resourceUrlRef.current = location.startsWith('http')
          ? location
          : `http://localhost:${WHEP_PORT}${location}`
      }

      // Apply answer SDP
      const answerSdp = await resp.text()
      await pc.setRemoteDescription(
        new RTCSessionDescription({ type: 'answer', sdp: answerSdp })
      )
    } catch (err) {
      console.error('WHEP preview error:', err)
      if (!mountedRef.current) return
      setStatus('error')
      retryRef.current = setTimeout(() => {
        if (mountedRef.current) connect()
      }, 2500)
    }
  }, [path, cleanup])

  useEffect(() => {
    mountedRef.current = true

    if (!active) {
      cleanup()
      setStatus('waiting')
      return
    }

    // Small delay to let mediamtx register the stream after FFmpeg starts
    retryRef.current = setTimeout(() => connect(), 800)

    return () => {
      mountedRef.current = false
      cleanup()
    }
  }, [active, path])

  return (
    <div className="node-preview">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        onPlaying={() => setStatus('playing')}
      />
      {status !== 'playing' && (
        <div className="node-preview-placeholder">
          <div className="node-preview-placeholder-content">
            {status === 'waiting' && (
              <>
                <span className="preview-icon">{'\u{1F4E1}'}</span>
                <span>Waiting for stream...</span>
              </>
            )}
            {status === 'connecting' && (
              <>
                <span className="preview-spinner" />
                <span>Connecting...</span>
              </>
            )}
            {status === 'error' && (
              <>
                <span className="preview-spinner" />
                <span>Reconnecting...</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
