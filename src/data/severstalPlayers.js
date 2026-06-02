import { PlayerPosition } from "../models/PlayerPosition.js";

const SEVERSTAL_TEAM_ID = "c3e7f2a9-6a51-4f84-9c6d-87b5d8e4a901";
const DEFAULT_PHOTO = "./player-photo/default.png";
const photo = (slug, available = true) => available ? `./player-photo/${slug}.png` : DEFAULT_PHOTO;

const seasonByIndex = ["2025/2026", "2026/2027", "2027/2028", "2028/2029", "2029/2030"];
const salaryRub = (millions) => Math.round(Number(millions) * 1000000);
const contractId = (slug, seasonIndex) => `severstal-contract-${slug}-${seasonIndex}`;
const playerId = (slug) => `severstal-player-${slug}`;

const getPeakAge = (birthDate) => {
  const birthYear = Number(String(birthDate).slice(0, 4)) || 1998;
  return birthYear >= 2004 ? 27 : birthYear >= 1999 ? 28 : birthYear >= 1994 ? 29 : 31;
};

const getGrowthRate = (birthDate) => {
  const birthYear = Number(String(birthDate).slice(0, 4)) || 1998;
  return birthYear >= 2006 ? 1.15 : birthYear >= 2003 ? 1 : birthYear >= 2000 ? 0.85 : 0.55;
};

const severstalRoster = [
  ["aimurzin", "Данил", "Аймурзин", PlayerPosition.CTR, [], photo("aimurzin"), "2002-04-17", "RU", 6, 218, 100, 77, 76, 80, 74, 81, 81, "one-way", [23]],
  ["burenov", "Николай", "Буренов", PlayerPosition.DEF, [], photo("burenov"), "2001-05-13", "RU", 4, 178, 100, 61, 74, 65, 71, 74, 74, "two-way", [2, 2]],
  ["vashchenko", "Григорий", "Ващенко", PlayerPosition.DEF, [], photo("vashchenko"), "1995-01-29", "RU", 5, 108, 100, 63, 70, 72, 72, 62, 71, "two-way", [1]],
  ["gregoire", "Томас", "Грегуар", PlayerPosition.DEF, [], photo("gregoire"), "1998-07-15", "CA", 1, 60, 100, 71, 79, 70, 75, 76, 77, "one-way", [40]],
  ["grudinin", "Владимир", "Грудинин", PlayerPosition.DEF, [], photo("grudinin"), "2003-12-09", "RU", 5, 201, 100, 69, 78, 68, 77, 77, 79, "two-way", [17, 20]],
  ["timofei-davydov", "Тимофей", "Давыдов", PlayerPosition.DEF, [], photo("timofei-davydov"), "2002-06-01", "RU", 5, 189, 100, 63, 73, 77, 74, 75, 78, "two-way", [2, 3]],
  ["dumbadze", "Давид", "Думбадзе", PlayerPosition.RW, [], photo("dumbadze"), "1995-09-28", "RU", 6, 306, 100, 72, 77, 74, 72, 75, 75, "one-way", [2, 2]],
  ["zhukov", "Артем", "Жуков", PlayerPosition.DEF, [], photo("zhukov"), "2002-08-14", "RU", 3, 107, 100, 60, 65, 77, 70, 63, 73, "two-way", [6, 12]],
  ["ivantsov", "Илья", "Иванцов", PlayerPosition.CTR, [], photo("ivantsov"), "2003-01-27", "RU", 5, 234, 100, 69, 78, 71, 72, 75, 76, "two-way", [20]],
  ["kazulayev", "Даниил", "Казулаев", PlayerPosition.LW, [PlayerPosition.RW], photo("kazulayev"), "2005-10-25", "RU", 1, 14, 100, 61, 62, 69, 64, 65, 76, "three-way", [0.5, 0.5, 0.5]],
  ["kaldis", "Иоаннис", "Калдис", PlayerPosition.DEF, [], photo("kaldis"), "1995-09-30", "CA", 3, 182, 100, 74, 79, 77, 75, 80, 79, "one-way", [40, 40]],
  ["kamalov", "Никита", "Камалов", PlayerPosition.DEF, [], photo("kamalov"), "1995-08-08", "RU", 13, 448, 100, 72, 78, 78, 74, 78, 78, "one-way", [31]],
  ["kvochko", "Илья", "Квочко", PlayerPosition.RW, [PlayerPosition.CTR], photo("kvochko"), "2004-02-22", "RU", 4, 50, 100, 70, 76, 73, 67, 73, 76, "two-way", [0.5, 0.5]],
  ["liska", "Адам", "Лишка", PlayerPosition.RW, [PlayerPosition.LW], photo("liska"), "1999-10-14", "SK", 8, 432, 100, 75, 76, 77, 76, 77, 77, "one-way", [25]],
  ["okunev", "Иван", "Окунев", PlayerPosition.RW, [], photo("okunev"), "2006-08-03", "RU", 1, 9, 100, 59, 63, 62, 58, 64, 70, "three-way", [0.5, 0.5, 0.5]],
  ["podshivalov", "Иван", "Подшивалов", PlayerPosition.CTR, [], photo("podshivalov"), "2002-02-18", "RU", 5, 213, 100, 70, 73, 73, 70, 74, 74, "two-way", [2, 3]],
  ["reingardt", "Илья", "Рейнгардт", PlayerPosition.RW, [PlayerPosition.LW], photo("reingardt"), "2003-09-08", "RU", 3, 104, 100, 68, 73, 67, 64, 75, 75, "two-way", [5]],
  ["skorenov", "Александр", "Скоренов", PlayerPosition.LW, [PlayerPosition.RW], photo("skorenov"), "1999-12-18", "BY", 4, 205, 100, 79, 75, 76, 71, 78, 78, "one-way", [17, 19]],
  ["fomin", "Макар", "Фомин", PlayerPosition.DEF, [], photo("fomin"), "2006-12-17", "RU", 2, 50, 100, 61, 69, 64, 70, 70, 79, "three-way", [0.5, 1, 2]],
  ["tsitsyura", "Владислав", "Цицюра", PlayerPosition.CTR, [], photo("tsitsyura"), "1999-09-26", "RU", 6, 213, 100, 70, 76, 70, 67, 73, 75, "one-way", [27]],
  ["chebykin", "Николай", "Чебыкин", PlayerPosition.RW, [], photo("chebykin"), "1997-08-01", "RU", 8, 276, 100, 75, 74, 81, 78, 70, 77, "one-way", [5]],
  ["chefanov", "Илья", "Чефанов", PlayerPosition.RW, [], photo("chefanov"), "2001-10-18", "RU", 2, 55, 100, 69, 72, 70, 70, 73, 74, "two-way", [3, 3]],
  ["abrosimov", "Руслан", "Абросимов", PlayerPosition.CTR, [], photo("abrosimov"), "2001-05-15", "RU", 5, 265, 100, 78, 81, 75, 72, 80, 81, "one-way", [10, 10]],
  ["veryayev", "Данил", "Веряев", PlayerPosition.LW, [PlayerPosition.RW], photo("veryayev"), "1998-07-13", "RU", 9, 391, 100, 67, 72, 75, 75, 70, 75, "one-way", [4]],
  ["emil-pyanov", "Эмиль", "Пьянов", PlayerPosition.CTR, [], photo("emil-pyanov", false), "2005-01-31", "RU", 3, 41, 100, 70, 72, 70, 64, 72, 76, "two-way", [0.5, 1]],
];

export const severstalPlayerProfiles = severstalRoster.map(([
  slug,
  firstName,
  lastName,
  position,
  secondaryPositions,
  photoUrl,
  birthDate,
  nationality,
  seasonsPlayed,
  khlGamesPlayed,
  reputation,
  shot,
  speed,
  physical,
  defense,
  skill,
  potential,
]) => ({
  id: playerId(slug),
  teamId: SEVERSTAL_TEAM_ID,
  lineIndex: null,
  position,
  identity: {
    firstName,
    lastName,
    displayName: `${firstName} ${lastName}`,
    birthDate,
    nationality,
    isGoalie: false,
    photoUrl,
    primaryPosition: position,
    secondaryPositions,
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
}));

export const severstalPlayerContracts = severstalRoster.flatMap(([slug,,,,,,,,,,,,,,,,, type, salaries]) =>
  salaries.map((salary, seasonIndex) => ({
    id: contractId(slug, seasonIndex),
    playerId: playerId(slug),
    teamId: SEVERSTAL_TEAM_ID,
    season: seasonByIndex[seasonIndex],
    salaryRub: salaryRub(salary),
    type,
  })),
);
