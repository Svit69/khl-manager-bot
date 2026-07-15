import { PHOTO_FALLBACK_ATTR } from "../utils/PlayerPhoto.js";

const statusClass = (status) => status === "НСА" ? "nsa" : "osa";
const statusLabel = (row, formatStatus) => row.freeAgentStatus || formatStatus(row.age, row.khlGamesPlayed);
const contractLabel = (row) => row.contractEndDate || "Контракт не найден";
const termLabel = (row) => {
  const seasons = (row.contracts || []).length;
  if (!seasons) return "нет данных";
  if (seasons === 1) return "остался 1 год";
  if (seasons >= 2 && seasons <= 4) return `осталось ${seasons} года`;
  return `осталось ${seasons} лет`;
};
const splitName = (name = "") => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  return { first: parts.slice(0, -1).join(" "), last: parts.at(-1) || "" };
};
const renderAction = (row) => row.isRenewalLocked
  ? `<div class="contract-player-renewed"><span>✓</span><strong>ПРОДЛЕНО</strong><small>Контракт действует</small></div>`
  : `<button class="contract-player-action" data-action="open-negotiation" data-player-id="${row.playerId}">ПРОДЛИТЬ КОНТРАКТ</button>`;

export const renderContractPlayerCard = (row, formatStatus) => {
  const status = statusLabel(row, formatStatus);
  const name = splitName(row.displayName);
  const lockNotice = row.isRenewalLocked ? `<div class="contract-lock-note">${row.renewalLockReason}</div>` : "";
  return `<article class="contract-player-card ${statusClass(status)}">
    <div class="contract-player-photo-wrap">
      <img class="contract-player-photo" src="${row.photoUrl || "./player-photo/default.png"}" alt="${row.displayName}" ${PHOTO_FALLBACK_ATTR}>
      <span>#${String(row.playerId || "").slice(-2).toUpperCase()}</span>
    </div>
    <div class="contract-player-main">
      <h3 title="${row.displayName}">${name.first ? `${name.first} ` : ""}${name.last}</h3>
      <div class="contract-player-bio"><b>${row.position}</b><span>${row.age} лет</span></div>
      <div class="contract-player-details"><div><span>Позиция</span><strong>${row.position}</strong></div><div><span>Лига</span><strong>КХЛ</strong></div></div>
    </div>
    <div class="contract-player-ovr"><span>OVR</span><strong>${row.ovr}</strong></div>
    <div class="contract-player-term"><span>Контракт до</span><strong>${contractLabel(row)}</strong><em>${termLabel(row)}</em></div>
    <span class="contract-player-status ${statusClass(status)}">${status}</span>
    ${renderAction(row)}
    ${lockNotice}
  </article>`;
};
