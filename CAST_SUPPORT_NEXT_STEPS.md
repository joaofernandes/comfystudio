# Cast Support for 16GB Music Video Profile - Implementation Guide

## Context

ComfyStudio is an Electron app for ComfyUI-based video generation. The Music Video Director Mode allows users to create scripted music videos with cast members (artists/band members). Cast members are referenced in director scripts via `Artist: slug-name` fields and matched to reference images from a Cast Roster.

## Problem Statement

**SOLVED:** Shot duration clamping issue - shots were being limited to 5 seconds instead of respecting script values (9s, 12s, etc.)

**CURRENT ISSUE:** The 16GB VRAM profile for music videos doesn't support cast member references. When a director script contains `Artist: jose` or `Artist: amelia`, the generated keyframes ignore these references and create generic visuals instead of using the cast member's reference image.

## Technical Architecture

### ComfyUI Setup
- **Location:** Remote server on host 99 (accessed via tunnel)
- **Not local:** ComfyUI runs on a separate machine, not the user's dev environment
- **ComfyStudio:** Electron app that communicates with the remote ComfyUI server

### Music Video Pipeline
1. **Director Script** → contains shots with fields: `Start at:`, `Lyric moment:`, `Artist:`, `Keyframe prompt:`, `Motion prompt:`, `Camera:`, `Length:`
2. **Cast Roster** → maps slugs (e.g., "jose", "amelia") to image asset references
3. **Plan Building** → parses script, resolves Artist fields to cast member images
4. **Keyframe Generation (Storyboard Pass)** → uses image workflow to create still frames
5. **Video Generation** → animates keyframes with audio conditioning (LTX 2.3 + audio)

### Workflow Profiles

Current 16GB profile configuration (file: `src/config/generateWorkspaceConfig.js`, lines 95-98):

```javascript
'16gb': Object.freeze({
  storyboardWorkflowId: 'z-image-turbo-16gb',  // NO cast support
  videoWorkflowId: 'music-video-shot-ltx23-16gb',
}),
```

**Why z-image-turbo-16gb doesn't work:**
- It's a pure text-to-image workflow (no reference image inputs)
- Workflow file: `public/workflows/z_image_turbo_16gb.json`
- No LoadImage nodes for cast references
- No IP-Adapter or similar conditioning

**Why image-edit-model-product doesn't work:**
- It's an IMAGE EDIT workflow (requires input image to edit)
- Workflow file: `public/workflows/image_qwen_image_edit_2509_Model_and_Product.json`
- Error when used: "input asset not found" (expects an image to edit, not text-to-image)

**What DOES work (but is cloud-based):**
- `nano-banana-2` (balanced/premium profiles) - cloud API workflow
- Workflow file: `public/workflows/api_google_nano_banana2_image_edit.json`
- Has two LoadImage nodes: `model_placeholder.jpg` (node 16) and `product_placeholder.jpg` (node 24)
- Passes reference images to GeminiNanoBanana2 API node via `images` input
- This is how cast references should work in a local workflow

### How Cast References Work

From the code (`src/components/GenerateWorkspace.jsx`):

1. **Script parsing** (line 741): Per-shot `Artist: name` field is parsed
2. **Cast resolution** (lines 747-764): Artist name is matched against Cast Roster slugs
3. **Reference image lookup**: Matched cast member's image asset is retrieved
4. **Workflow inputs**: Reference image should be passed to workflow as model/product reference

The workflow receives:
- Text prompt (keyframe prompt + shot type + style)
- Reference image(s) from cast member(s)
- The model should blend the prompt with visual reference conditioning

## Solution Needed

### Option 1: Add IP-Adapter to Remote ComfyUI (RECOMMENDED)

**On ComfyUI server (host 99):**

1. Access ComfyUI Manager interface
2. Install IP-Adapter custom nodes:
   - Search for "IPAdapter" or "IP-Adapter Plus"
   - Install the IPAdapter custom node pack
3. Download IP-Adapter models:
   - IP-Adapter models for Flux or SDXL (depending on base model)
   - Place in `ComfyUI/models/ipadapter/` directory
4. Create new workflow: `z-image-turbo-16gb-with-ipadapter.json`
   - Base: Copy from `z_image_turbo_16gb.json`
   - Add: LoadImage node for cast reference (input key: `model_placeholder.jpg`)
   - Add: IPAdapterApply node to condition the model on reference image
   - Add: Optional second LoadImage for multi-cast shots (`product_placeholder.jpg`)
   - Connect: reference images → IPAdapter → main generation pipeline
5. Test workflow in ComfyUI interface with sample reference image
6. Export workflow JSON

**In ComfyStudio code:**

1. Add new workflow to registry (`src/config/workflowRegistry.js`):
```javascript
{ 
  id: 'z-image-turbo-16gb-ipadapter', 
  label: 'Text to Image (Z Image Turbo 16GB + Cast)', 
  category: 'image', 
  needsImage: false, 
  description: 'Local text-to-image with cast reference support (16GB VRAM)', 
  file: 'z_image_turbo_16gb_ipadapter.json' 
}
```

2. Add to BUILTIN_WORKFLOW_PATHS:
```javascript
'z-image-turbo-16gb-ipadapter': getBundledWorkflowPath('z_image_turbo_16gb_ipadapter.json'),
```

3. Update 16GB profile (`src/config/generateWorkspaceConfig.js`, line 96):
```javascript
'16gb': Object.freeze({
  storyboardWorkflowId: 'z-image-turbo-16gb-ipadapter',  // NEW: supports cast
  videoWorkflowId: 'music-video-shot-ltx23-16gb',
}),
```

4. Add workflow hardware info (`src/config/generateWorkspaceConfig.js`, after line 289):
```javascript
'z-image-turbo-16gb-ipadapter': {
  tierId: 'standard',
  runtime: 'local',
  minimumVramGb: 14,
  recommendedVramGb: 16,
},
```

5. Add display label (`src/config/generateWorkspaceConfig.js`, after line 160):
```javascript
'z-image-turbo-16gb-ipadapter': 'Z Image Turbo + Cast (16GB)',
```

6. Copy workflow JSON to: `public/workflows/z_image_turbo_16gb_ipadapter.json`

7. Rebuild: `npm run build`

8. Reinstall app to `/Applications/ComfyStudio.app`

### Option 2: Conditional Profile Switching

Modify the 16GB profile logic to automatically use cloud workflow when cast is present:

**In GenerateWorkspace.jsx**, around line 3856 where storyboard workflow is selected:

```javascript
// For 16GB profile with cast members, fall back to nano-banana-2
if (profile === '16gb' && shotHasCastMembers(shot)) {
  storyboardWorkflowId = 'nano-banana-2'  // Cloud fallback for cast
} else {
  storyboardWorkflowId = profileConfig.storyboardWorkflowId
}
```

This is a HYBRID approach: local z-image-turbo-16gb for non-cast shots, cloud nano-banana-2 for cast shots.

**Pros:** No ComfyUI changes needed, works immediately
**Cons:** Requires cloud credits for cast shots, inconsistent runtime

### Option 3: Use Balanced Profile (Workaround)

Tell user to use "balanced" profile instead of "16gb":
- Uses nano-banana-2 for storyboard (cloud, supports cast)
- Uses music-video-shot-ltx23 for video (local, audio-conditioned)
- Requires 24GB VRAM for video pass, but cast works

## Key Files Reference

### Configuration
- `src/config/generateWorkspaceConfig.js` - Profile definitions, workflow hardware specs
- `src/config/workflowRegistry.js` - Workflow registration and metadata
- `src/config/musicVideoShotConfig.js` - Music video defaults and shot parsing

### Core Logic
- `src/components/GenerateWorkspace.jsx`:
  - Line 572-850: Music video plan building (script parsing, cast resolution)
  - Line 741-764: Artist field resolution and validation
  - Line 3856: Workflow selection for keyframe generation
  - Line 447-452: Shot normalization (duration clamping - FIXED to 15s max)

### Workflow Files
- `public/workflows/z_image_turbo_16gb.json` - Current 16GB text-to-image (no cast)
- `public/workflows/api_google_nano_banana2_image_edit.json` - Cloud reference example
- `public/workflows/music_video_shot_ltx2_3_i2v_audio_16gb.json` - Video pass (has cast support via audio conditioning)

## Testing Checklist

After implementing solution:

1. **Rebuild app:** `npm run build`
2. **Reinstall:** Copy to `/Applications/ComfyStudio.app`, open with: `open /Applications/ComfyStudio.app`
3. **Create test project:**
   - Add cast members: jose (slug: jose), amelia (slug: amelia)
   - Set one as default lead vocalist
4. **Build director script:**
```
Shot 1:
Start at: 0:00
Lyric moment: "opening line"
Artist: jose
Keyframe prompt: Close-up of artist in studio with warm lighting
Motion prompt: Slow dolly in toward face
Camera: Medium close-up, Low angle
Length: 9

Shot 2:
Start at: 0:09
Lyric moment: "next line"
Artist: amelia
Keyframe prompt: Artist performing with energy
Motion prompt: Tracking shot around performer
Camera: Medium shot, Eye level
Length: 12
```
5. **Select 16GB profile**
6. **Build plan** - verify no duration clamping (shots show 9s, 12s)
7. **Generate keyframes:**
   - Shot 1 should use Jose's reference image
   - Shot 2 should use Amelia's reference image
   - Both should maintain visual consistency with references
8. **Check for errors:**
   - No "input asset not found"
   - No "workflow failed" 
   - KeyFrames panel shows generated stills

## Current Status (April 26, 2024)

✅ **FIXED:** Duration clamping - all four clamping locations updated to 15s max:
- `src/utils/yoloPlanning.js` line 172: Parser clamp
- `src/config/musicVideoShotConfig.js` line 116: Max shot length
- `src/components/GenerateWorkspace.jsx` line 720-732: SRT vs script priority
- `src/components/GenerateWorkspace.jsx` line 447-452: normalizeShotForScene clamp

❌ **UNSOLVED:** Cast support for 16GB profile
- Workflow z-image-turbo-16gb has no reference image inputs
- Need IP-Adapter or similar solution
- ComfyUI is on remote host 99 (tunneled access available)

## Documentation Created

- `CAST_SUPPORT_CHANGES.md` - Previous fix attempt (16GB profile workflow change)
- `IMPLEMENTATION_PLAN_16GB.md` - Original 16GB optimization plan
- This file - Next steps for cast support

## Questions to Ask User

1. Can you access ComfyUI Manager on host 99 to install IP-Adapter nodes?
2. Do you prefer: (A) Local IP-Adapter solution, (B) Hybrid local/cloud, or (C) Use balanced profile?
3. What is your monthly cloud credit budget if we use hybrid approach?
4. Does host 99 have internet access to download IP-Adapter models from HuggingFace?
