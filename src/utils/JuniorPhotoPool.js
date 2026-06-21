const RUSSIAN_JUNIOR_PHOTOS = Object.freeze(Array.from({ length: 30 }, (_, index) =>
  `./player-photo/rus_${index + 1}.png`
));
const KAZAKH_JUNIOR_PHOTOS = Object.freeze(Array.from({ length: 10 }, (_, index) =>
  `./player-photo/kz_${index + 1}.png`
));

const PHOTO_POOLS_BY_NATIONALITY = Object.freeze({
  RU: RUSSIAN_JUNIOR_PHOTOS,
  RUS: RUSSIAN_JUNIOR_PHOTOS,
  KZ: KAZAKH_JUNIOR_PHOTOS,
  KAZ: KAZAKH_JUNIOR_PHOTOS,
});

const getStockPhotoPool = (player) => PHOTO_POOLS_BY_NATIONALITY[String(player?.nationality || "").toUpperCase()] || null;

export class JuniorPhotoPool {
  selectAvailablePhoto(player, usedPhotoUrls = []) {
    const photoPool = getStockPhotoPool(player);
    if (!photoPool) return null;
    const used = new Set(usedPhotoUrls || []);
    const available = photoPool.filter((photoUrl) => !used.has(photoUrl));
    if (!available.length) return null;
    return available[Math.floor(Math.random() * available.length)];
  }

  hasStockPhotoPool(player) {
    return Boolean(getStockPhotoPool(player));
  }
}

export const isRussianJuniorStockPhoto = (photoUrl) => RUSSIAN_JUNIOR_PHOTOS.includes(photoUrl);
export const isJuniorStockPhoto = (photoUrl) => [...RUSSIAN_JUNIOR_PHOTOS, ...KAZAKH_JUNIOR_PHOTOS].includes(photoUrl);
