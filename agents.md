# ComfyStudio Export Debug Notes (dev)

## Current State (2026-05-14)
- Branch: `dev` (dirty; do not revert unrelated changes).
- Installed test target: `/home/bogos/Applications/ComfyStudio-0.1.14-linux-x86_64.AppImage`.
- Project under test: `/home/bogos/Documents/comfystudio/maodeferro`.

## What "Good" Looks Like For Normal Video Export
- Log shows system FFmpeg selection:
  - `[Export] Using NVENC-capable FFmpeg from system: /usr/bin/ffmpeg`
- Log shows fast pipe started:
  - `[Export] Frame pipe started with hevc_nvenc (NVENC)` (or another selected codec)
- Export worker uses reduced asset payload:
  - `[ExportWorker] Resolved assets 62 / 62` (project-specific value; should be close to actively referenced assets, not full library)
- `ffmpeg` process is active while rendering is in progress (not only after render finishes).
- Export folder does **not** accumulate `frames/frame_*.png` for normal pipe export.

## Latest Live Verification Snapshot
Observed during active export (`export_1778768628634`):
- `frame_*.png` count in export `frames` folder: `0`
- Export folder size while running: `14M`
- Active ffmpeg command:
  - `/usr/bin/ffmpeg ... -f rawvideo ... -c:v hevc_nvenc ... /video_only.mp4`
- Worker logs include:
  - `Resolved assets 62 / 62`
  - `Starting fast FFmpeg pipe...`
  - `Frame pipe started with hevc_nvenc (NVENC)`

Interpretation:
- This confirms pipe mode + NVENC are engaged, and fallback PNG sequence path is not being used.
- A render rate around `~5.5 FPS` can still be expected on heavy timelines because Chromium decode/seek/composite can be the bottleneck, not encoder throughput.

## Primary Bottleneck Hypothesis
Even with NVENC enabled, export speed can remain limited by hidden Chromium renderer work:
- media decode/seeking,
- canvas compositing,
- frame readback (`getImageData` warning observed),
- per-frame JS/render pipeline overhead.

In that case, NVENC reduces encode cost but cannot fully remove render-side bottlenecks.

## Triage Commands
From repo root:

```bash
cd /var/home/bogos/git/comfystudio
```

Check most recent export folder + PNG growth:

```bash
latest=$(ls -td /home/bogos/Documents/comfystudio/maodeferro/renders/export_* 2>/dev/null | head -1)
date +%H:%M:%S
echo "$latest"
find "$latest/frames" -maxdepth 1 -name "frame_*.png" 2>/dev/null | wc -l
du -sh "$latest" 2>/dev/null
```

Monitor export/ffmpeg processes:

```bash
ps -eo pid,ppid,stat,pcpu,pmem,rss,etime,comm,args | grep -E "comfystudio|ComfyStudio|ffmpeg|ffprobe" | grep -v grep
```

Recent export logs:

```bash
journalctl --user --since "10 minutes ago" --no-pager \
  | grep -Ei "ExportWorker|ExportPanel|Export\\]|ffmpeg|complete|failed|error|Progress|Resolved assets|Frame pipe|closed|crash|oom|killed" \
  | tail -240
```

## Red Flags (Need Investigation)
- Log says `Fast FFmpeg pipe unavailable`.
- Log says `Failed to write frame to FFmpeg pipe`.
- `frame_*.png` count climbs rapidly during normal export.
- No active `ffmpeg` process during render phase.
- Worker close/crash/unresponsive/no-progress watchdog logs.

## Practical Guidance On FPS
- `~5.5 FPS` is acceptable **if** the good-path signals above are present.
- Treat it as not-good when:
  - FPS trends downward continuously,
  - memory climbs without leveling,
  - exporter falls back to PNG path,
  - or progress stalls for long windows.
