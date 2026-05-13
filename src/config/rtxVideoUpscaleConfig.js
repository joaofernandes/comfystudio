export const RTX_VIDEO_UPSCALE_WORKFLOW_ID = 'rtx-video-upscale-4k'

export const RTX_VIDEO_UPSCALE_QUALITY_OPTIONS = Object.freeze([
  { id: 'LOW', label: 'Low' },
  { id: 'MEDIUM', label: 'Medium' },
  { id: 'HIGH', label: 'High' },
  { id: 'ULTRA', label: 'Ultra' },
])

export const RTX_VIDEO_UPSCALE_DEFAULTS = Object.freeze({
  quality: 'HIGH',
  longSide: 3840,
})

export function resolveRtx4kDimensions(width = 1920, height = 1080) {
  const sourceWidth = Math.max(2, Number(width) || 1920)
  const sourceHeight = Math.max(2, Number(height) || 1080)
  const longSide = RTX_VIDEO_UPSCALE_DEFAULTS.longSide
  const scale = longSide / Math.max(sourceWidth, sourceHeight)
  const makeEven = (value) => Math.max(2, Math.round(value / 2) * 2)
  return {
    width: makeEven(sourceWidth * scale),
    height: makeEven(sourceHeight * scale),
  }
}
