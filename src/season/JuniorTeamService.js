import { createSkater } from "../data/playerFactory.js";
import { calculateAge, parseSeasonEnd } from "../contracts/SeasonUtils.js";
import { PlayerPosition } from "../models/PlayerPosition.js";

const TARGET_JUNIOR_SIZE = 22;
const POSITION_TARGETS = Object.freeze({
  [PlayerPosition.CTR]: 4,
  [PlayerPosition.LW]: 4,
  [PlayerPosition.RW]: 4,
  [PlayerPosition.DEF]: 8,
  [PlayerPosition.G]: 2,
});

const FIRST_NAMES_RU = ["Иван","Артем","Никита","Даниил","Максим","Егор","Кирилл","Матвей","Михаил","Александр","Роман","Тимофей","Семен","Ярослав"];
const LAST_NAMES_RU = ["Смирнов","Кузнецов","Соколов","Попов","Васильев","Морозов","Волков","Федоров","Михайлов","Новиков","Павлов","Козлов","Орлов","Зайцев"];
const FIRST_NAMES_BY = ["Артем","Матвей","Егор","Данила","Максим","Кирилл","Никита","Илья"];
const LAST_NAMES_BY = ["Ковалев","Гончаров","Савицкий","Мороз","Пинчук","Соловей","Левченко","Климович"];

const pick = (items, seed) => items[Math.abs(seed) % items.length];
const hash = (source) => {
  let value = 0;
  for (let index = 0; index < source.length; index++) value = (value * 31 + source.charCodeAt(index)) % 1000003;
  return value;
};
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

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
  const firstNames = nationality === "BY" ? FIRST_NAMES_BY : FIRST_NAMES_RU;
  const lastNames = nationality === "BY" ? LAST_NAMES_BY : LAST_NAMES_RU;
  return {
    firstName: pick(firstNames, seed),
    lastName: pick(lastNames, Math.floor(seed / 7)),
  };
};

const getSeasonKey = (seasonLabel) => String(seasonLabel || "season-1").replace(/[^0-9A-Za-z]+/g, "-");
const getSeasonReferenceYear = (seasonLabel) => parseSeasonEnd(seasonLabel) || new Date().getUTCFullYear();
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

  applyOffseasonDevelopment(teams, seasonDate = null) {
    (teams || []).forEach((team) => {
      (team.juniorPlayers || []).forEach((player) => {
        if (player.identity?.isGoalie) return;
        const age = calculateAge(player.identity?.birthDate, seasonDate);
        const growth = age <= 18 ? 1 : age <= 20 ? 0.7 : 0.25;
        const potentialGap = Math.max(0, (player.potential?.potential || player.ovr) - player.ovr);
        const chance = Math.min(0.75, 0.18 + potentialGap * 0.035 + growth * 0.16);
        const roll = (hash(`${player.id}:junior-dev`) % 1000) / 1000;
        if (roll > chance) return;
        const attrs = Object.keys(player.attributes.attributesJson || {});
        const key = attrs[hash(`${player.id}:attr`) % attrs.length];
        player.attributes.applyAttributeDelta(key, 1);
      });
    });
  }

  #createRegen(team, seasonLabel, index, forcedId = null) {
    const seed = hash(`${team.id}:${seasonLabel}:${index}`);
    const age = 16 + (seed % 5);
    const birthYear = getSeasonReferenceYear(seasonLabel) - age;
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
        photoUrl: "./player-photo/placeholder.png",
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
