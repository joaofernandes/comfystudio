# Music Video Director Mode Fixes - April 26, 2024

## Issues Fixed

### 1. Cast Members Not Appearing in Keyframes
**Problem:** When using the 16GB local profile, `Artist: jose` and `Artist: amelia` were ignored.  
**Root Cause:** The `z-image-turbo-16gb` workflow doesn't support reference images.  
**Solution:** Changed the 16GB profile to use `image-edit-model-product` workflow instead.

### 2. Shot Durations Ignored by SRT Timing
**Problem:** Script's `Length:` field was being overridden by SRT lyric line duration.  
**Example:** Script says `Length: 9`, but shot was only 5 seconds (SRT line duration).  
**Root Cause:** SRT timing had priority over explicit script values.  
**Solution:** Reversed priority so script's `Length:` always wins.

## Changes Made

### File: `src/config/generateWorkspaceConfig.js`
```javascript
// CHANGED: 16GB profile now uses reference-capable workflow
'16gb': Object.freeze({
  storyboardWorkflowId: 'image-edit-model-product',  // Was: 'z-image-turbo-16gb'
  videoWorkflowId: 'music-video-shot-ltx23-16gb',
}),
```

### File: `src/components/GenerateWorkspace.jsx` (lines 720-732)
```javascript
// NEW PRIORITY ORDER for shot duration:
// 1. Script's explicit Length: field (director's creative intent)
// 2. SRT line duration (only if Length: is missing)
// 3. Default 5s (last resort)
```

**Why:** A video shot is a cinematic unit, not a lyric unit. The director may want a shot to hold through multiple lyric lines or cover instrumental passages.

## How It Works Now

### Cast Resolution (Reference Images)
1. Script contains: `Artist: jose`
2. System matches `jose` slug in Cast Roster → finds image asset
3. Image asset passed as **reference image** to `image-edit-model-product` workflow
4. Workflow uses IP-Adapter to generate visuals consistent with reference

**Note:** Cast names are NOT text prompts—they're visual references.

### Shot Duration (Always Respects Script)
```
Shot 1:
Start at: 0:00          ← Uses SRT timing if available (perfect lip-sync)
Lyric moment: "text"    ← Fuzzy-matches to SRT for positioning
Length: 9               ← ALWAYS RESPECTED (your creative intent)
```

## Workflows Comparison

| Profile | Storyboard Workflow | Supports Cast? | VRAM |
|---------|-------------------|----------------|------|
| draft | z-image-turbo | ❌ No | 8-10GB |
| **16gb** | **image-edit-model-product** | ✅ **Yes** | 12-16GB |
| balanced | nano-banana-2 | ✅ Yes | Cloud |
| premium | nano-banana-2 | ✅ Yes | Cloud |

## After Rebuilding

**To apply changes:**
```bash
npm run build
# Restart ComfyStudio
```

**Then in your project:**
1. Use the **16GB profile** (it now supports cast!)
2. Build your plan with `Artist:` fields
3. Generate keyframes—they'll respect both cast and duration

## What to Expect

✅ Shot 1 will be **9 seconds** (not 5)  
✅ Shot 2 will be **12 seconds** (not 5)  
✅ `Artist: jose` shots will use Jose's reference image  
✅ `Artist: amelia` shots will use Amelia's reference image  
✅ `Artist: lead-vocalist` continues to work as before
