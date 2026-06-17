const RUSSIAN_JUNIOR_PHOTOS = Object.freeze(Array.from({ length: 25 }, (_, index) =>
  `./player-photo/rus_${index + 1}.png`
));

const isRussian = (player) => String(player?.nationality || "").toUpperCase() === "RU";

export class JuniorPhotoPool {
  selectAvailablePhoto(player, usedPhotoUrls = []) {
    if (!isRussian(player)) return null;
    const used = new Set(usedPhotoUrls || []);
    const available = RUSSIAN_JUNIOR_PHOTOS.filter((photoUrl) => !used.has(photoUrl));
    if (!available.length) return null;
    return available[Math.floor(Math.random() * available.length)];
  }
}

export const isRussianJuniorStockPhoto = (photoUrl) => RUSSIAN_JUNIOR_PHOTOS.includes(photoUrl);
