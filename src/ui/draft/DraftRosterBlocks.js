import { formatMillions } from "./DraftUiFormat.js";

const TARGETS = { CTR: 5, LW: 5, RW: 5, DEF: 6, G: 2 };
const ITEMS = [
  { key: "CTR", label: "ЦТР" },
  { key: "LW", label: "ЛНП" },
  { key: "RW", label: "ПНП" },
  { key: "DEF", label: "ЗАЩ" },
  { key: "G", label: "ВРТ" },
];

export const renderDraftNeedsGrid = (userRoster) => `<div class="draft-needs-grid">${ITEMS.map((item) => {
  const current = (userRoster[item.key] || []).length;
  const target = TARGETS[item.key] || 0;
  const ratio = target ? Math.min(1, current / target) : 0;
  return `<div class="draft-need-card"><div class="draft-need-head"><span>${item.label}</span><span>${current}/${target}</span></div><div class="draft-need-bar"><span style="width:${Math.round(ratio * 100)}%"></span></div></div>`;
}).join("")}</div>`;

const renderPlayer = (player, salaryCap) => {
  const salary = salaryCap ? `<small>${formatMillions(salaryCap.salaryByPlayerId?.[player.id])} млн</small>` : "";
  return `<div class="draft-picked-player"><span>${player.name}${salary}</span><button data-action="draft-release-player" data-player-id="${player.id}">Расторгнуть</button></div>`;
};

export const renderDraftRosterPanel = (userRoster, salaryCap = null) => `<div class="draft-panel">${ITEMS.map((item) => {
  const players = userRoster[item.key] || [];
  const names = players.map((player) => renderPlayer(player, salaryCap)).join("");
  return `<div class="draft-pos"><div class="muted">${item.label} (${players.length})</div><div>${names || "—"}</div></div>`;
}).join("")}</div>`;
