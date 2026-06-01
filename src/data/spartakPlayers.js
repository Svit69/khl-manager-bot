import { PlayerPosition } from "../models/PlayerPosition.js";

const SPARTAK_TEAM_ID = "a9423c8e-6d40-4a2b-9c25-3df4a0a1d726";
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
  "Словакия": "SK",
});

const spartakRoster = [
  ["biro", "Брэндон", "Биро", "ЛНП", ["ЦТР"], photo("biro"), "1998-03-11", "Канада", 1, 42, 100, 65, 80, 72, 72, 77, 78, "односторонний", [14]],
  ["bychkov", "Роман", "Бычков", "ЗАЩ", [], photo("bychkov"), "2001-02-10", "Россия", 5, 90, 100, 61, 72, 73, 73, 62, 77, "двухсторонний", [6]],
  ["vishnevsky", "Дмитрий", "Вишневский", "ЗАЩ", [], photo("vishnevsky"), "1990-01-03", "Россия", 18, 764, 100, 70, 75, 78, 82, 76, 77, "односторонний", [20]],
  ["gutik", "Даниил", "Гутик", "ЛНП", [], photo("gutik"), "2001-08-31", "Россия", 5, 222, 100, 76, 82, 75, 72, 81, 83, "односторонний", [9]],
  ["knyazev", "Артемий", "Князев", "ЗАЩ", [], photo("knyazev"), "2001-01-04", "Россия", 3, 91, 100, 66, 70, 76, 75, 69, 77, "односторонний", [9]],
  ["korolyov", "Вениамин", "Королев", "ЗАЩ", [], photo("korolyov"), "2003-06-30", "Россия", 2, 78, 100, 62, 64, 82, 74, 64, 77, "двухсторонний", [2, 4]],
  ["korostelyov", "Никита", "Коростелев", "ЛНП", ["ПНП"], photo("korostelyov"), "1997-02-08", "Россия", 7, 326, 100, 80, 74, 78, 72, 78, 79, "односторонний", [40, 40]],
  ["lockhart", "Лукас", "Локхарт", "ЦТР", [], photo("lockhart"), "1992-11-01", "Канада", 9, 503, 100, 76, 77, 70, 70, 78, 76, "односторонний", [30, 30]],
  ["maltsev", "Михаил", "Мальцев", "ЦТР", ["ПНП"], photo("maltsev"), "1998-03-12", "Россия", 6, 183, 100, 73, 74, 81, 74, 79, 79, "односторонний", [40, 40]],
  ["andrei-mironov", "Андрей", "Миронов", "ЗАЩ", [], photo("andrei-mironov"), "1994-07-29", "Россия", 13, 652, 100, 71, 80, 82, 78, 81, 81, "односторонний", [40, 40, 40]],
  ["ivan-morozov", "Иван", "Морозов", "ЦТР", [], photo("ivan-morozov"), "2000-05-05", "Россия", 8, 250, 100, 78, 75, 80, 76, 82, 80, "односторонний", [18]],
  ["daniil-orlov", "Даниил", "Орлов", "ЗАЩ", [], photo("daniil-orlov"), "2003-12-21", "Россия", 4, 192, 100, 75, 77, 78, 76, 80, 83, "двухсторонний", [4]],
  ["pivchulin", "Данил", "Пивчулин", "ЛНП", [], photo("pivchulin"), "2003-04-11", "Россия", 2, 76, 100, 76, 78, 68, 67, 77, 80, "двухсторонний", [1, 2]],
  ["poryadin", "Павел", "Порядин", "ПНП", [], photo("poryadin"), "1996-07-21", "Россия", 11, 530, 100, 77, 81, 72, 70, 84, 83, "односторонний", [45, 45, 45]],
  ["rubtsov", "Герман", "Рубцов", "ЦТР", [], photo("rubtsov"), "1998-06-27", "Россия", 6, 244, 100, 70, 71, 79, 77, 78, 78, "односторонний", [15, 16]],
  ["jaros", "Кристиан", "Ярош", "ЗАЩ", [], photo("jaros"), "1996-04-02", "Словакия", 4, 173, 100, 65, 67, 89, 80, 73, 78, "односторонний", [30, 35, 35]],
  ["keane", "Джозеф", "Кин", "ЗАЩ", [], photo("keane"), "1999-07-02", "США", 3, 162, 100, 72, 80, 78, 76, 81, 80, "односторонний", [25, 25]],
  ["belyayev", "Александр", "Беляев", "ПНП", ["ЛНП"], photo("belyayev"), "1999-03-28", "Россия", 4, 172, 100, 73, 77, 74, 76, 76, 77, "двухсторонний", [3, 3]],
  ["pashin", "Александр", "Пашин", "ПНП", [], photo("pashin"), "2002-07-28", "Россия", 5, 173, 100, 73, 80, 72, 70, 79, 80, "двухсторонний", [11, 13]],
  ["kholodilin", "Никита", "Холодилин", "ЦТР", [], photo("kholodilin"), "2002-06-19", "Россия", 5, 129, 100, 66, 70, 76, 70, 70, 76, "двухсторонний", [0.5, 0.5, 0.5]],
  ["filin", "Егор", "Филин", "ПНП", ["ЛНП"], photo("filin"), "1999-06-01", "Россия", 3, 132, 100, 70, 77, 68, 73, 74, 76, "двухсторонний", [2, 2]],
  ["korotkikh", "Игнат", "Коротких", "ЦТР", [], photo("korotkikh"), "2002-06-22", "Россия", 6, 141, 100, 69, 72, 77, 72, 75, 77, "двухсторонний", [2]],
  ["filimonov", "Максим", "Филимонов", "ЛНП", ["ПНП"], photo("filimonov"), "2006-05-13", "Россия", 1, 2, 100, 66, 69, 67, 64, 72, 79, "трехсторонний", [0.5, 0.5, 1]],
  ["tyurin", "Никита", "Тюрин", "ЗАЩ", [], photo("tyurin"), "2007-07-12", "Россия", 2, 8, 100, 61, 64, 70, 70, 68, 80, "трехсторонний", [0.5, 0.5, 2, 3]],
  ["plesovskikh", "Александр", "Плесовских", "ЛНП", ["ПНП"], photo("plesovskikh"), "2006-08-01", "Россия", 1, 3, 100, 64, 65, 65, 60, 67, 79, "трехсторонний", [0.5, 0.5, 1]],
  ["danila-sysoyev", "Данила", "Сысоев", "ЛНП", [], photo("danila-sysoyev"), "2006-04-17", "Россия", 0, 0, 100, 68, 68, 63, 63, 70, 78, "трехсторонний", [0.5, 0.5, 1]],
  ["yakunin", "Евгений", "Якунин", "ЦТР", [], photo("yakunin"), "2009-02-09", "Россия", 0, 0, 100, 67, 59, 72, 66, 71, 81, "трехсторонний", [0.5, 0.5, 2, 3]],
];

const toPosition = (label) => positionByLabel[label] || PlayerPosition.CTR;
const toSecondaryPositions = (labels) => labels.map(toPosition).filter(Boolean);
const toNationality = (label) => nationalityByLabel[label] || "RU";
const contractId = (slug, seasonIndex) => `spartak-contract-${slug}-${seasonIndex}`;
const playerId = (slug) => `spartak-player-${slug}`;
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

export const spartakPlayerProfiles = spartakRoster.map(([
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
    teamId: SPARTAK_TEAM_ID,
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

export const spartakPlayerContracts = spartakRoster.flatMap(([slug,,,,,,,,,,,,,,,,, typeLabel, salaries]) =>
  salaries.map((salary, seasonIndex) => ({
    id: contractId(slug, seasonIndex),
    playerId: playerId(slug),
    teamId: SPARTAK_TEAM_ID,
    season: seasonByIndex[seasonIndex],
    salaryRub: salaryRub(salary),
    type: contractTypeByLabel[typeLabel] || "one-way",
  })),
);
