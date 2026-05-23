import { PlayerPosition } from "../models/PlayerPosition.js";

const SIB_TEAM_ID = "8ef62a37-2c8f-4c7b-9d38-2c4b6e0e9f14";
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

const sibirRoster = [
  ["mikhail-abramov", "Михаил", "Абрамов", "ЦТР", [], photo("mikhail-abramov"), "2001-03-26", "Россия", 3, 82, 100, 77, 79, 70, 71, 78, 77, "односторонний", [16]],
  ["alanov", "Егор", "Аланов", "ЗАЩ", [], photo("alanov"), "2000-12-16", "Россия", 8, 310, 100, 70, 80, 78, 82, 80, 80, "односторонний", [20, 20]],
  ["andreoff", "Энди", "Андреофф", "ПНП", ["ЦТР"], photo("andreoff"), "1991-05-17", "Канада", 4, 151, 100, 77, 76, 76, 70, 79, 77, "односторонний", [30, 55]],
  ["akhiyarov", "Тимур", "Ахияров", "ЗАЩ", [], photo("akhiyarov"), "1999-09-19", "Россия", 8, 235, 100, 70, 74, 78, 77, 71, 76, "односторонний", [13]],
  ["baklashyov", "Никита", "Баклашев", "ЗАЩ", [], photo("baklashyov"), "2005-02-05", "Россия", 3, 74, 100, 57, 66, 73, 70, 60, 75, "двухсторонний", [0.5, 0.5, 0.5]],
  ["beck", "Тэйлор", "Бек", "ПНП", [], photo("beck"), "1991-05-13", "Канада", 10, 468, 100, 83, 78, 74, 70, 85, 79, "односторонний", [35, 55]],
  ["valitov", "Даниил", "Валитов", "ЗАЩ", [], photo("valitov"), "2000-06-09", "Россия", 7, 64, 100, 60, 72, 74, 70, 67, 74, "двухсторонний", [1, 1]],
  ["gordeyev", "Фёдор", "Гордеев", "ЗАЩ", [], photo("gordeyev"), "1999-01-27", "Россия", 4, 122, 100, 64, 72, 82, 76, 76, 77, "односторонний", [20]],
  ["yegor-zaitsev", "Егор", "Зайцев", "ЗАЩ", [], photo("yegor-zaitsev"), "1998-05-03", "Россия", 10, 449, 100, 62, 73, 79, 73, 73, 75, "односторонний", [13]],
  ["ivan-klimovich", "Иван", "Климович", "ЦТР", [], photo("ivan-klimovich"), "2003-08-26", "Россия", 5, 143, 100, 57, 64, 77, 70, 71, 74, "двухсторонний", [0.7, 0.7]],
  ["yegor-klimovich", "Егор", "Климович", "ПНП", ["ЛНП"], photo("yegor-klimovich"), "2005-05-14", "Россия", 4, 40, 100, 70, 78, 70, 63, 71, 77, "двухсторонний", [0.5, 0.5]],
  ["kosolapov", "Антон", "Косолапов", "ЛНП", [], photo("kosolapov"), "2002-01-30", "Россия", 3, 41, 100, 81, 79, 75, 72, 81, 80, "односторонний", [7, 15, 25]],
  ["koshelev", "Семён", "Кошелев", "ПНП", ["ЛНП"], photo("koshelev"), "1996-01-11", "Россия", 11, 518, 100, 75, 78, 74, 76, 77, 76, "односторонний", [24]],
  ["leshchenko", "Вячеслав", "Лещенко", "ПНП", ["ЛНП"], photo("leshchenko"), "1995-04-24", "Россия", 12, 543, 100, 76, 76, 71, 72, 76, 75, "односторонний", [12]],
  ["loktionov", "Андрей", "Локтионов", "ЦТР", [], photo("loktionov"), "1990-05-30", "Россия", 12, 570, 100, 76, 74, 76, 72, 77, 76, "односторонний", [14, 35]],
  ["nekolenko", "Архип", "Неколенко", "ЦТР", [], photo("nekolenko"), "1996-03-11", "Россия", 11, 382, 100, 62, 70, 79, 73, 76, 76, "односторонний", [35, 35]],
  ["mikhail-orlov", "Михаил", "Орлов", "ЗАЩ", [], photo("mikhail-orlov"), "1992-09-21", "Россия", 10, 446, 100, 68, 64, 78, 73, 70, 75, "односторонний", [5, 5]],
  ["priskie", "Чейз", "Приски", "ЗАЩ", [], photo("priskie"), "1996-03-19", "США", 1, 50, 100, 75, 82, 74, 76, 78, 79, "односторонний", [47]],
  ["pyanov", "Валентин", "Пьянов", "ЦТР", [], photo("pyanov"), "1991-07-21", "Россия", 15, 569, 100, 72, 74, 74, 75, 75, 75, "односторонний", [30]],
  ["sushko", "Максим", "Сушко", "ЛНП", [], photo("sushko"), "1999-02-10", "Беларусь", 6, 209, 100, 65, 67, 76, 75, 70, 75, "односторонний", [4]],
  ["talaluyev", "Илья", "Талалуев", "ЛНП", [], photo("talaluyev"), "1998-01-28", "Россия", 10, 306, 100, 74, 77, 70, 71, 74, 76, "односторонний", [5, 10]],
  ["tkachenko", "Павел", "Ткаченко", "ЛНП", ["ПНП"], photo("tkachenko"), "1997-07-11", "Россия", 7, 100, 100, 60, 75, 63, 67, 69, 72, "двухсторонний", [1, 1]],
  ["ilya-fedotov", "Илья", "Федотов", "ЛНП", ["ПНП"], photo("ilya-fedotov"), "2003-03-19", "Россия", 7, 162, 100, 68, 80, 72, 69, 77, 79, "односторонний", [6, 10]],
  ["andrei-churkin", "Андрей", "Чуркин", "ЗАЩ", [], photo("andrei-churkin"), "1996-07-11", "Россия", 6, 204, 100, 60, 79, 73, 73, 73, 75, "односторонний", [17, 17]],
  ["shirokov", "Сергей", "Широков", "ЛНП", ["ПНП"], photo("shirokov"), "1986-03-10", "Россия", 16, 803, 100, 79, 74, 75, 73, 79, 76, "односторонний", [30]],
  ["alexei-yakovlev", "Алексей", "Яковлев", "ЛНП", ["ЦТР"], photo("alexei-yakovlev"), "1995-06-04", "Россия", 13, 355, 100, 70, 74, 78, 75, 72, 74, "односторонний", [15, 15]],
  ["pershakov", "Александр", "Першаков", "ПНП", [], photo("pershakov"), "2006-10-19", "Россия", 3, 47, 100, 67, 70, 64, 64, 70, 78, "трехсторонний", [0.5, 0.5, 0.5]],
];

const toPosition = (label) => positionByLabel[label] || PlayerPosition.CTR;
const toSecondaryPositions = (labels) => labels.map(toPosition).filter(Boolean);
const toNationality = (label) => nationalityByLabel[label] || "RU";
const contractId = (slug, seasonIndex) => `sib-contract-${slug}-${seasonIndex}`;
const playerId = (slug) => `sib-player-${slug}`;
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

export const sibirPlayerProfiles = sibirRoster.map(([
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
    teamId: SIB_TEAM_ID,
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

export const sibirPlayerContracts = sibirRoster.flatMap(([slug,,,,,,,,,,,,,,,,, typeLabel, salaries]) =>
  salaries.map((salary, seasonIndex) => ({
    id: contractId(slug, seasonIndex),
    playerId: playerId(slug),
    teamId: SIB_TEAM_ID,
    season: seasonByIndex[seasonIndex],
    salaryRub: salaryRub(salary),
    type: contractTypeByLabel[typeLabel] || "one-way",
  })),
);
