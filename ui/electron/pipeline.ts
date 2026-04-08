import { ChildProcess, spawn, execSync } from 'child_process'
import { join } from 'path'
import { existsSync } from 'fs'
import { BrowserWindow } from 'electron'

interface PipelineConfig {
  id: string
  camera: { device: string; index: number }
  rtsp: { path: string; port: number }
}

interface CameraDevice {
  index: number
  name: string
}

// Ensure homebrew and common paths are available to spawned processes
const PATH = [
  '/opt/homebrew/bin',
  '/usr/local/bin',
  '/usr/bin',
  '/bin',
  '/usr/sbin',
  '/sbin',
  process.env.PATH,
].join(':')

const spawnEnv = { ...process.env, PATH }

function findBinary(name: string): string {
  const locations = ['/opt/homebrew/bin', '/usr/local/bin', '/usr/bin']
  for (const dir of locations) {
    const full = join(dir, name)
    if (existsSync(full)) return full
  }
  return name // fall back to PATH lookup
}

export class PipelineManager {
  private pipelines = new Map<string, ChildProcess>()
  private mediamtxProcess: ChildProcess | null = null
  private mainWindow: BrowserWindow | null = null
  private projectRoot: string
  private ffmpegPath: string
  private isPackaged: boolean

  constructor(projectRoot: string, isPackaged = false) {
    this.projectRoot = projectRoot
    this.isPackaged = isPackaged
    this.ffmpegPath = findBinary('ffmpeg')
    console.log(`[relay] packaged=${isPackaged}, projectRoot=${projectRoot}`)
    console.log(`[relay] ffmpeg=${this.ffmpegPath}`)
  }

  setMainWindow(win: BrowserWindow) {
    this.mainWindow = win
  }

  private sendStatus(id: string, status: string, error?: string) {
    this.mainWindow?.webContents.send('pipeline-status', { id, status, error })
  }

  private sendLog(id: string, message: string) {
    this.mainWindow?.webContents.send('pipeline-log', { id, message })
  }

  async listCameras(): Promise<CameraDevice[]> {
    const platform = process.platform

    if (platform === 'darwin') {
      return this.listCamerasMac()
    } else if (platform === 'linux') {
      return this.listCamerasLinux()
    } else if (platform === 'win32') {
      return this.listCamerasWindows()
    }
    return []
  }

  private listCamerasMac(): Promise<CameraDevice[]> {
    return new Promise((resolve) => {
      const ffmpeg = spawn(this.ffmpegPath, ['-f', 'avfoundation', '-list_devices', 'true', '-i', ''], { env: spawnEnv })
      let output = ''
      ffmpeg.stderr.on('data', (data: Buffer) => { output += data.toString() })
      ffmpeg.on('close', () => {
        const cameras: CameraDevice[] = []
        const lines = output.split('\n')
        let inVideo = false
        for (const line of lines) {
          if (line.includes('AVFoundation video devices:')) {
            inVideo = true
            continue
          }
          if (line.includes('AVFoundation audio devices:')) break
          if (inVideo) {
            const match = line.match(/\[(\d+)\]\s+(.+)/)
            if (match) {
              cameras.push({ index: parseInt(match[1]), name: match[2].trim() })
            }
          }
        }
        resolve(cameras)
      })
      ffmpeg.on('error', () => resolve([]))
    })
  }

  private listCamerasLinux(): Promise<CameraDevice[]> {
    return new Promise((resolve) => {
      const cameras: CameraDevice[] = []
      for (let i = 0; i < 10; i++) {
        if (existsSync(`/dev/video${i}`)) {
          cameras.push({ index: i, name: `/dev/video${i}` })
        }
      }
      resolve(cameras)
    })
  }

  private listCamerasWindows(): Promise<CameraDevice[]> {
    return new Promise((resolve) => {
      const ffmpeg = spawn(this.ffmpegPath, ['-f', 'dshow', '-list_devices', 'true', '-i', 'dummy'], { env: spawnEnv })
      let output = ''
      ffmpeg.stderr.on('data', (data: Buffer) => { output += data.toString() })
      ffmpeg.on('close', () => {
        const cameras: CameraDevice[] = []
        const lines = output.split('\n')
        let idx = 0
        for (const line of lines) {
          if (line.includes('(video)')) {
            const match = line.match(/"(.+?)"/)
            if (match) {
              cameras.push({ index: idx++, name: match[1] })
            }
          }
        }
        resolve(cameras)
      })
      ffmpeg.on('error', () => resolve([]))
    })
  }

  async ensureMediaMTX(): Promise<boolean> {
    if (this.mediamtxProcess) return true

    // Find mediamtx binary: check bundled resources, project build, then PATH
    let mediamtxPath = ''
    let mediamtxCwd = this.projectRoot

    // 1. Check bundled resources (packaged mode)
    if (this.isPackaged) {
      const bundled = join(process.resourcesPath, 'mediamtx')
      if (existsSync(bundled)) {
        mediamtxPath = bundled
        mediamtxCwd = process.resourcesPath
        console.log(`[relay] Using bundled mediamtx: ${bundled}`)
      }
    }

    // 2. Check project root for pre-built binary
    if (!mediamtxPath) {
      const localBin = join(this.projectRoot, 'mediamtx')
      if (existsSync(localBin)) {
        mediamtxPath = localBin
      }
    }

    // 3. Try building from Go source (dev mode only)
    if (!mediamtxPath && !this.isPackaged) {
      try {
        console.log('[relay] Building mediamtx from source...')
        execSync('go build -o mediamtx .', { cwd: this.projectRoot, timeout: 120000, env: spawnEnv })
        const localBin = join(this.projectRoot, 'mediamtx')
        if (existsSync(localBin)) {
          mediamtxPath = localBin
        }
      } catch {
        console.log('[relay] Could not build mediamtx, trying PATH...')
      }
    }

    // 4. Fall back to PATH
    if (!mediamtxPath) {
      mediamtxPath = findBinary('mediamtx')
    }

    // Find mediamtx.yml config
    let configArgs: string[] = []
    const configLocations = [
      join(mediamtxCwd, 'mediamtx.yml'),
      join(process.resourcesPath || '', 'mediamtx.yml'),
      join(this.projectRoot, 'mediamtx.yml'),
    ]
    for (const cfgPath of configLocations) {
      if (cfgPath && existsSync(cfgPath)) {
        configArgs = [cfgPath]
        console.log(`[relay] Using config: ${cfgPath}`)
        break
      }
    }

    return new Promise((resolve) => {
      console.log(`[relay] Starting mediamtx: ${mediamtxPath} ${configArgs.join(' ')}`)
      this.mediamtxProcess = spawn(mediamtxPath, configArgs, {
        cwd: mediamtxCwd,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: spawnEnv,
      })

      const timeout = setTimeout(() => resolve(true), 3000)

      this.mediamtxProcess.stderr?.on('data', (data: Buffer) => {
        const msg = data.toString()
        console.log('[mediamtx]', msg.trim())
        if (msg.includes('listener opened') || msg.includes('RTSP')) {
          clearTimeout(timeout)
          resolve(true)
        }
      })

      this.mediamtxProcess.stdout?.on('data', (data: Buffer) => {
        const msg = data.toString()
        console.log('[mediamtx]', msg.trim())
        if (msg.includes('listener opened') || msg.includes('RTSP')) {
          clearTimeout(timeout)
          resolve(true)
        }
      })

      this.mediamtxProcess.on('error', (err) => {
        console.error('mediamtx failed to start:', err.message)
        clearTimeout(timeout)
        this.mediamtxProcess = null
        resolve(false)
      })

      this.mediamtxProcess.on('close', (code) => {
        console.log(`mediamtx exited with code ${code}`)
        this.mediamtxProcess = null
      })
    })
  }

  async startPipeline(config: PipelineConfig): Promise<void> {
    if (this.pipelines.has(config.id)) return

    this.sendStatus(config.id, 'starting')

    const serverReady = await this.ensureMediaMTX()
    if (!serverReady) {
      this.sendStatus(config.id, 'error', 'Failed to start RTSP server. Install mediamtx or build from project root.')
      return
    }

    const rtspUrl = `rtsp://localhost:${config.rtsp.port}/${config.rtsp.path}`
    const platform = process.platform

    let ffmpegArgs: string[]
    if (platform === 'darwin') {
      ffmpegArgs = [
        '-f', 'avfoundation',
        '-framerate', '30',
        '-video_size', '1280x720',
        '-i', `${config.camera.index}:none`,
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-tune', 'zerolatency',
        '-g', '30',
        '-f', 'rtsp',
        '-rtsp_transport', 'tcp',
        rtspUrl,
      ]
    } else if (platform === 'linux') {
      ffmpegArgs = [
        '-f', 'v4l2',
        '-framerate', '30',
        '-video_size', '1280x720',
        '-i', `/dev/video${config.camera.index}`,
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-tune', 'zerolatency',
        '-g', '30',
        '-f', 'rtsp',
        '-rtsp_transport', 'tcp',
        rtspUrl,
      ]
    } else {
      ffmpegArgs = [
        '-f', 'dshow',
        '-framerate', '30',
        '-video_size', '1280x720',
        '-i', `video=${config.camera.device}`,
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-tune', 'zerolatency',
        '-g', '30',
        '-f', 'rtsp',
        '-rtsp_transport', 'tcp',
        rtspUrl,
      ]
    }

    console.log('Starting FFmpeg:', this.ffmpegPath, ffmpegArgs.join(' '))
    const ffmpeg = spawn(this.ffmpegPath, ffmpegArgs, { env: spawnEnv })
    this.pipelines.set(config.id, ffmpeg)

    ffmpeg.stderr?.on('data', (data: Buffer) => {
      const msg = data.toString()
      this.sendLog(config.id, msg)
      if (msg.includes('Output #0') || msg.includes('frame=')) {
        this.sendStatus(config.id, 'streaming')
      }
    })

    ffmpeg.on('error', (err) => {
      this.sendStatus(config.id, 'error', `FFmpeg error: ${err.message}. Is ffmpeg installed?`)
      this.pipelines.delete(config.id)
    })

    ffmpeg.on('close', (code) => {
      if (this.pipelines.has(config.id)) {
        if (code !== 0) {
          this.sendStatus(config.id, 'error', `FFmpeg exited with code ${code}`)
        } else {
          this.sendStatus(config.id, 'stopped')
        }
        this.pipelines.delete(config.id)
      }
    })
  }

  stopPipeline(id: string): void {
    const proc = this.pipelines.get(id)
    if (proc) {
      proc.kill('SIGTERM')
      this.pipelines.delete(id)
      this.sendStatus(id, 'stopped')
    }
  }

  stopAll(): void {
    for (const [id, proc] of this.pipelines) {
      proc.kill('SIGTERM')
      this.sendStatus(id, 'stopped')
    }
    this.pipelines.clear()

    if (this.mediamtxProcess) {
      this.mediamtxProcess.kill('SIGTERM')
      this.mediamtxProcess = null
    }
  }

  cleanup(): void {
    this.stopAll()
  }
}
