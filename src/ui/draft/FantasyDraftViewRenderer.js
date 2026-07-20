import { renderDraftCapSummary } from "./DraftCapSummaryRenderer.js";
import { renderDraftHeader } from "./DraftHeaderRenderer.js";
import { renderDraftPlayerList } from "./DraftPlayerList.js";
import { renderDraftPlayerPreviewCard } from "./DraftPlayerPreviewCard.js";
import { renderDraftPositionSummaryCard } from "./DraftPositionSummaryCard.js";
import { renderDraftTeamsSummaryCard } from "./DraftTeamsSummaryCard.js";
import { renderDraftTopToolbar } from "./DraftTopToolbar.js";

const getRemainingUserPicks = (draft) => Math.max(0, (Number(draft.rounds) || 0) - Object.values(draft.userRosterByPosition || {}).flat().length);

const getSalaryCap = (draft, player) => draft.salaryCap ? {
  ...draft.salaryCap,
  remainingPicks: getRemainingUserPicks(draft),
  averageRemainingRub: getRemainingUserPicks(draft) ? Math.max(0, Number(draft.salaryCap.remainingRub) || 0) / getRemainingUserPicks(draft) : 0,
  selectedSalaryRub: player ? Number(draft.salaryCap.salaryByPlayerId?.[player.id]) || 0 : 0,
  selectedFits: !player || (Number(draft.salaryCap.userPayrollRub) || 0) + (Number(draft.salaryCap.salaryByPlayerId?.[player.id]) || 0) <= Number(draft.salaryCap.capRub),
} : null;
const getVisiblePlayers = (draft) => {
  const query = String(draft.searchQuery || "").trim().toLowerCase();
  if (!query) return draft.availablePlayers;
  return draft.availablePlayers.filter((player) => String(player.name || "").toLowerCase().includes(query));
};

export const renderFantasyDraftView = (draft, team) => {
  const visiblePlayers = getVisiblePlayers(draft);
  const selected = draft.availablePlayers.find((player) => player.id === draft.selectedPlayerId) || null;
  const preview = selected || visiblePlayers[0] || null;
  const salaryCap = getSalaryCap(draft, preview);
  const order = draft.upcomingOrder.map((item) => `<div class="draft-order-chip${item.round === draft.currentRound && item.pick === draft.currentPickInRound ? " active" : ""}"><div class="draft-order-chip-meta">R${item.round} • #${item.pick}</div><div class="draft-order-chip-name">${draft.teams.find((entry) => entry.id === item.teamId)?.name || item.teamId}</div></div>`).join("");
  const canChoose = draft.isUserTurn && selected && (!salaryCap || salaryCap.selectedFits);
  const warning = draft.message ? `<div class="draft-warning">${draft.message}</div>` : "";
  return `<div class="draft-screen"><div class="draft-top">${renderDraftHeader(team)}${renderDraftCapSummary(salaryCap, draft)}<div class="draft-order-strip">${order}</div></div>${renderDraftTopToolbar(draft)}<div class="draft-layout"><section class="draft-left"><div class="draft-card"><div class="draft-card-head"><h2>Доступные игроки</h2><div class="muted">${visiblePlayers.length} в пуле</div></div>${warning}<div class="draft-list">${renderDraftPlayerList({ ...draft, availablePlayers: visiblePlayers }, salaryCap) || '<div class="muted">Нет игроков</div>'}</div></div></section><aside class="draft-right">${renderDraftPlayerPreviewCard(preview, salaryCap, { canChoose })}<div class="draft-side-grid">${renderDraftPositionSummaryCard(draft.userRosterByPosition || {})}${renderDraftTeamsSummaryCard(draft, team)}</div></aside></div></div>`;
};
