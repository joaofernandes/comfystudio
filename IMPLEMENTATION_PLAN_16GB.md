# Implementation Plan: 16GB VRAM as Selectable Option

## Current Status

✅ **Workflows Created:**
- `z_image_turbo_16gb.json` - Local Z-Image Turbo (replaces nano-banana-2)
- `music_video_shot_ltx2_3_i2v_audio_16gb.json` - GGUF optimized animation

✅ **Originals Restored:**
- `api_google_nano_banana2_image_edit.json` - Original Gemini API
- `music_video_shot_ltx2_3_i2v_audio.json` - Original FP8 models

## What Needs to be Done

### 1. Register New Workflows in `workflowRegistry.js`

Add two new entries:

```javascript
// Storyboard - 16GB option
{ 
  id: 'z-image-turbo-16gb', 
  label: 'Text to Image (Z-Image Turbo - 16GB VRAM)', 
  category: 'image', 
  needsImage: false, 
  description: 'Local generation for 16GB VRAM GPUs',
  file: 'z_image_turbo_16gb.json',
  vramReq: '16GB'
},

// Animation - 16GB option
{
  id: 'music-video-shot-ltx23-16gb',
  label: 'Music Video Shot (LTX 2.3 GGUF - 16GB VRAM)',
  category: 'video',
  needsImage: true,
  description: 'Optimized for 16GB VRAM using GGUF models',
  file: 'music_video_shot_ltx2_3_i2v_audio_16gb.json',
  vramReq: '16GB'
}
```

### 2. Add Dependency Packs in `workflowDependencyPacks.js`

```javascript
'z-image-turbo-16gb': Object.freeze({
  id: 'z-image-turbo-16gb',
  displayName: 'Z-Image Turbo (16GB VRAM)',
  requiredNodes: Object.freeze([
    { classType: 'CLIPLoader' },
    { classType: 'VAELoader' },
    { classType: 'UNETLoader' },
    { classType: 'ModelSamplingAuraFlow' },
    { classType: 'KSampler' },
    { classType: 'SaveImage' },
  ]),
  requiredModels: Object.freeze([
    {
      classType: 'UNETLoader',
      inputKey: 'unet_name',
      filename: 'Z-Image/z_image_turbo_bf16.safetensors',
      targetSubdir: 'unet',
    },
    {
      classType: 'CLIPLoader',
      inputKey: 'clip_name',
      filename: 'qwen_3_4b.safetensors',
      targetSubdir: 'text_encoders',
    },
    {
      classType: 'VAELoader',
      inputKey: 'vae_name',
      filename: 'ae.safetensors',
      targetSubdir: 'vae',
    },
  ]),
  requiresComfyOrgApiKey: false,
}),

'music-video-shot-ltx23-16gb': Object.freeze({
  id: 'music-video-shot-ltx23-16gb',
  displayName: 'Music Video Shot (LTX 2.3 GGUF - 16GB)',
  requiredNodes: Object.freeze([
    { classType: 'UnetLoaderGGUF' },
    { classType: 'DualCLIPLoaderGGUF' },
    // ... rest of nodes
  ]),
  requiredModels: Object.freeze([
    {
      classType: 'UnetLoaderGGUF',
      inputKey: 'unet_name',
      filename: 'ltx-2.3-22b-distilled-Q3_K_M.gguf',
      targetSubdir: 'unet',
    },
    // ... rest of models
  ]),
}),
```

### 3. Update Director Mode Config in `generateWorkspaceConfig.js`

Add VRAM mode selector:

```javascript
musicVideo: {
  // ... existing config
  vramModes: [
    {
      id: 'standard',
      label: 'Standard (24GB+ VRAM)',
      storyboardWorkflowId: 'nano-banana-2',
      animationWorkflowId: MUSIC_VIDEO_SHOT_WORKFLOW_ID,
    },
    {
      id: '16gb',
      label: 'Low VRAM (16GB)',
      storyboardWorkflowId: 'z-image-turbo-16gb',
      animationWorkflowId: 'music-video-shot-ltx23-16gb',
    },
  ],
}
```

### 4. UI Changes

**Add VRAM selector to Setup step** (`src/components/GenerateWorkspace.jsx`):

```javascript
<div className="vram-mode-selector">
  <label>VRAM Mode:</label>
  <select value={vramMode} onChange={e => setVramMode(e.target.value)}>
    <option value="standard">Standard (24GB+ VRAM)</option>
    <option value="16gb">Low VRAM (16GB) - Local Generation</option>
  </select>
</div>
```

### 5. Build & Test

```bash
# Rebuild
npm run electron:build:mac

# Test both modes
# 1. Standard mode should use nano-banana-2 + FP8 models
# 2. 16GB mode should use z-image-turbo + GGUF models
```

## Benefits of This Approach

✅ **Non-breaking** - Existing users can continue using standard mode
✅ **Discoverable** - 16GB option visible in UI dropdown
✅ **Maintainable** - Clear separation between standard and optimized workflows
✅ **Mergeable** - Can be contributed back to upstream as a feature
✅ **Future-proof** - Easy to add more VRAM modes (32GB, 8GB, etc.)

## Files to Modify

1. `src/config/workflowRegistry.js` - Register new workflows
2. `src/config/workflowDependencyPacks.js` - Add dependency checks
3. `src/config/generateWorkspaceConfig.js` - Add VRAM mode config
4. `src/components/GenerateWorkspace.jsx` - Add UI selector
5. `src/stores/generateWorkspaceStore.js` - Store VRAM mode preference

## Alternative: Quick Hack (Not Recommended)

Just swap the workflow IDs in config to point to 16GB versions:
- Change `nano-banana-2` file to `z_image_turbo_16gb.json`
- Change `MUSIC_VIDEO_SHOT_WORKFLOW_ID` file to `music_video_shot_ltx2_3_i2v_audio_16gb.json`

**But this breaks for users with 24GB+ VRAM who want the original workflows.**

## Recommendation

Implement the full UI-selectable approach. It's more work now but:
- Better UX
- Contribut able to upstream
- Supports all users

Estimated time: 2-3 hours for full implementation + testing.

## Next Steps

Do you want to:
A) Continue with full UI implementation
B) Use quick hack for personal use only
C) Stop here and document for future work
