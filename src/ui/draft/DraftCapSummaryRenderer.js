import { formatMillions } from "./DraftUiFormat.js";

const getPercent = (value, total) => total > 0 ? Math.max(0, Math.min(100, Math.round((value / total) * 100))) : 0;
const getPickedCount = (draft) => Object.values(draft.userRosterByPosition || {}).flat().length;
const renderMeter = (value) => `<div class="draft-summary-meter"><div class="draft-summary-meter-bar"><span style="width:${value}%"></span></div><strong>${value}%</strong></div>`;

const getRecommendedRange = (cap) => {
  const average = Number(cap?.averageRemainingRub) || 0;
  if (!average) return "—";
  const low = Math.max(1, Math.floor((average * 0.85) / 1000000));
  const high = Math.max(low, Math.ceil((average * 1.15) / 1000000));
  return `${low}–${high}`;
};

export const renderDraftCapSummary = (cap, draft) => {
  const totalPicks = Number(draft?.rounds) || 0;
  const pickedCount = getPickedCount(draft);
  const pickPercent = getPercent(pickedCount, totalPicks);
  const usedPercent = getPercent(Number(cap?.userPayrollRub) || 0, Number(cap?.capRub) || 0);
  return `<section class="draft-cap-summary">
    <div class="draft-summary-cell draft-summary-cell-picks">
      <span>ПИКИ</span><strong><em>${pickedCount}</em> / ${totalPicks}</strong><small>Выбрано / Всего</small>${renderMeter(pickPercent)}
    </div>
    <div class="draft-summary-cell">
      <span>ПОТОЛОК ЗАРПЛАТ</span><strong>${formatMillions(cap?.capRub)} млн ₽</strong><small>Использовано ${usedPercent}%</small>${renderMeter(usedPercent)}
    </div>
    <div class="draft-summary-cell">
      <span>СРЕДНЕЕ МЛН НА ПИК</span><strong>${formatMillions(cap?.averageRemainingRub)} млн ₽</strong><small><i></i>Рекомендовано ${getRecommendedRange(cap)}</small>
    </div>
    <div class="draft-summary-cell">
      <span>ОСТАЛОСЬ ПИКОВ</span><strong>${cap?.remainingPicks || 0}</strong><small>Следующий: #${draft?.pickNumber || 1}</small>
    </div>
  </section>`;
};
