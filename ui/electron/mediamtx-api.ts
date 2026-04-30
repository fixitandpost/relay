import { net } from 'electron'

const API_BASE = 'http://localhost:9997/v3'

async function apiGet(path: string): Promise<any> {
  const resp = await net.fetch(`${API_BASE}${path}`)
  if (!resp.ok) throw new Error(`mediamtx API ${path}: ${resp.status}`)
  return resp.json()
}

async function apiPost(path: string, body?: unknown): Promise<any> {
  const resp = await net.fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!resp.ok) throw new Error(`mediamtx API POST ${path}: ${resp.status}`)
  return resp.json().catch(() => ({}))
}

async function apiPatch(path: string, body: unknown): Promise<any> {
  const resp = await net.fetch(`${API_BASE}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!resp.ok) throw new Error(`mediamtx API PATCH ${path}: ${resp.status}`)
  return resp.json().catch(() => ({}))
}

async function apiDelete(path: string): Promise<void> {
  const resp = await net.fetch(`${API_BASE}${path}`, { method: 'DELETE' })
  if (!resp.ok && resp.status !== 404) {
    throw new Error(`mediamtx API DELETE ${path}: ${resp.status}`)
  }
}

export class MediaMTXApi {
  /* ── Info ── */
  async getInfo() {
    return apiGet('/info')
  }

  /* ── Live paths ── */
  async listPaths() {
    const data = await apiGet('/paths/list?itemsPerPage=1000')
    return data.items || []
  }

  async getPath(name: string) {
    return apiGet(`/paths/get/${encodeURIComponent(name)}`)
  }

  /* ── Path config CRUD ── */
  async addPathConfig(name: string, conf: Record<string, unknown>) {
    const resp = await net.fetch(`${API_BASE}/config/paths/add/${encodeURIComponent(name)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(conf),
    })
    // 409 = already exists, try patch instead
    if (resp.status === 409) {
      return this.patchPathConfig(name, conf)
    }
    if (!resp.ok) throw new Error(`addPathConfig ${name}: ${resp.status}`)
  }

  async patchPathConfig(name: string, conf: Record<string, unknown>) {
    return apiPatch(`/config/paths/patch/${encodeURIComponent(name)}`, conf)
  }

  async deletePathConfig(name: string) {
    return apiDelete(`/config/paths/delete/${encodeURIComponent(name)}`)
  }

  /* ── Connections ── */
  async listRtspSessions() {
    const data = await apiGet('/rtspsessions/list?itemsPerPage=1000')
    return data.items || []
  }

  async listRtmpConns() {
    const data = await apiGet('/rtmpconns/list?itemsPerPage=1000')
    return data.items || []
  }

  async listWebrtcSessions() {
    const data = await apiGet('/webrtcsessions/list?itemsPerPage=1000')
    return data.items || []
  }

  async listSrtConns() {
    const data = await apiGet('/srtconns/list?itemsPerPage=1000')
    return data.items || []
  }

  async listHlsMuxers() {
    const data = await apiGet('/hlsmuxers/list?itemsPerPage=1000')
    return data.items || []
  }

  async kickSession(protocol: string, id: string) {
    const endpoints: Record<string, string> = {
      rtsp: '/rtspsessions/kick',
      rtmp: '/rtmpconns/kick',
      webrtc: '/webrtcsessions/kick',
      srt: '/srtconns/kick',
    }
    const base = endpoints[protocol]
    if (!base) throw new Error(`Unknown protocol: ${protocol}`)
    return apiPost(`${base}/${encodeURIComponent(id)}`)
  }

  /* ── Global config ── */
  async getGlobalConfig() {
    return apiGet('/config/global/get')
  }

  async patchGlobalConfig(patch: Record<string, unknown>) {
    return apiPatch('/config/global/patch', patch)
  }

  /* ── Path defaults ── */
  async getPathDefaults() {
    return apiGet('/config/pathdefaults/get')
  }

  async patchPathDefaults(patch: Record<string, unknown>) {
    return apiPatch('/config/pathdefaults/patch', patch)
  }

  /* ── Recordings ── */
  async listRecordings() {
    const data = await apiGet('/recordings/list?itemsPerPage=1000')
    return data.items || []
  }

  async getRecording(name: string) {
    return apiGet(`/recordings/get/${encodeURIComponent(name)}`)
  }

  async deleteRecordingSegment(path: string, start: string) {
    return apiDelete(`/recordings/deletesegment?path=${encodeURIComponent(path)}&start=${encodeURIComponent(start)}`)
  }

  /* ── Bundled monitor fetch ── */
  async getMonitorData() {
    const [paths, rtspSessions, rtmpConns, webrtcSessions, srtConns, hlsMuxers] = await Promise.all([
      this.listPaths().catch(() => []),
      this.listRtspSessions().catch(() => []),
      this.listRtmpConns().catch(() => []),
      this.listWebrtcSessions().catch(() => []),
      this.listSrtConns().catch(() => []),
      this.listHlsMuxers().catch(() => []),
    ])
    return { paths, rtspSessions, rtmpConns, webrtcSessions, srtConns, hlsMuxers }
  }
}
