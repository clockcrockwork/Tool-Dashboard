# Mobile Local LLM Lab

This is an independent experiment for the personal Tool-Dashboard. It does not import Tool-Dashboard packages, modify its user-facing architecture, share local data between devices, or register MCP/WebMCP operations. Claude Design can continue exploring UX and widget requirements separately.

## Purpose

Evaluate actual Japanese small-model inference on Windows Chrome/Edge, Android Chrome, and iPhone Safari (where supported). Built as a standalone static page so the phone can open it over HTTPS.

- WebLLM 0.2.84: WebGPU, worker-backed Qwen2.5-0.5B-Instruct q4f16 or q4f32 (approx. 945MB–1GB estimated GPU memory).
- wllama 3.13.0: official Qwen2.5-0.5B-Instruct GGUF Q4_K_M from Hugging Face (approx. 491MB download), CPU single-thread baseline or optional WebGPU offload. Uses wllama's Safari compatibility preset.
- Common Japanese task-to-JSON input and generation parameters, max 128 tokens and temperature 0.
- Records load time, generation time, completion tokens if available, token/elapsed seconds as an approximate speed, JSON/schema pass or fail, device capabilities, errors, and model identifiers.
- History is memory-only and exported to a local JSON download by explicit user action. No telemetry, account or backend.
- Imports and model downloads are made from third-party CDNs/Hugging Face. Only use synthetic or non-sensitive text. Imported code is version-pinned, not cryptographically SRI-pinned.

## Deploy

Create a separate Vercel static project from this same GitHub repository with Root Directory set to experiments/mobile-local-llm. Framework: Other/none. No build or output directory. This must NOT deploy the Tool-Dashboard root Vite app.

A simple static HTTPS server works. COOP/COEP intentionally are not required for this first test: the conservative wllama CPU mode runs one thread, while the GPU mode is a separate capability experiment. A later multithreaded test can use an isolated origin with verified third-party resource policies.

## Manual test plan

1. Open page on each device and record WebGPU, shader-f16, and available storage. These browser values do not reveal actual free GPU VRAM or total app memory.
2. Select WebLLM and its q4f16 model if shader-f16 is supported; otherwise q4f32. Select Load explicitly (no automatic multi-hundred MB download).
3. Run the default Japanese prompt twice, then export JSON before switching.
4. Use Memory release, select wllama CPU mode, load its GGUF, and repeat twice.
5. After release, optionally try wllama WebGPU on supported browsers. Record failures or tab crashes.
6. Compare results on the same device and different devices. Distinguish first download from warm cache; clear browser cache or use a fresh profile only when deliberately testing cold download.
7. For Safari and Android, also note UI responsiveness, device warming, system browser tab unload/reload, and whether generation completes. Do not treat browser tab termination as a model quality failure.

## Caveats

- Different GGUF/MLC quantization and GPU/CPU compute paths mean this is a practical device feasibility test, NOT a scientific equal-compute benchmark.
- Tokens per second are completion tokens divided by the entire request duration (including prefill), not pure decode throughput.
- A model might produce JSON but not conform to the schema. JSON extraction quality is not solely a runtime property.
- CDN loading, iOS Safari behavior, and actual model inference must be confirmed on real browsers. A static source check or a Vercel deployment does not establish them.
- Inputs/results may appear in the manual downloaded report, which should not be shared publicly if the input was personal.

## Primary sources

- https://webllm.mlc.ai/docs/user/get_started.html
- https://webllm.mlc.ai/models/
- https://github.com/mlc-ai/web-llm/tree/main/examples/get-started-web-worker
- https://github.ngxson.com/wllama/docs/index.html
- https://github.com/ngxson/wllama/blob/master/compat/README.md
- https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF
