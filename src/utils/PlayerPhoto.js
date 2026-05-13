export const PLACEHOLDER_PHOTO_URL = "./player-photo/placeholder.png";

const safePhotoId = (playerId) => String(playerId || "player").replace(/[^0-9A-Za-z._-]+/g, "_");

export const getGeneratedJuniorPhotoUrl = (playerId) => `./player-photo/juniors/${safePhotoId(playerId)}.png`;

export const isPlaceholderPhoto = (photoUrl) => !photoUrl || photoUrl === PLACEHOLDER_PHOTO_URL;

const JUNIOR_AVATAR_COLORS = [
  ["#18314f", "#31d0aa", "#f6f7fb"],
  ["#2d1f48", "#ffb84d", "#f6f7fb"],
  ["#173b2e", "#8fe36b", "#f6f7fb"],
  ["#402034", "#ff6f91", "#f6f7fb"],
  ["#1d2b45", "#7cc7ff", "#f6f7fb"],
  ["#3a2d18", "#f0cf6b", "#f6f7fb"],
];
const juniorAvatarCache = new Map();

const hashText = (value) => {
  let hash = 0;
  const text = String(value || "");
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
};

const getInitials = (player) => {
  const first = player?.identity?.firstName || "";
  const last = player?.identity?.lastName || player?.name || "";
  return `${first.slice(0, 1)}${last.slice(0, 1)}`.toUpperCase() || "U";
};

export const getJuniorAvatarPhotoUrl = (player) => {
  const key = player?.id || player?.identity?.id || player?.name || "junior";
  if (juniorAvatarCache.has(key)) return juniorAvatarCache.get(key);
  const [base, accent, text] = JUNIOR_AVATAR_COLORS[hashText(key) % JUNIOR_AVATAR_COLORS.length];
  const initials = getInitials(player);
  const position = player?.identity?.primaryPosition || "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
    <defs>
      <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
        <stop stop-color="${base}" offset="0"/>
        <stop stop-color="#071018" offset="1"/>
      </linearGradient>
    </defs>
    <rect width="96" height="96" rx="18" fill="url(#bg)"/>
    <circle cx="48" cy="34" r="18" fill="#d7b99a"/>
    <path d="M28 82c2-19 13-28 20-28s18 9 20 28z" fill="${accent}"/>
    <path d="M25 80c6-8 14-12 23-12s17 4 23 12v16H25z" fill="${base}"/>
    <text x="48" y="78" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="800" fill="${text}">${initials}</text>
    <text x="48" y="92" text-anchor="middle" font-family="Arial, sans-serif" font-size="9" font-weight="700" fill="${accent}">${position}</text>
  </svg>`;
  const url = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  juniorAvatarCache.set(key, url);
  return url;
};

export const getPlayerPhotoUrl = (player) => {
  const photoUrl = player?.identity?.photoUrl;
  if (!isPlaceholderPhoto(photoUrl)) return photoUrl;
  const playerId = player?.id || player?.identity?.id;
  if (String(playerId || "").startsWith("junior-")) return getJuniorAvatarPhotoUrl(player);
  return PLACEHOLDER_PHOTO_URL;
};

export const PHOTO_FALLBACK_ATTR = `onerror="this.onerror=null;this.src='${PLACEHOLDER_PHOTO_URL}'"`;
