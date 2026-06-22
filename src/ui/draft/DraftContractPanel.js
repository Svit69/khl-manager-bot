import { formatMillions } from "./DraftUiFormat.js";

const limitRows = [
  "Выбрать более дешевого игрока на текущую позицию.",
  "Отложить дорогую позицию и закрыть недорогой дефицит состава.",
  "Сортировать пул по зарплате и держать средний бюджет на пик.",
];

export const renderDraftContractPanel = (player, salaryCap) => {
  if (!player || !salaryCap) return "";
  const rows = salaryCap.contractByPlayerId?.[player.id] || [];
  const content = rows.length ? rows.map((row) => `<div><span>${row.season}</span><strong>${formatMillions(row.salaryRub)} млн</strong></div>`).join("") : `<div><span>Контракт</span><strong>${formatMillions(salaryCap.selectedSalaryRub)} млн</strong></div>`;
  return `<section class="draft-contract-panel"><h3>Контракт</h3><div class="draft-contract-grid">${content}</div></section>`;
};

export const renderDraftLimitAdvice = (salaryCap) => {
  if (!salaryCap || salaryCap.selectedFits) return "";
  return `<div class="draft-limit-advice"><strong>Игрок не помещается под потолок.</strong>${limitRows.map((row) => `<span>${row}</span>`).join("")}</div>`;
};
