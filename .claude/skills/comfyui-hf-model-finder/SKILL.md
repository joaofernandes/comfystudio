---
name: comfyui-hf-model-finder
description: Finds and downloads missing ComfyUI models from HuggingFace. Use this skill when the user mentions missing ComfyUI models, workflow errors about models not found, or wants to set up models for ComfyUI workflows. Handles model detection, HuggingFace search, and automatic installation into correct ComfyUI folders. Always use this when working with ComfyUI workflow JSON files that reference models.
---

# ComfyUI HuggingFace Model Finder

This skill helps find and download missing ComfyUI models from HuggingFace automatically. It's designed to work with smaller LLMs (like local Ollama models) and provides clear, step-by-step guidance.

## When to Use This Skill

- User mentions missing models in ComfyUI workflows
- Workflow fails with "model not found" errors
- User asks where to download specific ComfyUI models
- User wants to set up a ComfyUI workflow from a JSON file
- User asks about finding models on HuggingFace

## How It Works

This skill follows a systematic 4-step process:

### Step 1: Extract Model References from Workflow

Parse the ComfyUI workflow JSON file and extract all model references. Look for these fields:

- `ckpt_name` → Checkpoint models
- `unet_name` → UNET models
- `clip_name`, `clip_name1`, `clip_name2` → CLIP models
- `vae_name` → VAE models
- `lora_name` → LoRA models
- `model_name` → Generic models (upscalers, audio processors, etc.)

**Important**: Some workflows use nested structures. Search recursively through all nodes and their inputs.

### Step 2: Check Which Models Are Missing

Before searching or downloading anything, check which models already exist locally. This is the FIRST step after extraction.

**ComfyUI Default Structure:**
```
ComfyUI/
└── models/
    ├── checkpoints/      (for ckpt_name)
    ├── unet/             (for unet_name)
    ├── clip/             (for clip_name, clip_name1, clip_name2)
    ├── vae/              (for vae_name)
    ├── loras/            (for lora_name)
    ├── upscale_models/   (for upscaler model_name)
    └── audio/            (for audio model_name)
```

**Model Type to Folder Mapping:**
- `ckpt_name` → `models/checkpoints/`
- `unet_name` → `models/unet/`
- `clip_name*` → `models/clip/`
- `vae_name` → `models/vae/`
- `lora_name` → `models/loras/`
- `model_name` with "upscaler" in name → `models/upscale_models/`
- `model_name` with audio-related terms → `models/audio/`
- Other `model_name` → Check multiple folders or ask user

**Finding ComfyUI Installation:**

Try these locations in order:
1. Environment variable `$COMFYUI_PATH`
2. `~/ComfyUI`
3. Current directory if it contains `models/` folder
4. Ask the user to specify the path

**Checking for Existing Models:**

For each model file (e.g., `ltx-2.3-22b-distilled-Q3_K_M.gguf`):
1. Map it to the correct folder based on its type
2. Use the `Bash` tool to check if the file exists: `ls -lh "$COMFYUI_PATH/models/unet/ltx-2.3-22b-distilled-Q3_K_M.gguf"`
3. If found, mark it as "✓ Already installed" and note the file size
4. If not found, mark it as "✗ Missing" and add to download list

**Output Format for Step 2:**

Present results as a clear table:

```markdown
## Model Status Check

| Model Name | Type | Status | Location/Size |
|------------|------|--------|---------------|
| ltx-2.3-22b-distilled-Q3_K_M.gguf | UNET | ✓ Already installed | models/unet/ (12.4GB) |
| gemma-3-12b-it-IQ4_XS.gguf | CLIP | ✗ Missing | - |
| taeltx2_3.safetensors | VAE | ✗ Missing | - |

**Summary:**
- Total models: 3
- Already installed: 1
- Missing: 2
```

### Step 3: Search HuggingFace for Missing Models

For each missing model, search HuggingFace systematically.

**Search Strategy (in priority order):**

1. **Direct filename search**
   - Search HF for the exact filename (with extension)
   - Example: Search for `"ltx-2.3-22b-distilled-Q3_K_M.gguf"`

2. **Model name without extension**
   - Remove file extension and search
   - Example: `"ltx-2.3-22b-distilled-Q3_K_M"`

3. **Infer from node type or prefix**
   - Look at the workflow node's `class_type` field
   - Extract project/model names from filename patterns
   - Example: `ltx-2.3-*` suggests "Lightricks LTX" or "LTX Video"
   - Example: `qwen_*` suggests "Qwen" by Alibaba
   - Example: `wan2.2_*` suggests "WAN" video models

4. **Common official organizations**
   - `Lightricks` - LTX Video models
   - `Qwen` or `Alibaba-NLP` - Qwen models
   - `black-forest-labs` - FLUX models
   - `stabilityai` - Stable Diffusion models
   - `runwayml` - RunwayML models
   - `ByteDance` - WAN models

**How to Search HuggingFace:**

Use the `Grep` or `Bash` tool to search:

```bash
# Option 1: Use HuggingFace Hub CLI (if available)
huggingface-cli search repos --query "ltx-2.3-22b-distilled"

# Option 2: Use curl to search HF API
curl -s "https://huggingface.co/api/models?search=ltx-2.3-22b-distilled&limit=10" | jq '.[] | .id'
```

Or use the `WebSearch` tool with queries like:
- `"ltx-2.3-22b-distilled-Q3_K_M.gguf" site:huggingface.co`
- `"Lightricks LTX 2.3 GGUF" site:huggingface.co`

**Prioritize Official Repos:**

When multiple results appear:
- Official organization repos > Community uploads
- Look for verified checkmarks or official org names
- Check repo popularity (downloads, likes)
- If unsure, present top 2-3 options and ask user which to use

**Output Format for Step 3:**

```markdown
## HuggingFace Search Results

### ✓ Found: gemma-3-12b-it-IQ4_XS.gguf
- **Repo**: `bartowski/gemma-3-12b-it-GGUF`
- **File**: `gemma-3-12b-it-IQ4_XS.gguf`
- **Size**: 4.2GB
- **URL**: https://huggingface.co/bartowski/gemma-3-12b-it-GGUF/blob/main/gemma-3-12b-it-IQ4_XS.gguf

### ⚠ Multiple matches: taeltx2_3.safetensors
Found in:
1. **Lightricks/LTX-Video** (Official, 2.5k downloads)
2. **community-user/ltx-vae-collection** (Community, 50 downloads)

**Recommendation**: Use option 1 (official repo)
Proceed with Lightricks/LTX-Video? (yes/no)

### ✗ Not found: some_rare_model.ckpt
No results found on HuggingFace. Possible reasons:
- Model might be on CivitAI or other platforms
- Filename might be custom/renamed
- Model might be deprecated

Manual search suggestion: Try searching for the model's project name or check the workflow source.
```

### Step 4: Download and Install Models

After confirming which models to download, proceed with installation.

**Dry Run Mode (Default First Time):**

ALWAYS show a dry-run summary BEFORE downloading:

```markdown
## Download Plan (Dry Run)

The following models will be downloaded:

| Model | Destination | Size | Source |
|-------|-------------|------|--------|
| gemma-3-12b-it-IQ4_XS.gguf | models/clip/ | 4.2GB | bartowski/gemma-3-12b-it-GGUF |
| taeltx2_3.safetensors | models/vae/ | 800MB | Lightricks/LTX-Video |

**Total download size**: ~5.0GB
**Estimated time**: ~5-10 minutes (depends on connection)

Proceed with download? (yes/no)
```

**Download Process:**

For each model:

1. **Use huggingface-cli download** (preferred method):
```bash
huggingface-cli download \
  bartowski/gemma-3-12b-it-GGUF \
  gemma-3-12b-it-IQ4_XS.gguf \
  --local-dir-use-symlinks False \
  --local-dir "$COMFYUI_PATH/models/clip"
```

2. **Alternative: Use wget/curl** (if huggingface-cli not available):
```bash
cd "$COMFYUI_PATH/models/clip"
wget -O gemma-3-12b-it-IQ4_XS.gguf \
  "https://huggingface.co/bartowski/gemma-3-12b-it-GGUF/resolve/main/gemma-3-12b-it-IQ4_XS.gguf"
```

3. **Show progress** as each model downloads
4. **Verify downloads** by checking file size matches expected size
5. **Mark complete** when file exists and size is correct

**Output Format for Step 4:**

```markdown
## Download Progress

✓ gemma-3-12b-it-IQ4_XS.gguf → models/clip/ (4.2GB) [Complete]
⏳ taeltx2_3.safetensors → models/vae/ (800MB) [Downloading... 45%]

---

## Installation Complete!

All missing models have been downloaded and installed:
- gemma-3-12b-it-IQ4_XS.gguf → models/clip/
- taeltx2_3.safetensors → models/vae/

Your workflow should now work correctly.
```

## Error Handling

**If ComfyUI path not found:**
```
❌ ComfyUI installation not found.

Tried:
- $COMFYUI_PATH environment variable
- ~/ComfyUI
- Current directory

Please specify your ComfyUI installation path.
```

**If huggingface-cli not available:**
```
⚠ huggingface-cli not found. Using wget fallback.

For better performance, install it with:
pip install huggingface-hub
```

**If download fails:**
```
❌ Failed to download: gemma-3-12b-it-IQ4_XS.gguf

Possible reasons:
- Network connection interrupted
- Insufficient disk space
- File no longer available

Retry download? (yes/no)
```

**If model not found on HF:**
```
❌ Model not found on HuggingFace: some_model.safetensors

Try:
1. Check if model name is correct in workflow
2. Search manually: https://huggingface.co/models?search=some_model
3. Check alternative sources (CivitAI, model creator's website)
4. Ask in ComfyUI community if model is deprecated/renamed
```

## Important Notes for Smaller LLMs

This skill is designed to work with local Ollama models. Keep responses clear and structured:

- ✅ Use simple, direct language
- ✅ Show progress step-by-step
- ✅ Use tables and lists for clarity
- ✅ Provide exact commands that can be copy-pasted
- ✅ Always check existing files BEFORE searching
- ❌ Don't skip the dry-run confirmation
- ❌ Don't assume models are missing without checking
- ❌ Don't download without user confirmation

## Example Workflow

User: "I have a ComfyUI workflow that's missing models. Can you help?"

Response:
```markdown
I'll help you find and install the missing models. Please provide the workflow JSON file path.

Once you do, I'll:
1. Extract all model references
2. Check which models you already have
3. Search HuggingFace for missing ones
4. Show you a download plan
5. Install them with your approval
```

User provides: `/path/to/workflow.json`

Then proceed through Steps 1-4 systematically, showing clear output at each stage.
