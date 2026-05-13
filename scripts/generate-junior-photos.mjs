import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { teamsData } from "../src/data/teams.js";
import { createTeams } from "../src/data/seed.js";
import { JuniorTeamService } from "../src/season/JuniorTeamService.js";
import { getGeneratedJuniorPhotoUrl } from "../src/utils/PlayerPhoto.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const outputDir = path.join(repoRoot, "player-photo", "juniors");

const DEFAULT_SERVER = "http://127.0.0.1:8188";
const DEFAULT_CHECKPOINT = process.env.COMFYUI_CHECKPOINT || "realvisxlV50_v50Bakedvae.safetensors";
const DEFAULT_NEGATIVE_PROMPT = [
  "cartoon",
  "illustration",
  "anime",
  "helmet",
  "face cage",
  "team logo",
  "text",
  "watermark",
  "blurry",
  "distorted face",
  "extra fingers",
  "deformed",
].join(", ");

const usage = () => {
  console.log(`Usage:
  node scripts/generate-junior-photos.mjs --season 2025/2026 --limit 20 --dry-run
  node scripts/generate-junior-photos.mjs --season 2025/2026 --server http://127.0.0.1:8188 --checkpoint model.safetensors
  node scripts/generate-junior-photos.mjs --save save.json --save-out save-with-photos.json

Options:
  --season <label>       Generate deterministic junior players for a season.
  --save <file>          Read exported app save JSON and generate for junior players in it.
  --save-out <file>      Write updated save with identity.photoUrl values after generation.
  --server <url>         ComfyUI server. Default: ${DEFAULT_SERVER}
  --checkpoint <name>    ComfyUI checkpoint name. Default: env COMFYUI_CHECKPOINT or ${DEFAULT_CHECKPOINT}
  --limit <n>            Max players to generate.
  --force                Regenerate even if output file already exists.
  --dry-run              Only write prompt manifest, do not call ComfyUI.
  --prompts-out <file>   Prompt manifest path. Default: player-photo/juniors/prompts.json
`);
};

const parseArgs = () => {
  const args = {
    server: DEFAULT_SERVER,
    checkpoint: DEFAULT_CHECKPOINT,
    season: null,
    save: null,
    saveOut: null,
    limit: Infinity,
    force: false,
    dryRun: false,
    promptsOut: path.join(outputDir, "prompts.json"),
  };
  const raw = process.argv.slice(2);
  for (let index = 0; index < raw.length; index += 1) {
    const item = raw[index];
    if (item === "--help" || item === "-h") args.help = true;
    else if (item === "--season") args.season = raw[++index];
    else if (item === "--save") args.save = raw[++index];
    else if (item === "--save-out") args.saveOut = raw[++index];
    else if (item === "--server") args.server = raw[++index];
    else if (item === "--checkpoint") args.checkpoint = raw[++index];
    else if (item === "--limit") args.limit = Math.max(0, Number(raw[++index]) || 0);
    else if (item === "--force") args.force = true;
    else if (item === "--dry-run") args.dryRun = true;
    else if (item === "--prompts-out") args.promptsOut = raw[++index];
    else throw new Error(`Unknown option: ${item}`);
  }
  return args;
};

const safeOutputPath = (playerId) => {
  const relative = getGeneratedJuniorPhotoUrl(playerId).replace(/^\.\//, "");
  return path.join(repoRoot, relative);
};

const getSeed = (playerId) => {
  let value = 0;
  for (let index = 0; index < String(playerId).length; index += 1) {
    value = (value * 31 + String(playerId).charCodeAt(index)) % 2147483647;
  }
  return value || 123456789;
};

const buildPrompt = (player) => {
  const nationality = String(player.nationality || "").toUpperCase();
  const nationalityPrompt = nationality === "BY" ? "Belarusian" : nationality === "KZ" ? "Kazakh" : "Russian";
  const position = player.position || "hockey player";
  return [
    "realistic studio media day headshot portrait",
    `young ${nationalityPrompt} male ice hockey prospect`,
    `${player.age || 18} years old`,
    `${position} position`,
    "short athletic haircut",
    "wearing a plain dark hockey jersey without logos",
    "neutral dark arena background",
    "front facing",
    "professional sports photography",
    "sharp focus",
    "natural skin texture",
  ].join(", ");
};

const createWorkflow = ({ prompt, negativePrompt, seed, checkpoint, filenamePrefix }) => ({
  "3": {
    class_type: "KSampler",
    inputs: {
      seed,
      steps: 28,
      cfg: 6.5,
      sampler_name: "dpmpp_2m",
      scheduler: "karras",
      denoise: 1,
      model: ["4", 0],
      positive: ["6", 0],
      negative: ["7", 0],
      latent_image: ["5", 0],
    },
  },
  "4": {
    class_type: "CheckpointLoaderSimple",
    inputs: { ckpt_name: checkpoint },
  },
  "5": {
    class_type: "EmptyLatentImage",
    inputs: { width: 768, height: 768, batch_size: 1 },
  },
  "6": {
    class_type: "CLIPTextEncode",
    inputs: { text: prompt, clip: ["4", 1] },
  },
  "7": {
    class_type: "CLIPTextEncode",
    inputs: { text: negativePrompt, clip: ["4", 1] },
  },
  "8": {
    class_type: "VAEDecode",
    inputs: { samples: ["3", 0], vae: ["4", 2] },
  },
  "9": {
    class_type: "SaveImage",
    inputs: { filename_prefix: filenamePrefix, images: ["8", 0] },
  },
});

const normalizeSavePlayer = (snapshot) => {
  const identity = snapshot?.identity || {};
  const displayName = identity.displayName || [identity.firstName, identity.lastName].filter(Boolean).join(" ") || snapshot?.id;
  return {
    id: snapshot.id,
    name: displayName,
    age: null,
    position: identity.primaryPosition,
    nationality: identity.nationality,
    photoUrl: identity.photoUrl || snapshot.photoUrl || null,
    snapshot,
  };
};

const loadPlayersFromSave = (savePath) => {
  const absolute = path.resolve(savePath);
  const save = JSON.parse(fs.readFileSync(absolute, "utf8"));
  const players = (save.players || [])
    .filter((player) => String(player?.id || "").startsWith("junior-"))
    .map(normalizeSavePlayer);
  return { save, players };
};

const loadPlayersFromSeason = (seasonLabel) => {
  const teams = createTeams(teamsData);
  const contracts = { createJuniorContract: (player) => ({ id: `generated-${player.id}` }) };
  new JuniorTeamService().ensureJuniorDepth({ teams, contracts, seasonLabel });
  return {
    save: null,
    players: teams.flatMap((team) =>
      (team.juniorPlayers || []).map((player) => ({
        id: player.id,
        name: player.name,
        age: null,
        position: player.identity.primaryPosition,
        nationality: player.identity.nationality,
        photoUrl: player.identity.photoUrl,
        snapshot: null,
      })),
    ),
  };
};

const queuePrompt = async ({ server, workflow }) => {
  const response = await fetch(`${server}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: workflow, client_id: "khl-manager-junior-photos" }),
  });
  if (!response.ok) throw new Error(`ComfyUI /prompt failed: ${response.status} ${await response.text()}`);
  const data = await response.json();
  return data.prompt_id;
};

const waitForImage = async ({ server, promptId }) => {
  for (let attempt = 0; attempt < 180; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const response = await fetch(`${server}/history/${promptId}`);
    if (!response.ok) continue;
    const data = await response.json();
    const outputs = data?.[promptId]?.outputs || {};
    const image = Object.values(outputs).flatMap((output) => output.images || [])[0];
    if (image) return image;
  }
  throw new Error(`Timed out waiting for ComfyUI prompt ${promptId}`);
};

const downloadImage = async ({ server, image, outputPath }) => {
  const params = new URLSearchParams({
    filename: image.filename,
    subfolder: image.subfolder || "",
    type: image.type || "output",
  });
  const response = await fetch(`${server}/view?${params.toString()}`);
  if (!response.ok) throw new Error(`ComfyUI /view failed: ${response.status} ${await response.text()}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(outputPath, bytes);
};

const updateSavePhotos = ({ save, playerIds, saveOut }) => {
  if (!save || !saveOut) return;
  const generated = new Set(playerIds);
  (save.players || []).forEach((snapshot) => {
    if (!generated.has(snapshot.id)) return;
    snapshot.identity = snapshot.identity || {};
    snapshot.identity.photoUrl = getGeneratedJuniorPhotoUrl(snapshot.id);
  });
  fs.writeFileSync(path.resolve(saveOut), `${JSON.stringify(save, null, 2)}\n`, "utf8");
};

const main = async () => {
  const args = parseArgs();
  if (args.help) {
    usage();
    return;
  }
  if (!args.season && !args.save) throw new Error("Pass --season or --save.");
  fs.mkdirSync(outputDir, { recursive: true });

  const source = args.save ? loadPlayersFromSave(args.save) : loadPlayersFromSeason(args.season);
  const jobs = source.players
    .filter((player) => args.force || !fs.existsSync(safeOutputPath(player.id)))
    .slice(0, args.limit)
    .map((player) => {
      const prompt = buildPrompt(player);
      return {
        playerId: player.id,
        name: player.name,
        output: path.relative(repoRoot, safeOutputPath(player.id)).replace(/\\/g, "/"),
        prompt,
        seed: getSeed(player.id),
      };
    });

  fs.writeFileSync(path.resolve(args.promptsOut), `${JSON.stringify(jobs, null, 2)}\n`, "utf8");
  console.log(`Prepared ${jobs.length} junior photo jobs.`);
  console.log(`Prompt manifest: ${path.relative(repoRoot, path.resolve(args.promptsOut))}`);
  if (args.dryRun || jobs.length === 0) return;

  const generatedIds = [];
  for (const job of jobs) {
    const outputPath = safeOutputPath(job.playerId);
    const workflow = createWorkflow({
      prompt: job.prompt,
      negativePrompt: DEFAULT_NEGATIVE_PROMPT,
      seed: job.seed,
      checkpoint: args.checkpoint,
      filenamePrefix: `khl_junior_${job.playerId}`,
    });
    console.log(`Generating ${job.name} -> ${job.output}`);
    const promptId = await queuePrompt({ server: args.server, workflow });
    const image = await waitForImage({ server: args.server, promptId });
    await downloadImage({ server: args.server, image, outputPath });
    generatedIds.push(job.playerId);
  }

  updateSavePhotos({ save: source.save, playerIds: generatedIds, saveOut: args.saveOut });
  console.log(`Generated ${generatedIds.length} junior photos.`);
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
