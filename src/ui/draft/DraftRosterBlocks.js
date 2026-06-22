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

export const renderDraftRosterPanel = (userRoster) => `<div class="draft-panel">${ITEMS.map((item) => {
  const players = userRoster[item.key] || [];
  const names = players.map((player) => player.name).join(", ");
  return `<div class="draft-pos"><div class="muted">${item.label} (${players.length})</div><div>${names || "—"}</div></div>`;
}).join("")}</div>`;
