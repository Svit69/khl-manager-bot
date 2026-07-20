import { calculateAge } from "../../contracts/SeasonUtils.js";
import { getPlayerPhotoUrl, PHOTO_FALLBACK_ATTR } from "../../utils/PlayerPhoto.js";

export { calculateAge, getPlayerPhotoUrl, PHOTO_FALLBACK_ATTR };

export const formatMillions = (value) => {
  const millions = (Number(value) || 0) / 1000000;
  return Number.isInteger(millions) ? String(millions) : millions.toFixed(1);
};

export const getNationBadge = (nationality) => `<span class="nation-badge-inline"><span>${String(nationality || "N/A").trim().toUpperCase()}</span></span>`;
