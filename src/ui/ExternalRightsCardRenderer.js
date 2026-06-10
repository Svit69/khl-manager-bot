import { PHOTO_FALLBACK_ATTR } from "../utils/PlayerPhoto.js";

const getNameFitClass = (name = "") => name.length > 28 ? "name-fit-xs" : name.length > 22 ? "name-fit-sm" : "";
const formatReasons = (reasons = []) =>
  reasons.map((reason) => `${reason.value >= 0 ? "+" : ""}${reason.value} ${reason.text}`).join(" • ");

const renderExternalRightsCard = (row) => {
  const rightsClass = row.isActiveTeamRights ? "is-owned" : "";
  const availability = row.availableToKhl
    ? '<span class="external-player-state available">Доступен</span>'
    : '<span class="external-player-state contract">Контракт NHL/AHL</span>';
  const contractLabel = row.contractUntil ? `До ${row.contractUntil}` : "Без контракта";
  const offerClass = row.offerWindow?.canOffer ? "available" : "locked";
  const offerLabel = row.offerWindow?.canOffer ? (row.offerWindow?.label || "Можно сделать оффер") : "Оффер после освобождения";
  const reasons = formatReasons(row.returnInterestReasons);
  return `<div class="external-player-card ${rightsClass}">
    <div class="external-player-identity">
      <img class="external-player-photo" src="${row.photoUrl}" alt="${row.displayName}" ${PHOTO_FALLBACK_ATTR}>
      <div class="external-player-core">
        <div class="external-player-name"><strong class="${getNameFitClass(row.displayName)}" title="${row.displayName}">${row.displayName}</strong>${availability}</div>
        <span>${row.position} • ${row.age} лет • ${row.league}</span>
      </div>
      <div class="external-player-ovr"><span>OVR</span><strong>${row.ovr}</strong></div>
    </div>
    <div class="external-player-meta">
      <div class="external-player-stat"><span>Соглашение</span><strong>${contractLabel}</strong></div>
      <div class="external-player-stat"><span>Права</span><strong>${row.rightsTeamName}</strong></div>
      <div class="external-player-stat"><span>Интерес</span><strong>${row.returnInterestLabel} ${row.returnInterestScore ?? 0}/100</strong></div>
      <div class="external-player-footer"><span class="external-player-state ${offerClass}">${offerLabel}</span>${reasons ? `<button class="external-reason-tip" title="${reasons}" aria-label="Причины интереса">i</button>` : ""}${row.isActiveTeamRights ? '<b class="external-rights-owned">Ваши права</b>' : ""}</div>
    </div>
  </div>`;
};

export const renderExternalRightsPanel = (rows = []) => {
  if (!rows.length) return "";
  const cards = rows.map((row) => renderExternalRightsCard(row)).join("");
  return `<section class="external-players-panel">
    <div class="external-players-head">
      <div><h3>Права НХЛ / АХЛ</h3><p>Игроки остаются в системе клуба и могут вернуться через окно оффера</p></div>
      <span>${rows.length}</span>
    </div>
    <div class="external-player-grid">${cards}</div>
  </section>`;
};
