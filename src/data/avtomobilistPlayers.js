import { PlayerPosition } from "../models/PlayerPosition.js";

const AVT_TEAM_ID = "a4b4f445-2c38-41c5-a2d2-3aee8a0f5d2a";
const photo = (slug) => `./player-photo/${slug}.png`;

const contractTypeByLabel = Object.freeze({
  "односторонний": "one-way",
  "двухсторонний": "two-way",
  "трехсторонний": "three-way",
});

const positionByLabel = Object.freeze({
  "ЦТР": PlayerPosition.CTR,
  "ЛНП": PlayerPosition.LW,
  "ПНП": PlayerPosition.RW,
  "ЗАЩ": PlayerPosition.DEF,
});

const nationalityByLabel = Object.freeze({
  "Россия": "RU",
  "Нидерланды": "NL",
});

const avtomobilistAdditions = [
  ["yuri-pautov", "Юрий", "Паутов", "ЗАЩ", [], photo("yuri-pautov"), "1995-03-18", "Россия", 9, 336, 100, 61, 70, 70, 73, 70, 74, "односторонний", [7]],
  ["shchuchinov", "Артем", "Щучинов", "ЗАЩ", [], photo("shchuchinov"), "2005-10-19", "Россия", 4, 96, 100, 64, 78, 69, 72, 75, 77, "трехсторонний", [2, 2]],
  ["sprong", "Даниэль", "Спронг", "ЛНП", ["ПНП"], photo("sprong"), "1997-03-17", "Нидерланды", 1, 52, 100, 82, 83, 80, 70, 89, 84, "односторонний", [35, 90]],
  ["chernikov", "Егор", "Черников", "ЦТР", ["ПНП"], photo("chernikov"), "2002-12-09", "Россия", 2, 73, 100, 74, 70, 77, 74, 70, 76, "двухсторонний", [5, 5, 5]],
  ["gashilov", "Лавр", "Гашилов", "ЦТР", [], photo("gashilov"), "2007-09-23", "Россия", 1, 3, 100, 62, 70, 68, 66, 72, 81, "трехсторонний", [0.5, 0.5]],
  ["gamzakov", "Михаил", "Гамзаков", "ЗАЩ", [], photo("gamzakov"), "2007-08-18", "Россия", 0, 0, 100, 60, 71, 72, 72, 69, 80, "трехсторонний", [0.5, 0.5]],
  ["velikov", "Максим", "Великов", "ПНП", [], photo("velikov"), "2005-10-21", "Россия", 1, 4, 100, 63, 66, 67, 68, 74, 75, "трехсторонний", [0.5, 1]],
];

const toPosition = (label) => positionByLabel[label] || PlayerPosition.CTR;
const toSecondaryPositions = (labels) => labels.map(toPosition).filter(Boolean);
const toNationality = (label) => nationalityByLabel[label] || "RU";
const contractId = (slug, seasonIndex) => `avt-add-contract-${slug}-${seasonIndex}`;
const playerId = (slug) => `avt-add-player-${slug}`;
const seasonByIndex = ["2025/2026", "2026/2027", "2027/2028", "2028/2029", "2029/2030"];
const salaryRub = (millions) => Math.round(Number(millions) * 1000000);
const getPeakAge = (birthDate) => {
  const birthYear = Number(String(birthDate).slice(0, 4)) || 1998;
  return birthYear >= 2004 ? 27 : birthYear >= 1999 ? 28 : birthYear >= 1994 ? 29 : 31;
};
const getGrowthRate = (birthDate) => {
  const birthYear = Number(String(birthDate).slice(0, 4)) || 1998;
  return birthYear >= 2007 ? 1.15 : birthYear >= 2005 ? 1 : birthYear >= 2001 ? 0.85 : 0.55;
};

export const avtomobilistPlayerProfiles = avtomobilistAdditions.map(([
  slug,
  firstName,
  lastName,
  positionLabel,
  secondaryPositionLabels,
  photoUrl,
  birthDate,
  nationalityLabel,
  seasonsPlayed,
  khlGamesPlayed,
  reputation,
  shot,
  speed,
  physical,
  defense,
  skill,
  potential,
]) => {
  const position = toPosition(positionLabel);
  return {
    id: playerId(slug),
    teamId: AVT_TEAM_ID,
    lineIndex: null,
    position,
    identity: {
      firstName,
      lastName,
      displayName: `${firstName} ${lastName}`,
      birthDate,
      nationality: toNationality(nationalityLabel),
      isGoalie: false,
      photoUrl,
      primaryPosition: position,
      secondaryPositions: toSecondaryPositions(secondaryPositionLabels),
    },
    attributes: { shot, speed, physical, defense, skill },
    potential: {
      potential,
      growthRate: getGrowthRate(birthDate),
      peakAge: getPeakAge(birthDate),
      declineRate: 0.7,
    },
    condition: { fatigueScore: 0, form: 1.0, injuryUntilDay: null },
    career: { khlGamesPlayed, seasonsPlayed, reputation },
    affiliation: { contractId: contractId(slug, 0) },
  };
});

export const avtomobilistPlayerContracts = avtomobilistAdditions.flatMap(([slug,,,,,,,,,,,,,,,,, typeLabel, salaries]) =>
  salaries.map((salary, seasonIndex) => ({
    id: contractId(slug, seasonIndex),
    playerId: playerId(slug),
    teamId: AVT_TEAM_ID,
    season: seasonByIndex[seasonIndex],
    salaryRub: salaryRub(salary),
    type: contractTypeByLabel[typeLabel] || "one-way",
  })),
);
