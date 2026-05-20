export const PLACEHOLDER_PHOTO_URL = "./player-photo/default.png";
export const LEGACY_PLACEHOLDER_PHOTO_URL = "./player-photo/placeholder.png";

export const isPlaceholderPhoto = (photoUrl) =>
  !photoUrl || photoUrl === PLACEHOLDER_PHOTO_URL || photoUrl === LEGACY_PLACEHOLDER_PHOTO_URL;

export const getPlayerPhotoUrl = (player) => {
  const photoUrl = player?.identity?.photoUrl;
  if (!isPlaceholderPhoto(photoUrl)) return photoUrl;
  return PLACEHOLDER_PHOTO_URL;
};

export const PHOTO_FALLBACK_ATTR = `onerror="this.onerror=null;this.src='${PLACEHOLDER_PHOTO_URL}'"`;
