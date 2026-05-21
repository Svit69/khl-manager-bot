import { PlayerPosition } from "../models/PlayerPosition.js";

const LOK_TEAM_ID = "5e7f6c2a-2d44-4d3a-9b2c-9f1a6e8d7c30";
const DEFAULT_PHOTO = "./player-photo/default.png";
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
  "ПНА": PlayerPosition.RW,
  "ЗАЩ": PlayerPosition.DEF,
});

const nationalityByLabel = Object.freeze({
  "Россия": "RU",
  "Словакия": "SK",
  "Канада": "CA",
});

const lokomotivRoster = [
  ["denis-alexeyev", "Денис", "Алексеев", "ЦТР", ["ЛНП"], photo("denis-alexeyev"), "1997-10-01", "Россия", 10, 488, 100, 73, 73, 77, 75, 78, 78, "односторонний", [55, 55]],
  ["bereglazov", "Алексей", "Береглазов", "ЗАЩ", [], photo("bereglazov"), "1994-04-20", "Россия", 13, 643, 100, 71, 74, 79, 80, 76, 78, "односторонний", [52, 65]],
  ["beryozkin", "Максим", "Березкин", "ЛНП", ["ПНП"], photo("beryozkin"), "2001-10-12", "Россия", 7, 306, 100, 74, 82, 77, 70, 84, 81, "односторонний", [22]],
  ["alexander-volkov", "Александр", "Волков", "ПНП", [], photo("alexander-volkov"), "2003-04-09", "Россия", 4, 111, 100, 69, 72, 75, 70, 72, 75, "двухсторонний", [1]],
  ["gernat", "Мартин", "Гернат", "ЗАЩ", [], photo("gernat"), "1993-04-11", "Словакия", 3, 186, 100, 76, 77, 79, 83, 82, 83, "односторонний", [50]],
  ["yelesin", "Александр", "Елесин", "ЗАЩ", [], photo("yelesin"), "1996-02-07", "Россия", 8, 409, 100, 72, 74, 86, 83, 79, 81, "односторонний", [60, 60]],
  ["georgi-ivanov", "Георгий", "Иванов", "ЦТР", [], photo("georgi-ivanov"), "1998-09-25", "Россия", 9, 468, 100, 72, 77, 80, 78, 75, 78, "односторонний", [35, 70, 73]],
  ["kayumov", "Артур", "Каюмов", "ПНП", ["ЛНП"], photo("kayumov"), "1998-02-14", "Россия", 10, 469, 100, 76, 77, 77, 75, 83, 80, "односторонний", [70, 70]],
  ["kiryanov", "Никита", "Кирьянов", "ЛНП", [], photo("kiryanov"), "2002-05-07", "Россия", 3, 156, 100, 67, 81, 80, 76, 75, 78, "двухсторонний", [3, 3]],
  ["kraskovsky", "Павел", "Красковский", "ЦТР", [], photo("kraskovsky"), "1996-09-11", "Россия", 13, 587, 100, 70, 74, 80, 76, 76, 78, "односторонний", [55]],
  ["kuzin", "Артем", "Кузин", "ЦТР", [], photo("kuzin"), "2005-10-27", "Россия", 1, 35, 100, 60, 69, 74, 66, 65, 73, "трехсторонний", [0.9, 0.9]],
  ["misyul", "Даниил", "Мисюль", "ЗАЩ", [], photo("misyul"), "2000-10-20", "Россия", 6, 244, 100, 69, 72, 80, 76, 72, 78, "односторонний", [40]],
  ["ilya-nikolayev", "Илья", "Николаев", "ПНП", [], photo("ilya-nikolayev"), "2001-06-26", "Россия", 2, 39, 100, 68, 74, 72, 74, 76, 76, "двухсторонний", [2, 2]],
  ["nikulin", "Степан", "Никулин", "ЛНП", [], photo("nikulin"), "2001-03-17", "Россия", 5, 205, 100, 69, 78, 75, 70, 75, 76, "односторонний", [2]],
  ["panik", "Рихард", "Паник", "ПНП", ["ЛНП"], photo("panik"), "1991-02-07", "Словакия", 2, 67, 100, 74, 80, 76, 73, 77, 79, "односторонний", [45]],
  ["polunin", "Александр", "Полунин", "ЛНП", ["ЦТР"], photo("polunin"), "1997-05-25", "Россия", 11, 563, 100, 73, 77, 77, 78, 75, 78, "односторонний", [40]],
  ["radulov", "Александр", "Радулов", "ПНП", [], DEFAULT_PHOTO, "1986-07-05", "Россия", 12, 635, 100, 81, 75, 80, 70, 88, 82, "односторонний", [39, 60]],
  ["rafikov", "Рушан", "Рафиков", "ЗАЩ", [], DEFAULT_PHOTO, "1995-05-15", "Россия", 11, 589, 100, 73, 78, 78, 79, 78, 80, "односторонний", [56, 56]],
  ["sergeyev", "Андрей", "Сергеев", "ЗАЩ", [], photo("andrei-sergeyev"), "1991-03-26", "Россия", 17, 785, 100, 71, 77, 81, 81, 74, 80, "односторонний", [60, 57, 60]],
  ["surin", "Егор", "Сурин", "ЛНП", ["ПНП"], DEFAULT_PHOTO, "2006-08-01", "Россия", 3, 101, 100, 70, 74, 82, 75, 78, 85, "двухсторонний", [40, 60]],
  ["ulyev", "Марк", "Ульев", "ЗАЩ", [], DEFAULT_PHOTO, "2005-02-06", "Россия", 3, 80, 100, 70, 72, 72, 72, 68, 78, "трехсторонний", [1, 1]],
  ["froese", "Байрон", "Фрэз", "ЦТР", [], DEFAULT_PHOTO, "1991-03-12", "Канада", 2, 127, 100, 75, 76, 72, 78, 79, 77, "односторонний", [26]],
  ["cherepanov", "Никита", "Черепанов", "ЗАЩ", [], DEFAULT_PHOTO, "1995-11-19", "Россия", 11, 575, 100, 70, 75, 77, 78, 73, 77, "односторонний", [32]],
  ["shalunov", "Максим", "Шалунов", "ЦТР", [], DEFAULT_PHOTO, "1993-01-31", "Россия", 14, 644, 100, 80, 78, 77, 74, 78, 80, "односторонний", [55, 80, 80]],
  ["pustovoy", "Андрей", "Пустовой", "ПНП", [], DEFAULT_PHOTO, "2008-12-08", "Россия", 0, 0, 100, 67, 72, 74, 66, 77, 83, "трехсторонний", [0.5, 0.5, 1]],
  ["dudorov", "Вадим", "Дудоров", "ПНП", [], DEFAULT_PHOTO, "2006-07-21", "Россия", 1, 11, 100, 70, 74, 66, 66, 74, 80, "трехсторонний", [0.5]],
];

const toPosition = (label) => positionByLabel[label] || PlayerPosition.CTR;
const toSecondaryPositions = (labels) => labels.map(toPosition).filter(Boolean);
const toNationality = (label) => nationalityByLabel[label] || "RU";
const contractId = (slug, seasonIndex) => `lok-contract-${slug}-${seasonIndex}`;
const playerId = (slug) => `lok-player-${slug}`;
const seasonByIndex = ["2025/2026", "2026/2027", "2027/2028", "2028/2029", "2029/2030"];
const salaryRub = (millions) => Math.round(Number(millions) * 1000000);
const getPeakAge = (birthDate) => {
  const birthYear = Number(String(birthDate).slice(0, 4)) || 1998;
  return birthYear >= 2004 ? 27 : birthYear >= 1999 ? 28 : birthYear >= 1994 ? 29 : 31;
};
const getGrowthRate = (birthDate) => {
  const birthYear = Number(String(birthDate).slice(0, 4)) || 1998;
  return birthYear >= 2006 ? 1.15 : birthYear >= 2003 ? 1 : birthYear >= 2000 ? 0.85 : 0.55;
};

export const lokomotivPlayerProfiles = lokomotivRoster.map(([
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
    teamId: LOK_TEAM_ID,
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

export const lokomotivPlayerContracts = lokomotivRoster.flatMap(([slug,,,,,,,,,,,,,,,,, typeLabel, salaries]) =>
  salaries.map((salary, seasonIndex) => ({
    id: contractId(slug, seasonIndex),
    playerId: playerId(slug),
    teamId: LOK_TEAM_ID,
    season: seasonByIndex[seasonIndex],
    salaryRub: salaryRub(salary),
    type: contractTypeByLabel[typeLabel] || "one-way",
  })),
);
