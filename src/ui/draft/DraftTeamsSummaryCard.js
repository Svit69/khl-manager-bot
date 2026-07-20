import { formatMillions } from "./DraftUiFormat.js";

const getCapPercent = (team) => team.capRub ? Math.min(100, Math.round(((Number(team.payrollRub) || 0) / team.capRub) * 100)) : 0;

export const renderDraftTeamsSummaryCard = (draft, activeTeam) => {
  const rows = (draft.teams || []).filter((team) => team.id !== activeTeam.id).map((team) => {
    const percent = getCapPercent(team);
    const payroll = team.capRub ? `${formatMillions(team.payrollRub)} / ${formatMillions(team.capRub)}` : "—";
    return `<div class="draft-team-summary-row"><img src="${team.logoUrl || ""}" alt="${team.name}"/><span>${team.name}</span><strong>${team.pickedCount}/${draft.rounds}</strong><em>${payroll}</em><i><b style="width:${percent}%"></b></i></div>`;
  }).join("");
  return `<section class="draft-side-card"><h2>Другие команды</h2><div class="draft-team-summary-head"><span>Команда</span><span>Пики</span><span>Контракты / потолок</span></div><div class="draft-team-summary-list">${rows}</div></section>`;
};
