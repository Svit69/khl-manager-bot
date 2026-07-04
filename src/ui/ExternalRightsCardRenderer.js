import { PHOTO_FALLBACK_ATTR } from "../utils/PlayerPhoto.js";
import { formatInterestPercent, formatInterestReasons, getNameFitClass, splitPlayerDisplayName } from "./ExternalRightsCardFormatters.js";

const renderExternalRightsCard = (row) => {
  const { firstName, lastName } = splitPlayerDisplayName(row.displayName);
  const rightsClass = row.isActiveTeamRights ? "is-owned" : "";
  const contractLabel = row.contractUntil ? `До ${row.contractUntil}` : "Без контракта";
  const interestPercent = formatInterestPercent(row.returnInterestScore);
  const interestClass = row.returnInterestScore >= 67 ? "high" : row.returnInterestScore >= 42 ? "medium" : "low";
  const reasons = formatInterestReasons(row.returnInterestReasons);
  return `<div class="external-player-card ${rightsClass}">
    <div class="external-player-card-top">
      <img class="external-player-photo" src="${row.photoUrl}" alt="${row.displayName}" ${PHOTO_FALLBACK_ATTR}>
      <div class="external-player-name" title="${row.displayName}">
        <span>${firstName}</span>
        <strong class="${getNameFitClass(row.displayName)}">${lastName}</strong>
      </div>
    </div>
    <div class="external-player-main">
      <div class="external-player-bio"><span>${row.age} лет</span><strong>${row.position || "Игрок"}</strong></div>
      <div class="external-player-ovr"><span>Рейтинг</span><strong>${row.ovr}</strong></div>
    </div>
    <div class="external-player-details">
      <div><span>Лига</span><strong>${row.league}</strong></div>
      <div><span>Контракт до</span><strong>${contractLabel}</strong></div>
    </div>
    <div class="external-player-interest">
      <span>Интерес к КХЛ</span>
      <b class="external-interest-ring ${interestClass}" style="--interest:${interestPercent}"></b>
      <strong>${interestPercent}</strong>
      ${reasons ? `<button class="external-reason-tip" title="${reasons}" aria-label="Причины интереса">i</button>` : ""}
    </div>
    ${row.isActiveTeamRights ? '<b class="external-rights-owned">Ваши права</b>' : ""}
  </div>`;
};

export const renderExternalRightsPanel = (rows = []) => {
  if (!rows.length) return "";
  const cards = rows.map((row) => renderExternalRightsCard(row)).join("");
  return `<section class="external-players-panel">
    <div class="external-players-head">
      <div><h3>Права на игроков</h3><p>Игроки за океаном, которые могут вернуться через окно оффера</p></div>
      <span>${rows.length}</span>
    </div>
    <div class="external-player-grid">${cards}</div>
  </section>`;
};
