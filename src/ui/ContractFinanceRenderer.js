const formatMillions = (value) => {
  const millions = (Number(value) || 0) / 1000000;
  return Number.isInteger(millions) ? String(millions) : millions.toFixed(1);
};

const shortSeason = (season = "") => season.replace(/\/20(\d{2})$/, "/$1");
const rub = (value) => `₽ ${formatMillions(value)} млн`;
const pct = (used, cap) => Math.max(0, Math.min(100, Math.round(((Number(used) || 0) / Math.max(1, Number(cap) || 1)) * 100)));

const renderTabs = () => `<div class="contracts-tab-switcher">
  <button class="active" type="button">КОНТРАКТЫ ИГРОКОВ</button>
  <button type="button">ПРАВА НА ИГРОКОВ</button>
  <button type="button">ФИНАНСЫ</button>
</div>`;

const renderFutureSeason = (item) => `<article class="contract-future-cap-tile">
  <strong>${shortSeason(item.seasonLabel)}</strong>
  <span>Обязательства</span>
  <b>${rub(item.payrollRub)}</b>
  <span>Свободно</span>
  <em>${rub(item.remainingRub)}</em>
  <small>${item.contractCount} контрактов</small>
</article>`;

const renderCapDashboard = (cap) => {
  if (!cap?.enabled) return "";
  const fill = pct(cap.payrollRub, cap.capRub);
  return `<section class="contract-finance-panel">
    <div class="contract-current-cap">
      <h3>ПОТОЛОК ЗАРПЛАТ <span>${cap.seasonLabel}</span></h3>
      <div class="contract-cap-metrics">
        <div><span>ПОТОЛОК</span><strong>${rub(cap.capRub)}</strong></div>
        <div><span>ЗАПОЛНЕНО</span><strong>${rub(cap.payrollRub)}</strong></div>
        <div><span>ОСТАЛОСЬ</span><strong>${rub(cap.remainingRub)}</strong></div>
      </div>
      <div class="contract-cap-progress-label"><span>Заполнено: ${rub(cap.payrollRub)} из ${rub(cap.capRub)}</span><b>${fill}%</b></div>
      <div class="contract-cap-progress"><span style="width:${fill}%"></span></div>
      <small>Минимальный пол: ${rub(cap.floorRub || 0)}</small>
    </div>
    <div class="contract-future-cap">
      <h3>ПОТОЛОК НА СЛЕДУЮЩИЕ СЕЗОНЫ</h3>
      <div>${(cap.futureSeasons || []).map(renderFutureSeason).join("")}</div>
    </div>
  </section>`;
};

export const renderContractFinanceHeader = (cap) => `${renderTabs()}${renderCapDashboard(cap)}`;
