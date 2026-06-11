const percent = (value) => `${Math.max(0, Math.min(100, Number(value) || 0))}%`;
const formatImpact = (value) => `${value >= 1 ? "+" : ""}${Math.round((value - 1) * 1000) / 10}%`;

const metric = (label, value) => `<div class="coach-fit-metric">
  <span>${label}</span><strong>${value || "—"}</strong><em style="width:${percent(value)}"></em>
</div>`;

const player = (entry) => `<div class="coach-fit-player">
  <span>${entry.playerName}</span><strong>${entry.fit}</strong><em>${entry.position || "—"} • OVR ${entry.ovr}</em>
</div>`;

export const renderCoachFit = (fit) => {
  if (!fit) return `<section class="coach-panel coach-fit-panel"><h3>System Fit</h3><div class="coach-empty">Недостаточно данных состава</div></section>`;
  const effect = fit.effect || {};
  return `<section class="coach-panel coach-fit-panel">
    <div class="coach-fit-head"><h3>System Fit</h3><strong>${fit.label}</strong></div>
    <div class="coach-fit-score"><span>${fit.teamFit}</span><em style="width:${percent(fit.teamFit)}"></em></div>
    <div class="coach-fit-grid">
      ${metric("Core", fit.coreFit)}
      ${metric("Forwards", fit.forwardFit)}
      ${metric("Defense", fit.defenseFit)}
    </div>
    <div class="coach-fit-impact">
      <span>Attack ${formatImpact(effect.attackMultiplier || 1)}</span>
      <span>Defense ${formatImpact(effect.defenseMultiplier || 1)}</span>
      <span>Development ${formatImpact(effect.developmentMultiplier || 1)}</span>
      <span>Fewer Penalties ${formatImpact((effect.penaltyMultiplier || 1) * -1 + 2)}</span>
    </div>
    <div class="coach-fit-lists">
      <div><b>Best Fits</b>${(fit.bestFits || []).map(player).join("")}</div>
      <div><b>Risk Fits</b>${(fit.poorFits || []).map(player).join("")}</div>
    </div>
  </section>`;
};
