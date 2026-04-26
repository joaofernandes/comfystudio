# ComfyStudio 16GB VRAM Branch

## Quick Start

This branch modifies ComfyStudio Director Mode to work on **16GB VRAM GPUs**.

```bash
git checkout 16gb-vram-optimizations
npm install
npm run electron:build:mac  # or :win / :linux
```

The built app will be in `dist/` directory.

---

## What's Different?

### Storyboard Generation
- **Original:** Google Gemini API (requires API key)
- **This branch:** Local Z-Image Turbo (no API key needed)

### Animation Generation
- **Original:** FP8 models (~27GB VRAM)
- **This branch:** GGUF Q3/Q4 models (~14GB VRAM)

---

## Required Models on ComfyUI

Make sure your ComfyUI has these models installed:

### Storyboard Phase (Z-Image Turbo):
```
/models/unet/Z-Image/z_image_turbo_bf16.safetensors
/models/text_encoders/qwen_3_4b.safetensors
/models/vae/ae.safetensors
```

### Animation Phase (LTX 2.3 GGUF):
```
/models/unet/ltx-2.3-22b-distilled-Q3_K_M.gguf
/models/text_encoders/gemma-3-12b-it-IQ4_XS.gguf
/models/text_encoders/ltx-2.3-distilled-connector.safetensors
/models/vae/ltx-2.3-distilled-video-vae.safetensors
/models/vae/ltx-2.3-distilled-audio-vae.safetensors
/models/audio_checkpoints/MelBandRoFormer/MelBandRoformer_fp16.safetensors
```

---

## Output Resolution

- **Original:** 1280×736
- **This branch:** 768×512 (draft mode)

You can upscale separately using RealESRGAN or regenerate final shots at higher resolution.

---

## Merging Upstream Updates

When the main repo updates:

```bash
# Add upstream if not already added
git remote add upstream https://github.com/JaimeIsMe/comfystudio.git

# Fetch upstream
git fetch upstream

# Merge (may have conflicts in workflow files)
git merge upstream/main

# Resolve conflicts manually in:
# - public/workflows/api_google_nano_banana2_image_edit.json
# - public/workflows/music_video_shot_ltx2_3_i2v_audio.json
```

Use the changes documented in `CHANGES_16GB_VRAM.md` as reference.

---

## Troubleshooting

**"Missing models" error:**
- Verify models are installed in ComfyUI
- Check model paths match exactly
- Restart ComfyUI after installing new models

**"Out of memory" error:**
- Lower resolution further (edit node 1591/1606)
- Increase chunking (edit node 504)
- Close other GPU applications

**Storyboard quality issues:**
- Z-Image Turbo is faster but less refined than Gemini
- Consider using SDXL instead (edit `api_google_nano_banana2_image_edit.json`)
- Or get a free Gemini API key and use original workflow

---

## Contributing

If you improve this branch, please:
1. Update `CHANGES_16GB_VRAM.md`
2. Test on actual 16GB GPU
3. Submit PR to upstream with "16GB VRAM" in title

---

## License

Same as upstream: MIT
