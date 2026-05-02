# Bug Report: Music Video Shot Durations Clamped to 5 Seconds by Ad-Specific Normalization

## Summary

Music video director scripts with explicit `Length:` fields (e.g., 9 seconds, 12 seconds) were being incorrectly clamped to a maximum of 5 seconds in the generated plan. The root cause was ad-specific shot normalization logic (`normalizeShotForScene`) being applied to music video workflows, which have fundamentally different duration requirements.

## Environment

- **ComfyStudio Version:** April 2024 build
- **Affected Feature:** Music Video Director Mode
- **Profile:** All music video profiles (draft, balanced, premium, 16gb)
- **Platform:** macOS (Electron app)

## Steps to Reproduce

1. Create a new Music Video project in Director Mode
2. Build a director script with explicit shot durations:
```
Shot 1:
Start at: 0:00
Lyric moment: "first line"
Artist: jose
Keyframe prompt: Close-up in studio
Length: 9

Shot 2:
Start at: 0:09
Lyric moment: "second line"
Artist: amelia
Keyframe prompt: Wide shot performance
Length: 12
```
3. Click "Build Plan"
4. Observe the generated plan in the Keyframes panel

## Expected Behavior

- Shot 1 should have duration: 9 seconds (as specified in script)
- Shot 2 should have duration: 12 seconds (as specified in script)
- Music video shots should respect creative intent for duration (can be 2-15+ seconds)

## Actual Behavior

- Shot 1 shows duration: 5 seconds (clamped)
- Shot 2 shows duration: 5 seconds (clamped)
- All shots are hard-limited to 5 seconds maximum, regardless of script values

## Root Cause Analysis

### Multiple Clamping Layers

The duration was being clamped at THREE different locations in the pipeline:

#### 1. Script Parser Clamp
**File:** `src/utils/yoloPlanning.js`, line 172  
**Function:** `parseOptionalShotDurationSeconds()`

```javascript
// BEFORE (incorrect):
return Number(Math.min(5, Math.max(2, parsed)).toFixed(2))  // Max 5 seconds

// AFTER (fixed):
return Number(Math.min(15, Math.max(2, parsed)).toFixed(2))  // Max 15 seconds
```

This function parses the `Length: X` field from the director script and immediately clamps it to [2, 5] range.

#### 2. Music Video Config Clamp
**File:** `src/config/musicVideoShotConfig.js`, line 116  
**Object:** `MUSIC_VIDEO_SHOT_DEFAULTS`

```javascript
// BEFORE (incorrect):
export const MUSIC_VIDEO_SHOT_DEFAULTS = Object.freeze({
  // ...
  maxShotLengthSeconds: 8,  // Applied by clampMusicVideoShotLength()
})

// AFTER (fixed):
export const MUSIC_VIDEO_SHOT_DEFAULTS = Object.freeze({
  // ...
  maxShotLengthSeconds: 15,
})
```

#### 3. Ad-Specific Normalization (PRIMARY BUG)
**File:** `src/components/GenerateWorkspace.jsx`, lines 447-452  
**Function:** `normalizeShotForScene()`

```javascript
// BEFORE (incorrect - ad-specific clamp):
const duration = clampNumberValue(
  shot?.durationSeconds,
  2,
  5,  // Hard 5-second max for ADS
  clampNumberValue(fallback?.durationSeconds, 2, 5, 3)
)

// AFTER (fixed):
const duration = clampNumberValue(
  shot?.durationSeconds,
  2,
  15,  // Allow up to 15 seconds for music videos
  clampNumberValue(fallback?.durationSeconds, 2, 15, 3)
)
```

### The Core Problem

**Line 3856** in `GenerateWorkspace.jsx` calls `normalizeGeneratedYoloPlan()` for ALL director mode projects:

```javascript
const normalized = normalizeGeneratedYoloPlan(rawPlan, {
  // ... applies normalizeShotForScene to every shot
})
```

**This function was designed for AD campaigns**, where:
- Shots are typically 3-5 seconds (quick product cuts)
- Longer shots are considered errors
- Tight pacing is the standard

**Music videos have different requirements:**
- Performance shots: 8-12 seconds (hold on artist's face during vocal delivery)
- B-roll/establishing: 3-6 seconds (quick scene-setting cuts)
- Instrumental/bridge: 5-15 seconds (visual storytelling without vocals)
- Epic moments: 10-20 seconds (climax, emotional peaks)

### Why Music Videos Use Ad Normalizer

The `normalizeGeneratedYoloPlan()` function handles:
- Shot duration validation
- Scene transitions
- Prompt validation
- Asset reference validation

However, it applies **ad-specific business rules** (5-second max shots) to music video content, which has entirely different pacing requirements.

**Question for maintainers:** Should music videos have their own normalization function, or should `normalizeShotForScene()` accept a `maxDuration` parameter based on project type?

## Impact

- **Severity:** High - breaks core creative control feature
- **Scope:** All music video projects with shots > 5 seconds
- **Workaround:** None (hard-coded limit)
- **User Experience:** Director's explicit timing instructions are silently ignored

## Additional Context

### Console Debug Output

When adding debug logs before the fix:

```javascript
// In parseOptionalShotDurationSeconds:
console.log('[PARSER] Parsed duration:', 9, '→ Clamped to:', 5)

// In GenerateWorkspace shot building:
console.log('[SHOT BUILD] scriptShot.durationSeconds:', 9)
console.log('[SHOT BUILD] After normalization:', 5)
```

This confirmed that:
1. Parser correctly read `9` from `Length: 9`
2. Value survived through planning phase
3. Final normalization step crushed it to `5`

### Design Question

The final fix changed all clamps to 15 seconds, but this raises questions:

1. Should there be different max durations per profile?
   - Draft: 8s max (fast iteration)
   - Balanced/Premium: 15s max (cinematic pacing)
   - 16GB: 12s max (memory constraints)

2. Should music videos skip `normalizeShotForScene()` entirely?
   - Pro: No ad-specific assumptions
   - Con: Lose validation/cleanup logic

3. Should there be a `projectType` parameter?
   ```javascript
   normalizeShotForScene(shot, fallback, { projectType: 'music-video' })
   // Applies different rules based on context
   ```

## Recommended Fix (Implemented)

Changed all three clamping locations to allow 15-second maximum:

- ✅ Parser: 2-15 seconds (`src/utils/yoloPlanning.js`)
- ✅ Music config: max 15 seconds (`src/config/musicVideoShotConfig.js`)
- ✅ Normalization: 2-15 seconds range (`src/components/GenerateWorkspace.jsx`)

## Related Files

- `src/utils/yoloPlanning.js` - Script parsing
- `src/config/musicVideoShotConfig.js` - Music video defaults
- `src/components/GenerateWorkspace.jsx` - Plan building and normalization
- `CAST_SUPPORT_CHANGES.md` - Documentation of fix
- `IMPLEMENTATION_PLAN_16GB.md` - 16GB optimization context

## Testing

### Test Case 1: Long Performance Shot
```
Shot 1:
Length: 12
Lyric moment: "hold this note"
Artist: lead-vocalist
```
**Expected:** 12-second shot  
**Before Fix:** 5 seconds  
**After Fix:** 12 seconds ✅

### Test Case 2: Multiple Artists in Sequence
```
Shot 1:
Length: 9
Artist: jose

Shot 2:
Length: 12
Artist: amelia
```
**Expected:** 9s + 12s = 21 seconds total  
**Before Fix:** 5s + 5s = 10 seconds (53% time loss)  
**After Fix:** 9s + 12s = 21 seconds ✅

### Test Case 3: Song Coverage
- Song duration: 199.6 seconds
- Script with 8 shots averaging 9 seconds each
- **Before Fix:** ~40 seconds total (20% coverage, unusable)
- **After Fix:** ~72 seconds total (36% coverage, + B-roll = complete)

## Proposed Long-Term Solution

1. **Separate normalization for music videos:**
   ```javascript
   function normalizeMusicVideoShot(shot, fallback, musicDefaults) {
     const duration = clampNumberValue(
       shot?.durationSeconds,
       musicDefaults.minShotLengthSeconds,  // 1.5s
       musicDefaults.maxShotLengthSeconds,  // 15s
       3
     )
     // No ad-specific validations
   }
   ```

2. **Project-type-aware clamping:**
   ```javascript
   const MAX_DURATIONS = {
     'ad-campaign': 5,
     'music-video': 15,
     'narrative': 30,
   }
   ```

3. **Remove normalization for music videos entirely:**
   - Trust the director script as-is
   - Only validate at workflow submission (ComfyUI level)
   - Keep UI responsive, fail fast with clear errors

## Status

- ✅ **FIXED** in local build (April 26, 2024)
- ⚠️ **Needs upstream PR** to main repository
- 📝 **Documentation updated** in `CAST_SUPPORT_CHANGES.md`
