/* mediamtx REST API response types — derived from api/openapi.yaml */

export interface MediaMTXInfo {
  version: string
  started: string
}

/* ── Path (live status) ── */

export interface MediaMTXPathSource {
  type: string
  id: string
}

export interface MediaMTXPathReader {
  type: string
  id: string
}

export interface MediaMTXPathTrackCodecProps {
  width?: number
  height?: number
  profile?: string
  level?: string
  channelCount?: number
  sampleRate?: number
  [key: string]: unknown
}

export interface MediaMTXPathTrack {
  codec: string
  codecProps?: MediaMTXPathTrackCodecProps | null
}

export interface MediaMTXPath {
  name: string
  confName: string
  source: MediaMTXPathSource | null
  available: boolean
  availableTime: string | null
  online: boolean
  onlineTime: string | null
  tracks2: MediaMTXPathTrack[]
  readers: MediaMTXPathReader[]
  inboundBytes: number
  outboundBytes: number
  inboundFramesInError: number
}

/* ── Connections ── */

export interface MediaMTXRTSPSession {
  id: string
  created: string
  remoteAddr: string
  state: 'idle' | 'read' | 'publish'
  path: string
  query: string
  user: string
  transport: string | null
  inboundBytes: number
  outboundBytes: number
  inboundRTPPackets: number
  inboundRTPPacketsLost: number
  inboundRTPPacketsJitter: number
  outboundRTPPackets: number
}

export interface MediaMTXRTMPConn {
  id: string
  created: string
  remoteAddr: string
  state: 'idle' | 'read' | 'publish'
  path: string
  query: string
  user: string
  inboundBytes: number
  outboundBytes: number
  outboundFramesDiscarded: number
}

export interface MediaMTXWebRTCSession {
  id: string
  created: string
  remoteAddr: string
  peerConnectionEstablished: boolean
  localCandidate: string
  remoteCandidate: string
  state: 'read' | 'publish'
  path: string
  query: string
  user: string
  inboundBytes: number
  outboundBytes: number
  inboundRTPPackets: number
  inboundRTPPacketsLost: number
  inboundRTPPacketsJitter: number
  outboundRTPPackets: number
  outboundFramesDiscarded: number
}

export interface MediaMTXSRTConn {
  id: string
  created: string
  remoteAddr: string
  state: 'idle' | 'read' | 'publish'
  path: string
  query: string
  user: string
  packetsSent: number
  packetsReceived: number
  packetsSendLoss: number
  packetsReceivedLoss: number
  bytesSent: number
  bytesReceived: number
  msRTT: number
  mbpsSendRate: number
  mbpsReceiveRate: number
  mbpsLinkCapacity: number
  outboundFramesDiscarded?: number
}

export interface MediaMTXHLSMuxer {
  path: string
  created: string
  lastRequest: string
  outboundBytes: number
  outboundFramesDiscarded: number
}

/* ── Recordings ── */

export interface MediaMTXRecordingSegment {
  start: string
}

export interface MediaMTXRecording {
  name: string
  segments: MediaMTXRecordingSegment[]
}

/* ── Global Config (subset for settings UI) ── */

export interface MediaMTXGlobalConfig {
  logLevel: string
  logDestinations: string[]

  api: boolean
  apiAddress: string

  metrics: boolean
  metricsAddress: string

  playback: boolean
  playbackAddress: string

  rtsp: boolean
  rtspAddress: string
  rtspsAddress: string

  rtmp: boolean
  rtmpAddress: string
  rtmpsAddress: string

  hls: boolean
  hlsAddress: string
  hlsVariant: string
  hlsSegmentCount: number
  hlsSegmentDuration: string

  webrtc: boolean
  webrtcAddress: string

  srt: boolean
  srtAddress: string

  [key: string]: unknown
}

/* ── Path Config ── */

export interface MediaMTXPathConfig {
  source: string
  sourceOnDemand: boolean
  sourceOnDemandStartTimeout: string
  sourceOnDemandCloseAfter: string
  maxReaders: number
  overridePublisher: boolean
  record: boolean
  recordPath: string
  recordFormat: string
  recordPartDuration: string
  recordSegmentDuration: string
  recordDeleteAfter: string
  [key: string]: unknown
}

/* ── Bundled monitor data ── */

export interface MonitorData {
  paths: MediaMTXPath[]
  rtspSessions: MediaMTXRTSPSession[]
  rtmpConns: MediaMTXRTMPConn[]
  webrtcSessions: MediaMTXWebRTCSession[]
  srtConns: MediaMTXSRTConn[]
  hlsMuxers: MediaMTXHLSMuxer[]
}
