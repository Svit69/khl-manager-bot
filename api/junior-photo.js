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
  "deformed",
].join(", ");

const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1-mini";
const OPENAI_IMAGE_SIZE = process.env.OPENAI_IMAGE_SIZE || "1024x1024";
const OPENAI_IMAGE_QUALITY = process.env.OPENAI_IMAGE_QUALITY || "low";
const OPENAI_IMAGE_FORMAT = process.env.OPENAI_IMAGE_FORMAT || "jpeg";

const sanitizeText = (value, fallback = "") => String(value || fallback).trim().slice(0, 120);

const buildPrompt = (player) => {
  const nationality = String(player?.nationality || "").toUpperCase();
  const nationalityPrompt = nationality === "BY" ? "Belarusian" : nationality === "KZ" ? "Kazakh" : "Russian";
  return [
    "realistic studio media day headshot portrait",
    `young ${nationalityPrompt} male ice hockey prospect`,
    `${Number(player?.age) || 18} years old`,
    `${sanitizeText(player?.position, "hockey player")} position`,
    "short athletic haircut",
    "wearing a plain dark hockey jersey without logos",
    "neutral dark arena background",
    "front facing",
    "professional sports photography",
    "sharp focus",
    "natural skin texture",
  ].join(", ");
};

const getDataUrlMimeType = (format) => {
  if (format === "png") return "image/png";
  if (format === "webp") return "image/webp";
  return "image/jpeg";
};

const sendJson = (res, status, payload) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
};

const parseJsonResponse = async (response) => {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { error: text || "Invalid JSON response" };
  }
};

const requestWorkerPhoto = async (workerUrl, headers, payload) => {
  const response = await fetch(workerUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  const data = await parseJsonResponse(response);

  if (!response.ok) {
    return { status: response.status, error: data.error || "Photo worker failed" };
  }

  const photoUrl = data.photoUrl || data.url || data.imageUrl;
  if (!photoUrl) {
    return { status: 502, error: "Photo worker did not return photoUrl" };
  }

  return { status: 200, photoUrl, provider: "worker" };
};

const requestOpenAiPhoto = async (payload) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      status: 503,
      error: "Настройте JUNIOR_PHOTO_WORKER_URL или OPENAI_API_KEY в переменных окружения Vercel.",
    };
  }

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_IMAGE_MODEL,
      prompt: `${payload.prompt}. Fictional player portrait, not a real person, no club logos, no readable text.`,
      size: OPENAI_IMAGE_SIZE,
      quality: OPENAI_IMAGE_QUALITY,
      output_format: OPENAI_IMAGE_FORMAT,
    }),
  });
  const data = await parseJsonResponse(response);

  if (!response.ok) {
    return { status: response.status, error: data.error?.message || data.error || "OpenAI image generation failed" };
  }

  const image = data.data?.[0] || {};
  if (image.url) return { status: 200, photoUrl: image.url, provider: "openai" };
  if (image.b64_json) {
    return {
      status: 200,
      photoUrl: `data:${getDataUrlMimeType(OPENAI_IMAGE_FORMAT)};base64,${image.b64_json}`,
      provider: "openai",
    };
  }

  return { status: 502, error: "OpenAI did not return image data" };
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  let body = {};
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  } catch {
    sendJson(res, 400, { error: "Invalid JSON body" });
    return;
  }
  const player = body.player || {};
  const playerId = sanitizeText(player.id);
  if (!playerId || !playerId.startsWith("junior-")) {
    sendJson(res, 400, { error: "Only junior players can request generated photos" });
    return;
  }

  const payload = {
    player: {
      id: playerId,
      name: sanitizeText(player.name, "Junior player"),
      age: Number(player.age) || 18,
      position: sanitizeText(player.position, "hockey player"),
      nationality: sanitizeText(player.nationality, "RU"),
      teamName: sanitizeText(player.teamName),
    },
    outputKey: `junior-photos/${playerId}.png`,
    prompt: buildPrompt(player),
    negativePrompt: DEFAULT_NEGATIVE_PROMPT,
  };

  const headers = { "Content-Type": "application/json" };
  if (process.env.JUNIOR_PHOTO_WORKER_TOKEN) {
    headers.Authorization = `Bearer ${process.env.JUNIOR_PHOTO_WORKER_TOKEN}`;
  }

  const workerUrl = process.env.JUNIOR_PHOTO_WORKER_URL;
  const result = workerUrl
    ? await requestWorkerPhoto(workerUrl, headers, payload)
    : await requestOpenAiPhoto(payload);

  if (result.status !== 200) {
    sendJson(res, result.status, { error: result.error });
    return;
  }

  sendJson(res, 200, { playerId, photoUrl: result.photoUrl, provider: result.provider });
}
