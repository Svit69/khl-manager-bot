export const PLACEHOLDER_PHOTO_URL = "./player-photo/placeholder.png";

const safePhotoId = (playerId) => String(playerId || "player").replace(/[^0-9A-Za-z._-]+/g, "_");

export const getGeneratedJuniorPhotoUrl = (playerId) => `./player-photo/juniors/${safePhotoId(playerId)}.png`;

export const isPlaceholderPhoto = (photoUrl) => !photoUrl || photoUrl === PLACEHOLDER_PHOTO_URL;

export const getPlayerPhotoUrl = (player) => {
  const photoUrl = player?.identity?.photoUrl;
  if (!isPlaceholderPhoto(photoUrl)) return photoUrl;
  const playerId = player?.id || player?.identity?.id;
  if (String(playerId || "").startsWith("junior-")) return getGeneratedJuniorPhotoUrl(playerId);
  return PLACEHOLDER_PHOTO_URL;
};

export const PHOTO_FALLBACK_ATTR = `onerror="this.onerror=null;this.src='${PLACEHOLDER_PHOTO_URL}'"`;
