import { renderDraftPositionFilters } from "./DraftPositionFilters.js";

const SORTS = Object.freeze([
  { id: "ovr", label: "Рейтинг" },
  { id: "position", label: "Позиция" },
  { id: "age", label: "Возраст" },
]);
const escapeAttribute = (value) => String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char]));

export const renderDraftTopToolbar = (draft) => `<div class="draft-top-toolbar">
  ${renderDraftPositionFilters(draft.filterPosition)}
  <div class="draft-search-box"><input type="search" data-action="draft-search" value="${escapeAttribute(draft.searchQuery)}" placeholder="Поиск игрока..."/><span>⌕</span></div>
  <label class="draft-sort-box"><span>Сортировка:</span><select data-action="draft-sort-select">
    ${SORTS.map((item) => `<option value="${item.id}"${draft.sortBy === item.id ? " selected" : ""}>${item.label}</option>`).join("")}
  </select></label>
</div>`;
