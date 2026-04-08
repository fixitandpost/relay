import { useEffect, useRef, useState, useCallback } from 'react'

interface CameraPreviewProps {
  deviceName: string
  active: boolean
}

export function CameraPreview({ deviceName, active }: CameraPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [status, setStatus] = useState<'loading' | 'playing' | 'error' | 'idle'>('idle')

  const stopPreview = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  const startPreview = useCallback(async () => {
    stopPreview()
    setStatus('loading')

    try {
      // Ask the main process to trigger the macOS camera permission dialog first
      if (window.relay?.requestCamera) {
        const granted = await window.relay.requestCamera()
        if (!granted) {
          console.error('Camera access denied by macOS')
          setStatus('error')
          return
        }
      }

      // Enumerate devices — labels may be empty until first getUserMedia grant
      let devices = await navigator.mediaDevices.enumerateDevices()
      let videoDevices = devices.filter((d) => d.kind === 'videoinput')

      // If labels are blank, request a temporary stream to unlock them
      if (videoDevices.length > 0 && !videoDevices[0].label) {
        try {
          const tempStream = await navigator.mediaDevices.getUserMedia({ video: true })
          tempStream.getTracks().forEach((t) => t.stop())
          devices = await navigator.mediaDevices.enumerateDevices()
          videoDevices = devices.filter((d) => d.kind === 'videoinput')
        } catch {
          // Permission was denied at the browser level
          setStatus('error')
          return
        }
      }

      // Match the avfoundation device name to a browser deviceId
      let matched = videoDevices.find(
        (d) =>
          d.label &&
          deviceName &&
          (d.label.toLowerCase().includes(deviceName.toLowerCase()) ||
            deviceName.toLowerCase().includes(d.label.toLowerCase()))
      )

      // Fall back to the first available camera
      if (!matched && videoDevices.length > 0) {
        matched = videoDevices[0]
      }

      if (!matched) {
        console.warn('No matching camera found for:', deviceName)
      }

      const constraints: MediaStreamConstraints = {
        video: matched?.deviceId
          ? {
              deviceId: { exact: matched.deviceId },
              width: { ideal: 320 },
              height: { ideal: 180 },
              frameRate: { ideal: 15 },
            }
          : {
              width: { ideal: 320 },
              height: { ideal: 180 },
              frameRate: { ideal: 15 },
            },
        audio: false,
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err) {
      console.error('Camera preview error:', err)
      setStatus('error')
    }
  }, [deviceName, stopPreview])

  useEffect(() => {
    if (!active) {
      stopPreview()
      setStatus('idle')
      return
    }

    startPreview()

    return () => {
      stopPreview()
    }
  }, [active, deviceName])

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
            {status === 'idle' && (
              <>
                <span className="preview-icon">{'\u{1F4F9}'}</span>
                <span>Camera preview</span>
              </>
            )}
            {status === 'loading' && (
              <>
                <span className="preview-spinner" />
                <span>Starting camera...</span>
              </>
            )}
            {status === 'error' && (
              <>
                <span className="preview-icon">{'\u26A0\uFE0F'}</span>
                <span>Camera access denied</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
