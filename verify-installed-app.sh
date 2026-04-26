#!/bin/bash
# Verify installed ComfyStudio.app has correct workflows

echo "🔍 Verifying installed ComfyStudio.app workflows..."
echo ""

if [ ! -d "/Applications/ComfyStudio.app" ]; then
    echo "❌ ComfyStudio.app not found in /Applications"
    echo "Please drag it from the DMG first."
    exit 1
fi

# Extract asar temporarily
TMP_DIR="/tmp/comfystudio-verify-$$"
echo "📦 Extracting app.asar..."
npx asar extract /Applications/ComfyStudio.app/Contents/Resources/app.asar "$TMP_DIR" 2>/dev/null

if [ ! -d "$TMP_DIR" ]; then
    echo "❌ Failed to extract app.asar"
    exit 1
fi

# Check storyboard workflow
echo ""
echo "Checking storyboard workflow..."
if grep -q "Z-Image/z_image_turbo" "$TMP_DIR/dist/workflows/api_google_nano_banana2_image_edit.json" 2>/dev/null; then
    echo "✅ Storyboard: Z-Image Turbo (local generation)"
else
    echo "❌ Storyboard: Still has Gemini API!"
    rm -rf "$TMP_DIR"
    exit 1
fi

# Check animation workflow
echo ""
echo "Checking animation workflow..."
if grep -q "UnetLoaderGGUF" "$TMP_DIR/dist/workflows/music_video_shot_ltx2_3_i2v_audio.json" 2>/dev/null; then
    echo "✅ Animation: GGUF UNET loader"
else
    echo "❌ Animation: Not using GGUF!"
    rm -rf "$TMP_DIR"
    exit 1
fi

if grep -q "ltx-2.3-22b-distilled-Q3_K_M.gguf" "$TMP_DIR/dist/workflows/music_video_shot_ltx2_3_i2v_audio.json" 2>/dev/null; then
    echo "✅ Animation: Q3 GGUF model"
else
    echo "❌ Animation: Wrong model!"
    rm -rf "$TMP_DIR"
    exit 1
fi

if grep -q "DualCLIPLoaderGGUF" "$TMP_DIR/dist/workflows/music_video_shot_ltx2_3_i2v_audio.json" 2>/dev/null; then
    echo "✅ Animation: GGUF CLIP loader"
else
    echo "❌ Animation: Wrong CLIP loader!"
    rm -rf "$TMP_DIR"
    exit 1
fi

if grep -q '"value": 768' "$TMP_DIR/dist/workflows/music_video_shot_ltx2_3_i2v_audio.json" 2>/dev/null && \
   grep -q '"value": 512' "$TMP_DIR/dist/workflows/music_video_shot_ltx2_3_i2v_audio.json" 2>/dev/null; then
    echo "✅ Animation: 768×512 resolution"
else
    echo "❌ Animation: Wrong resolution!"
    rm -rf "$TMP_DIR"
    exit 1
fi

# Cleanup
rm -rf "$TMP_DIR"

echo ""
echo "✅ All workflows correctly embedded in installed app!"
echo ""
echo "Next steps:"
echo "1. Override macOS security: xattr -cr /Applications/ComfyStudio.app"
echo "2. Launch ComfyStudio"
echo "3. Create Director Mode → Music Video project"
echo "4. Should NOT show 'nano-banana-2' or 'missing models' errors"
