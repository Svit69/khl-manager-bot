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

const sendJson = (res, status, payload) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  const workerUrl = process.env.JUNIOR_PHOTO_WORKER_URL;
  if (!workerUrl) {
    sendJson(res, 503, { error: "JUNIOR_PHOTO_WORKER_URL is not configured" });
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

  const response = await fetch(workerUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: text || "Invalid worker response" };
  }

  if (!response.ok) {
    sendJson(res, response.status, { error: data.error || "Photo worker failed" });
    return;
  }

  const photoUrl = data.photoUrl || data.url || data.imageUrl;
  if (!photoUrl) {
    sendJson(res, 502, { error: "Photo worker did not return photoUrl" });
    return;
  }

  sendJson(res, 200, { playerId, photoUrl });
}
