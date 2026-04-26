# Installing ComfyStudio 16GB VRAM Build

## What You Have

Two `.dmg` files in the `release/` directory:
- **ComfyStudio-0.1.11-mac-x64.dmg** (Intel Mac)
- **ComfyStudio-0.1.11-mac-arm64.dmg** (Apple Silicon M1/M2/M3/M4)

## Installation Steps

### 1. Choose the Right Version

**Apple Silicon (M1/M2/M3/M4):**
```bash
open release/ComfyStudio-0.1.11-mac-arm64.dmg
```

**Intel Mac:**
```bash
open release/ComfyStudio-0.1.11-mac-x64.dmg
```

### 2. Install the App

1. Double-click the `.dmg` file
2. Drag `ComfyStudio.app` to your Applications folder
3. Close the installer window
4. Eject the DMG

### 3. First Launch

**Important:** macOS will block unsigned apps. To open:

1. Open **Applications** folder
2. Right-click `ComfyStudio.app`
3. Select **Open**
4. Click **Open** in the security dialog

Or via Terminal:
```bash
xattr -cr /Applications/ComfyStudio.app
open /Applications/ComfyStudio.app
```

### 4. Verify ComfyUI Connection

1. Launch ComfyStudio
2. Go to Settings (gear icon)
3. Verify ComfyUI connection:
   - Host: `127.0.0.1` (if using tunnel)
   - Port: `8188`

### 5. Test Director Mode

1. Create new project → Director Mode → Music Video
2. Upload an MP3 file
3. You should **NOT** see:
   - "Cloud API key needed" error
   - "Missing models" error for LTX 2.3
   
   If you do, check model installation below.

---

## Troubleshooting

### "Missing Models" Error

Make sure your **remote ComfyUI** (192.168.1.157) has these models:

**Check via tunnel:**
```bash
# Verify SSH tunnel is running
lsof -i :8188

# Test connection
curl http://127.0.0.1:8188/system_stats
```

**Required models on remote:**
```
/basedir/models/unet/Z-Image/z_image_turbo_bf16.safetensors
/basedir/models/unet/ltx-2.3-22b-distilled-Q3_K_M.gguf
/basedir/models/text_encoders/qwen_3_4b.safetensors
/basedir/models/text_encoders/gemma-3-12b-it-IQ4_XS.gguf
/basedir/models/text_encoders/ltx-2.3-distilled-connector.safetensors
/basedir/models/vae/ae.safetensors
/basedir/models/vae/ltx-2.3-distilled-video-vae.safetensors
/basedir/models/vae/ltx-2.3-distilled-audio-vae.safetensors
/basedir/models/audio_checkpoints/MelBandRoFormer/MelBandRoformer_fp16.safetensors
```

### "App is Damaged" Error

macOS Gatekeeper blocking:
```bash
xattr -cr /Applications/ComfyStudio.app
sudo spctl --master-disable  # Disable Gatekeeper (not recommended)
# Or sign the app properly
```

### App Won't Open

Check logs:
```bash
# ComfyUI logs
tail -f "/Users/$(whoami)/Library/Application Support/comfystudio/logs/comfyui-$(date +%Y%m%d)-*.log"

# macOS system logs
log show --predicate 'process == "ComfyStudio"' --last 5m
```

---

## Uninstalling

```bash
# Remove app
rm -rf /Applications/ComfyStudio.app

# Remove user data (optional)
rm -rf ~/Library/Application\ Support/comfystudio
rm -rf ~/Library/Caches/comfystudio
```

---

## Upgrading from Official Release

If you have the official ComfyStudio installed:

1. **Backup your projects:**
   ```bash
   cp -r ~/comfystudio ~/comfystudio-backup
   ```

2. **Remove old app:**
   ```bash
   rm -rf /Applications/ComfyStudio.app
   ```

3. **Install this build** (steps above)

4. **Projects are preserved** in `~/comfystudio/`

---

## Reverting to Official Release

```bash
# Remove this build
rm -rf /Applications/ComfyStudio.app

# Download official from:
# https://github.com/JaimeIsMe/comfystudio/releases
```

Your projects in `~/comfystudio/` will work with both versions.

---

## Next Steps

- Read `CHANGES_16GB_VRAM.md` for technical details
- See `README_16GB.md` for model requirements
- Join Discord: https://discord.gg/comfystudio (if available)
- Report issues: https://github.com/JaimeIsMe/comfystudio/issues
