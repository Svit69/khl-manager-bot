import { PlayerPosition } from "../models/PlayerPosition.js";

export const BARYS_TEAM_ID = "0f7b8a2d-4d25-4c2e-9b5a-0f3d9e5a6b71";

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
  "Казахстан": "KZ",
  "Россия": "RU",
  "США": "US",
  "Канада": "CA",
});

const barysRoster = [
  ["asetov", "Алихан", "Асетов", "ПНП", ["ЛНП"], photo("asetov"), "1996-08-26", "Казахстан", 9, 344, 100, 69, 72, 79, 74, 70, 76, "односторонний", [20]],
  ["beketayev", "Адиль", "Бекетаев", "ЗАЩ", [], photo("beketayev"), "1998-04-23", "Казахстан", 5, 251, 100, 65, 73, 78, 70, 70, 73, "односторонний", [10, 12]],
  ["vecchione", "Майкл", "Веккьоне", "ЛНП", ["ЦТР"], photo("vecchione"), "1993-02-25", "США", 1, 65, 100, 77, 77, 75, 71, 79, 79, "односторонний", [38]],
  ["emil-galimov", "Эмиль", "Галимов", "ПНП", [], photo("emil-galimov"), "1992-05-09", "Россия", 16, 550, 100, 75, 72, 75, 69, 75, 75, "односторонний", [24]],
  ["daniyar", "Самат", "Данияр", "ЗАЩ", [], photo("daniyar"), "1999-01-24", "Казахстан", 7, 283, 100, 60, 77, 70, 76, 67, 76, "односторонний", [5, 5, 5]],
  ["kaiyrzhan", "Динмухамед", "Кайыржан", "ЛНП", ["ПНП"], photo("kaiyrzhan"), "2003-06-27", "Казахстан", 5, 202, 100, 71, 75, 75, 72, 70, 74, "односторонний", [1, 2, 2]],
  ["logvin", "Всеволод", "Логвин", "ЦТР", [], photo("logvin"), "2004-01-12", "Казахстан", 3, 121, 100, 74, 73, 73, 69, 74, 77, "двухсторонний", [1, 3, 6]],
  ["lyapunov", "Кирилл", "Ляпунов", "ПНП", ["ЦТР"], photo("lyapunov"), "2005-05-11", "Казахстан", 2, 37, 100, 66, 72, 72, 63, 67, 76, "двухсторонний", [1, 2]],
  ["mccoshen", "Иэн", "Маккошен", "ЗАЩ", [], photo("mccoshen"), "1995-08-05", "США", 2, 127, 100, 65, 67, 80, 75, 70, 75, "односторонний", [30]],
  ["massie", "Джейк", "Масси", "ЗАЩ", [], photo("massie"), "1997-01-21", "Канада", 1, 67, 100, 74, 74, 77, 74, 76, 76, "односторонний", [40, 45, 45]],
  ["morelli", "Мэйсон", "Морелли", "ЦТР", ["ЛНП"], photo("morelli"), "1996-02-01", "США", 1, 63, 100, 75, 72, 77, 71, 77, 77, "односторонний", [30]],
  ["muratov", "Батырлан", "Муратов", "ПНП", [], photo("muratov"), "1999-02-01", "Казахстан", 6, 115, 100, 70, 70, 73, 70, 72, 72, "двухсторонний", [0.5]],
  ["mukhametov", "Максим", "Мухаметов", "ЦТР", [], photo("mukhametov"), "1999-04-30", "Казахстан", 3, 66, 100, 74, 72, 63, 63, 66, 70, "односторонний", [14]],
  ["omirbekov", "Алихан", "Омирбеков", "ЦТР", [], photo("omirbekov"), "2001-06-14", "Казахстан", 3, 179, 100, 71, 75, 67, 64, 67, 74, "односторонний", [4, 4, 4]],
  ["orazov", "Бейбарыс", "Оразов", "ЗАЩ", [], photo("orazov"), "2005-05-06", "Казахстан", 2, 67, 100, 55, 68, 60, 64, 59, 74, "двухсторонний", [0.5, 0.5, 1]],
  ["panyukov", "Кирилл", "Панюков", "ЛНП", ["ПНП"], photo("panyukov"), "1997-05-22", "Казахстан", 9, 353, 100, 73, 71, 77, 76, 73, 75, "односторонний", [20, 20]],
  ["savitsky", "Кирилл", "Савицкий", "ЛНП", [], photo("savitsky"), "1995-03-09", "Казахстан", 5, 253, 100, 74, 68, 76, 69, 75, 74, "односторонний", [4]],
  ["semyon-simonov", "Семен", "Симонов", "ПНП", ["ЛНП"], photo("semyon-simonov"), "2005-06-17", "Казахстан", 2, 87, 100, 75, 67, 74, 71, 75, 78, "двухсторонний", [1, 2, 3]],
  ["tyce-thompson", "Тайс", "Томпсон", "ЦТР", ["ПНП"], photo("tyce-thompson"), "1999-07-12", "США", 1, 57, 100, 76, 77, 76, 73, 77, 77, "односторонний", [30, 33]],
  ["willman", "Макс", "Уиллман", "ЛНП", [], photo("willman"), "1995-02-13", "США", 1, 44, 100, 74, 77, 72, 66, 73, 75, "односторонний", [25]],
  ["walsh", "Райли", "Уолш", "ЗАЩ", [], photo("walsh"), "1999-04-21", "США", 1, 68, 100, 79, 78, 73, 74, 81, 81, "односторонний", [37, 45]],
  ["shaikhmeddenov", "Ансар", "Шайхмедденов", "ЦТР", [], photo("shaikhmeddenov"), "2002-02-19", "Казахстан", 4, 75, 100, 66, 65, 74, 65, 67, 73, "односторонний", [2, 4]],
  ["artyom-korolyov", "Артем", "Королев", "ЗАЩ", [], photo("artyom-korolyov"), "2001-09-20", "Казахстан", 3, 76, 100, 55, 69, 66, 70, 64, 70, "двухсторонний", [0.5, 0.5]],
  ["gaitamirov", "Тамирлан", "Гайтамиров", "ЗАЩ", [], photo("gaitamirov"), "2000-08-23", "Казахстан", 5, 167, 100, 57, 61, 74, 71, 68, 71, "двухсторонний", [0.5, 0.5, 0.5]],
  ["mindubayev", "Тимур", "Миндубаев", "ПНП", [], photo("mindubayev"), "2007-02-01", "Казахстан", 1, 4, 100, 58, 66, 53, 58, 67, 74, "трехсторонний", [0.5, 0.5]],
];

const toPosition = (label) => positionByLabel[label] || PlayerPosition.CTR;
const toSecondaryPositions = (labels) => labels.map(toPosition).filter(Boolean);
const toNationality = (label) => nationalityByLabel[label] || "RU";
const contractId = (slug, seasonIndex) => `barys-contract-${slug}-${seasonIndex}`;
const playerId = (slug) => `barys-player-${slug}`;
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

export const barysPlayerProfiles = barysRoster.map(([
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
    teamId: BARYS_TEAM_ID,
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

export const barysPlayerContracts = barysRoster.flatMap(([slug,,,,,,,,,,,,,,,,, typeLabel, salaries]) =>
  salaries.map((salary, seasonIndex) => ({
    id: contractId(slug, seasonIndex),
    playerId: playerId(slug),
    teamId: BARYS_TEAM_ID,
    season: seasonByIndex[seasonIndex],
    salaryRub: salaryRub(salary),
    type: contractTypeByLabel[typeLabel] || "one-way",
  })),
);
