import { PHOTO_FALLBACK_ATTR } from "../utils/PlayerPhoto.js";

const statusClass = (status) => status === "НСА" ? "nsa" : "osa";
const statusLabel = (row, formatStatus) => row.freeAgentStatus || formatStatus(row.age, row.khlGamesPlayed);
const contractLabel = (row) => row.contractEndDate || "Контракт не найден";
const parseSeasonStartYear = (season) => Number(String(season || "0/0").split("/")[0]) || 0;
const getCurrentSeasonContract = (row) => {
  const contracts = row.contracts || [];
  const currentSeason = row.currentSeasonLabel;
  const exactContract = contracts.find((contract) => contract.season === currentSeason);
  if (exactContract) return exactContract;
  return [...contracts].sort((left, right) => parseSeasonStartYear(right.season) - parseSeasonStartYear(left.season))[0] || null;
};
const formatCurrentContractSalaryLabel = (row) => {
  const currentContract = getCurrentSeasonContract(row);
  const millions = (Number(currentContract?.salaryRub) || 0) / 1000000;
  if (!millions) return "нет данных";
  return `${Number.isInteger(millions) ? millions : millions.toFixed(1)} млн ₽`;
};
const termLabel = (row) => {
  const contractSeasons = (row.contracts || []).map((contract) => parseSeasonStartYear(contract.season)).filter(Boolean);
  if (!contractSeasons.length) return "нет данных";
  const currentSeasonStart = parseSeasonStartYear(row.currentSeasonLabel) || Math.min(...contractSeasons);
  const lastSeasonStart = Math.max(...contractSeasons);
  const seasonsLeft = Math.max(0, lastSeasonStart - currentSeasonStart + 1);
  if (!seasonsLeft) return "контракт истек";
  if (seasonsLeft === 1) return "остался 1 сезон";
  if (seasonsLeft >= 2 && seasonsLeft <= 4) return `осталось ${seasonsLeft} сезона`;
  return `осталось ${seasonsLeft} сезонов`;
};
const splitName = (name = "") => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  return { first: parts.slice(0, -1).join(" "), last: parts.at(-1) || "" };
};
const renderAction = (row) => row.isRenewalLocked
  ? `<div class="contract-player-renewed"><span>✓</span><strong>ПРОДЛЕНО</strong><small>Продлен в этом сезоне</small></div>`
  : `<button class="contract-player-action" data-action="open-negotiation" data-player-id="${row.playerId}">ПРОДЛИТЬ КОНТРАКТ</button>`;

export const renderContractPlayerCard = (row, formatStatus) => {
  const status = statusLabel(row, formatStatus);
  const name = splitName(row.displayName);
  return `<article class="contract-player-card ${statusClass(status)}">
    <div class="contract-player-photo-wrap">
      <img class="contract-player-photo" src="${row.photoUrl || "./player-photo/default.png"}" alt="${row.displayName}" ${PHOTO_FALLBACK_ATTR}>
      <span>#${String(row.playerId || "").slice(-2).toUpperCase()}</span>
    </div>
    <div class="contract-player-main">
      <h3 title="${row.displayName}">${name.first ? `${name.first} ` : ""}${name.last}</h3>
      <div class="contract-player-bio"><b>${row.position}</b><span>${row.age} лет</span></div>
      <div class="contract-player-details"><div><span>Текущий контракт</span><strong>${formatCurrentContractSalaryLabel(row)}</strong></div></div>
    </div>
    <div class="contract-player-ovr"><span>OVR</span><strong>${row.ovr}</strong></div>
    <div class="contract-player-term"><span>Контракт до</span><strong>${contractLabel(row)}</strong><em>${termLabel(row)}</em></div>
    <span class="contract-player-status ${statusClass(status)}">${status}</span>
    ${renderAction(row)}
  </article>`;
};
