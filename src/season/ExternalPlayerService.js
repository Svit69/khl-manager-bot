import { getUfaStatus } from "../contracts/RenewalScoring.js";
import { calculateAge, clamp, parseSeasonEnd } from "../contracts/SeasonUtils.js";

const STATUS_LABELS = Object.freeze({
  nhl_regular: "Игрок основы НХЛ",
  nhl_depth: "Глубина состава НХЛ",
  ahl_leader: "Лидер АХЛ",
  ahl_bubble: "На границе НХЛ / АХЛ",
  released: "Освобожден клубом",
  rights_only: "Права без контракта",
});

const stableUnit = (source) => {
  let hash = 2166136261;
  String(source || "").split("").forEach((char) => {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  });
  return (hash >>> 0) / 4294967295;
};

const addSeasonYears = (seasonLabel, years) => {
  const startYear = Number(String(seasonLabel || "").split("/")[0]) || 2025;
  return `${startYear + years}/${startYear + years + 1}`;
};

const hasActiveExternalContract = (contractUntil, seasonLabel) =>
  Boolean(contractUntil) && parseSeasonEnd(contractUntil) >= parseSeasonEnd(seasonLabel);

const getRoleStatus = (player, career, seasonLabel) => {
  const noise = (stableUnit(`${player.id}:${seasonLabel}:role`) - 0.5) * 5;
  const fitScore =
    (Number(player.ovr) || 0) +
    (Number(player.potential?.potential) || Number(player.ovr) || 0) * 0.06 +
    (Number(career.nhlAmbition) || 0) * 0.035 +
    noise;
  if (fitScore >= 86) return "nhl_regular";
  if (fitScore >= 81) return "nhl_depth";
  if (fitScore >= 76) return "ahl_leader";
  return "ahl_bubble";
};

const getReturnInterest = (player, career, age, roleStatus, seasonLabel) => {
  const roleModifier = {
    nhl_regular: -28,
    nhl_depth: -12,
    ahl_leader: 5,
    ahl_bubble: 18,
  }[roleStatus] || 0;
  const ovr = Number(player.ovr) || 0;
  const potential = Number(player.potential?.potential) || ovr;
  const ageModifier = age >= 33 ? 24 : age >= 30 ? 18 : age >= 28 ? 12 : age >= 27 ? 8 : age <= 22 ? -8 : 0;
  const ceilingModifier = (ovr < 76 ? 14 : ovr < 80 ? 9 : 0) + (potential < 82 ? 7 : 0) + (age >= 29 && roleStatus !== "nhl_regular" ? 8 : 0);
  const noise = (stableUnit(`${player.id}:${seasonLabel}:return`) - 0.5) * 14;
  return Math.round(clamp(
    (Number(career.returnPreference) || 0) -
      (Number(career.nhlAmbition) || 0) * 0.35 +
      (Number(career.seasonsOutsideKhl) || 0) * 4 +
      roleModifier +
      ageModifier +
      ceilingModifier +
      noise,
    0,
    100,
  ));
};

const shouldExtendExternalContract = (player, career, roleStatus, seasonLabel) => {
  const roleModifier = {
    nhl_regular: 32,
    nhl_depth: 18,
    ahl_leader: 8,
    ahl_bubble: -12,
  }[roleStatus] || 0;
  const age = calculateAge(player.identity?.birthDate, `${parseSeasonEnd(seasonLabel)}-05-31`);
  const nonElitePenalty = ((Number(player.ovr) || 0) < 80 ? 10 : 0) + (age >= 30 ? 12 : age >= 28 ? 6 : 0);
  const chance = clamp(
    18 +
      roleModifier +
      ((Number(player.ovr) || 0) - 75) * 2.5 +
      (Number(career.nhlAmbition) || 0) * 0.35 -
      (Number(career.returnPreference) || 0) * 0.25 -
      nonElitePenalty,
    2,
    96,
  );
  return stableUnit(`${player.id}:${seasonLabel}:extension`) * 100 < chance;
};

export const getExternalStatusLabel = (status) => STATUS_LABELS[status] || "Игрок НХЛ / АХЛ";

export const getReturnInterestLabel = (score) => {
  const value = Number(score) || 0;
  if (value >= 75) return "Высокий";
  if (value >= 50) return "Средний";
  if (value >= 25) return "Низкий";
  return "Минимальный";
};

export class ExternalPlayerService {
  evaluateOffseason({ players, seasonDate, seasonLabel }) {
    const returnCandidates = [];
    const evaluatedPlayers = (players || []).map((player) => {
      const previous = player.externalCareer || {};
      if (previous.lastEvaluatedSeason === seasonLabel) return player;
      if (previous.status === "rights_only") {
        player.externalCareer = { ...previous, availableToKhl: true, lastEvaluatedSeason: seasonLabel };
        return player;
      }

      const age = calculateAge(player.identity?.birthDate, seasonDate);
      const seasonsOutsideKhl = (Number(previous.seasonsOutsideKhl) || 0) + 1;
      const roleStatus = getRoleStatus(player, previous, seasonLabel);
      const returnInterest = getReturnInterest(
        player,
        { ...previous, seasonsOutsideKhl },
        age,
        roleStatus,
        seasonLabel,
      );
      let contractUntil = previous.contractUntil || null;
      let status = roleStatus;
      let availableToKhl = false;
      const league = roleStatus.startsWith("nhl") ? "NHL" : "AHL";

      if (!hasActiveExternalContract(contractUntil, seasonLabel)) {
        if (shouldExtendExternalContract(player, previous, roleStatus, seasonLabel) && returnInterest < 72) {
          const extensionYears = roleStatus === "nhl_regular" ? 2 : 1;
          contractUntil = addSeasonYears(seasonLabel, extensionYears - 1);
        } else if (returnInterest >= 48) {
          contractUntil = null;
          status = "released";
          availableToKhl = true;
        } else {
          contractUntil = seasonLabel;
        }
      }

      player.externalCareer = {
        ...previous,
        league,
        status,
        contractUntil,
        seasonsOutsideKhl,
        returnInterest,
        availableToKhl,
        lastEvaluatedSeason: seasonLabel,
      };

      if (availableToKhl) {
        returnCandidates.push({
          player,
          ufaStatus: getUfaStatus(age, player.career?.khlGamesPlayed || 0),
          rightsTeamId: previous.rightsTeamId || null,
          fromLeague: league,
          age,
        });
      }
      return player;
    });

    return { players: evaluatedPlayers, returnCandidates };
  }
}
