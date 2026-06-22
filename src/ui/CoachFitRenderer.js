const percent = (value) => `${Math.max(0, Math.min(100, Number(value) || 0))}%`;
const formatImpact = (value) => `${value >= 1 ? "+" : ""}${Math.round((value - 1) * 1000) / 10}%`;
const formatPenaltyImpact = (value) => `${Math.round((1 - (Number(value) || 1)) * 1000) / 10}%`;

const metric = (label, value) => `<div class="coach-fit-metric">
  <span>${label}</span><strong>${value || "—"}</strong><em style="width:${percent(value)}"></em>
</div>`;

export const renderCoachFit = (fit) => {
  if (!fit) return `<section class="coach-panel coach-fit-panel"><h3>Подходит составу</h3><div class="coach-empty">Недостаточно данных состава</div></section>`;
  const effect = fit.effect || {};
  return `<section class="coach-panel coach-fit-panel">
    <div class="coach-fit-head"><h3>Подходит составу</h3><strong>${fit.label}</strong></div>
    <div class="coach-fit-score"><span>${fit.teamFit}</span><em style="width:${percent(fit.teamFit)}"></em></div>
    <div class="coach-fit-grid">
      ${metric("Ядро", fit.coreFit)}
      ${metric("Атака", fit.forwardFit)}
      ${metric("Защита", fit.defenseFit)}
    </div>
    <div class="coach-fit-impact">
      <span>Атака ${formatImpact(effect.attackMultiplier || 1)}</span>
      <span>Защита ${formatImpact(effect.defenseMultiplier || 1)}</span>
      <span>Рост ${formatImpact(effect.developmentMultiplier || 1)}</span>
      <span>Штрафы ${formatPenaltyImpact(effect.penaltyMultiplier || 1)}</span>
    </div>
  </section>`;
};
