#!/bin/bash
# Verify that workflows have been correctly updated for 16GB VRAM

echo "🔍 Verifying workflow modifications..."
echo ""

# Check storyboard workflow
if grep -q "Z-Image/z_image_turbo" public/workflows/api_google_nano_banana2_image_edit.json; then
    echo "✅ Storyboard: Z-Image Turbo (local)"
else
    echo "❌ Storyboard: Still using Gemini API!"
    exit 1
fi

# Check animation workflow - UNET
if grep -q "UnetLoaderGGUF" public/workflows/music_video_shot_ltx2_3_i2v_audio.json; then
    echo "✅ Animation: GGUF UNET loader"
else
    echo "❌ Animation: Not using GGUF UNET loader!"
    exit 1
fi

# Check animation workflow - CLIP
if grep -q "DualCLIPLoaderGGUF" public/workflows/music_video_shot_ltx2_3_i2v_audio.json; then
    echo "✅ Animation: GGUF CLIP loader"
else
    echo "❌ Animation: Not using GGUF CLIP loader!"
    exit 1
fi

# Check animation workflow - model path
if grep -q "ltx-2.3-22b-distilled-Q3_K_M.gguf" public/workflows/music_video_shot_ltx2_3_i2v_audio.json; then
    echo "✅ Animation: Q3 GGUF model path"
else
    echo "❌ Animation: Wrong model path!"
    exit 1
fi

# Check animation workflow - resolution
if grep -q '"value": 768' public/workflows/music_video_shot_ltx2_3_i2v_audio.json && \
   grep -q '"value": 512' public/workflows/music_video_shot_ltx2_3_i2v_audio.json; then
    echo "✅ Animation: 768×512 resolution"
else
    echo "❌ Animation: Wrong resolution!"
    exit 1
fi

# Check MelBand path fix
if grep -q "MelBandRoFormer/MelBandRoformer_fp16.safetensors" public/workflows/music_video_shot_ltx2_3_i2v_audio.json; then
    echo "✅ Animation: Correct MelBand path"
else
    echo "❌ Animation: Wrong MelBand path!"
    exit 1
fi

echo ""
echo "✅ All workflow modifications verified!"
echo ""
echo "To verify in built app:"
echo "1. Open built .dmg"
echo "2. Extract app contents:"
echo "   cd /Applications/ComfyStudio.app/Contents/Resources"
echo "   npx asar extract app.asar /tmp/verify-app"
echo "3. Check workflows:"
echo "   grep UnetLoaderGGUF /tmp/verify-app/dist/workflows/music_video_shot_ltx2_3_i2v_audio.json"
