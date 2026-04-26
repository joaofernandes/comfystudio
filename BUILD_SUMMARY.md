# ComfyStudio 16GB VRAM Build - Summary

**Date:** 2026-04-26
**Branch:** `16gb-vram-optimizations`
**Base Version:** 0.1.11

---

## What Was Done

### 1. Source Code Modifications

**Files Changed:**
- `public/workflows/api_google_nano_banana2_image_edit.json` → Replaced Gemini API with Z-Image Turbo
- `public/workflows/music_video_shot_ltx2_3_i2v_audio.json` → Updated to GGUF models + 16GB settings

**Key Changes:**
- Storyboard: Google Gemini API → Local Z-Image Turbo
- Animation: FP8 models (27GB) → GGUF Q3/Q4 (14GB)
- Resolution: 1280×736 → 768×512
- Chunking: Increased for better memory management

### 2. Git Commits

```
0e04983 docs: add installation guide for built app
e471d4c docs: add 16GB VRAM setup guide
024537e feat: 16GB VRAM optimizations for Director Mode
```

View full diff:
```bash
git diff main..16gb-vram-optimizations
```

### 3. Build Artifacts

**Location:** `release/`

| File | Size | Platform |
|---|---|---|
| ComfyStudio-0.1.11-mac-arm64.dmg | 369 MB | Apple Silicon (M1/M2/M3/M4) |
| ComfyStudio-0.1.11-mac-x64.dmg | 374 MB | Intel Mac |

### 4. Documentation Created

- `CHANGES_16GB_VRAM.md` - Technical changelog
- `README_16GB.md` - Setup guide
- `INSTALL.md` - Installation instructions
- `BUILD_SUMMARY.md` - This file

---

## Testing Checklist

Before using the built app:

- [ ] Install app (see `INSTALL.md`)
- [ ] Verify ComfyUI tunnel is running (`lsof -i :8188`)
- [ ] Check required models are installed (see `README_16GB.md`)
- [ ] Launch app and test connection
- [ ] Create Director Mode music video project
- [ ] Verify NO "missing dependencies" errors
- [ ] Generate storyboard (should use Z-Image locally)
- [ ] Generate animation (should use LTX GGUF)
- [ ] Check VRAM usage stays under 16GB

---

## Merging Future Updates

When upstream releases new features:

```bash
cd /Users/joaopedro.fernandes/git/comfystudio
git fetch origin
git checkout 16gb-vram-optimizations
git merge origin/main

# Fix conflicts in workflow files if any
git add .
git commit -m "merge: upstream updates"

# Rebuild
npm run electron:build:mac
```

**Always review workflow JSON changes** to ensure GGUF settings are preserved.

---

## Sharing This Build

If sharing with others:

1. **Upload `.dmg` files** to a file host
2. **Share documentation:**
   - `INSTALL.md` - How to install
   - `README_16GB.md` - Model requirements
   - `CHANGES_16GB_VRAM.md` - What changed
3. **Include warning:**
   - Not officially signed
   - Requires 16GB VRAM GPU
   - Lower resolution than original (768×512)

---

## Contributing Back to Upstream

To propose this as an official feature:

1. **Clean up branch:**
   ```bash
   git rebase -i main  # Squash commits
   ```

2. **Create PR:**
   - Fork: https://github.com/JaimeIsMe/comfystudio
   - Push branch to your fork
   - Open PR with title: "feat: Add 16GB VRAM support for Director Mode"

3. **PR Description:**
   ```
   ## Problem
   Director Mode requires 24GB+ VRAM, limiting hardware compatibility.
   
   ## Solution
   - Replace Gemini API with local Z-Image Turbo (no API key needed)
   - Use GGUF quantized models (Q3/Q4) instead of FP8
   - Reduce default resolution to 768×512
   - Optimize chunking for memory efficiency
   
   ## Trade-offs
   - Lower resolution (can upscale separately)
   - Different storyboard quality (Z-Image vs Gemini)
   
   ## Testing
   Tested on RTX 5070 Ti (16GB) - VRAM usage stays ~14GB
   ```

4. **Expect feedback:**
   - May request UI toggle between modes
   - May want resolution as user option
   - Code style / linting fixes

---

## Rollback Plan

If issues occur:

```bash
# Remove custom build
rm -rf /Applications/ComfyStudio.app

# Download official release
# https://github.com/JaimeIsMe/comfystudio/releases

# Projects in ~/comfystudio/ are compatible with both
```

---

## Build Environment

```
Node: v22.17.1
npm: 10.x
OS: macOS 15.3 (Darwin 25.3.0)
Electron: 28.3.3
Vite: 5.4.21
```

---

## Notes

- App is **unsigned** (requires Gatekeeper override on first launch)
- Workflows are embedded in `app.asar` (not external files)
- Settings stored in `~/Library/Application Support/comfystudio/`
- Projects stored in `~/comfystudio/`
- Cache stored in `~/Library/Caches/comfystudio/`

---

## Support

For issues with this build:
- Check `INSTALL.md` troubleshooting section
- Review ComfyUI logs in app support folder
- Verify models are correctly installed
- Test with official release to compare

For upstream issues:
- https://github.com/JaimeIsMe/comfystudio/issues
