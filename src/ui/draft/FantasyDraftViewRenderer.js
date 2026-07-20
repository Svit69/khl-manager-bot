import { renderDraftContractPanel, renderDraftLimitAdvice } from "./DraftContractPanel.js";
import { renderDraftCapSummary } from "./DraftCapSummaryRenderer.js";
import { renderDraftHeader } from "./DraftHeaderRenderer.js";
import { renderDraftPlayerList } from "./DraftPlayerList.js";
import { renderDraftPositionFilters } from "./DraftPositionFilters.js";
import { renderDraftNeedsGrid, renderDraftRosterPanel } from "./DraftRosterBlocks.js";
import { calculateAge, formatMillions, getNationBadge, getPlayerPhotoUrl, PHOTO_FALLBACK_ATTR } from "./DraftUiFormat.js";

const attrLabels = { shot: "Бросок", speed: "Скорость", physical: "Силовая", defense: "Оборона", skill: "Техника", reaction: "Реакция", positioning: "Позиция", athleticism: "Атлетизм", puckControl: "Контроль шайбы", mental: "Психология" };

const getRemainingUserPicks = (draft) => Math.max(0, (Number(draft.rounds) || 0) - Object.values(draft.userRosterByPosition || {}).flat().length);

const getSalaryCap = (draft, player) => draft.salaryCap ? {
  ...draft.salaryCap,
  remainingPicks: getRemainingUserPicks(draft),
  averageRemainingRub: getRemainingUserPicks(draft) ? Math.max(0, Number(draft.salaryCap.remainingRub) || 0) / getRemainingUserPicks(draft) : 0,
  selectedSalaryRub: player ? Number(draft.salaryCap.salaryByPlayerId?.[player.id]) || 0 : 0,
  selectedFits: !player || (Number(draft.salaryCap.userPayrollRub) || 0) + (Number(draft.salaryCap.salaryByPlayerId?.[player.id]) || 0) <= Number(draft.salaryCap.capRub),
} : null;

const renderPreview = (player, salaryCap) => {
  if (!player) return `<div class="muted">Игрок не выбран</div>`;
  const attrs = Object.entries(player.attributes?.attributesJson || {}).filter(([, value]) => typeof value === "number").slice(0, 5).map(([key, value]) => `<div class="draft-attr-row"><span>${attrLabels[key] || key}</span><div class="draft-attr-bar"><span style="width:${Math.max(0, Math.min(100, value))}%"></span></div><strong>${value}</strong></div>`).join("");
  const salary = salaryCap ? ` • ЗП ${formatMillions(salaryCap.selectedSalaryRub)} млн` : "";
  return `<div class="draft-preview-head"><img class="draft-preview-photo" src="${getPlayerPhotoUrl(player)}" alt="${player.name}" ${PHOTO_FALLBACK_ATTR}/><div class="draft-preview-title"><div class="draft-preview-ovr">${player.ovr}</div><div class="draft-preview-name">${player.name}</div><div class="draft-preview-meta">${player.identity.primaryPosition} • ${calculateAge(player.identity.birthDate)} лет • ${getNationBadge(player.identity.nationality)}${salary}</div></div></div>${renderDraftContractPanel(player, salaryCap)}<div class="draft-preview-attrs">${attrs || '<div class="muted">Атрибуты недоступны</div>'}</div>`;
};

const renderTeams = (draft, team) => draft.teams.map((item) => {
  const payroll = item.payrollRub !== null && item.payrollRub !== undefined ? `<small>${formatMillions(item.payrollRub)} / ${formatMillions(item.capRub)} млн</small>` : "";
  return `<div class="draft-team-row${item.id === draft.currentTeamId ? " current" : ""}${item.id === team.id ? " user" : ""}"><span class="draft-team-name">${item.name}${payroll}</span><span class="draft-team-count">${item.pickedCount}/${draft.rounds}</span></div>`;
}).join("");

export const renderFantasyDraftView = (draft, team) => {
  const selected = draft.availablePlayers.find((player) => player.id === draft.selectedPlayerId) || null;
  const preview = selected || draft.availablePlayers[0] || null;
  const salaryCap = getSalaryCap(draft, preview);
  const order = draft.upcomingOrder.map((item) => `<div class="draft-order-chip${item.round === draft.currentRound && item.pick === draft.currentPickInRound ? " active" : ""}"><div class="draft-order-chip-meta">R${item.round} • #${item.pick}</div><div class="draft-order-chip-name">${draft.teams.find((entry) => entry.id === item.teamId)?.name || item.teamId}</div></div>`).join("");
  const status = draft.isComplete ? "Драфт завершен" : (draft.isUserTurn ? `Ваш пик: ${draft.currentTeamName}` : `Пикает: ${draft.currentTeamName}`);
  const confirmDisabled = !draft.isUserTurn || !selected || (salaryCap && !salaryCap.selectedFits) ? "disabled" : "";
  const confirmText = selected ? `Задрафтовать: ${selected.name}` : "Выберите игрока";
  const action = `<div class="draft-action"><div class="draft-action-text"><div class="muted">Статус</div><div>${status}</div><div class="muted">Выбрано: ${selected ? `${selected.name} • ${selected.identity.primaryPosition} • OVR ${selected.ovr}` : "—"}</div>${renderDraftLimitAdvice(salaryCap)}${draft.message ? `<div class="draft-warning">${draft.message}</div>` : ""}</div><div class="draft-action-buttons"><button class="btn secondary" data-action="draft-cancel">Отмена</button><button class="btn" ${confirmDisabled} data-action="draft-confirm-pick">${confirmText}</button></div></div>`;
  return `<div class="draft-screen"><div class="draft-top">${renderDraftHeader(team)}${renderDraftCapSummary(salaryCap, draft)}<div class="draft-order-strip">${order}</div></div><div class="draft-layout"><section class="draft-left">${renderDraftPositionFilters(draft.filterPosition)}<div class="draft-card"><div class="draft-card-head"><h2>Доступные игроки</h2><div class="muted">${draft.availablePlayers.length} в пуле</div></div>${action}<div class="draft-list">${renderDraftPlayerList(draft, salaryCap) || '<div class="muted">Нет игроков</div>'}</div></div></section><aside class="draft-right"><div class="draft-card"><div class="draft-card-head"><h2>Просмотр игрока</h2><div class="muted">Скиллы и контракт</div></div>${renderPreview(preview, salaryCap)}</div><div class="draft-card"><div class="draft-card-head"><h2>Ваш драфт-борд</h2><div class="muted">Расторгните контракт, чтобы освободить потолок</div></div>${renderDraftNeedsGrid(draft.userRosterByPosition || {})}${renderDraftRosterPanel(draft.userRosterByPosition || {}, salaryCap)}</div><div class="draft-card"><div class="draft-card-head"><h2>Команды</h2><div class="muted">${draft.rounds} раундов • змейка</div></div><div class="draft-team-list">${renderTeams(draft, team)}</div></div></aside></div></div>`;
};
