const formatMillions = (value) => {
  const millions = (Number(value) || 0) / 1000000;
  return `${Number.isInteger(millions) ? millions : millions.toFixed(1)} млн`;
};

const formatDelta = (value) => {
  if (!value) return "0 млн";
  return `${value > 0 ? "+" : ""}${formatMillions(value)}`;
};

const renderTeamCap = (label, preview) => {
  const worst = preview?.worst;
  if (!worst) return "";
  const tone = worst.projectedRemainingRub < 0 ? "danger" : worst.projectedRemainingRub < 25000000 ? "warn" : "ok";
  return `<div class="trade-cap-team ${tone}">
    <div class="trade-cap-team-head"><span>${label}</span><strong>${worst.season}</strong></div>
    <div class="trade-cap-track"><span style="width:${Math.min(100, Math.max(0, worst.projectedPayrollRub / Math.max(1, worst.capRub) * 100))}%"></span></div>
    <div class="trade-cap-grid">
      <div><span>Сейчас</span><strong>${formatMillions(worst.payrollRub)}</strong></div>
      <div><span>После</span><strong>${formatMillions(worst.projectedPayrollRub)}</strong></div>
      <div><span>Изменение</span><strong>${formatDelta(worst.deltaRub)}</strong></div>
      <div><span>Останется</span><strong>${formatMillions(worst.projectedRemainingRub)}</strong></div>
    </div>
  </div>`;
};

export const renderTradeSalaryCap = (salaryCap) => {
  if (!salaryCap?.enabled) return "";
  const statusClass = salaryCap.allowed ? "ok" : "danger";
  const statusText = salaryCap.allowed ? "Пакет помещается под потолок" : "Пакет превышает потолок";
  return `<section class="trade-cap-panel ${statusClass}">
    <div class="trade-cap-head"><div><span>Потолок зарплат</span><strong>${statusText}</strong></div></div>
    <div class="trade-cap-teams">
      ${renderTeamCap("Ваш клуб", salaryCap.user)}
      ${renderTeamCap("Клуб ИИ", salaryCap.ai)}
    </div>
  </section>`;
};

export const formatTradeSalary = (salaryRub) =>
  Number(salaryRub) > 0 ? formatMillions(salaryRub) : null;
