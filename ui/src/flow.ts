import type { Connection, Edge, Node } from '@xyflow/react'
import type { OutputType, SourceType } from './types'

export const SOURCE_TYPES: SourceType[] = ['camera', 'rtspSource', 'rtmpSource', 'srtSource', 'hlsSource']
export const OUTPUT_TYPES: OutputType[] = ['rtspOutput', 'rtmpOutput', 'hlsOutput', 'webrtcOutput', 'srtOutput']

export const OUTPUT_DEFAULT_PORTS: Record<OutputType, number> = {
  rtspOutput: 8554,
  rtmpOutput: 1935,
  hlsOutput: 8888,
  webrtcOutput: 8889,
  srtOutput: 8890,
}

export const OUTPUT_LABELS: Record<OutputType, string> = {
  rtspOutput: 'RTSP Output',
  rtmpOutput: 'RTMP Output',
  hlsOutput: 'HLS Output',
  webrtcOutput: 'WebRTC Output',
  srtOutput: 'SRT Output',
}

const SOURCE_URL_PREFIXES: Partial<Record<SourceType, string[]>> = {
  rtspSource: ['rtsp://', 'rtsps://'],
  rtmpSource: ['rtmp://', 'rtmps://'],
  srtSource: ['srt://'],
  hlsSource: ['http://', 'https://'],
}

function getStringValue(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function getNumberValue(value: unknown): number {
  return typeof value === 'number' ? value : Number(value)
}

export function sanitizePath(path: unknown): string {
  return getStringValue(path).trim().replace(/^\/+|\/+$/g, '')
}

export function isSourceType(type: string | null | undefined): type is SourceType {
  return !!type && SOURCE_TYPES.includes(type as SourceType)
}

export function isOutputType(type: string | null | undefined): type is OutputType {
  return !!type && OUTPUT_TYPES.includes(type as OutputType)
}

export function isValidPipelinePair(
  sourceType: string | null | undefined,
  targetType: string | null | undefined
): boolean {
  return isSourceType(sourceType) && isOutputType(targetType)
}

function validateSourceNode(node: Node): string | null {
  if (node.type === 'camera') {
    return null
  }

  if (!isSourceType(node.type)) {
    return 'This node cannot be used as a source'
  }

  const url = getStringValue((node.data as Record<string, unknown>).url).trim()
  if (!url) {
    return 'A source URL is required'
  }

  const prefixes = SOURCE_URL_PREFIXES[node.type]
  if (prefixes && !prefixes.some((prefix) => url.startsWith(prefix))) {
    return `URL must start with ${prefixes.join(' or ')}`
  }

  return null
}

function validateOutputNode(node: Node): string | null {
  if (!isOutputType(node.type)) {
    return 'This node cannot be used as an output'
  }

  const data = node.data as Record<string, unknown>
  const path = sanitizePath(data.path)
  if (!path) {
    return 'A stream path is required'
  }

  if (/[\s?#]/.test(path)) {
    return 'Path cannot contain spaces, ? or #'
  }

  const port = getNumberValue(data.port)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return 'Port must be between 1 and 65535'
  }

  return null
}

export interface FlowValidationResult {
  pipelineEdges: Edge[]
  nodeErrors: Map<string, string>
}

export function validateFlow(nodes: Node[], edges: Edge[]): FlowValidationResult {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]))
  const nodeErrors = new Map<string, string>()
  const pipelineEdges: Edge[] = []

  for (const edge of edges) {
    const sourceNode = nodeMap.get(edge.source)
    const targetNode = nodeMap.get(edge.target)

    if (!sourceNode || !targetNode) {
      continue
    }

    if (!isValidPipelinePair(sourceNode.type, targetNode.type)) {
      const message = 'Connect a source node to an output node'
      nodeErrors.set(sourceNode.id, message)
      nodeErrors.set(targetNode.id, message)
      continue
    }

    const sourceError = validateSourceNode(sourceNode)
    if (sourceError) {
      nodeErrors.set(sourceNode.id, sourceError)
    }

    const targetError = validateOutputNode(targetNode)
    if (targetError) {
      nodeErrors.set(targetNode.id, targetError)
    }

    if (!sourceError && !targetError) {
      pipelineEdges.push(edge)
    }
  }

  return { pipelineEdges, nodeErrors }
}

export function isValidConnectionBetweenNodes(nodes: Node[], connection: Connection | Edge): boolean {
  if (!connection.source || !connection.target) {
    return false
  }

  const sourceNode = nodes.find((node) => node.id === connection.source)
  const targetNode = nodes.find((node) => node.id === connection.target)

  return isValidPipelinePair(sourceNode?.type, targetNode?.type)
}
