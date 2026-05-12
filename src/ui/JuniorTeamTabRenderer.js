import { calculateAge } from "../contracts/SeasonUtils.js";
import { getJuniorSeasonAge } from "../season/JuniorEligibility.js";

const getPosition = (player) => player?.identity?.primaryPosition || "-";
const getPotential = (player) => player?.potential?.potential || player?.ovr || 0;
const getCurrentAge = (player) => calculateAge(player?.identity?.birthDate);
const getSeasonAge = (player, seasonLabel) => getJuniorSeasonAge(player, seasonLabel);
const getGrowth = (player) => Math.max(0, getPotential(player) - (player?.ovr || 0));

const renderPhoto = (player) =>
  `<img class="junior-manager-photo" src="${player?.identity?.photoUrl || "./player-photo/placeholder.png"}" alt="${player?.name || ""}"/>`;

const renderSummary = (label, value, accent = false) =>
  `<div class="junior-manager-summary-card${accent ? " accent" : ""}"><span>${label}</span><strong>${value}</strong></div>`;

const renderProspect = (seasonLabel) => (player, index) => `
  <article class="junior-manager-prospect">
    <div class="junior-manager-prospect-rank">#${index + 1}</div>
    ${renderPhoto(player)}
    <div class="junior-manager-player-copy">
      <strong>${player.name}</strong>
      <span>${getPosition(player)} • ${getSeasonAge(player, seasonLabel)} лет на старт • OVR ${player.ovr}</span>
    </div>
    <div class="junior-manager-growth">+${getGrowth(player)}</div>
  </article>
`;

const renderJuniorRow = (seasonLabel) => (player, index) => `
  <article class="junior-manager-row">
    <span class="junior-manager-rank">${index + 1}</span>
    <div class="junior-manager-player">
      ${renderPhoto(player)}
      <div class="junior-manager-player-copy">
        <strong>${player.name}</strong>
        <span>${player.identity?.nationality || "Нация не указана"}</span>
      </div>
    </div>
    <span class="junior-manager-cell" data-label="Поз.">${getPosition(player)}</span>
    <span class="junior-manager-cell" data-label="Возраст">${getSeasonAge(player, seasonLabel)}</span>
    <span class="junior-manager-rating" data-label="OVR">${player.ovr || 0}</span>
    <span class="junior-manager-cell" data-label="POT">${getPotential(player)}</span>
    <span class="junior-manager-growth" data-label="Рост">+${getGrowth(player)}</span>
    <button class="junior-manager-action" data-action="promote-junior" data-player-id="${player.id}">В основу</button>
  </article>
`;

const renderMainRow = ({ player, canSend, reason }, seasonLabel) => `
  <article class="junior-manager-row junior-manager-row--main${canSend ? "" : " disabled"}">
    <span class="junior-manager-rank">${getPosition(player)}</span>
    <div class="junior-manager-player">
      ${renderPhoto(player)}
      <div class="junior-manager-player-copy">
        <strong>${player.name}</strong>
        <span>${getSeasonAge(player, seasonLabel)} лет на старт • сейчас ${getCurrentAge(player)} • OVR ${player.currentOvr ?? player.ovr}</span>
      </div>
    </div>
    <span class="junior-manager-contract${canSend ? " eligible" : ""}">${canSend ? "Доступен" : "Недоступен"}</span>
    <button class="junior-manager-action secondary" ${canSend ? "" : "disabled"} data-action="send-to-junior" data-player-id="${player.id}">
      ${canSend ? "В молодежку" : reason || "Нельзя перевести"}
    </button>
  </article>
`;

export class JuniorTeamTabRenderer {
  render(view) {
    if (!view?.juniorTeam) {
      return `<section class="junior-manager"><div class="junior-manager-empty">У этой команды молодежная команда пока не настроена.</div></section>`;
    }

    const seasonLabel = view.seasonLabel;
    const players = view.players || [];
    const mainPlayers = view.mainPlayers || [];
    const targetSize = view.targetSize || 22;
    const averageOvr = players.length
      ? Math.round(players.reduce((sum, player) => sum + (Number(player.ovr) || 0), 0) / players.length)
      : "-";
    const averageAge = players.length
      ? (players.reduce((sum, player) => sum + getSeasonAge(player, seasonLabel), 0) / players.length).toFixed(1)
      : "-";
    const topProspects = [...players]
      .sort((left, right) => (getPotential(right) - getPotential(left)) || ((right.ovr || 0) - (left.ovr || 0)))
      .slice(0, 4);
    const eligibleMainPlayers = mainPlayers.filter((item) => item.canSend);
    const sortedMainPlayers = [...mainPlayers].sort((left, right) =>
      Number(right.canSend) - Number(left.canSend) ||
      ((right.player.currentOvr ?? right.player.ovr) - (left.player.currentOvr ?? left.player.ovr)) ||
      left.player.name.localeCompare(right.player.name, "ru"),
    );

    return `<section class="junior-manager">
      <header class="junior-manager-hero">
        <div class="junior-manager-title">
          <img src="${view.juniorTeam.logoUrl}" alt="${view.juniorTeam.name}"/>
          <div>
            <span>Молодежная команда</span>
            <h2>${view.juniorTeam.name}</h2>
            <p>${view.juniorTeam.city} • возраст считается на 1 сентября сезона • перевод вниз только по трехстороннему контракту</p>
          </div>
        </div>
        <div class="junior-manager-summary">
          ${renderSummary("Состав", `${players.length}/${targetSize}`, true)}
          ${renderSummary("OVR ср.", averageOvr)}
          ${renderSummary("Возраст", averageAge)}
          ${renderSummary("Можно вниз", eligibleMainPlayers.length)}
        </div>
      </header>

      <section class="junior-manager-section">
        <div class="junior-manager-section-head">
          <div>
            <h3>Топ-проспекты</h3>
            <span>Лучшие игроки молодежки по потенциалу и текущему рейтингу</span>
          </div>
        </div>
        <div class="junior-manager-prospects">
          ${topProspects.map(renderProspect(seasonLabel)).join("") || `<div class="junior-manager-empty">Проспектов пока нет</div>`}
        </div>
      </section>

      <div class="junior-manager-board">
        <section class="junior-manager-section junior-manager-section--wide">
          <div class="junior-manager-section-head">
            <div>
              <h3>Состав молодежки</h3>
              <span>В молодежке могут быть только игроки, которым не больше 20 лет на старте сезона</span>
            </div>
          </div>
          <div class="junior-manager-table">
            <div class="junior-manager-table-head">
              <span>#</span><span>Игрок</span><span>Поз.</span><span>Возраст</span><span>OVR</span><span>POT</span><span>Рост</span><span></span>
            </div>
            <div class="junior-manager-table-body">
              ${players.map(renderJuniorRow(seasonLabel)).join("") || `<div class="junior-manager-empty">Состав пуст</div>`}
            </div>
          </div>
        </section>

        <section class="junior-manager-section">
          <div class="junior-manager-section-head">
            <div>
              <h3>Перевод из основы</h3>
              <span>Доступны только игроки с трехсторонним контрактом и возрастом до 20 на 1 сентября</span>
            </div>
          </div>
          <div class="junior-manager-main-list">
            ${sortedMainPlayers.map((item) => renderMainRow(item, seasonLabel)).join("") || `<div class="junior-manager-empty">Игроков нет</div>`}
          </div>
        </section>
      </div>
    </section>`;
  }
}
