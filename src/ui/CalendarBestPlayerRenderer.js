import { PHOTO_FALLBACK_ATTR } from "../utils/PlayerPhoto.js";

const splitPlayerName = (name) => {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { first: "", last: parts[0] || "" };
  return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1] };
};

const escapeHtmlAttribute = (value) => String(value || "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "\"": "&quot;",
  "'": "&#39;",
}[char]));

const pluralizePoints = (count) => {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "очко";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "очка";
  return "очков";
};

export class CalendarBestPlayerRenderer {
  render(player) {
    if (!player) return "";
    const nameParts = splitPlayerName(player.displayName);
    const fullName = escapeHtmlAttribute(player.displayName);
    const points = Number(player.points) || 0;
    const goals = Number(player.goals) || 0;
    const assists = Number(player.assists) || 0;
    return `<article class="calendar-best-player">
      <h3>ЛУЧШИЙ ИГРОК КОМАНДЫ</h3>
      <img src="${player.photoUrl || "./player-photo/default.png"}" alt="${fullName}" ${PHOTO_FALLBACK_ATTR}>
      <div class="calendar-best-player-shade"></div>
      <div class="calendar-best-player-info">
        <strong title="${fullName}">${String(nameParts.last || player.displayName || "").toUpperCase()}</strong>
        <span>${player.position || ""}</span>
        <div class="calendar-best-player-points"><b>${points}</b> ${pluralizePoints(points)}</div>
        <div class="calendar-best-player-stats">
          <div><b>${goals}</b><span>ГОЛЫ</span></div>
          <div><b>${assists}</b><span>ПЕРЕДАЧИ</span></div>
        </div>
      </div>
    </article>`;
  }
}
