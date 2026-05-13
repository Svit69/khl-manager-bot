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

## Current Save

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

In the browser, junior players without a real `identity.photoUrl` use deterministic generated avatars. The app no longer tries to load missing `player-photo/juniors/<juniorId>.png` files on Vercel.

## Vercel Generation

For production on Vercel, use the in-app button `Generate photo` / `Сгенерировать фото`. It calls:

```text
POST /api/junior-photo
```

The Vercel function supports two modes.

## OpenAI Fallback

This is the simplest production setup. Add this environment variable in Vercel:

```text
openai_api_key=sk-...
```

Optional tuning variables:

```text
openai_image_model=gpt-image-1-mini
openai_image_size=1024x1024
openai_image_quality=low
openai_image_format=jpeg
```

Uppercase aliases like `OPENAI_API_KEY` are also supported, but lowercase names are friendlier to panels that only allow lowercase letters, digits, dashes, and underscores.

When `junior_photo_worker_url` is not configured, the API uses OpenAI Images and returns an inline data URL. It works without a separate GPU worker, but many generated photos can make the browser save larger.

## External Worker

Use this mode if you want persistent CDN URLs and smaller browser saves:

```text
junior_photo_worker_url=https://your-worker.example.com/generate-junior-photo
junior_photo_worker_token=optional-secret-token
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

The returned `photoUrl` is saved into the browser save state as `identity.photoUrl`, so worker URLs must be public and persistent. Good storage targets are Cloudflare R2, S3, Supabase Storage, or a CDN bucket attached to your generation worker.
