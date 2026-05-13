import comfyui, { modifyRtxVideoUpscaleWorkflow } from './comfyui'
import { BUILTIN_WORKFLOW_PATHS } from '../config/workflowRegistry'
import {
  RTX_VIDEO_UPSCALE_DEFAULTS,
  RTX_VIDEO_UPSCALE_WORKFLOW_ID,
  resolveRtx4kDimensions,
} from '../config/rtxVideoUpscaleConfig'
import { checkWorkflowDependencies } from './workflowDependencies'
import { markPromptHandledByApp } from './comfyPromptGuard'

const VIDEO_EXTENSIONS = new Set(['mp4', 'webm', 'mov', 'mkv', 'avi'])

function basenameFromPath(filePath = '') {
  const parts = String(filePath || '').split(/[\/]/)
  return parts[parts.length - 1] || 'video.mp4'
}

function stripExtension(filename = '') {
  return String(filename || '').replace(/\.[^/.]+$/, '')
}

function extensionOf(filename = '') {
  const parts = String(filename || '').split('.')
  return parts.length > 1 ? parts.pop().toLowerCase() : ''
}

function isVideoFilename(filename = '') {
  return VIDEO_EXTENSIONS.has(extensionOf(filename))
}

function extractOutputInfo(item) {
  if (!item || typeof item !== 'object') return null
  const filename = String(item.filename || '').trim()
  if (!filename || !isVideoFilename(filename)) return null
  return {
    filename,
    subfolder: String(item.subfolder || '').trim(),
    outputType: String(item.type || 'output').trim() || 'output',
  }
}

function findVideoResult(outputs = {}, expectedPrefix = '') {
  const normalizedPrefix = String(expectedPrefix || '').trim().toLowerCase()
  let fallback = null
  for (const nodeOutput of Object.values(outputs || {})) {
    if (!nodeOutput || typeof nodeOutput !== 'object') continue
    for (const items of Object.values(nodeOutput)) {
      if (!Array.isArray(items)) continue
      for (const item of items) {
        const info = extractOutputInfo(item)
        if (!info) continue
        if (normalizedPrefix && info.filename.toLowerCase().includes(normalizedPrefix)) return info
        fallback = fallback || info
      }
    }
  }
  return fallback
}

async function loadWorkflowDefinition(workflowId = RTX_VIDEO_UPSCALE_WORKFLOW_ID) {
  const workflowPath = BUILTIN_WORKFLOW_PATHS[String(workflowId || '').trim()]
  if (!workflowPath) throw new Error(`Unknown workflow "${workflowId}"`)
  const response = await fetch(workflowPath)
  if (!response.ok) throw new Error(`Failed to load workflow file: ${workflowPath} (${response.status})`)
  return response.json()
}

async function fileFromPath(filePath = '') {
  if (!window.electronAPI?.readFileAsBuffer) {
    throw new Error('RTX upscale export requires the desktop app file APIs.')
  }
  const result = await window.electronAPI.readFileAsBuffer(filePath)
  if (!result?.success) throw new Error(result?.error || 'Failed to read exported video for RTX upscale.')
  const filename = basenameFromPath(filePath)
  return new File([result.data], filename, { type: 'video/mp4' })
}

async function pollForRtxVideoResult(promptId, expectedPrefix = '', onStatus = () => {}) {
  const startedAt = Date.now()
  const maxTotalMs = 2 * 60 * 60 * 1000
  const pollIntervalMs = 1000
  while (Date.now() - startedAt < maxTotalMs) {
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
    const elapsed = Date.now() - startedAt
    onStatus({
      status: 'running',
      progress: Math.min(92, 12 + ((elapsed / (20 * 60 * 1000)) * 80)),
      statusMessage: 'Running RTX 4K upscale...',
    })

    const history = await comfyui.getHistory(promptId)
    const promptHistory = history?.[promptId] || history
    const topStatus = promptHistory?.status
    if (topStatus?.status_str === 'error') {
      const messages = Array.isArray(topStatus.messages) ? topStatus.messages : []
      const errorEntry = [...messages].reverse().find((entry) => Array.isArray(entry) && entry[0] === 'execution_error')
      const data = errorEntry?.[1] || {}
      const detail = String(data.exception_message || '').trim()
      throw new Error(detail || `ComfyUI failed at node ${data.node_id || 'unknown'}`)
    }

    const outputs = promptHistory?.outputs
    if (!outputs || typeof outputs !== 'object') continue
    const videoResult = findVideoResult(outputs, expectedPrefix)
    if (videoResult) return videoResult
  }
  throw new Error('Timed out waiting for RTX upscale output.')
}

export async function runRtxVideoUpscale(options = {}) {
  const {
    inputPath = '',
    outputPath = '',
    sourceWidth = 1920,
    sourceHeight = 1080,
    quality = RTX_VIDEO_UPSCALE_DEFAULTS.quality,
    workflowId = RTX_VIDEO_UPSCALE_WORKFLOW_ID,
    skipDependencyCheck = false,
    onStatus = () => {},
  } = options

  if (!inputPath) throw new Error('RTX upscale requires an exported source video path.')
  if (!outputPath) throw new Error('RTX upscale requires a final output path.')
  if (!window.electronAPI?.writeFileFromArrayBuffer) {
    throw new Error('RTX upscale export requires the desktop app file APIs.')
  }

  if (!skipDependencyCheck) {
    onStatus({ status: 'checking', progress: 0, statusMessage: 'Checking RTX upscale dependencies...' })
    const dependencyCheck = await checkWorkflowDependencies(workflowId)
    if (dependencyCheck?.hasBlockingIssues) {
      if ((dependencyCheck.missingNodes || []).length > 0) {
        throw new Error('RTX 4K upscale is missing required ComfyUI nodes. Open Workflow Setup to install RTX upscale support.')
      }
      throw new Error('RTX 4K upscale dependencies are not ready.')
    }
  }

  onStatus({ status: 'uploading', progress: 5, statusMessage: 'Uploading export to ComfyUI...' })
  const uploadFile = await fileFromPath(inputPath)
  const uploadResult = await comfyui.uploadFile(uploadFile)
  const uploadedFilename = uploadResult?.name || uploadFile.name
  const workflowJson = await loadWorkflowDefinition(workflowId)
  const { width, height } = resolveRtx4kDimensions(sourceWidth, sourceHeight)
  const outputToken = `rtx_4k_export_${Date.now()}`
  const modifiedWorkflow = modifyRtxVideoUpscaleWorkflow(workflowJson, {
    inputVideo: uploadedFilename,
    width,
    height,
    quality,
    filenamePrefix: `video/${outputToken}`,
  })

  onStatus({ status: 'queuing', progress: 10, statusMessage: 'Queueing RTX 4K upscale...' })
  const promptId = await comfyui.queuePrompt(modifiedWorkflow)
  if (!promptId) throw new Error('Failed to queue the RTX 4K upscale workflow.')
  markPromptHandledByApp(promptId)

  const result = await pollForRtxVideoResult(promptId, outputToken, onStatus)
  onStatus({ status: 'downloading', progress: 94, statusMessage: 'Downloading RTX upscaled export...' })
  const videoFile = await comfyui.downloadVideo(result.filename, result.subfolder, result.outputType)
  const arrayBuffer = await videoFile.arrayBuffer()
  const writeResult = await window.electronAPI.writeFileFromArrayBuffer(outputPath, arrayBuffer)
  if (!writeResult?.success) throw new Error(writeResult?.error || 'Failed to write RTX upscaled export.')

  return {
    promptId,
    outputPath,
    width,
    height,
    quality,
    sourcePath: inputPath,
    filename: basenameFromPath(outputPath),
    baseName: stripExtension(basenameFromPath(outputPath)),
  }
}
