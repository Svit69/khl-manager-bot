import { PlayerPosition } from "../models/PlayerPosition.js";

const SKA_TEAM_ID = "b81ef7c2-4a9a-4c0d-93e0-7b8ef6ad1946";
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
  "Канада": "CA",
  "США": "US",
  "Беларусь": "BY",
});

const skaRoster = [
  ["blandisi", "Джозеф", "Бландизи", "ЦТР", ["ЛНП"], photo("blandisi"), "1994-07-18", "Канада", 1, 62, 100, 77, 77, 74, 70, 76, 78, "односторонний", [40, 50]],
  ["mikhail-vorobyov", "Михаил", "Воробьев", "ЦТР", [], photo("mikhail-vorobyov"), "1997-01-05", "Россия", 8, 363, 100, 75, 75, 81, 75, 76, 79, "односторонний", [55]],
  ["galenyuk", "Данила", "Галенюк", "ЗАЩ", [], photo("galenyuk"), "2000-02-11", "Россия", 9, 303, 100, 65, 76, 76, 75, 75, 76, "односторонний", [30]],
  ["goldobin", "Николай", "Голдобин", "ПНП", ["ЛНП"], photo("goldobin"), "1995-10-07", "Россия", 6, 328, 100, 82, 79, 76, 71, 85, 81, "односторонний", [35, 40, 45]],
  ["grimaldi", "Рокко", "Гримальди", "ЛНП", [], photo("grimaldi"), "1993-02-08", "США", 1, 66, 100, 77, 79, 70, 71, 82, 79, "односторонний", [92, 92]],
  ["zykov", "Валентин", "Зыков", "ЦТР", [], photo("zykov"), "1995-05-15", "Россия", 5, 233, 100, 76, 75, 80, 77, 78, 78, "односторонний", [35, 45]],
  ["koledov", "Павел", "Коледов", "ЗАЩ", [], photo("koledov"), "1994-09-20", "Россия", 14, 636, 100, 67, 78, 77, 76, 77, 77, "односторонний", [26]],
  ["korotky", "Матвей", "Короткий", "ЦТР", [], photo("korotky"), "2005-12-23", "Россия", 2, 73, 100, 78, 81, 80, 71, 77, 83, "двухсторонний", [5, 10]],
  ["menell", "Бреннан", "Менелл", "ЗАЩ", [], photo("menell"), "1997-05-24", "Россия", 6, 258, 100, 74, 84, 72, 76, 82, 80, "односторонний", [55]],
  ["pedan", "Андрей", "Педан", "ЗАЩ", [], photo("pedan"), "1993-07-03", "Россия", 9, 327, 100, 68, 70, 83, 79, 76, 78, "односторонний", [40]],
  ["savikov", "Егор", "Савиков", "ЗАЩ", [], photo("savikov"), "2002-11-24", "Россия", 6, 227, 100, 74, 82, 76, 75, 79, 81, "односторонний", [10, 15, 17]],
  ["sapego", "Сергей", "Сапего", "ЗАЩ", [], photo("sapego"), "1999-10-08", "Беларусь", 6, 255, 100, 67, 73, 79, 79, 76, 78, "односторонний", [50, 50]],
  ["wilson", "Скотт", "Уилсон", "ПНП", ["ЛНП"], photo("wilson"), "1992-04-24", "Канада", 4, 227, 100, 78, 81, 74, 72, 77, 78, "односторонний", [25, 60]],
  ["phillips", "Маркус", "Филлипс", "ЗАЩ", [], photo("phillips"), "1999-03-21", "Канада", 2, 125, 100, 64, 77, 77, 74, 70, 75, "односторонний", [18]],
  ["khairullin", "Марат", "Хайруллин", "ПНП", [], photo("khairullin"), "1996-07-15", "Россия", 11, 540, 100, 81, 80, 79, 77, 83, 82, "односторонний", [55]],
  ["zaitsev", "Никита", "Зайцев", "ЗАЩ", [], photo("zaitsev"), "1991-10-29", "Россия", 10, 393, 100, 70, 77, 82, 76, 78, 77, "односторонний", [75, 75, 75]],
  ["larionov", "Игорь", "Ларионов", "ЦТР", [], photo("larionov"), "1998-08-24", "Россия", 5, 140, 100, 68, 73, 73, 71, 74, 75, "односторонний", [30]],
  ["murphy", "Тревор", "Мерфи", "ЗАЩ", [], photo("murphy"), "1995-07-17", "Канада", 8, 312, 100, 80, 78, 78, 75, 85, 82, "односторонний", [75, 75]],
  ["plotnikov", "Сергей", "Плотников", "ПНП", ["ЦТР"], photo("plotnikov"), "1990-06-03", "Россия", 16, 855, 100, 78, 75, 82, 77, 81, 80, "односторонний", [55, 60, 60]],
  ["vydrenkov", "Иван", "Выдренков", "ЗАЩ", [], photo("vydrenkov"), "2004-07-31", "Россия", 4, 61, 100, 62, 67, 77, 73, 64, 76, "двухсторонний", [2, 2]],
  ["zelenov", "Егор", "Зеленов", "ЗАЩ", [], photo("zelenov"), "2002-06-27", "Россия", 1, 44, 100, 60, 70, 69, 70, 72, 75, "двухсторонний", [1]],
  ["polyakov", "Матвей", "Поляков", "ПНП", [], photo("polyakov"), "2004-07-10", "Россия", 2, 64, 100, 75, 78, 72, 70, 78, 80, "двухсторонний", [3]],
  ["dishkovsky", "Никита", "Дишковский", "ПНП", [], photo("dishkovsky"), "2002-12-10", "Россия", 1, 66, 100, 72, 77, 78, 74, 75, 78, "двухсторонний", [1]],
  ["nedopyokin", "Никита", "Недопекин", "ЦТР", [], photo("nedopyokin"), "2005-03-22", "Россия", 1, 50, 100, 73, 74, 69, 64, 70, 76, "двухсторонний", [0.5, 0.5]],
  ["lutfullin", "Игнат", "Лутфуллин", "ЛНП", [], photo("lutfullin"), "2005-02-11", "Россия", 1, 19, 100, 72, 70, 71, 64, 74, 77, "двухсторонний", [1, 1]],
  ["khanin", "Макар", "Ханин", "ПНП", [], photo("khanin"), "2005-03-17", "Россия", 1, 4, 100, 65, 67, 64, 60, 70, 76, "двухсторонний", [0.5]],
];

const toPosition = (label) => positionByLabel[label] || PlayerPosition.CTR;
const toSecondaryPositions = (labels) => labels.map(toPosition).filter(Boolean);
const toNationality = (label) => nationalityByLabel[label] || "RU";
const contractId = (slug, seasonIndex) => `ska-contract-${slug}-${seasonIndex}`;
const playerId = (slug) => `ska-player-${slug}`;
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

export const skaPlayerProfiles = skaRoster.map(([
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
    teamId: SKA_TEAM_ID,
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

export const skaPlayerContracts = skaRoster.flatMap(([slug,,,,,,,,,,,,,,,,, typeLabel, salaries]) =>
  salaries.map((salary, seasonIndex) => ({
    id: contractId(slug, seasonIndex),
    playerId: playerId(slug),
    teamId: SKA_TEAM_ID,
    season: seasonByIndex[seasonIndex],
    salaryRub: salaryRub(salary),
    type: contractTypeByLabel[typeLabel] || "one-way",
  })),
);
