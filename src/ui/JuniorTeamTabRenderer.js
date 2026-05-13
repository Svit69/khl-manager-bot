import { getPlayerPhotoUrl, isPlaceholderPhoto, PHOTO_FALLBACK_ATTR } from "../utils/PlayerPhoto.js";

const getPosition = (player) => player?.identity?.primaryPosition || "-";
const getGrowth = (entry) => Math.max(0, (entry?.scoutedPotential?.high || entry?.player?.ovr || 0) - (entry?.player?.ovr || 0));

const renderPhoto = (player) =>
  `<img class="junior-manager-photo" src="${getPlayerPhotoUrl(player)}" alt="${player?.name || ""}" ${PHOTO_FALLBACK_ATTR}/>`;

const renderSummary = (label, value, accent = false) =>
  `<div class="junior-manager-summary-card${accent ? " accent" : ""}"><span>${label}</span><strong>${value}</strong></div>`;

const renderMetric = (label, value, className = "") =>
  `<span class="junior-manager-metric ${className}"><small>${label}</small><strong>${value}</strong></span>`;

const renderPlayerHead = (entry) => {
  const player = entry.player;
  return `<div class="junior-manager-player">
    ${renderPhoto(player)}
    <div class="junior-manager-player-copy">
      <strong>${player.name}</strong>
      <span>${getPosition(player)} • ${entry.age} лет на старт • ${player.identity?.nationality || "Нация не указана"}</span>
    </div>
  </div>`;
};

const renderProspect = (entry, index) => {
  const player = entry.player;
  return `<article class="junior-manager-prospect">
    <div class="junior-manager-prospect-rank">#${index + 1}</div>
    ${renderPhoto(player)}
    <div class="junior-manager-player-copy">
      <strong>${player.name}</strong>
      <span>OVR ${player.ovr} • POT ${entry.scoutedPotential.label} • ${entry.scoutedPotential.confidence}</span>
    </div>
    <div class="junior-manager-growth">+${getGrowth(entry)}</div>
  </article>`;
};

const renderPhotoAction = (player, status) => {
  if (!isPlaceholderPhoto(player.identity?.photoUrl)) return "";
  const labels = {
    loading: "Генерация...",
    ready: "Фото готово",
    error: "Повторить фото",
  };
  const label = labels[status] || "Сгенерировать фото";
  const disabled = status === "loading" ? "disabled" : "";
  return `<button class="junior-manager-action secondary" ${disabled} data-action="generate-junior-photo" data-player-id="${player.id}">${label}</button>`;
};

const renderJuniorCard = (entry, photoStatusById, photoErrorById) => {
  const player = entry.player;
  const status = entry.isGraduating ? "Выпуск" : entry.practice.label;
  const photoStatus = photoStatusById?.get?.(player.id);
  const photoError = photoErrorById?.get?.(player.id);
  return `<article class="junior-manager-card">
    <div class="junior-manager-card-top">
      ${renderPlayerHead(entry)}
      <span class="junior-manager-pill${entry.isGraduating ? " warn" : ""}">${status}</span>
    </div>
    <div class="junior-manager-metrics">
      ${renderMetric("OVR", player.ovr || 0, "rating")}
      ${renderMetric("POT", entry.scoutedPotential.label)}
      ${renderMetric("Точность", entry.scoutedPotential.confidence)}
      ${renderMetric("Практика", entry.practice.khlGames)}
      ${renderMetric("Рост", `+${getGrowth(entry)}`, "growth")}
    </div>
    <div class="junior-manager-card-actions">
      <button class="junior-manager-action secondary" data-action="promote-junior" data-player-id="${player.id}">Поднять в основу</button>
      ${renderPhotoAction(player, photoStatus)}
      ${entry.isGraduating && !entry.hasMainContract ? `<button class="junior-manager-action" data-action="sign-junior-main" data-player-id="${player.id}">Подписать основу</button>` : ""}
    </div>
    ${photoError ? `<div class="junior-manager-photo-error">${photoError}</div>` : ""}
  </article>`;
};

const renderGraduate = (entry) => {
  const player = entry.player;
  return `<article class="junior-manager-graduate${entry.hasMainContract ? " signed" : ""}">
    ${renderPlayerHead(entry)}
    <div class="junior-manager-graduate-status">
      <strong>${entry.hasMainContract ? "Контракт основы есть" : "Нужен контракт основы"}</strong>
      <span>${entry.hasMainContract ? "После сезона будет поднят в резерв" : "Без контракта уйдет в свободные агенты"}</span>
    </div>
    <button class="junior-manager-action" ${entry.hasMainContract ? "disabled" : ""} data-action="sign-junior-main" data-player-id="${player.id}">
      ${entry.hasMainContract ? "Подписан" : "Подписать основу"}
    </button>
  </article>`;
};

const renderMainRow = (entry) => {
  const player = entry.player;
  return `<article class="junior-manager-transfer">
    ${renderPhoto(player)}
    <div class="junior-manager-player-copy">
      <strong>${player.name}</strong>
      <span>${getPosition(player)} • OVR ${player.currentOvr ?? player.ovr} • POT ${entry.scoutedPotential.label}</span>
    </div>
    <button class="junior-manager-action secondary" data-action="send-to-junior" data-player-id="${player.id}">В молодежку</button>
  </article>`;
};

export class JuniorTeamTabRenderer {
  render(view) {
    if (!view?.juniorTeam) {
      return `<section class="junior-manager"><div class="junior-manager-empty">У этой команды молодежная команда пока не настроена.</div></section>`;
    }

    const players = view.players || [];
    const photoStatusById = view.photoStatusById;
    const photoErrorById = view.photoErrorById;
    const graduationClass = view.graduationClass || [];
    const mainPlayers = view.mainPlayers || [];
    const targetSize = view.targetSize || 22;
    const averageOvr = players.length
      ? Math.round(players.reduce((sum, entry) => sum + (Number(entry.player.ovr) || 0), 0) / players.length)
      : "-";
    const averageAge = players.length
      ? (players.reduce((sum, entry) => sum + entry.age, 0) / players.length).toFixed(1)
      : "-";
    const topProspects = [...players]
      .sort((left, right) =>
        (right.scoutedPotential.high - left.scoutedPotential.high) ||
        ((right.player.ovr || 0) - (left.player.ovr || 0)) ||
        left.player.name.localeCompare(right.player.name, "ru"),
      )
      .slice(0, 4);

    return `<section class="junior-manager">
      <header class="junior-manager-hero">
        <div class="junior-manager-title">
          <img src="${view.juniorTeam.logoUrl}" alt="${view.juniorTeam.name}"/>
          <div>
            <span>Молодежная команда</span>
            <h2>${view.juniorTeam.name}</h2>
            <p>${view.juniorTeam.city} • возраст на 1 сентября • потенциал показан скаутским диапазоном</p>
          </div>
        </div>
        <div class="junior-manager-summary">
          ${renderSummary("Состав", `${players.length}/${targetSize}`, true)}
          ${renderSummary("OVR ср.", averageOvr)}
          ${renderSummary("Возраст", averageAge)}
          ${renderSummary("Выпуск", graduationClass.length)}
        </div>
      </header>

      <section class="junior-manager-section">
        <div class="junior-manager-section-head">
          <div>
            <h3>Выпускной класс</h3>
            <span>Игроки, которые после сезона уже не смогут оставаться в молодежке</span>
          </div>
        </div>
        <div class="junior-manager-graduates">
          ${graduationClass.map(renderGraduate).join("") || `<div class="junior-manager-empty">В этом сезоне выпускников нет</div>`}
        </div>
      </section>

      <section class="junior-manager-section">
        <div class="junior-manager-section-head">
          <div>
            <h3>Топ-проспекты</h3>
            <span>Потенциал скрыт диапазоном: практика в основе сужает разброс</span>
          </div>
        </div>
        <div class="junior-manager-prospects">
          ${topProspects.map(renderProspect).join("") || `<div class="junior-manager-empty">Проспектов пока нет</div>`}
        </div>
      </section>

      <div class="junior-manager-board">
        <section class="junior-manager-section junior-manager-section--wide">
          <div class="junior-manager-section-head">
            <div>
              <h3>Состав молодежки</h3>
              <span>Развитие зависит от возраста, потенциала и матчей в основе за сезон</span>
            </div>
          </div>
          <div class="junior-manager-card-grid">
            ${players.map((entry) => renderJuniorCard(entry, photoStatusById, photoErrorById)).join("") || `<div class="junior-manager-empty">Состав пуст</div>`}
          </div>
        </section>

        <section class="junior-manager-section">
          <div class="junior-manager-section-head">
            <div>
              <h3>Можно опустить</h3>
              <span>Показаны только игроки, которым доступен перевод в молодежку</span>
            </div>
          </div>
          <div class="junior-manager-main-list">
            ${mainPlayers.map(renderMainRow).join("") || `<div class="junior-manager-empty">Нет доступных игроков для перевода</div>`}
          </div>
        </section>
      </div>
    </section>`;
  }
}
