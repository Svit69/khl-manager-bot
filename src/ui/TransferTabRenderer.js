const METHOD_LABELS = Object.freeze({
  freeAgent: "Свободный агент",
  trade: "Обмен",
  offerSheet: "ОСА",
  contractExpired: "Контракт завершен",
  juniorRelease: "Выпуск молодежки",
  retirement: "Завершение карьеры",
  rosterDepth: "Добор состава",
});

const renderTeamOptions = (teams, selectedTeamId) =>
  (teams || [])
    .map((team) => `<option value="${team.id}"${team.id === selectedTeamId ? " selected" : ""}>${team.name}</option>`)
    .join("");

const renderRows = (rows, emptyLabel, type) => {
  if (!rows.length) return `<div class="transfer-empty">${emptyLabel}</div>`;
  return rows.map((row) => {
    const meta = type === "in"
      ? `из: ${row.sourceLabel || "Свободный агент"}`
      : `статус: ${row.destinationLabel || "Свободный агент"}`;
    return `<div class="transfer-row">
      <div class="transfer-player">
        <strong title="${row.playerName}">${row.playerName}</strong>
        <span>${row.position || ""} • OVR ${row.ovr || "—"}</span>
      </div>
      <div class="transfer-meta">
        <strong>${METHOD_LABELS[row.method] || row.methodLabel || "Переход"}</strong>
        <span>${meta}</span>
      </div>
      <div class="transfer-day">День ${row.day ?? "—"}</div>
    </div>`;
  }).join("");
};

export class TransferTabRenderer {
  render(view = {}) {
    const {
      teams = [],
      selectedTeamId = "",
      selectedTeam = null,
      seasonLabel = "",
      signings = [],
      departures = [],
    } = view;

    return `<section class="transfer-shell">
      <div class="transfer-hero">
        <div>
          <span class="transfer-kicker">Движение состава</span>
          <h3>${selectedTeam?.name || "Команда"} • ${seasonLabel}</h3>
          <p>Список обновляется в течение сезона: подписания, обмены, уходы на рынок и текущий статус ушедших игроков.</p>
        </div>
        <label class="transfer-team-select">
          <span>Команда</span>
          <select data-action="transfer-team-select">${renderTeamOptions(teams, selectedTeamId)}</select>
        </label>
      </div>

      <div class="transfer-summary">
        <div><span>Подписали</span><strong>${signings.length}</strong></div>
        <div><span>Покинули</span><strong>${departures.length}</strong></div>
      </div>

      <div class="transfer-grid">
        <section class="transfer-panel">
          <div class="transfer-panel-head">
            <h4>Кого подписали</h4>
            <span>${signings.length}</span>
          </div>
          ${renderRows(signings, "В этом сезоне подписаний пока нет", "in")}
        </section>
        <section class="transfer-panel">
          <div class="transfer-panel-head">
            <h4>Кто покинул клуб</h4>
            <span>${departures.length}</span>
          </div>
          ${renderRows(departures, "В этом сезоне уходов пока нет", "out")}
        </section>
      </div>
    </section>`;
  }
}
