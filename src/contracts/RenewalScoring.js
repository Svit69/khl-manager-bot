import { getTermMod, getTermPreference, termPreferenceLabel } from "./TermPreference.js";
import { calculateAge, clamp } from "./SeasonUtils.js";

const MIN_GAMES_FOR_ROLE_EVAL = 5;
const MIN_GAMES_FOR_IMPACT_EVAL = 5;
const MIN_TEAM_GAMES_FOR_PERFORMANCE = 5;
const MIN_MARKET_SALARY_RUB = 500000;
const SALARY_POSITIVE_CAP = 18;
const SALARY_NEGATIVE_CAP = -20;
const FORWARD_POSITIONS = new Set(["ЛНП", "ЦТР", "ПНП"]);
const ROLE_CAPACITY = { F: 12, D: 6, G: 2, SKATER: 12 };
const PROJECTED_ROLE_THRESHOLDS = {
  F: [3, 6, 9, 12],
  D: [2, 4, 6],
  G: [1, 2],
  SKATER: [4, 8, 12],
};

const average = (values) =>
  values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0;
const roundToTenth = (value) => Math.round(value * 10) / 10;
const roundSalaryRub = (value) =>
  Math.max(MIN_MARKET_SALARY_RUB, Math.round((Number(value) || 0) / 500000) * 500000);
const interpolate = (value, inMin, inMax, outMin, outMax) => {
  if (inMin === inMax) return outMax;
  const ratio = clamp((value - inMin) / (inMax - inMin), 0, 1);
  return outMin + (outMax - outMin) * ratio;
};

const isDomesticNationality = (nationality) => {
  const normalized = String(nationality || "").trim().toLowerCase();
  return normalized === "россия" || normalized === "ru" || normalized === "rus" || normalized === "russia";
};

const isLegioner = (player) => !isDomesticNationality(player?.identity?.nationality);

const getPositionGroup = (position) => {
  if (position === "ЗАЩ") return "D";
  if (position === "ВРТ") return "G";
  if (FORWARD_POSITIONS.has(position)) return "F";
  return "SKATER";
};

const getLineInfo = (team, player) => {
  const lines = team?.lines || [];
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const slotIndex = (line.players || []).findIndex((candidate) => candidate?.id === player?.id);
    if (slotIndex !== -1) {
      return {
        lineIndex: index + 1,
        slotIndex,
        slotPosition: line.positions?.[slotIndex] || null,
      };
    }
  }
  return { lineIndex: null, slotIndex: null, slotPosition: null };
};

const getTeamRosterByGroup = (team, group, excludePlayerId = null) => {
  const roster = team?.getRoster?.() || [];
  return roster.filter(
    (candidate) =>
      candidate &&
      candidate.id !== excludePlayerId &&
      getPositionGroup(candidate.identity?.primaryPosition) === group,
  );
};

const getProjectedRoleInfo = (team, player) => {
  const group = getPositionGroup(player?.identity?.primaryPosition);
  const roster = getTeamRosterByGroup(team, group, player?.id);
  const ovrs = roster.map((candidate) => candidate.ovr || 0).sort((left, right) => right - left);
  const teamAverageOvr = average(ovrs);
  const higherCount = roster.filter((candidate) => (candidate.ovr || 0) > (player?.ovr || 0)).length;
  const thresholds = PROJECTED_ROLE_THRESHOLDS[group] || PROJECTED_ROLE_THRESHOLDS.SKATER;
  const capacity = ROLE_CAPACITY[group] || ROLE_CAPACITY.SKATER;
  const ovrGap = (player?.ovr || 0) - teamAverageOvr;

  let tier = "depth";
  let label = "глубина состава";
  let score = -2;

  if (group === "F") {
    if (higherCount < thresholds[0]) {
      tier = "top";
      label = "верхние звенья";
      score = 9;
    } else if (higherCount < thresholds[1]) {
      tier = "middle";
      label = "топ-6";
      score = 6;
    } else if (higherCount < thresholds[2]) {
      tier = "rotation";
      label = "третье звено";
      score = 3;
    } else if (higherCount < thresholds[3]) {
      tier = "depth";
      label = "нижние звенья";
      score = 1;
    } else {
      tier = "fringe";
      label = "вне основной обоймы";
      score = ovrGap <= -6 ? -6 : -3;
    }
  } else if (group === "D") {
    if (higherCount < thresholds[0]) {
      tier = "top";
      label = "первая пара";
      score = 9;
    } else if (higherCount < thresholds[1]) {
      tier = "middle";
      label = "топ-4";
      score = 6;
    } else if (higherCount < thresholds[2]) {
      tier = "rotation";
      label = "третья пара";
      score = 2;
    } else {
      tier = "fringe";
      label = "глубина защиты";
      score = ovrGap <= -6 ? -6 : -3;
    }
  } else if (group === "G") {
    if (higherCount < thresholds[0]) {
      tier = "top";
      label = "первый номер";
      score = 10;
    } else if (higherCount < thresholds[1]) {
      tier = "depth";
      label = "второй номер";
      score = 2;
    } else {
      tier = "fringe";
      label = "вне вратарской пары";
      score = -6;
    }
  } else {
    if (higherCount < thresholds[0]) {
      tier = "top";
      label = "основная роль";
      score = 8;
    } else if (higherCount < thresholds[1]) {
      tier = "rotation";
      label = "ротация";
      score = 3;
    } else {
      tier = "fringe";
      label = "глубина состава";
      score = ovrGap <= -6 ? -6 : -3;
    }
  }

  return {
    group,
    higherCount,
    rosterCount: roster.length,
    teamAverageOvr,
    ovrGap,
    tier,
    label,
    score: clamp(score, -10, 10),
    capacity,
  };
};

const roleFitScore = (player, team, reasons, context) => {
  if (context?.isFreeAgent) {
    const projectedRole = getProjectedRoleInfo(team, player);
    reasons.push({ text: `Ожидаемая роль после подписания: ${projectedRole.label}`, value: projectedRole.score });
    return projectedRole.score;
  }

  const games = player.seasonStats?.games || 0;
  if (games < MIN_GAMES_FOR_ROLE_EVAL) {
    reasons.push({ text: `Недостаточно матчей для оценки роли (нужно ${MIN_GAMES_FOR_ROLE_EVAL})`, value: 0 });
    return 0;
  }

  const expectedLine = player.expectedLineIndex || null;
  const { lineIndex, slotPosition } = getLineInfo(team, player);
  const secondaryPositions = player.identity?.secondaryPositions || [];
  let score = 0;

  if (!lineIndex) {
    score -= 12;
    reasons.push({ text: "Игрок вне основной обоймы команды", value: -12 });
  } else if (expectedLine) {
    if (lineIndex === expectedLine) {
      score += 10;
      reasons.push({ text: `Играет в ожидаемом звене (${lineIndex})`, value: 10 });
    } else if (lineIndex < expectedLine) {
      score += 6;
      reasons.push({ text: `Получает роль выше ожиданий (${lineIndex} звено вместо ${expectedLine})`, value: 6 });
    } else {
      score -= 10;
      reasons.push({ text: `Играет ниже ожиданий (${lineIndex} звено вместо ${expectedLine})`, value: -10 });
    }
  } else if (lineIndex <= 2) {
    score += 5;
    reasons.push({ text: `Закреплен в верхних звеньях (${lineIndex})`, value: 5 });
  }

  if (slotPosition) {
    if (slotPosition === player.identity?.primaryPosition) {
      score += 3;
      reasons.push({ text: "Используется на основной позиции", value: 3 });
    } else if (secondaryPositions.includes(slotPosition)) {
      score -= 4;
      reasons.push({ text: "Стабильно играет на дополнительной позиции", value: -4 });
    } else {
      score -= 10;
      reasons.push({ text: "Регулярно используется вне профильной позиции", value: -10 });
    }
  }

  return clamp(score, -15, 15);
};

const teamPerformanceScore = (context, reasons) => {
  const teamGamesPlayed = context?.teamGamesPlayed ?? 0;
  if (teamGamesPlayed < MIN_TEAM_GAMES_FOR_PERFORMANCE) {
    reasons.push({
      text: `Недостаточно командных матчей для оценки таблицы (нужно ${MIN_TEAM_GAMES_FOR_PERFORMANCE})`,
      value: 0,
    });
    return 0;
  }

  const rank = context?.teamRank ?? null;
  if (rank === null) {
    reasons.push({ text: "Нет данных по месту команды", value: 0 });
    return 0;
  }

  if (rank <= 4) {
    reasons.push({ text: `Команда идет очень высоко (${rank} место)`, value: 10 });
    return 10;
  }
  if (rank <= 8) {
    reasons.push({ text: `Команда в зоне плей-офф (${rank} место)`, value: 7 });
    return 7;
  }

  const penalty = rank >= (context?.teamsCount || 0) - 1 ? -10 : -7;
  reasons.push({ text: `Команда вне топ-8 (${rank} место)`, value: penalty });
  return penalty;
};

const personalPerformanceScore = (player, context, reasons) => {
  const games = player.seasonStats?.games || 0;
  if (games < MIN_GAMES_FOR_IMPACT_EVAL) {
    reasons.push({
      text: `Недостаточно матчей для оценки импакта (нужно ${MIN_GAMES_FOR_IMPACT_EVAL})`,
      value: 0,
    });
    return 0;
  }

  const teamRoster = context?.teamRoster || [];
  const group = getPositionGroup(player.identity?.primaryPosition);
  const comparablePlayers = teamRoster.filter(
    (candidate) =>
      candidate.id !== player.id &&
      (candidate.seasonStats?.games || 0) >= MIN_GAMES_FOR_IMPACT_EVAL &&
      getPositionGroup(candidate.identity?.primaryPosition) === group,
  );

  const points = player.seasonStats?.points ?? (player.seasonStats?.goals || 0) + (player.seasonStats?.assists || 0);
  const shots = player.seasonStats?.shots || 0;
  const playerPpg = points / games;
  const playerShotsPerGame = shots / games;
  const avgIceTime = games > 0 ? (player.seasonStats?.totalIceTime || 0) / games : 0;

  if (!comparablePlayers.length) {
    reasons.push({ text: `Импакт: ${roundToTenth(playerPpg)} очка за матч, но мало сопоставимых игроков`, value: 0 });
    return 0;
  }

  const comparablePpg = comparablePlayers.map((candidate) => {
    const candidatePoints =
      candidate.seasonStats?.points ?? (candidate.seasonStats?.goals || 0) + (candidate.seasonStats?.assists || 0);
    return candidatePoints / Math.max(1, candidate.seasonStats?.games || 1);
  });
  const comparableShotsPerGame = comparablePlayers
    .filter((candidate) => (candidate.seasonStats?.shots || 0) > 0)
    .map((candidate) => (candidate.seasonStats?.shots || 0) / Math.max(1, candidate.seasonStats?.games || 1));

  const ppgGap = playerPpg - average(comparablePpg);
  const shotsGap = comparableShotsPerGame.length ? playerShotsPerGame - average(comparableShotsPerGame) : 0;
  let score = 0;

  if (ppgGap >= 0.25) {
    score += 6;
    reasons.push({ text: `Высокий результативный импакт: ${roundToTenth(playerPpg)} очка за матч`, value: 6 });
  } else if (ppgGap <= -0.2) {
    score -= 6;
    reasons.push({ text: `Результативность ниже конкурентов по роли (${roundToTenth(playerPpg)} очка за матч)`, value: -6 });
  } else {
    reasons.push({ text: `Результативность соответствует роли (${roundToTenth(playerPpg)} очка за матч)`, value: 0 });
  }

  if (shotsGap >= 0.8) {
    score += 2;
    reasons.push({
      text: `Создает больше моментов, чем игроки его роли (${roundToTenth(playerShotsPerGame)} броска за матч)`,
      value: 2,
    });
  } else if (shotsGap <= -0.8) {
    score -= 2;
    reasons.push({ text: "Создает меньше моментов, чем игроки его роли", value: -2 });
  }

  if (avgIceTime > 0) {
    const minutes = roundToTenth(avgIceTime / 60);
    if (minutes >= 18) {
      score += 2;
      reasons.push({ text: `Большая нагрузка: ${minutes} мин в среднем`, value: 2 });
    } else if (minutes <= 11) {
      score -= 2;
      reasons.push({ text: `Ограниченная роль по айстайму: ${minutes} мин в среднем`, value: -2 });
    }
  }

  return clamp(score, -10, 10);
};

const ageMotivationScore = (age, reasons) => {
  if (age <= 24) {
    reasons.push({ text: "Молодой возраст повышает готовность расти в клубе", value: 5 });
    return 5;
  }
  if (age >= 34) {
    reasons.push({ text: "Возраст делает игрока осторожнее по долгому контракту", value: -10 });
    return -10;
  }
  if (age >= 30) {
    reasons.push({ text: "Возраст снижает мотивацию к долгому контракту", value: -5 });
    return -5;
  }
  reasons.push({ text: "Возраст нейтрален", value: 0 });
  return 0;
};

const salarySatisfactionScore = (offerSalary, targetSalary, reasons) => {
  const ratio = offerSalary / Math.max(1, targetSalary);
  let score;

  if (ratio <= 0.5) score = SALARY_NEGATIVE_CAP;
  else if (ratio < 0.8) score = interpolate(ratio, 0.5, 0.8, -20, -10);
  else if (ratio < 1.0) score = interpolate(ratio, 0.8, 1.0, -10, 0);
  else if (ratio < 1.15) score = interpolate(ratio, 1.0, 1.15, 0, 12);
  else if (ratio < 1.4) score = interpolate(ratio, 1.15, 1.4, 12, SALARY_POSITIVE_CAP);
  else score = SALARY_POSITIVE_CAP;

  const roundedScore = Math.round(clamp(score, SALARY_NEGATIVE_CAP, SALARY_POSITIVE_CAP));
  reasons.push({ text: `Соотношение зарплаты к ожиданию от клуба: ${ratio.toFixed(2)}`, value: roundedScore });
  return { score: roundedScore, ratio };
};

const calculateTeamAdjustedDemand = (player, team, context, marketSalary, reasons) => {
  let factor = 1;
  const isFreeAgent = Boolean(context?.isFreeAgent);
  const rank = context?.teamRank ?? null;
  const enoughTeamData = (context?.teamGamesPlayed ?? 0) >= MIN_TEAM_GAMES_FOR_PERFORMANCE;

  if (isFreeAgent) {
    const projectedRole = getProjectedRoleInfo(team, player);

    if (projectedRole.tier === "top") factor *= 1.08;
    else if (projectedRole.tier === "middle") factor *= 1.03;
    else if (projectedRole.tier === "rotation") factor *= 0.97;
    else if (projectedRole.tier === "depth") factor *= projectedRole.ovrGap <= -4 ? 0.9 : 0.95;
    else factor *= 0.88;

    if (projectedRole.ovrGap <= -5) {
      factor *= 0.95;
      reasons.push({ text: `Игрок видит себя как depth-опцию на позиции (${projectedRole.label})`, value: 0 });
    } else if (projectedRole.ovrGap >= 4) {
      factor *= 1.06;
      reasons.push({ text: `Игрок ожидает крупную роль на позиции (${projectedRole.label})`, value: 0 });
    }

    if (enoughTeamData && rank !== null) {
      if (rank <= 4) factor *= 0.96;
      else if (rank <= 8) factor *= 0.99;
      else if (rank > 8) factor *= 1.04;
    }
  } else {
    const { lineIndex, slotPosition } = getLineInfo(team, player);
    if (lineIndex === 1) factor *= 1.08;
    else if (lineIndex === 2) factor *= 1.04;
    else if (lineIndex === 3) factor *= 0.99;
    else if (lineIndex === 4) factor *= 0.94;
    else factor *= 0.9;

    if (slotPosition && slotPosition !== player.identity?.primaryPosition) {
      const secondaryPositions = player.identity?.secondaryPositions || [];
      factor *= secondaryPositions.includes(slotPosition) ? 0.97 : 0.92;
    }

    if (enoughTeamData && rank !== null) {
      if (rank <= 4) factor *= 0.98;
      else if (rank > 8) factor *= 1.03;
    }
  }

  if (isLegioner(player) && enoughTeamData && rank !== null && rank > 8) {
    factor *= 1.06;
    reasons.push({ text: "Легионер в слабой команде ждет чуть больше гарантий по деньгам", value: 0 });
  }

  return roundSalaryRub(marketSalary * factor);
};

const freeAgentTeamStrengthAppeal = (player, team, context, reasons) => {
  if (!context?.isFreeAgent) return 0;

  const projectedRole = getProjectedRoleInfo(team, player);
  let score = 0;

  if (projectedRole.ovrGap <= -5) {
    score += 4;
    reasons.push({ text: "Сильная позиционная конкуренция упрощает ожидания по контракту", value: 4 });
  } else if (projectedRole.ovrGap <= -2) {
    score += 2;
    reasons.push({ text: "Игрок видит понятную depth-роль в команде", value: 2 });
  } else if (projectedRole.ovrGap >= 4) {
    score -= 3;
    reasons.push({ text: "Игрок понимает, что станет важной фигурой и ждет больше", value: -3 });
  }

  if ((context?.teamGamesPlayed ?? 0) >= MIN_TEAM_GAMES_FOR_PERFORMANCE) {
    const rank = context?.teamRank ?? null;
    if (rank !== null) {
      if (rank <= 4) {
        score += 3;
        reasons.push({ text: `Сильный клуб повышает привлекательность (${rank} место)`, value: 3 });
      } else if (rank <= 8) {
        score += 1;
        reasons.push({ text: `Команда в конкурентной зоне (${rank} место)`, value: 1 });
      } else if (rank > 8) {
        score -= 2;
        reasons.push({ text: `Слабый сезон снижает привлекательность клуба (${rank} место)`, value: -2 });
      }
    }
  }

  return clamp(score, -6, 8);
};

export const getUfaStatus = (age, khlGamesPlayed) => {
  if (age >= 29) return "NSA";
  if (age >= 28 && (khlGamesPlayed || 0) >= 250) return "NSA";
  return "OSA";
};

export const estimateMarketSalary = (player, lastContract, marketSalaryOverride = null) => {
  if (Number.isFinite(marketSalaryOverride) && marketSalaryOverride > 0) return marketSalaryOverride;
  if (lastContract?.salaryRub) return roundSalaryRub(lastContract.salaryRub);
  return roundSalaryRub(Math.max(1000000, Math.round((player.ovr || 0) * 1000000)));
};

export const getAcceptanceChance = (willingness) => {
  const value = clamp(Number(willingness) || 0, 0, 100);
  if (value <= 24) return Math.round(interpolate(value, 0, 24, 0, 4));
  if (value <= 44) return Math.round(interpolate(value, 25, 44, 5, 15));
  if (value <= 59) return Math.round(interpolate(value, 45, 59, 16, 35));
  if (value <= 74) return Math.round(interpolate(value, 60, 74, 36, 65));
  if (value <= 89) return Math.round(interpolate(value, 75, 89, 66, 88));
  return Math.round(interpolate(value, 90, 100, 89, 96));
};

export const willingnessState = (willingness) => {
  const chance = getAcceptanceChance(willingness);
  if (willingness >= 75) {
    return { label: "Хочет продлевать", emoji: "🟢", chance };
  }
  if (willingness >= 45) {
    return { label: "Сомневается", emoji: "🟡", chance };
  }
  return { label: "Не хочет", emoji: "🔴", chance };
};

export const evaluateRenewalWillingness = ({
  player,
  team,
  offer,
  context,
  lastContract,
  marketSalary: marketSalaryOverride = null,
}) => {
  const baseMarketSalary = estimateMarketSalary(player, lastContract, marketSalaryOverride);
  const years = clamp(offer?.years || 1, 1, 4);
  const reasons = [];
  let willingness = 50;

  const age = calculateAge(player.identity.birthDate);
  const ufaStatus = getUfaStatus(age, player.career?.khlGamesPlayed || 0);
  const projectedRole = getProjectedRoleInfo(team, player);
  const teamAdjustedDemand = calculateTeamAdjustedDemand(player, team, context, baseMarketSalary, reasons);
  const offerSalary = roundSalaryRub(offer?.salaryRub || teamAdjustedDemand);

  const roleScore = roleFitScore(player, team, reasons, context);
  willingness += roleScore;

  const teamScore = teamPerformanceScore(context, reasons);
  willingness += teamScore;

  const performanceScore = personalPerformanceScore(player, context, reasons);
  willingness += performanceScore;

  if (context?.isFreeAgent) {
    willingness += 8;
    reasons.push({ text: "Свободный агент открыт к полноценному предложению", value: 8 });
    willingness += freeAgentTeamStrengthAppeal(player, team, context, reasons);
  }

  const { score: salaryScore, ratio: salaryRatio } = salarySatisfactionScore(offerSalary, teamAdjustedDemand, reasons);
  willingness += salaryScore;

  willingness += ageMotivationScore(age, reasons);

  if (ufaStatus === "OSA") {
    willingness += 10;
    reasons.push({ text: "ОСА легче удержать при адекватном предложении", value: 10 });
  }

  const isInjured = player.condition?.fatigueStatus === "injured" || Boolean(player.condition?.injuryUntilDay);
  const { termPreference } = getTermPreference({
    age,
    declineRate: player.potential?.declineRate,
    ufaStatus,
    fatigueScore: player.condition?.fatigueScore ?? player.fatigueScore,
    isInjured,
  });
  const termMod = getTermMod(years, termPreference);
  willingness += termMod;
  reasons.push({ text: `Срок ${years} г. • Предпочтение: ${termPreferenceLabel(termPreference)}`, value: termMod });

  if (ufaStatus === "OSA") willingness = Math.max(willingness, 30);
  willingness = clamp(Math.round(willingness), 0, 100);

  return {
    offer: { years, salaryRub: offerSalary },
    marketSalary: baseMarketSalary,
    teamAdjustedDemand,
    willingness,
    state: willingnessState(willingness),
    ufaStatus,
    reasons,
    termPreference,
    termMod,
    roleScore,
    teamScore,
    performanceScore,
    salaryScore,
    salaryRatio,
    projectedRole,
  };
};
