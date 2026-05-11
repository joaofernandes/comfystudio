import { ArrowLeft, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import WorkflowFieldRenderer from './WorkflowFieldRenderer'

export default function WorkflowDetail({
  workflow,
  values,
  actions,
  disabled = false,
  disabledReason = '',
  onBack = null,
}) {
  if (!workflow) {
    return (
      <div className="rounded-2xl border border-dashed border-sf-dark-700 bg-sf-dark-900/60 p-8 text-center text-sm text-sf-text-muted">
        Choose a workflow to configure it.
      </div>
    )
  }

  const previewBadges = [workflow.provider, workflow.badge]
    .map((label) => String(label || '').trim())
    .filter(Boolean)
    .filter((label, index, labels) => labels.findIndex((entry) => entry.toLowerCase() === label.toLowerCase()) === index)
  const previewAssets = Array.isArray(values?.previewAssets) ? values.previewAssets : []
  const previewAssetIndex = Math.max(0, Number(values?.previewAssetIndex) || 0)
  const previewAsset = values?.previewAsset
  const canPreviewAsset = previewAsset?.url && ['video', 'image', 'audio'].includes(previewAsset.type)
  const canCyclePreviewAssets = previewAssets.length > 1 && typeof actions?.onPreviewAssetIndexChange === 'function'
  const coverIsVideo = /\.(mp4|webm|mov)(\?|#|$)/i.test(String(workflow.cover || ''))
  const coverPosition = workflow.coverPosition || 'center'
  const goToPreviewAsset = (nextIndex) => {
    if (!canCyclePreviewAssets) return
    const wrappedIndex = (nextIndex + previewAssets.length) % previewAssets.length
    actions.onPreviewAssetIndexChange(wrappedIndex)
  }

  return (
    <div className="space-y-3">
      {typeof onBack === 'function' && (
        <div className="sticky top-3 z-20">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-lg border border-sf-dark-700 bg-sf-dark-900/95 px-3 py-2 text-xs font-medium text-sf-text-secondary shadow-lg shadow-black/20 backdrop-blur transition-colors hover:border-sf-dark-500 hover:text-sf-text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to workflows
          </button>
        </div>
      )}

    <div className="mx-auto w-full max-w-4xl space-y-4">
      <div className="mx-auto w-full max-w-xl">
        <div className="overflow-hidden rounded-2xl border border-sf-dark-700 bg-sf-dark-900">
          <div className="relative aspect-video bg-sf-dark-800">
            {canPreviewAsset && previewAsset.type === 'video' ? (
              <video
                src={previewAsset.url}
                className="h-full w-full object-contain"
                controls
                playsInline
              />
            ) : canPreviewAsset && previewAsset.type === 'image' ? (
              <img src={previewAsset.url} alt={previewAsset.name || ''} className="h-full w-full object-contain" />
            ) : canPreviewAsset && previewAsset.type === 'audio' ? (
              <div className="flex h-full items-center justify-center p-6">
                <audio src={previewAsset.url} controls className="w-full max-w-md" />
              </div>
            ) : workflow.cover && coverIsVideo ? (
              <video
                src={workflow.cover}
                className="h-full w-full object-cover"
                style={{ objectPosition: coverPosition }}
                autoPlay
                muted
                loop
                playsInline
              />
            ) : workflow.cover ? (
              <img src={workflow.cover} alt="" className="h-full w-full object-cover" style={{ objectPosition: coverPosition }} />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-sf-text-muted">No preview</div>
            )}
            {!canPreviewAsset && (
              <>
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/75" />
                <div className="absolute bottom-3 left-3 right-3">
                  {previewBadges.length > 0 && (
                    <div className="flex items-center gap-2">
                      {previewBadges.map((badge) => (
                        <span key={badge} className="rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
                          {badge}
                        </span>
                      ))}
                    </div>
                  )}
                  <h2 className="mt-2 text-lg font-semibold leading-tight text-white">{workflow.title}</h2>
                  <p className="mt-1 max-w-2xl text-xs text-white/75">{workflow.description}</p>
                </div>
              </>
            )}
            {canCyclePreviewAssets && (
              <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => goToPreviewAsset(previewAssetIndex - 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-black/65 text-white backdrop-blur transition-colors hover:bg-black/85"
                  aria-label="Previous generated image"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="rounded-full bg-black/65 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur">
                  {previewAssetIndex + 1} / {previewAssets.length}
                </div>
                <button
                  type="button"
                  onClick={() => goToPreviewAsset(previewAssetIndex + 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-black/65 text-white backdrop-blur transition-colors hover:bg-black/85"
                  aria-label="Next generated image"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

      <div className="rounded-2xl border border-sf-dark-700 bg-sf-dark-900 p-4">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sf-text-muted">
              Workflow setup
            </div>
            <div className="mt-1 text-sm font-semibold text-sf-text-primary">{workflow.subtitle}</div>
          </div>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            workflow.runnable
              ? 'bg-emerald-400/10 text-emerald-300'
              : 'bg-yellow-400/10 text-yellow-300'
          }`}
          >
            {workflow.runnable ? 'Runnable' : 'Preview only'}
          </span>
        </div>

        <div className="space-y-3">
          {(workflow.fields || []).map((field) => (
            <WorkflowFieldRenderer
              key={field.id}
              field={field}
              workflow={workflow}
              values={values}
              actions={actions}
            />
          ))}
        </div>

        {!workflow.runnable && (
          <div className="mt-4 rounded-lg border border-yellow-400/25 bg-yellow-400/10 p-3 text-xs text-yellow-200">
            This catalog item is in the browser as a candidate. We still need its workflow graph and bindings before it can run.
          </div>
        )}

        {disabledReason && (
          <div className="mt-4 rounded-lg border border-sf-error/30 bg-sf-error/10 p-3 text-xs text-sf-error">
            {disabledReason}
          </div>
        )}

        <button
          type="button"
          onClick={actions.onGenerate}
          disabled={disabled || !workflow.runnable}
          className={`mt-4 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${
            disabled || !workflow.runnable
              ? 'cursor-not-allowed bg-sf-dark-700 text-sf-text-muted'
              : 'bg-sf-accent text-white hover:bg-sf-accent-hover'
          }`}
        >
          <Sparkles className="h-4 w-4" />
          Queue {workflow.outputType === 'audio' ? 'Audio' : workflow.outputType === 'image' ? 'Image' : 'Video'}
        </button>
      </div>
    </div>
    </div>
  )
}
