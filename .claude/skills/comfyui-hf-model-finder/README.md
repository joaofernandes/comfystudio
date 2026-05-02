# ComfyUI HuggingFace Model Finder Skill

This skill automatically finds and downloads missing ComfyUI models from HuggingFace.

## What It Does

1. **Extracts model references** from ComfyUI workflow JSON files
2. **Checks existing models** in your ComfyUI installation (models already downloaded are skipped)
3. **Searches HuggingFace** systematically with smart search strategies
4. **Downloads and installs** models to the correct folders with your approval

## When to Use

- ComfyUI workflow errors about missing models
- Setting up a new workflow from JSON
- Finding where to download specific models
- Bulk model installation for multiple workflows

## Usage Examples

**Example 1: Find and install missing models**
```
I have this workflow at public/workflows/music_video_shot_ltx2_3_i2v_audio_16gb.json 
but ComfyUI says models are missing. Can you help? My ComfyUI is at ~/ComfyUI
```

**Example 2: Check what's missing (no download)**
```
Check what models are needed for public/workflows/image_qwen_image_edit_2509.json
I have ComfyUI at /opt/ComfyUI. Just tell me what's missing, don't download yet.
```

**Example 3: Download specific models**
```
My workflow needs gemma-3-12b-it-IQ4_XS.gguf and taeltx2_3.safetensors
Find them on HuggingFace and download to the right folders
```

## Features

- ✅ **Smart existing model detection** - checks what you already have first
- ✅ **Dry-run mode** - shows download plan before proceeding
- ✅ **Official repo prioritization** - prefers verified/official sources
- ✅ **Correct folder mapping** - automatically places models in right ComfyUI folders
- ✅ **Multiple format support** - .safetensors, .ckpt, .gguf, etc.
- ✅ **Multiple model types** - checkpoints, UNETs, CLIPs, VAEs, LoRAs, upscalers, audio

## ComfyUI Path Detection

The skill will find your ComfyUI installation by checking:
1. `$COMFYUI_PATH` environment variable
2. `~/ComfyUI` (default location)
3. Current directory if it has a `models/` folder
4. Asks you to specify if not found

## Model Folder Structure

Models are installed to the correct ComfyUI folders:
```
ComfyUI/models/
├── checkpoints/      # Main model checkpoints
├── unet/             # UNET models
├── clip/             # CLIP text encoders
├── vae/              # VAE models
├── loras/            # LoRA adapters
├── upscale_models/   # Upscaler models
└── audio/            # Audio processing models
```

## Search Strategy

When searching HuggingFace, the skill:
1. Tries exact filename match first
2. Searches without extension
3. Infers project/org from filename patterns (ltx-* → Lightricks, qwen-* → Qwen/Alibaba)
4. Checks common official organizations
5. Presents multiple options if found, recommending official repos
6. Falls back to manual search suggestions if not found

## Requirements

- HuggingFace Hub CLI (`pip install huggingface-hub`) - recommended but not required
- Falls back to wget/curl if CLI not available
- No HuggingFace authentication needed (skips gated models)

## Test Cases

Three test cases are included in `evals/evals.json`:
1. Full workflow assistance with missing models
2. Check-only mode without downloading
3. Specific model search with env variable path

## Designed For

This skill is optimized for smaller LLMs (like local Ollama models):
- Clear, structured output with tables and lists
- Step-by-step progress indicators
- Simple, direct language
- Exact commands that can be copy-pasted
- Always checks existing files before searching
- Requires confirmation before downloads

## License

Part of the ComfyStudio project.
