import { PlayerPosition } from "../../models/PlayerPosition.js";

export const NEFTEKHIMIK_TEAM_ID = "1de54670-5a23-470a-94f2-5e3bbf7e4f91";

export const contractTypeByRussianLabel = Object.freeze({
  "односторонний": "one-way",
  "двухсторонний": "two-way",
  "трехсторонний": "three-way",
});

export const positionByRussianLabel = Object.freeze({
  "ЦТР": PlayerPosition.CTR,
  "ЛНП": PlayerPosition.LW,
  "ПНП": PlayerPosition.RW,
  "ЗАЩ": PlayerPosition.DEF,
});

export const nationalityByRussianLabel = Object.freeze({
  "Россия": "RU",
  "Канада": "CA",
  "Беларусь": "BY",
});

export const khlSeasonLabels = Object.freeze(["2025/2026", "2026/2027", "2027/2028", "2028/2029", "2029/2030"]);
