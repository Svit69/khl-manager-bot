import { CalendarScheduleDateFormatter } from "./calendarSchedule/CalendarScheduleDateFormatter.js";
import { CalendarScheduleGameCardRenderer } from "./calendarSchedule/CalendarScheduleGameCardRenderer.js";
import { CalendarScheduleResultPresenter } from "./calendarSchedule/CalendarScheduleResultPresenter.js";
import { CalendarScheduleStats } from "./calendarSchedule/CalendarScheduleStats.js";
import { CalendarScheduleSummaryRenderer } from "./calendarSchedule/CalendarScheduleSummaryRenderer.js";
import { CalendarScheduleTeamPresenter } from "./calendarSchedule/CalendarScheduleTeamPresenter.js";
const FILTERS = Object.freeze([{ id: "all", label: "ВСЕ" }, { id: "home", label: "ДОМА" }, { id: "away", label: "ВЫЕЗД" }]);
export class CalendarMonthRenderer {
  #dates = new CalendarScheduleDateFormatter();
  #teams = new CalendarScheduleTeamPresenter();
  #results = new CalendarScheduleResultPresenter();
  #stats = new CalendarScheduleStats();
  #cards = new CalendarScheduleGameCardRenderer(this.#dates, this.#teams, this.#results);
  #summary = new CalendarScheduleSummaryRenderer(this.#dates, this.#stats, this.#teams);
  render(rows = [], activeTeamId = null, options = {}) {
    const matchRows = (rows || []).filter((row) => row.myMatch);
    const monthGroups = this.#getMonthGroups(matchRows);
    const currentKey = this.#dates.getMonthKey((rows || []).find((row) => row.isCurrent));
    const currentIndex = Math.max(0, monthGroups.findIndex((group) => group.key === currentKey));
    const selectedIndex = Math.max(0, Math.min(monthGroups.length - 1, currentIndex + (Number(options.monthOffset) || 0)));
    const selectedGroup = monthGroups[selectedIndex];
    if (!selectedGroup) return `<div class="calendar-schedule-empty">Нет матчей выбранной команды</div>`;
    const filteredRows = this.#filterRows(selectedGroup.rows, activeTeamId, options.filter || "all");
    return `<div class="calendar-schedule-view">
      ${this.#renderToolbar(selectedGroup, selectedIndex, monthGroups.length, options.filter || "all")}
      <div class="calendar-schedule-list">${filteredRows.map((row) => this.#cards.render(row, activeTeamId)).join("") || `<div class="calendar-schedule-empty">В этом фильтре матчей нет</div>`}</div>
      ${this.#summary.render(selectedGroup.rows, activeTeamId)}
    </div>`;
  }
  #getMonthGroups(rows) {
    const map = new Map();
    rows.forEach((row) => {
      const key = this.#dates.getMonthKey(row);
      if (!map.has(key)) map.set(key, { key, title: this.#dates.getMonthTitle(row), rows: [] });
      map.get(key).rows.push(row);
    });
    return [...map.values()];
  }
  #filterRows(rows, activeTeamId, filter) {
    if (filter === "home") return rows.filter((row) => this.#teams.isHomeMatch(row.myMatch, activeTeamId));
    if (filter === "away") return rows.filter((row) => !this.#teams.isHomeMatch(row.myMatch, activeTeamId));
    return rows;
  }
  #renderToolbar(group, selectedIndex, monthCount, filter) {
    const filterButtons = FILTERS.map((item) => `<button class="schedule-filter-btn${filter === item.id ? " active" : ""}" data-action="calendar-schedule-filter" data-filter="${item.id}">${item.label}</button>`).join("");
    const nextDisabled = selectedIndex >= monthCount - 1 ? "disabled" : "";
    return `<div class="schedule-month-toolbar"><button class="schedule-month-nav" data-action="calendar-schedule-month" data-direction="-1" ${selectedIndex <= 0 ? "disabled" : ""}>&lsaquo;</button><strong>${group.title}</strong><button class="schedule-month-nav" data-action="calendar-schedule-month" data-direction="1" ${nextDisabled}>&rsaquo;</button><div class="schedule-filter-group">${filterButtons}</div></div>`;
  }
}
