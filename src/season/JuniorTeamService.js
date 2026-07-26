import { createSkater } from "../data/playerFactory.js";
import { RUSSIAN_SURNAME_ROOTS } from "../data/surnameRoots.js";
import { EXTRA_RUSSIAN_SURNAME_ROOTS } from "../data/surnameRootsExtra.js";
import { WEIGHTED_KAZAKH_FIRST_NAMES } from "../data/kazakhFirstNames.js";
import { calculateAge } from "../contracts/SeasonUtils.js";
import { PlayerPosition } from "../models/PlayerPosition.js";
import { getJuniorHiddenTraits } from "../models/HiddenPlayerTraits.js";
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
const KAZAKH_FIRST_NAME_TOTAL_WEIGHT = WEIGHTED_KAZAKH_FIRST_NAMES.reduce((sum, [, weight]) => sum + weight, 0);
const FIRST_NAME_POOLS = Object.freeze({
  RU: { items: WEIGHTED_FIRST_NAMES, totalWeight: FIRST_NAME_TOTAL_WEIGHT },
  BY: { items: WEIGHTED_FIRST_NAMES, totalWeight: FIRST_NAME_TOTAL_WEIGHT },
  KZ: { items: WEIGHTED_KAZAKH_FIRST_NAMES, totalWeight: KAZAKH_FIRST_NAME_TOTAL_WEIGHT },
});
const WEIGHTED_LAST_NAMES_RU = Object.freeze([
  ["Смирнов", 110],
  ["Кузнецов", 100],
  ["Соколов", 92],
  ["Попов", 84],
  ["Васильев", 78],
  ["Морозов", 72],
  ["Волков", 68],
  ["Федоров", 64],
  ["Михайлов", 60],
  ["Новиков", 56],
  ["Павлов", 52],
  ["Козлов", 48],
  ["Орлов", 44],
  ["Зайцев", 40],
  ["Белов", 34],
  ["Соловьев", 32],
  ["Андреев", 30],
  ["Макаров", 28],
  ["Никитин", 26],
  ["Громов", 24],
  ["Тихонов", 22],
  ["Калинин", 20],
  ["Быков", 18],
  ["Ершов", 16],
]);
const WEIGHTED_LAST_NAMES_BY = Object.freeze([
  ["Ковалев", 90],
  ["Гончаров", 82],
  ["Савицкий", 76],
  ["Мороз", 68],
  ["Пинчук", 60],
  ["Соловей", 54],
  ["Левченко", 48],
  ["Климович", 44],
  ["Мельник", 40],
  ["Бондарь", 36],
  ["Гуринович", 32],
  ["Романович", 28],
  ["Сидоренко", 24],
  ["Войтехович", 20],
]);
const WEIGHTED_LAST_NAMES_KZ = Object.freeze([
  ["Ахметов", 82],
  ["Омаров", 74],
  ["Ибраев", 66],
  ["Серикбаев", 58],
  ["Нурмагамбетов", 50],
  ["Сагындыков", 44],
  ["Касымов", 38],
  ["Жумабаев", 34],
  ["Тулегенов", 30],
  ["Ермеков", 26],
  ["Бекетов", 22],
  ["Абдрахманов", 18],
]);
const TEAM_HERITAGE_LAST_NAME_CHANCE = 2;
const HOCKEY_HISTORY_LAST_NAME_CHANCE = 2;
const GENERATED_LAST_NAME_CHANCE = Object.freeze({ RU: 92, BY: 90, KZ: 88 });
const WEIGHTED_SURNAME_SUFFIXES = Object.freeze({
  RU: [["ов", 43], ["ев", 22], ["ин", 18], ["енко", 8], ["чук", 4], ["ич", 3], ["ый", 2]],
  BY: [["енко", 28], ["ич", 24], ["чук", 18], ["ов", 12], ["ев", 8], ["ин", 6], ["ый", 4]],
  KZ: [["ов", 36], ["ев", 26], ["баев", 14], ["беков", 8], ["ин", 6], ["улы", 5], ["ханов", 3], ["тай", 2]],
});
const KAZAKH_SURNAME_ROOTS = Object.freeze([
  ["Ахмет", ["ов", "ев", "ин"]],
  ["Омар", ["ов", "ев", "ин"]],
  ["Ибра", ["ев", "ин", "улы"]],
  ["Серик", ["ов", "баев", "улы"]],
  ["Нур", ["ов", "баев", "беков", "ханов", "тай"]],
  ["Касым", ["ов", "ев", "улы"]],
  ["Ермек", ["ов", "баев", "улы"]],
  ["Жума", ["ев", "баев", "улы"]],
  ["Тулеген", ["ов", "ев", "улы"]],
  ["Сагын", ["ов", "баев", "тай"]],
  ["Бек", ["ов", "баев", "беков", "улы"]],
  ["Али", ["ев", "баев", "улы"]],
  ["Арман", ["ов", "ев", "улы"]],
  ["Темир", ["ов", "баев", "беков"]],
  ["Даурен", ["ов", "ев", "улы"]],
  ["Айдар", ["ов", "ев", "улы"]],
  ["Марат", ["ов", "ев", "ин"]],
  ["Есен", ["ов", "ев", "тай"]],
  ["Кайрат", ["ов", "ев", "улы"]],
  ["Мурат", ["ов", "ев", "ин"]],
  ["Сабыр", ["ов", "ев", "тай"]],
  ["Жан", ["ов", "баев", "беков", "ханов"]],
  ["Аскар", ["ов", "ев", "улы"]],
  ["Болат", ["ов", "ев", "улы"]],
  ["Руслан", ["ов", "ев", "ин"]],
  ["Талгат", ["ов", "ев", "улы"]],
  ["Абзал", ["ов", "ев", "улы"]],
  ["Самат", ["ов", "ев", "ин"]],
]);
const EXTENDED_RUSSIAN_SURNAME_ROOTS = Object.freeze([
  ...RUSSIAN_SURNAME_ROOTS,
  ...EXTRA_RUSSIAN_SURNAME_ROOTS,
]);
const SURNAME_ROOTS_BY_NATIONALITY = Object.freeze({
  RU: EXTENDED_RUSSIAN_SURNAME_ROOTS,
  BY: EXTENDED_RUSSIAN_SURNAME_ROOTS,
  KZ: KAZAKH_SURNAME_ROOTS,
});
const HOCKEY_HISTORY_LAST_NAMES = Object.freeze([
  ["Федоров", 8],
  ["Буре", 7],
  ["Могильный", 7],
  ["Ларионов", 7],
  ["Макаров", 7],
  ["Крутов", 6],
  ["Касатонов", 6],
  ["Ковальчук", 6],
  ["Малкин", 6],
  ["Овечкин", 5],
  ["Дацюк", 5],
  ["Каменский", 5],
  ["Гусев", 5],
  ["Капризов", 5],
  ["Радулов", 4],
  ["Тарасенко", 4],
  ["Кузнецов", 4],
  ["Григоренко", 4],
  ["Шипачев", 4],
  ["Зарипов", 4],
  ["Мозякин", 4],
  ["Зиновьев", 3],
  ["Морозов", 3],
  ["Ткачев", 3],
  ["Толчинский", 3],
  ["Слепышев", 3],
  ["Нестеров", 3],
  ["Войнов", 3],
]);
const LAST_NAME_POOLS = Object.freeze({
  RU: WEIGHTED_LAST_NAMES_RU,
  BY: WEIGHTED_LAST_NAMES_BY,
  KZ: WEIGHTED_LAST_NAMES_KZ,
});

const pick = (items, seed) => items[Math.abs(seed) % items.length];
const hash = (source) => {
  let value = 0;
  for (let index = 0; index < source.length; index++) value = (value * 31 + source.charCodeAt(index)) % 1000003;
  return value;
};
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const pickWeighted = (items, seed, totalWeight = null) => {
  const total = totalWeight ?? items.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = Math.abs(seed) % total;
  for (const [name, weight] of items) {
    if (roll < weight) return name;
    roll -= weight;
  }
  return items[0][0];
};

const pickWeightedFirstName = (nationality, seed) => {
  const pool = FIRST_NAME_POOLS[nationality] || FIRST_NAME_POOLS.RU;
  return pickWeighted(pool.items, seed, pool.totalWeight);
};

const getLastNamePool = (nationality) => LAST_NAME_POOLS[nationality] || WEIGHTED_LAST_NAMES_RU;
const getSurnameRoots = (nationality) => SURNAME_ROOTS_BY_NATIONALITY[nationality] || RUSSIAN_SURNAME_ROOTS;
const getSurnameSuffixes = (nationality) => WEIGHTED_SURNAME_SUFFIXES[nationality] || WEIGHTED_SURNAME_SUFFIXES.RU;
const getHockeyHistoryLastName = (seed) => pickWeighted(HOCKEY_HISTORY_LAST_NAMES, hash(`${seed}:hockey-history-last-name`));
const getTeamHeritageLastName = (team, seed, nationality) => {
  const names = (team?.getRoster?.() || [])
    .filter((player) => !nationality || player.identity?.nationality === nationality)
    .map((player) => player.identity?.lastName || String(player.name || "").trim().split(/\s+/).slice(-1)[0])
    .filter((name) => typeof name === "string" && name.length >= 4 && name.length <= 18);
  if (!names.length) return null;
  return pick([...new Set(names)], hash(`${seed}:team-heritage-last-name`));
};

const joinGeneratedLastName = (root, suffix) => {
  if (!root) return suffix;
  if (!suffix) return root;
  if (root.endsWith(suffix)) return root;
  if (root.endsWith("ов") && suffix === "ов") return root;
  if (root.endsWith("ев") && suffix === "ев") return root;
  if (root.endsWith("ин") && suffix === "ин") return root;
  if (/[аея]$/iu.test(root) && (suffix === "ов" || suffix === "ев")) return `${root}ев`;
  if (/о$/iu.test(root) && (suffix === "ов" || suffix === "ев")) return `${root.slice(0, -1)}ов`;
  if (root.endsWith("й") && suffix.startsWith("с")) return `${root.slice(0, -1)}${suffix}`;
  return `${root}${suffix}`;
};

const getCompatibleSurnameRoots = (nationality, suffix) =>
  getSurnameRoots(nationality).filter(([, suffixes]) => suffixes.includes(suffix));

const pickGeneratedSurnameParts = (nationality, seed) => {
  const suffixWeights = getSurnameSuffixes(nationality);
  for (let attempt = 0; attempt < suffixWeights.length; attempt += 1) {
    const suffix = pickWeighted(suffixWeights, hash(`${seed}:last-suffix:${attempt}`));
    const roots = getCompatibleSurnameRoots(nationality, suffix);
    if (roots.length) {
      const [root] = pick(roots, hash(`${seed}:last-root:${suffix}:${attempt}`));
      return { root, suffix };
    }
  }
  const [fallbackRoot, fallbackSuffixes] = pick(getSurnameRoots(nationality), hash(`${seed}:last-root:fallback`));
  return {
    root: fallbackRoot,
    suffix: pick(fallbackSuffixes, hash(`${seed}:last-suffix:fallback`)),
  };
};

const generateLastName = (nationality, seed) => {
  const { root, suffix } = pickGeneratedSurnameParts(nationality, seed);
  return joinGeneratedLastName(root, suffix);
};

const pickLastName = (nationality, seed, team = null) => {
  const teamHeritageRoll = hash(`${seed}:team-heritage-roll`) % 100;
  if (teamHeritageRoll < TEAM_HERITAGE_LAST_NAME_CHANCE) {
    const inherited = getTeamHeritageLastName(team, seed, nationality);
    if (inherited) return inherited;
  }
  if (hash(`${seed}:hockey-history-roll`) % 100 < HOCKEY_HISTORY_LAST_NAME_CHANCE) {
    return getHockeyHistoryLastName(seed);
  }
  const chance = GENERATED_LAST_NAME_CHANCE[nationality] ?? GENERATED_LAST_NAME_CHANCE.RU;
  if (hash(`${seed}:generated-last-name`) % 100 < chance) return generateLastName(nationality, seed);
  return pickWeighted(getLastNamePool(nationality), hash(`${seed}:listed-last-name`));
};

const getPositionNeed = (players) => {
  const counts = new Map();
  players.forEach((player) => counts.set(player.identity?.primaryPosition, (counts.get(player.identity?.primaryPosition) || 0) + 1));
  return Object.entries(POSITION_TARGETS)
    .sort((left, right) => ((counts.get(left[0]) || 0) / left[1]) - ((counts.get(right[0]) || 0) / right[1]))[0]?.[0] || PlayerPosition.CTR;
};

const getForwardSecondaryPositions = (position, seed) => {
  if (![PlayerPosition.CTR, PlayerPosition.LW, PlayerPosition.RW].includes(position)) return [];
  const roll = hash(`${seed}:secondary-position`) % 100;
  if (roll >= 42) return [];
  if (position === PlayerPosition.CTR) return [hash(`${seed}:wing-side`) % 2 ? PlayerPosition.RW : PlayerPosition.LW];
  if (roll < 30) return [position === PlayerPosition.LW ? PlayerPosition.RW : PlayerPosition.LW];
  return [PlayerPosition.CTR];
};

const getAttributeProfile = (position, ovr, seed) => {
  const spread = (offset) => clamp(ovr + ((seed + offset) % 9) - 4, 40, 99);
  if (position === PlayerPosition.DEF) {
    return { shot: spread(1) - 2, speed: spread(2), physical: spread(3) + 2, defense: spread(4) + 4, skill: spread(5) };
  }
  if (position === PlayerPosition.G) {
    return {
      reaction: spread(1) + 2,
      positioning: spread(2) + 1,
      athleticism: spread(3) + (seed % 3) - 1,
      puckControl: spread(4) - 2,
      mental: spread(5) + (seed % 5 >= 3 ? 2 : 0),
    };
  }
  return { shot: spread(1) + 2, speed: spread(2) + 1, physical: spread(3), defense: spread(4) - 2, skill: spread(5) + 2 };
};

const getBaseOvr = (age, seed) => {
  const ranges = {
    16: [50, 61],
    17: [53, 64],
    18: [56, 67],
    19: [55, 68],
    20: [57, 70],
  };
  const [min, max] = ranges[age] || [52, 66];
  return min + (seed % (max - min + 1));
};

const getInitialJuniorAge = (index, seed) => {
  const agePool = [16, 17, 17, 18, 18, 18, 19, 19, 20, 20, 18];
  return agePool[(index + seed) % agePool.length];
};

const getNationality = (team, seed) => {
  const roll = seed % 100;
  const country = String(team?.country || "RU").toUpperCase();
  if (country === "BY") {
    if (roll < 82) return "BY";
    if (roll < 98) return "RU";
    return "KZ";
  }
  if (country === "KZ") {
    if (roll < 82) return "KZ";
    if (roll < 97) return "RU";
    return "BY";
  }
  if (roll < 96) return "RU";
  if (roll < 99) return "BY";
  return "KZ";
};

const getNames = (nationality, seed, existingNames = new Set(), team = null) => {
  const firstName = pickWeightedFirstName(nationality, hash(`${seed}:first-name`));
  let lastName = pickLastName(nationality, seed, team);
  for (let attempt = 1; attempt <= 6 && existingNames.has(`${firstName} ${lastName}`); attempt += 1) {
    lastName = pickLastName(nationality, hash(`${seed}:last-name-reroll:${attempt}`), team);
  }
  return {
    firstName,
    lastName,
  };
};

const getSeasonKey = (seasonLabel) => String(seasonLabel || "season-1").replace(/[^0-9A-Za-z]+/g, "-");
const createJuniorPlayerId = (teamId, seasonLabel, index) => `junior-${teamId}-${getSeasonKey(seasonLabel)}-${index}`;

export class JuniorTeamService {
  ensureJuniorDepth({ teams, contracts, seasonLabel, generationSeed = null, ageSpread = false }) {
    const created = [];
    (teams || []).forEach((team) => {
      if (!team.juniorTeam) return;
      const isInitialFill = ageSpread && team.juniorPlayers.length === 0;
      team.juniorPlayers.forEach((player) => {
        const contract = contracts.createJuniorContract(player, team.id, seasonLabel);
        player.affiliation.teamId = team.id;
        player.affiliation.contractId = contract?.id || player.affiliation.contractId || null;
      });
      while (team.juniorPlayers.length < TARGET_JUNIOR_SIZE) {
        const usedIds = new Set(team.getRoster().map((player) => player.id));
        team.juniorPlayers.forEach((player) => usedIds.add(player.id));
        let index = 0;
        while (usedIds.has(createJuniorPlayerId(team.id, seasonLabel, index))) index += 1;
        const player = this.#createRegen(team, seasonLabel, index, null, generationSeed, { isInitialFill });
        const contract = contracts.createJuniorContract(player, team.id, seasonLabel);
        player.affiliation.contractId = contract?.id || null;
        team.juniorPlayers.push(player);
        created.push(player);
      }
    });
    return created;
  }

  ensureSavedJuniorPlayers({ teams, rosters, contracts, seasonLabel, generationSeed = null }) {
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
        const player = this.#createRegen(team, seasonLabel, index, playerId, generationSeed, { isInitialFill: false });
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
        const growth = age <= 17 ? 1.45 : age === 18 ? 1.2 : age <= 20 ? 0.85 : 0.25;
        const potentialGap = Math.max(0, (player.potential?.potential || player.ovr) - player.ovr);
        const practice = getJuniorPracticeProfile(player);
        const practiceBoost = Math.min(0.28, practice.khlGames * 0.016);
        const leagueBoost = Math.min(0.32, Number(player.juniorLeagueDevelopmentBonus) || 0);
        const noPracticePenalty = age >= 19 && practice.khlGames === 0 ? 0.05 : 0;
        const chance = Math.min(0.97, 0.32 + potentialGap * 0.055 + growth * 0.2 + practiceBoost + leagueBoost - noPracticePenalty);
        const roll = (hash(`${player.id}:${seasonLabel || "season"}:junior-dev`) % 1000) / 1000;
        if (roll > chance) return;
        const attrs = Object.keys(player.attributes.attributesJson || {});
        const key = attrs[hash(`${player.id}:attr`) % attrs.length];
        player.attributes.applyAttributeDelta(key, 1);
        if ((potentialGap >= 10 && age <= 18) || (practice.khlGames >= 18 && potentialGap >= 6) || (age <= 17 && potentialGap >= 7)) {
          const bonusKey = attrs[hash(`${player.id}:${seasonLabel || "season"}:practice-attr`) % attrs.length];
          player.attributes.applyAttributeDelta(bonusKey, 1);
        }
      });
    });
  }

  releaseOveragePlayers({ teams, seasonLabel, hasMainContract = () => false }) {
    const released = [];
    const promoted = [];
    const removed = [];
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
        removed.push({ player, team });
      });
      team.juniorPlayers.splice(0, team.juniorPlayers.length, ...keep);
    });
    return { released, promoted, removed };
  }

  applyInSeasonDevelopment(teams, seasonLabel = null, currentDay = 0, juniorScorers = []) {
    if (!currentDay || currentDay % 14 !== 0) return [];
    const scorerBonusById = new Map((juniorScorers || []).map((row) => [row.playerId, Number(row.developmentBonus) || 0]));
    const events = [];
    (teams || []).forEach((team) => {
      (team.juniorPlayers || []).forEach((player) => {
        if (player.identity?.isGoalie) return;
        const age = getJuniorSeasonAge(player, seasonLabel);
        const potentialGap = Math.max(0, (player.potential?.potential || player.ovr) - player.ovr);
        if (potentialGap <= 0) return;
        const leagueBonus = scorerBonusById.get(player.id) || 0;
        const chance = Math.min(0.5, 0.08 + potentialGap * 0.012 + leagueBonus * 1.4 + (age <= 18 ? 0.06 : 0));
        const roll = (hash(`${player.id}:${seasonLabel || "season"}:${currentDay}:junior-season-dev`) % 1000) / 1000;
        if (roll > chance) return;
        const attrs = Object.keys(player.attributes.attributesJson || {});
        const key = attrs[hash(`${player.id}:${currentDay}:junior-season-attr`) % attrs.length];
        const oldOvr = player.ovr;
        player.attributes.applyAttributeDelta(key, 1);
        if (potentialGap >= 10 || leagueBonus >= 0.12) {
          const bonusKey = attrs[hash(`${player.id}:${currentDay}:junior-season-bonus-attr`) % attrs.length];
          player.attributes.applyAttributeDelta(bonusKey, 1);
        }
        if (player.ovr > oldOvr) {
          events.push({ type: "upgrade", playerId: player.id, playerName: player.name, oldOvr, newOvr: player.ovr, teamId: team.id });
        }
      });
    });
    return events;
  }

  #createRegen(team, seasonLabel, index, forcedId = null, generationSeed = null, options = {}) {
    const seedPrefix = generationSeed ? `${generationSeed}:` : "";
    const seed = hash(`${seedPrefix}${team.id}:${seasonLabel}:${index}`);
    const age = options.isInitialFill ? getInitialJuniorAge(index, seed) : 16;
    const birthYear = getJuniorSeasonStartDate(seasonLabel).getUTCFullYear() - age;
    const position = getPositionNeed(team.juniorPlayers);
    const secondaryPositions = getForwardSecondaryPositions(position, seed);
    const nationality = getNationality(team, seed);
    const existingNames = new Set((team.juniorPlayers || []).map((player) => player.name));
    const { firstName, lastName } = getNames(nationality, seed, existingNames, team);
    const ovr = getBaseOvr(age, seed);
    const talentRoll = seed % 100;
    const potentialGap = talentRoll >= 96 ? 24 + (seed % 6) : talentRoll >= 82 ? 18 + (seed % 7) : talentRoll >= 47 ? 10 + (seed % 8) : 4 + (seed % 8);
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
        secondaryPositions,
      },
      hiddenTraits: getJuniorHiddenTraits({ position, seed, talentRoll }),
      attributes: getAttributeProfile(position, ovr, seed),
      potential: {
        potential: clamp(ovr + potentialGap, 55, 94),
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
