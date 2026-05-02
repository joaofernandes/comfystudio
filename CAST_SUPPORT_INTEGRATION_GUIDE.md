# ComfyStudio Cast Support Integration - Complete Implementation Guide

## Context

I've successfully configured the remote ComfyUI server (host 99, 192.168.1.99:8188) with IP-Adapter support for cast references. The workflow has been tested and is working. Now we need to integrate it into ComfyStudio's music video generation pipeline.

## What's Already Done ✓

1. **ComfyUI Server** (host 99):
   - ✓ IP-Adapter Plus custom node installed
   - ✓ Models downloaded (809MB + 2.4GB)
   - ✓ Workflow tested and generating correctly
   - ✓ Outputs images with cast reference influence

2. **Workflow JSON**:
   - File: `z_image_turbo_16gb_ipadapter.json`
   - Location: `/Users/joaopedro.fernandes/git/comfyui/z_image_turbo_16gb_ipadapter.json`
   - Status: ✓ Tested, working, ready to deploy

## What Needs to Be Done

Integrate the IP-Adapter workflow into ComfyStudio so that the 16GB music video profile can use cast member reference images during keyframe generation.

## Files to Modify

### 1. Copy Workflow File

**Action**: Copy the workflow JSON to ComfyStudio's workflows directory

```bash
cp /Users/joaopedro.fernandes/git/comfyui/z_image_turbo_16gb_ipadapter.json \
   /Users/joaopedro.fernandes/git/comfystudio/public/workflows/z_image_turbo_16gb_ipadapter.json
```

**Important**: Open the JSON and verify the LoadImage node:
- Should use input key: `"image": "model_placeholder.jpg"`
- This matches ComfyStudio's cast image upload system
- If it says `"test_reference.jpg"`, change it to `"model_placeholder.jpg"`

### 2. Register Workflow in workflowRegistry.js

**File**: `src/config/workflowRegistry.js`

**Find**: Line 43 (after the `z-image-turbo-16gb` entry in BUILTIN_WORKFLOWS)

**Add**: New workflow entry

```javascript
{ id: 'z-image-turbo-16gb-ipadapter', label: 'Text to Image (SDXL + Cast - 16GB)', category: 'image', needsImage: false, description: 'Local SDXL text-to-image with cast reference support via IP-Adapter (16GB VRAM)', file: 'z_image_turbo_16gb_ipadapter.json' },
```

**Find**: Line 67 (after the `z-image-turbo-16gb` path in BUILTIN_WORKFLOW_PATHS)

**Add**: Path mapping

```javascript
'z-image-turbo-16gb-ipadapter': getBundledWorkflowPath('z_image_turbo_16gb_ipadapter.json'),
```

### 3. Update Profile Configuration in generateWorkspaceConfig.js

**File**: `src/config/generateWorkspaceConfig.js`

#### Change A: Update 16GB Profile (line 95-98)

**Find**:
```javascript
'16gb': Object.freeze({
  storyboardWorkflowId: 'z-image-turbo-16gb',  // NO cast support
  videoWorkflowId: 'music-video-shot-ltx23-16gb',
}),
```

**Replace with**:
```javascript
'16gb': Object.freeze({
  storyboardWorkflowId: 'z-image-turbo-16gb-ipadapter',  // NEW: supports cast references
  videoWorkflowId: 'music-video-shot-ltx23-16gb',
}),
```

#### Change B: Add Workflow Hardware Specs (after line 289)

**Find**: The line with `'music-video-shot-ltx23-16gb': {`

**Add after that block**:

```javascript
'z-image-turbo-16gb-ipadapter': {
  tierId: 'standard',
  runtime: 'local',
  minimumVramGb: 14,
  recommendedVramGb: 16,
},
```

#### Change C: Add Display Label (after line 160)

**Find**: The line with `'z-image-turbo-16gb': 'Z Image Turbo (16GB)',`

**Add after it**:

```javascript
'z-image-turbo-16gb-ipadapter': 'SDXL + Cast (16GB)',
```

### 4. Verify Cast Image Input Key

**File**: `/Users/joaopedro.fernandes/git/comfyui/z_image_turbo_16gb_ipadapter.json` (before copying)

**Find**: The LoadImage node (node "3")

**Verify it says**:
```json
"3": {
  "inputs": {
    "image": "model_placeholder.jpg"
  },
  "class_type": "LoadImage",
  "_meta": {
    "title": "Load Reference Image"
  }
}
```

**If it says** `"test_reference.jpg"`, **change to** `"model_placeholder.jpg"` before copying to ComfyStudio.

This is critical because ComfyStudio's cast upload system uses the `model_placeholder.jpg` filename for cast member reference images (same as the cloud nano-banana-2 workflow).

## Build and Deploy

```bash
# Navigate to ComfyStudio directory
cd /Users/joaopedro.fernandes/git/comfystudio

# Build the app
npm run build

# For macOS Electron app - copy to Applications
# (Assuming the build creates a .app bundle)
# If build creates a distributable app, copy it to /Applications/ComfyStudio.app

# Open ComfyStudio
open /Applications/ComfyStudio.app
```

## Testing Checklist

### Test 1: Cast Member Setup

1. Open ComfyStudio Music Video mode
2. Create new project
3. Add cast member:
   - Name: "Test Artist"
   - Slug: `test-artist`
   - Upload reference image (portrait photo of a person)
4. Set as default lead vocalist

### Test 2: Director Script with Cast

Create test script:
```
Shot 1: Opening
Start at: 0:00
Artist: test-artist
Lyric moment: "First line of song"
Shot type: performance
Keyframe prompt: Close-up of artist singing with dramatic lighting, moody atmosphere, cinematic
Motion prompt: Slow push in toward face
Camera: Medium close-up, Low angle
Length: 9
```

### Test 3: Profile Selection & Generation

1. Select **"16GB"** profile in settings
2. Click **"Build Plan"** 
3. **Verify**:
   - ✓ Shot duration shows **9 seconds** (not clamped to 5)
   - ✓ Cast member resolved: shows "test-artist"
   - ✓ No warnings about unresolved Artist
4. Click **"Generate"** for Shot 1
5. **Verify during generation**:
   - ✓ Workflow selected: `z-image-turbo-16gb-ipadapter`
   - ✓ No "workflow not found" error
   - ✓ No "model missing" error from ComfyUI
   - ✓ No "input asset not found" error
6. **Wait** for generation (~5-10 seconds)
7. **Check keyframe result**:
   - ✓ Image shows person resembling reference
   - ✓ Dramatic lighting from prompt applied
   - ✓ Facial features match cast reference
   - ✓ Not a generic/random face

### Test 4: Multi-Cast Shot Sequence

Create script with multiple cast members:
```
Shot 1: Artist A
Start at: 0:00
Artist: artist-a
Keyframe prompt: Close-up singing
Length: 9

Shot 2: Artist B  
Start at: 0:09
Artist: artist-b
Keyframe prompt: Wide shot performance
Length: 12

Shot 3: No Cast (B-roll)
Start at: 0:21
Shot type: b_roll
Keyframe prompt: Abstract stage lights
Length: 5
```

**Verify**:
- Shot 1: Uses artist-a reference image
- Shot 2: Uses artist-b reference image (different person)
- Shot 3: Works without cast reference (pure text-to-image)

### Test 5: Duration Clamping (Regression Test)

Verify the previous bug fix still works:

```
Shot 1:
Length: 15

Shot 2:
Length: 12

Shot 3:
Length: 9
```

**Verify all durations** are respected (not clamped to 5 seconds).

## Expected Behavior

### When Cast is Present

1. Shot has `Artist: jose` field
2. ComfyStudio resolves "jose" → finds cast member in roster
3. System uploads cast member's reference image to ComfyUI as `model_placeholder.jpg`
4. Workflow's LoadImage node (node 3) receives the image
5. IPAdapterAdvanced node (node 8) conditions the SDXL model on the reference
6. Generated keyframe:
   - Resembles the reference person's facial features
   - Applies prompt styling (lighting, composition, mood)
   - Maintains visual consistency across shots with same artist

### When Cast is Missing

- Shot has no `Artist:` field, or `Artist: all`, or unresolved artist name
- Workflow should run with empty/default reference image
- May generate generic person or fail gracefully
- **Note**: Current workflow may need adjustment to handle this case

## Troubleshooting

### Error: "Workflow not found: z-image-turbo-16gb-ipadapter"

**Cause**: Workflow not registered properly

**Fix**:
1. Verify file exists: `public/workflows/z_image_turbo_16gb_ipadapter.json`
2. Check `workflowRegistry.js` has the workflow entry in BUILTIN_WORKFLOWS
3. Check `workflowRegistry.js` has the path in BUILTIN_WORKFLOW_PATHS
4. Rebuild: `npm run build`
5. Restart ComfyStudio

### Error: "Input asset not found: model_placeholder.jpg"

**Cause**: Cast image not uploaded to ComfyUI before workflow execution

**Diagnosis**:
- ComfyStudio should upload the cast member's image as `model_placeholder.jpg` before queuing
- This logic exists for nano-banana-2 workflow, may need to be extended for this workflow

**Fix**: Check GenerateWorkspace.jsx around line 4200-4300 for cast image upload logic

### Error: "IPAdapter model not found" (from ComfyUI)

**Cause**: IP-Adapter models missing on ComfyUI server

**Check on server**:
```bash
ssh bogos@192.168.1.99
docker exec comfyui-nvidia ls /basedir/models/ipadapter/
# Should show: ip-adapter-plus_sdxl_vit-h.safetensors
```

**Fix**: Re-run IP-Adapter setup on ComfyUI server (models should already be there)

### Generated image completely ignores reference

**Possible causes**:
1. **IP-Adapter weight too low** - Check node 8 in workflow JSON, `"weight"` should be 0.7-0.9
2. **Wrong image uploaded** - Verify the reference image is actually uploaded
3. **Reference very different from SDXL training data** - Extreme angles, non-human, etc.

**Fix**: 
- Try increasing `"weight"` in node 8 to 0.9 or 1.0
- Use clearer reference image (frontal face, good lighting)
- Check ComfyUI's /history API to see what inputs were received

### Error: "Size mismatch for proj.weight" (from ComfyUI)

**Cause**: Wrong IP-Adapter model for SDXL

**Fix**: Must use `ip-adapter-plus_sdxl_vit-h.safetensors` (with "vit-h" suffix)
- NOT `ip-adapter_sdxl.safetensors` (without "vit-h")
- This should already be correct from the setup

### Workflow runs but takes 30+ seconds

**Cause**: Models not cached in VRAM

**Expected behavior**:
- First generation: ~15 seconds (loading models)
- Subsequent: ~5-8 seconds (models cached)

**If always slow**: Check VRAM usage on server, may need to free memory

## Performance Notes

- **VRAM usage**: ~14-15GB peak (comfortable on 16GB card)
- **Generation time**: 
  - First run: ~15 seconds (model loading)
  - Cached: ~5-8 seconds per keyframe
- **Compared to text-only**: +2-3 seconds overhead for IP-Adapter

## Advanced Configuration

### Exposing IP-Adapter Strength

If you want users to control reference influence:

**In workflow JSON** (node 8):
```json
"weight": 0.75  // Current default
```

**Weight guide**:
- `0.3-0.5`: Subtle influence, prompt dominates
- `0.6-0.8`: Balanced (recommended for music videos)
- `0.9-1.2`: Strong reference, less variation

**To expose as UI setting**:
1. Add slider in GenerateWorkspace.jsx: "Cast Reference Strength"
2. Modify workflow JSON before submission with user's value
3. Range: 0.3 to 1.0, default 0.75

### Face-Specific IP-Adapter (Optional Enhancement)

For portrait-heavy music videos, use face-focused model:

**Download on server**:
```bash
ssh bogos@192.168.1.99
docker exec -u root comfyui-nvidia bash -c "
cd /basedir/models/ipadapter
curl -L -o ip-adapter-plus-face_sdxl_vit-h.safetensors \
  https://huggingface.co/h94/IP-Adapter/resolve/main/sdxl_models/ip-adapter-plus-face_sdxl_vit-h.safetensors
chown ubuntu:ubuntu ip-adapter-plus-face_sdxl_vit-h.safetensors
"
```

**In workflow JSON** (node 7), change:
```json
"ipadapter_file": "ip-adapter-plus-face_sdxl_vit-h.safetensors"
```

**Benefits**: Better facial consistency, especially for close-up performance shots

## Known Limitations

1. **Single cast member per shot**: Current workflow supports one reference image
   - For multi-cast shots (`Artist: jose, amelia`), uses first cast member only
   - Could be extended with second IPAdapter node for dual references

2. **B-roll/no-cast handling**: Workflow expects a reference image
   - May need conditional logic to skip IP-Adapter when no cast
   - Or upload a neutral/blank reference

3. **Non-human subjects**: IP-Adapter trained on human faces
   - Works best with human cast members
   - May not work well for animated/cartoon characters

## Success Criteria

✅ 16GB profile generates keyframes with cast member references
✅ Visual consistency across multiple shots of same cast member  
✅ Shot durations respect script values (not clamped to 5s)
✅ No "workflow not found" errors
✅ No "model missing" errors from ComfyUI
✅ Generation time: 5-10 seconds per keyframe (after warmup)
✅ Generated faces match cast reference photos

## Files Summary

**Already created**:
1. `/Users/joaopedro.fernandes/git/comfyui/z_image_turbo_16gb_ipadapter.json` - Tested workflow
2. `/Users/joaopedro.fernandes/git/comfyui/IPADAPTER_SETUP_COMPLETE.md` - Server setup log
3. This file - Integration guide

**Need to modify**:
1. `public/workflows/z_image_turbo_16gb_ipadapter.json` - Copy workflow here
2. `src/config/workflowRegistry.js` - Add 2 lines (workflow entry + path)
3. `src/config/generateWorkspaceConfig.js` - Add 3 blocks (profile update, hardware, label)

**Total code changes**: ~10 lines across 3 files

## Step-by-Step Implementation

1. ✅ **Verify workflow JSON** has `model_placeholder.jpg` as LoadImage input
2. ✅ **Copy workflow** to `public/workflows/`
3. ✅ **Edit workflowRegistry.js** - add workflow entry and path
4. ✅ **Edit generateWorkspaceConfig.js** - update profile, add hardware specs and label
5. ✅ **Build**: `npm run build`
6. ✅ **Deploy**: Install/copy to `/Applications/ComfyStudio.app`
7. ✅ **Test**: Follow testing checklist above
8. ✅ **Verify**: Cast references work, durations not clamped

## Related Documentation

- `CAST_SUPPORT_NEXT_STEPS.md` - Original problem analysis
- `CAST_SUPPORT_CHANGES.md` - Duration clamping fix
- `BUG_REPORT_MUSIC_VIDEO_DURATION_CLAMPING.md` - Bug report for upstream
- `IMPLEMENTATION_PLAN_16GB.md` - 16GB optimization context

## Status

- ✅ **ComfyUI server**: Configured and tested
- ⏳ **ComfyStudio integration**: In progress (this guide)
- ⏳ **Testing**: Pending integration completion
- ⏳ **Documentation**: Update user guide after testing

## Estimated Time

- **Code changes**: 15 minutes
- **Build + deploy**: 5 minutes
- **Testing**: 20 minutes
- **Total**: ~40 minutes

---

**Current Status**: Ready for integration. Follow steps 1-8 above.

**Next Action**: Copy workflow JSON and make the 3 code file changes listed.
