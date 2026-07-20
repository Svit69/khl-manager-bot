const FILTERS = Object.freeze([
  { id: "ALL", label: "Все" },
  { id: "ВРТ", label: "Вратари" },
  { id: "ЗАЩ", label: "Защитники" },
  { id: "ЛНП", label: "Левый край" },
  { id: "ЦТР", label: "Центр" },
  { id: "ПНП", label: "Правый край" },
]);

export const renderDraftPositionFilters = (activePosition) => `<div class="draft-position-tabs">
  ${FILTERS.map((item) => `<button class="draft-position-tab${activePosition === item.id ? " active" : ""}" data-action="draft-filter" data-position="${item.id}">${item.label}</button>`).join("")}
</div>`;
