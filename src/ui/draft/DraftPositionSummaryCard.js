const TARGETS = { G: 2, DEF: 6, CTR: 5, LW: 5, RW: 5 };
const ITEMS = [{ key: "G", label: "ВРТ" }, { key: "DEF", label: "ЗАЩ" }, { key: "CTR", label: "ЦТР" }, { key: "LW", label: "ЛКР" }, { key: "RW", label: "ПКР" }];

export const renderDraftPositionSummaryCard = (userRoster = {}) => {
  const total = Object.values(userRoster).flat().length;
  const rows = ITEMS.map((item) => {
    const current = (userRoster[item.key] || []).length;
    const target = TARGETS[item.key] || 1;
    return `<div class="draft-position-summary-row"><span>${item.label}</span><strong>${current} / ${target}</strong><i><b style="width:${Math.min(100, Math.round((current / target) * 100))}%"></b></i></div>`;
  }).join("");
  return `<section class="draft-side-card"><h2>Выбранные позиции</h2><div class="draft-position-summary">${rows}</div><footer>Всего игроков: ${total} / ${Object.values(TARGETS).reduce((sum, value) => sum + value, 0)}</footer></section>`;
};
