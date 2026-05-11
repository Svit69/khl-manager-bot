import { calculateAge } from "../contracts/SeasonUtils.js";

const getPosition = (player) => player?.identity?.primaryPosition || "—";
const getPotential = (player) => player?.potential?.potential || player?.ovr || 0;
const getAge = (player) => calculateAge(player?.identity?.birthDate);

const renderPlayerPhoto = (player, className = "junior-player-photo") =>
  `<img class="${className}" src="${player?.identity?.photoUrl || "./player-photo/placeholder.png"}" alt="${player?.name || ""}"/>`;

const renderStat = (label, value) =>
  `<div class="junior-stat"><span>${label}</span><strong>${value}</strong></div>`;

const renderProspectCard = (player, index) => {
  if (!player) return "";
  const gap = Math.max(0, getPotential(player) - (player.ovr || 0));
  return `<article class="junior-prospect-card">
    <div class="junior-prospect-rank">#${index + 1}</div>
    ${renderPlayerPhoto(player, "junior-prospect-photo")}
    <div class="junior-prospect-main">
      <strong>${player.name}</strong>
      <span>${getPosition(player)} • ${getAge(player)} лет • OVR ${player.ovr}</span>
    </div>
    <div class="junior-prospect-growth">+${gap}</div>
  </article>`;
};

const renderJuniorRow = (player) => {
  const age = getAge(player);
  const potential = getPotential(player);
  const gap = Math.max(0, potential - (player.ovr || 0));
  return `<article class="junior-row">
    <div class="junior-row-player">
      ${renderPlayerPhoto(player)}
      <div class="junior-row-copy">
        <strong>${player.name}</strong>
        <span>${getPosition(player)} • ${age} лет • ${player.identity?.nationality || "—"}</span>
      </div>
    </div>
    <div class="junior-row-metrics">
      ${renderStat("OVR", player.ovr || 0)}
      ${renderStat("POT", potential)}
      ${renderStat("Рост", `+${gap}`)}
    </div>
    <button class="junior-action-btn" data-action="promote-junior" data-player-id="${player.id}">В основу</button>
  </article>`;
};

const renderMainRow = ({ player, canSend }) => {
  const disabled = canSend ? "" : "disabled";
  const label = canSend ? "В молодежку" : "Нужен 3-сторонний";
  return `<article class="junior-row junior-row--main">
    <div class="junior-row-player">
      ${renderPlayerPhoto(player)}
      <div class="junior-row-copy">
        <strong>${player.name}</strong>
        <span>${getPosition(player)} • ${getAge(player)} лет • OVR ${player.ovr || 0}</span>
      </div>
    </div>
    <div class="junior-contract-pill${canSend ? " eligible" : ""}">${canSend ? "3-сторонний" : "Основной контракт"}</div>
    <button class="junior-action-btn secondary" ${disabled} data-action="send-to-junior" data-player-id="${player.id}">${label}</button>
  </article>`;
};

export class JuniorTeamTabRenderer {
  render(view) {
    if (!view?.juniorTeam) {
      return `<section class="junior-shell"><div class="junior-empty">У этой команды молодежная команда пока не настроена.</div></section>`;
    }
    const players = view.players || [];
    const mainPlayers = view.mainPlayers || [];
    const targetSize = view.targetSize || 22;
    const averageOvr = players.length
      ? Math.round(players.reduce((sum, player) => sum + (Number(player.ovr) || 0), 0) / players.length)
      : 0;
    const averageAge = players.length
      ? (players.reduce((sum, player) => sum + getAge(player), 0) / players.length).toFixed(1)
      : "—";
    const topProspects = [...players]
      .sort((left, right) => (getPotential(right) - getPotential(left)) || ((right.ovr || 0) - (left.ovr || 0)))
      .slice(0, 3);
    const eligibleCount = mainPlayers.filter((item) => item.canSend).length;

    return `<section class="junior-shell">
      <div class="junior-hero">
        <div class="junior-hero-main">
          <img class="junior-hero-logo" src="${view.juniorTeam.logoUrl}" alt="${view.juniorTeam.name}"/>
          <div>
            <div class="junior-kicker">Молодежная команда</div>
            <h2>${view.juniorTeam.name}</h2>
            <p>${view.juniorTeam.city} • игроки 16-20 лет • перевод доступен только по трехстороннему контракту</p>
          </div>
        </div>
        <div class="junior-hero-stats">
          ${renderStat("Игроки", `${players.length}/${targetSize}`)}
          ${renderStat("OVR ср.", averageOvr || "—")}
          ${renderStat("Возраст", averageAge)}
          ${renderStat("Можно вниз", eligibleCount)}
        </div>
      </div>
      <div class="junior-grid">
        <section class="junior-panel">
          <div class="junior-panel-head">
            <div><h3>Топ-проспекты</h3><span>Лучшие по потенциалу и рейтингу</span></div>
          </div>
          <div class="junior-prospect-list">${topProspects.map(renderProspectCard).join("") || `<div class="junior-empty">Проспектов пока нет</div>`}</div>
        </section>
        <section class="junior-panel junior-panel--list">
          <div class="junior-panel-head">
            <div><h3>Состав молодежки</h3><span>Поднять игрока можно в запас основной команды</span></div>
          </div>
          <div class="junior-list">${players.map(renderJuniorRow).join("") || `<div class="junior-empty">Состав пуст</div>`}</div>
        </section>
        <section class="junior-panel junior-panel--list">
          <div class="junior-panel-head">
            <div><h3>Основная команда</h3><span>Отправка вниз доступна только для трехсторонних контрактов</span></div>
          </div>
          <div class="junior-list">${mainPlayers.map(renderMainRow).join("") || `<div class="junior-empty">Игроков нет</div>`}</div>
        </section>
      </div>
    </section>`;
  }
}
