import { calculateAge, formatMillions, getNationBadge, getPlayerPhotoUrl, PHOTO_FALLBACK_ATTR } from "./DraftUiFormat.js";

export const renderDraftPlayerList = (draft, salaryCap) => draft.availablePlayers.map((player) => {
  const age = calculateAge(player.identity.birthDate);
  const selectedClass = player.id === draft.selectedPlayerId ? " selected" : "";
  const salaryRub = salaryCap?.salaryByPlayerId?.[player.id] || 0;
  const salary = salaryCap ? `<div class="draft-list-row-stat"><span class="draft-list-row-stat-label">ЗП</span><strong>${formatMillions(salaryRub)}</strong></div>` : "";
  return `<button class="draft-list-row${selectedClass}" data-action="draft-select" data-player-id="${player.id}">
    <div class="draft-list-row-pos">${player.identity.primaryPosition || "—"}</div>
    <img class="player-photo" src="${getPlayerPhotoUrl(player)}" alt="${player.name}" ${PHOTO_FALLBACK_ATTR}/>
    <div class="draft-list-row-main"><div class="draft-list-row-name">${player.name}</div><div class="draft-list-row-meta">${getNationBadge(player.identity.nationality)}</div></div>
    <div class="draft-list-row-stat"><span class="draft-list-row-stat-label">OVR</span><strong>${player.ovr}</strong></div>
    <div class="draft-list-row-stat"><span class="draft-list-row-stat-label">Возраст</span><strong>${age}</strong></div>${salary}
  </button>`;
}).join("");
