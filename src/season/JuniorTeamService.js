import { createSkater } from "../data/playerFactory.js";
import { calculateAge } from "../contracts/SeasonUtils.js";
import { PlayerPosition } from "../models/PlayerPosition.js";
import { getJuniorSeasonAge, getJuniorSeasonStartDate } from "./JuniorEligibility.js";
import { getJuniorPracticeProfile } from "./JuniorScouting.js";

const TARGET_JUNIOR_SIZE = 22;
const POSITION_TARGETS = Object.freeze({
  [PlayerPosition.CTR]: 4,
  [PlayerPosition.LW]: 4,
  [PlayerPosition.RW]: 4,
  [PlayerPosition.DEF]: 8,
  [PlayerPosition.G]: 2,
});

const WEIGHTED_FIRST_NAMES = Object.freeze([
  ["Михаил", 440],
  ["Александр", 400],
  ["Лев", 310],
  ["Артём", 290],
  ["Максим", 270],
  ["Матвей", 260],
  ["Марк", 250],
  ["Иван", 240],
  ["Тимофей", 220],
  ["Роман", 180],
  ["Дмитрий", 160],
  ["Даниил", 150],
  ["Мирон", 140],
  ["Кирилл", 130],
  ["Егор", 120],
  ["Арсений", 110],
  ["Никита", 100],
  ["Андрей", 95],
  ["Алексей", 90],
  ["Илья", 86],
  ["Макар", 82],
  ["Ярослав", 78],
  ["Фёдор", 74],
  ["Владимир", 70],
  ["Георгий", 66],
  ["Богдан", 62],
  ["Глеб", 59],
  ["Савелий", 56],
  ["Платон", 53],
  ["Леон", 51],
  ["Константин", 49],
  ["Давид", 47],
  ["Степан", 45],
  ["Артур", 43],
  ["Денис", 41],
  ["Павел", 39],
  ["Сергей", 37],
  ["Виктор", 35],
  ["Семён", 34],
  ["Демид", 33],
  ["Захар", 32],
  ["Владислав", 31],
  ["Пётр", 30],
  ["Григорий", 29],
  ["Юрий", 28],
  ["Леонид", 27],
  ["Николай", 26],
  ["Василий", 25],
  ["Артемий", 24],
  ["Амир", 23],
  ["Али", 22],
  ["Умар", 21],
  ["Дамир", 20],
  ["Тимур", 19],
  ["Данил", 18],
  ["Елисей", 17],
  ["Лука", 16],
  ["Герман", 15],
  ["Роберт", 15],
  ["Игорь", 14],
  ["Святослав", 14],
  ["Всеволод", 13],
  ["Прохор", 13],
  ["Мирослав", 12],
  ["Яков", 12],
  ["Родион", 11],
  ["Антон", 11],
  ["Олег", 10],
  ["Валерий", 10],
  ["Станислав", 10],
  ["Вячеслав", 9],
  ["Игнат", 9],
  ["Клим", 9],
  ["Марат", 8],
  ["Демьян", 8],
  ["Филипп", 8],
  ["Борис", 7],
  ["Вадим", 7],
  ["Евгений", 7],
  ["Руслан", 6],
  ["Анатолий", 6],
  ["Валентин", 6],
  ["Виталий", 6],
  ["Геннадий", 5],
  ["Игнатий", 5],
  ["Савва", 5],
  ["Ренат", 5],
  ["Мстислав", 4],
  ["Ростислав", 4],
  ["Вениамин", 4],
  ["Гордей", 4],
  ["Емельян", 4],
  ["Ефим", 4],
  ["Лавр", 3],
  ["Серафим", 3],
  ["Трофим", 3],
  ["Яромир", 3],
  ["Ян", 2],
  ["Наиль", 2],
  ["Симеон", 2],
]);
const FIRST_NAME_TOTAL_WEIGHT = WEIGHTED_FIRST_NAMES.reduce((sum, [, weight]) => sum + weight, 0);
const LAST_NAMES_RU = ["Смирнов","Кузнецов","Соколов","Попов","Васильев","Морозов","Волков","Федоров","Михайлов","Новиков","Павлов","Козлов","Орлов","Зайцев"];
const LAST_NAMES_BY = ["Ковалев","Гончаров","Савицкий","Мороз","Пинчук","Соловей","Левченко","Климович"];

const pick = (items, seed) => items[Math.abs(seed) % items.length];
const hash = (source) => {
  let value = 0;
  for (let index = 0; index < source.length; index++) value = (value * 31 + source.charCodeAt(index)) % 1000003;
  return value;
};
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const pickWeightedFirstName = (seed) => {
  let roll = Math.abs(seed) % FIRST_NAME_TOTAL_WEIGHT;
  for (const [name, weight] of WEIGHTED_FIRST_NAMES) {
    if (roll < weight) return name;
    roll -= weight;
  }
  return WEIGHTED_FIRST_NAMES[0][0];
};

const getPositionNeed = (players) => {
  const counts = new Map();
  players.forEach((player) => counts.set(player.identity?.primaryPosition, (counts.get(player.identity?.primaryPosition) || 0) + 1));
  return Object.entries(POSITION_TARGETS)
    .sort((left, right) => ((counts.get(left[0]) || 0) / left[1]) - ((counts.get(right[0]) || 0) / right[1]))[0]?.[0] || PlayerPosition.CTR;
};

const getAttributeProfile = (position, ovr, seed) => {
  const spread = (offset) => clamp(ovr + ((seed + offset) % 9) - 4, 40, 99);
  if (position === PlayerPosition.DEF) {
    return { shot: spread(1) - 2, speed: spread(2), physical: spread(3) + 2, defense: spread(4) + 4, skill: spread(5) };
  }
  if (position === PlayerPosition.G) {
    return { shot: spread(1) - 8, speed: spread(2), physical: spread(3) + 2, defense: spread(4) + 4, skill: spread(5) - 1 };
  }
  return { shot: spread(1) + 2, speed: spread(2) + 1, physical: spread(3), defense: spread(4) - 2, skill: spread(5) + 2 };
};

const getBaseOvr = (age, seed) => {
  const ranges = {
    16: [48, 60],
    17: [50, 63],
    18: [52, 66],
    19: [55, 68],
    20: [57, 70],
  };
  const [min, max] = ranges[age] || [52, 66];
  return min + (seed % (max - min + 1));
};

const getNationality = (team, seed) => {
  if (team.shortName === "DMN") return seed % 100 < 72 ? "BY" : "RU";
  if (seed % 100 < 82) return "RU";
  if (seed % 100 < 93) return "BY";
  return "KZ";
};

const getNames = (nationality, seed) => {
  const lastNames = nationality === "BY" ? LAST_NAMES_BY : LAST_NAMES_RU;
  return {
    firstName: pickWeightedFirstName(hash(`${seed}:first-name`)),
    lastName: pick(lastNames, Math.floor(seed / 7)),
  };
};

const getSeasonKey = (seasonLabel) => String(seasonLabel || "season-1").replace(/[^0-9A-Za-z]+/g, "-");
const createJuniorPlayerId = (teamId, seasonLabel, index) => `junior-${teamId}-${getSeasonKey(seasonLabel)}-${index}`;

export class JuniorTeamService {
  ensureJuniorDepth({ teams, contracts, seasonLabel }) {
    const created = [];
    (teams || []).forEach((team) => {
      if (!team.juniorTeam) return;
      while (team.juniorPlayers.length < TARGET_JUNIOR_SIZE) {
        const usedIds = new Set(team.getRoster().map((player) => player.id));
        team.juniorPlayers.forEach((player) => usedIds.add(player.id));
        let index = 0;
        while (usedIds.has(createJuniorPlayerId(team.id, seasonLabel, index))) index += 1;
        const player = this.#createRegen(team, seasonLabel, index);
        const contract = contracts.createJuniorContract(player, team.id, seasonLabel);
        player.affiliation.contractId = contract?.id || null;
        team.juniorPlayers.push(player);
        created.push(player);
      }
    });
    return created;
  }

  ensureSavedJuniorPlayers({ teams, rosters, contracts, seasonLabel }) {
    const allPlayersById = new Map(
      (teams || []).flatMap((team) => [...team.getRoster(), ...(team.juniorPlayers || [])]).map((player) => [player.id, player]),
    );
    const created = [];
    (rosters || []).forEach((item) => {
      const team = (teams || []).find((entry) => entry.id === item.teamId);
      if (!team?.juniorTeam || !Array.isArray(item.juniorPlayerIds)) return;
      const prefix = `junior-${team.id}-${getSeasonKey(seasonLabel)}-`;
      item.juniorPlayerIds.forEach((playerId) => {
        if (allPlayersById.has(playerId) || !String(playerId || "").startsWith(prefix)) return;
        const index = Number(String(playerId).slice(prefix.length));
        if (!Number.isFinite(index)) return;
        const player = this.#createRegen(team, seasonLabel, index, playerId);
        const contract = contracts.createJuniorContract(player, team.id, seasonLabel);
        player.affiliation.contractId = contract?.id || null;
        team.juniorPlayers.push(player);
        allPlayersById.set(player.id, player);
        created.push(player);
      });
    });
    return created;
  }

  applyOffseasonDevelopment(teams, seasonDate = null, seasonLabel = null) {
    (teams || []).forEach((team) => {
      (team.juniorPlayers || []).forEach((player) => {
        if (player.identity?.isGoalie) return;
        const age = calculateAge(player.identity?.birthDate, seasonDate);
        const growth = age <= 18 ? 1 : age <= 20 ? 0.7 : 0.25;
        const potentialGap = Math.max(0, (player.potential?.potential || player.ovr) - player.ovr);
        const practice = getJuniorPracticeProfile(player);
        const practiceBoost = Math.min(0.22, practice.khlGames * 0.014);
        const noPracticePenalty = age >= 19 && practice.khlGames === 0 ? 0.08 : 0;
        const chance = Math.min(0.82, 0.18 + potentialGap * 0.035 + growth * 0.16 + practiceBoost - noPracticePenalty);
        const roll = (hash(`${player.id}:${seasonLabel || "season"}:junior-dev`) % 1000) / 1000;
        if (roll > chance) return;
        const attrs = Object.keys(player.attributes.attributesJson || {});
        const key = attrs[hash(`${player.id}:attr`) % attrs.length];
        player.attributes.applyAttributeDelta(key, 1);
        if (practice.khlGames >= 18 && potentialGap >= 6) {
          const bonusKey = attrs[hash(`${player.id}:${seasonLabel || "season"}:practice-attr`) % attrs.length];
          player.attributes.applyAttributeDelta(bonusKey, 1);
        }
      });
    });
  }

  releaseOveragePlayers({ teams, seasonLabel, hasMainContract = () => false }) {
    const released = [];
    const promoted = [];
    (teams || []).forEach((team) => {
      if (!team?.juniorTeam || !Array.isArray(team.juniorPlayers)) return;
      const keep = [];
      team.juniorPlayers.forEach((player) => {
        const age = getJuniorSeasonAge(player, seasonLabel);
        if (age <= 20) {
          keep.push(player);
          return;
        }
        if (hasMainContract(player, team)) {
          player.expectedLineIndex = null;
          promoted.push({ player, team });
          return;
        }
        player.affiliation.teamId = null;
        player.affiliation.contractId = null;
        player.affiliation.acquiredDay = null;
        released.push({ player, team });
      });
      team.juniorPlayers.splice(0, team.juniorPlayers.length, ...keep);
    });
    return { released, promoted };
  }

  #createRegen(team, seasonLabel, index, forcedId = null) {
    const seed = hash(`${team.id}:${seasonLabel}:${index}`);
    const age = 16 + (seed % 5);
    const birthYear = getJuniorSeasonStartDate(seasonLabel).getUTCFullYear() - age;
    const position = getPositionNeed(team.juniorPlayers);
    const nationality = getNationality(team, seed);
    const { firstName, lastName } = getNames(nationality, seed);
    const ovr = getBaseOvr(age, seed);
    const talentRoll = seed % 100;
    const potentialGap = talentRoll >= 95 ? 18 + (seed % 5) : talentRoll >= 70 ? 11 + (seed % 7) : 5 + (seed % 8);
    const playerId = forcedId || createJuniorPlayerId(team.id, seasonLabel, index);
    const profile = {
      id: playerId,
      lineIndex: null,
      position,
      identity: {
        firstName,
        lastName,
        displayName: `${firstName} ${lastName}`,
        birthDate: `${birthYear}-${String((seed % 12) + 1).padStart(2, "0")}-${String((seed % 27) + 1).padStart(2, "0")}`,
        nationality,
        isGoalie: position === PlayerPosition.G,
        photoUrl: "./player-photo/default.png",
        primaryPosition: position,
        secondaryPositions: [],
      },
      attributes: getAttributeProfile(position, ovr, seed),
      potential: {
        potential: clamp(ovr + potentialGap, 55, 92),
        growthRate: 0.6 + ((seed % 40) / 100),
        peakAge: 26 + (seed % 4),
        declineRate: 0.3 + ((seed % 40) / 100),
      },
      condition: { fatigueScore: 0, form: 1, injuryUntilDay: null },
      career: { khlGamesPlayed: 0, seasonsPlayed: 0, reputation: talentRoll >= 95 ? 35 : talentRoll >= 70 ? 20 : 8 },
      affiliation: { teamId: team.id, contractId: null, acquiredDay: null },
    };
    const player = createSkater(team, firstName, lastName, position, seasonLabel || "season-1", profile);
    player.expectedLineIndex = null;
    return player;
  }
}
