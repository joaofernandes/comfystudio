# ComfyStudio 16GB VRAM Optimizations

Branch: `16gb-vram-optimizations`

## Overview

Modified ComfyStudio Director Mode workflows to run on 16GB VRAM GPUs using GGUF quantized models instead of FP8/BF16 models.

## Changes Made

### 1. Storyboard Generation (`api_google_nano_banana2_image_edit.json`)

**Before:** Used Google Gemini API (Nano Banana 2) - requires cloud API key

**After:** Uses local Z-Image Turbo generation

**Models required:**
- `Z-Image/z_image_turbo_bf16.safetensors` (UNET)
- `qwen_3_4b.safetensors` (CLIP)
- `ae.safetensors` (VAE)

**Benefits:**
- No cloud API key needed
- Runs 100% locally
- Fast generation (4 steps)
- ~8GB VRAM usage

---

### 2. Music Video Animation (`music_video_shot_ltx2_3_i2v_audio.json`)

**Changes:**

| Component | Before | After | VRAM Saved |
|---|---|---|---|
| **UNET Loader** | `UNETLoader` with FP8 model | `UnetLoaderGGUF` with Q3 GGUF | ~2GB |
| **CLIP Loader** | `DualCLIPLoader` with FP8 Gemma | `DualCLIPLoaderGGUF` with Q4 GGUF | ~2GB |
| **Video VAE** | `LTX23_video_vae_bf16.safetensors` | `ltx-2.3-distilled-video-vae.safetensors` | 0GB |
| **Audio VAE** | `LTX23_audio_vae_bf16.safetensors` | `ltx-2.3-distilled-audio-vae.safetensors` | 0GB |
| **MelBand** | `MelBandRoformer_fp16.safetensors` | `MelBandRoFormer/MelBandRoformer_fp16.safetensors` | 0GB (path fix) |
| **Resolution** | 1280×736 | 768×512 | ~3GB |
| **Chunking** | chunks=2, threshold=4096 | chunks=4, threshold=2048 | ~2GB |

**Total VRAM: ~27GB → ~14GB** ✅

**Models required:**
- `ltx-2.3-22b-distilled-Q3_K_M.gguf` (UNET)
- `gemma-3-12b-it-IQ4_XS.gguf` (CLIP text encoder)
- `ltx-2.3-distilled-connector.safetensors` (LTX connector)
- `ltx-2.3-distilled-video-vae.safetensors` (Video VAE)
- `ltx-2.3-distilled-audio-vae.safetensors` (Audio VAE)
- `MelBandRoFormer/MelBandRoformer_fp16.safetensors` (Audio separation)

---

## Build Instructions

```bash
# Clone and build
git clone https://github.com/JaimeIsMe/comfystudio.git
cd comfystudio
git checkout 16gb-vram-optimizations

# Install dependencies
npm install

# Build app (macOS example)
npm run build:mac

# Or run dev mode
npm run dev
```

---

## Testing

1. Start your ComfyUI instance with GGUF models installed
2. Launch ComfyStudio
3. Create a new Director Mode music video project
4. Verify no "missing dependencies" errors
5. Generate storyboard (should use Z-Image Turbo locally)
6. Generate animation (should use LTX 2.3 GGUF)

---

## Reverting Changes

To restore original workflows:

```bash
git checkout main public/workflows/
```

Or use the backup:

```bash
cp public/workflows/music_video_shot_ltx2_3_i2v_audio.json.backup \
   public/workflows/music_video_shot_ltx2_3_i2v_audio.json
```

---

## Trade-offs

**Pros:**
- ✅ Fits in 16GB VRAM
- ✅ 100% local (no API keys needed)
- ✅ Faster inference with GGUF

**Cons:**
- ⚠️ Lower resolution output (768×512 vs 1280×736)
- ⚠️ Storyboard quality may differ from Gemini API
- ⚠️ Can upscale separately if needed

---

## Future Improvements

- [ ] Add resolution selector in UI (draft vs final)
- [ ] Support multiple storyboard backends (Z-Image / SDXL / Gemini API)
- [ ] Auto-detect VRAM and adjust settings
- [ ] Add post-generation upscaling workflow

---

## Questions?

See: https://github.com/JaimeIsMe/comfystudio/issues
