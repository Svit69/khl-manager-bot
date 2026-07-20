import { getDraftAttributeSummary } from "./DraftAttributeSummary.js";
import { calculateAge, formatMillions, getNationBadge, getPlayerPhotoUrl, PHOTO_FALLBACK_ATTR } from "./DraftUiFormat.js";

const renderAttribute = (label, value) => `<div class="draft-preview-attribute"><span>${label}</span><div><i style="width:${Math.max(0, Math.min(100, value))}%"></i></div><strong>${value}</strong></div>`;

export const renderDraftPlayerPreviewCard = (player, salaryCap, context = {}) => {
  if (!player) return `<div class="muted">Игрок не выбран</div>`;
  const summary = getDraftAttributeSummary(player);
  const salary = salaryCap ? formatMillions(salaryCap.selectedSalaryRub) : "—";
  const disabled = context.canChoose ? "" : "disabled";
  return `<div class="draft-player-preview-card">
    <div class="draft-player-preview-media"><img src="${getPlayerPhotoUrl(player)}" alt="${player.name}" ${PHOTO_FALLBACK_ATTR}/><div><span>OVR</span><strong>${player.ovr}</strong></div></div>
    <h2>${player.name}</h2><p>${player.identity.primaryPosition} • ${calculateAge(player.identity.birthDate)} лет • ${getNationBadge(player.identity.nationality)}</p>
    <section class="draft-preview-contract"><span>Контракт</span><strong>${salary} млн ₽</strong></section>
    <section class="draft-preview-attributes"><div><strong>Характеристики</strong><small>(из 100)</small></div>${renderAttribute("Атака", summary.attack)}${renderAttribute("Защита", summary.defense)}</section>
    <button class="btn draft-preview-select" data-action="draft-confirm-pick" ${disabled}>Выбрать игрока</button>
    <button class="btn secondary draft-preview-favorite" data-action="draft-favorite" data-player-id="${player.id}">☆ В избранное</button>
  </div>`;
};
