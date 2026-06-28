const RUSSIAN_JUNIOR_PHOTOS = Object.freeze(Array.from({ length: 60 }, (_, index) =>
  `./player-photo/rus_${index + 1}.png`
));
const KAZAKH_JUNIOR_PHOTOS = Object.freeze(Array.from({ length: 10 }, (_, index) =>
  `./player-photo/kz_${index + 1}.png`
));

const PHOTO_POOLS_BY_NATIONALITY = Object.freeze({
  RU: RUSSIAN_JUNIOR_PHOTOS,
  RUS: RUSSIAN_JUNIOR_PHOTOS,
  RUSSIA: RUSSIAN_JUNIOR_PHOTOS,
  РОССИЯ: RUSSIAN_JUNIOR_PHOTOS,
  BY: RUSSIAN_JUNIOR_PHOTOS,
  BLR: RUSSIAN_JUNIOR_PHOTOS,
  BELARUS: RUSSIAN_JUNIOR_PHOTOS,
  БЕЛАРУСЬ: RUSSIAN_JUNIOR_PHOTOS,
  KZ: KAZAKH_JUNIOR_PHOTOS,
  KAZ: KAZAKH_JUNIOR_PHOTOS,
  KAZAKHSTAN: KAZAKH_JUNIOR_PHOTOS,
  КАЗАХСТАН: KAZAKH_JUNIOR_PHOTOS,
});

const getStockPhotoPool = (player) => PHOTO_POOLS_BY_NATIONALITY[String(player?.nationality || player?.identity?.nationality || "").toUpperCase()] || null;
const hashText = (value) =>
  [...String(value || "")].reduce((hash, char) => Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0, 2166136261);

export class JuniorPhotoPool {
  selectAvailablePhoto(player, usedPhotoUrls = [], seed = "") {
    const photoPool = getStockPhotoPool(player);
    if (!photoPool) return null;
    const used = new Set(usedPhotoUrls || []);
    const available = photoPool.filter((photoUrl) => !used.has(photoUrl));
    if (!available.length) return null;
    return available[hashText(`${player?.id || ""}:${seed}`) % available.length];
  }

  hasStockPhotoPool(player) {
    return Boolean(getStockPhotoPool(player));
  }
}

export const isRussianJuniorStockPhoto = (photoUrl) => RUSSIAN_JUNIOR_PHOTOS.includes(photoUrl);
export const isJuniorStockPhoto = (photoUrl) => [...RUSSIAN_JUNIOR_PHOTOS, ...KAZAKH_JUNIOR_PHOTOS].includes(photoUrl);
