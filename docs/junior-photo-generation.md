# Junior photo generation

Local junior portraits are generated through a running ComfyUI instance. The app never stores an API key in the browser.

## Quick start

1. Start ComfyUI locally.
2. Make sure an SDXL checkpoint is available in ComfyUI.
3. Run a dry pass:

```powershell
npm run junior:photos -- --season 2025/2026 --limit 5 --dry-run
```

4. Generate images:

```powershell
npm run junior:photos -- --season 2025/2026 --limit 5 --checkpoint realvisxlV50_v50Bakedvae.safetensors
```

Generated files are saved to `player-photo/juniors/<playerId>.png`.

## Current save

For players from a browser save, export the app state JSON and run:

```powershell
npm run junior:photos -- --save save.json --save-out save-with-photos.json
```

The script writes `identity.photoUrl` into the output save for every generated junior player.

## Options

- `--server` defaults to `http://127.0.0.1:8188`.
- `--checkpoint` can also be set with `COMFYUI_CHECKPOINT`.
- `--force` regenerates existing files.
- `--prompts-out` writes the prompt manifest to a custom path.

The UI also tries `player-photo/juniors/<juniorId>.png` automatically for generated junior IDs and falls back to `player-photo/placeholder.png` if the image does not exist.

## Vercel production worker

For production on Vercel, use the in-app button `Сгенерировать фото`. It calls:

```text
POST /api/junior-photo
```

The Vercel function does not run Stable Diffusion itself. Configure these environment variables:

```text
JUNIOR_PHOTO_WORKER_URL=https://your-worker.example.com/generate-junior-photo
JUNIOR_PHOTO_WORKER_TOKEN=optional-secret-token
```

Worker request body:

```json
{
  "player": {
    "id": "junior-team-2025-0",
    "name": "Иван Смирнов",
    "age": 18,
    "position": "ЦТР",
    "nationality": "RU",
    "teamName": "Омские Ястребы"
  },
  "outputKey": "junior-photos/junior-team-2025-0.png",
  "prompt": "realistic studio media day headshot portrait...",
  "negativePrompt": "cartoon, illustration..."
}
```

Worker response:

```json
{
  "photoUrl": "https://cdn.example.com/junior-photos/junior-team-2025-0.png"
}
```

The returned `photoUrl` is saved into the browser save state as `identity.photoUrl`, so the URL must be public and persistent. Good storage targets are Cloudflare R2, S3, Supabase Storage, or a CDN bucket attached to your generation worker.
