import hashlib
import os

import torch

try:
    import folder_paths
except Exception:
    folder_paths = None

try:
    import torchaudio
except Exception:
    torchaudio = None

try:
    from demucs import pretrained
    from demucs.apply import apply_model
except Exception:
    pretrained = None
    apply_model = None


class ComfyStudioCachedVocalStem:
    RETURN_TYPES = ("AUDIO",)
    RETURN_NAMES = ("vocals",)
    FUNCTION = "run"
    CATEGORY = "ComfyStudio/Audio"

    _MODEL_CACHE = {}

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "model_name": (["htdemucs", "htdemucs_ft", "mdx_extra"], {"default": "htdemucs"}),
                "device": (["auto", "cuda", "cpu"], {"default": "auto"}),
                "audio_file_path": (
                    "STRING",
                    {"default": "", "placeholder": "Optional path. Leave empty to use AUDIO input."},
                ),
            },
            "optional": {
                "audio": ("AUDIO",),
            },
        }

    def _resolve_device(self, requested):
        req = str(requested or "auto").strip().lower()
        if req == "cuda":
            return "cuda" if torch.cuda.is_available() else "cpu"
        if req == "cpu":
            return "cpu"
        return "cuda" if torch.cuda.is_available() else "cpu"

    def _resolve_audio_path(self, audio_file_path):
        raw = str(audio_file_path or "").strip()
        if not raw:
            return ""
        if os.path.isabs(raw) and os.path.isfile(raw):
            return os.path.normpath(raw)
        candidates = [raw]
        if folder_paths is not None:
            candidates.append(os.path.join(folder_paths.get_input_directory(), raw))
            candidates.append(os.path.join(folder_paths.get_output_directory(), raw))
            get_temp = getattr(folder_paths, "get_temp_directory", None)
            if callable(get_temp):
                candidates.append(os.path.join(get_temp(), raw))
        for path in candidates:
            full = os.path.normpath(path)
            if os.path.isfile(full):
                return full
        return ""

    def _load_from_audio_input(self, audio):
        if not isinstance(audio, dict):
            return None, None
        waveform = audio.get("waveform")
        sample_rate = audio.get("sample_rate")
        if waveform is None or sample_rate is None:
            return None, None
        if not isinstance(waveform, torch.Tensor):
            waveform = torch.as_tensor(waveform)
        if waveform.ndim == 2:
            waveform = waveform.unsqueeze(0)
        if waveform.ndim != 3:
            raise ValueError("Audio waveform must be 3D [B,C,T], got %s" % (tuple(waveform.shape),))
        return waveform.float(), int(sample_rate)

    def _load_waveform(self, audio_file_path, audio):
        waveform, sample_rate = self._load_from_audio_input(audio)
        if waveform is not None:
            return waveform, sample_rate, ""

        if torchaudio is None:
            raise ImportError("torchaudio is required to load audio_file_path.")

        resolved = self._resolve_audio_path(audio_file_path)
        if not resolved:
            raise ValueError("Provide a valid AUDIO input or audio_file_path.")

        wav, sr = torchaudio.load(resolved)
        return wav.unsqueeze(0).float(), int(sr), resolved

    def _cache_dir(self):
        if folder_paths is not None:
            base = folder_paths.get_output_directory()
        else:
            base = os.getcwd()
        path = os.path.join(base, "comfystudio_cache", "vocal_stems")
        os.makedirs(path, exist_ok=True)
        return path

    def _hash_audio(self, waveform, sample_rate, audio_path, model_name, device_name):
        h = hashlib.sha256()
        h.update(str(model_name).encode("utf-8"))
        h.update(b"\0")
        h.update(str(device_name).encode("utf-8"))
        h.update(b"\0")
        h.update(str(int(sample_rate)).encode("ascii"))
        h.update(b"\0")
        if audio_path:
            h.update(os.path.abspath(audio_path).encode("utf-8", "ignore"))
            h.update(b"\0")
            h.update(str(os.path.getmtime(audio_path)).encode("ascii"))
            h.update(b"\0")
            h.update(str(os.path.getsize(audio_path)).encode("ascii"))
            return h.hexdigest()
        tensor = waveform.detach().contiguous().cpu()
        h.update(str(tuple(tensor.shape)).encode("ascii"))
        h.update(b"\0")
        h.update(tensor.numpy().tobytes())
        return h.hexdigest()

    @classmethod
    def _get_model(cls, model_name, device):
        if pretrained is None or apply_model is None:
            raise ImportError("demucs is not installed. Install with: pip install demucs torch torchaudio")
        key = (str(model_name), str(device))
        cached = cls._MODEL_CACHE.get(key)
        if cached is not None:
            return cached
        model = pretrained.get_model(model_name)
        model.to(device)
        model.eval()
        cls._MODEL_CACHE[key] = model
        return model

    def _normalize_for_demucs(self, waveform, sample_rate, model):
        mix = waveform[0]
        if mix.ndim != 2:
            raise ValueError("Expected [C,T] audio after batch select, got %s" % (tuple(mix.shape),))

        if mix.shape[0] == 1:
            mix = mix.repeat(2, 1)
        elif mix.shape[0] > 2:
            mix = mix[:2, :]

        target_sr = int(getattr(model, "samplerate", sample_rate))
        if sample_rate != target_sr:
            if torchaudio is None:
                raise ImportError("torchaudio is required for resampling.")
            mix = torchaudio.functional.resample(mix, int(sample_rate), target_sr)
            sample_rate = target_sr

        return mix.unsqueeze(0).contiguous(), int(sample_rate)

    def _separate_vocals(self, waveform, sample_rate, model_name, device_name):
        model = self._get_model(model_name, device_name)
        mix, sample_rate = self._normalize_for_demucs(waveform, sample_rate, model)
        mix = mix.to(device_name)
        with torch.no_grad():
            try:
                stems = apply_model(model, mix, device=device_name, progress=False)
            except TypeError:
                stems = apply_model(model, mix)

        if not isinstance(stems, torch.Tensor):
            stems = torch.as_tensor(stems)
        stems = stems.detach()
        if stems.ndim == 4:
            stems = stems[0]
        if stems.ndim != 3:
            raise ValueError("Unexpected Demucs output shape: %s" % (tuple(stems.shape),))

        source_names = list(getattr(model, "sources", []))
        for idx, name in enumerate(source_names):
            if str(name).strip().lower() == "vocals" and idx < stems.shape[0]:
                return stems[idx].unsqueeze(0).contiguous().cpu(), sample_rate

        if stems.shape[0] < 4:
            raise ValueError("Demucs output does not include the vocals stem.")
        return stems[3].unsqueeze(0).contiguous().cpu(), sample_rate

    def run(self, model_name="htdemucs", device="auto", audio_file_path="", audio=None):
        device_name = self._resolve_device(device)
        waveform, sample_rate, audio_path = self._load_waveform(audio_file_path, audio)
        cache_key = self._hash_audio(waveform, sample_rate, audio_path, model_name, device_name)
        cache_path = os.path.join(self._cache_dir(), "%s.pt" % cache_key)

        if os.path.isfile(cache_path):
            cached = torch.load(cache_path, map_location="cpu")
            cached_waveform = cached["waveform"].contiguous().cpu()
            cached_rate = int(cached["sample_rate"])
            return ({"waveform": cached_waveform, "sample_rate": cached_rate},)

        vocals, vocal_rate = self._separate_vocals(waveform, sample_rate, model_name, device_name)
        payload = {"waveform": vocals.contiguous().cpu(), "sample_rate": int(vocal_rate)}
        tmp_path = "%s.tmp" % cache_path
        torch.save(payload, tmp_path)
        os.replace(tmp_path, cache_path)
        return (payload,)


NODE_CLASS_MAPPINGS = {
    "ComfyStudioCachedVocalStem": ComfyStudioCachedVocalStem,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "ComfyStudioCachedVocalStem": "ComfyStudio Cached Vocal Stem",
}
