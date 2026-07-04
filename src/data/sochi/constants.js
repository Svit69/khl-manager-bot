import { PlayerPosition } from "../../models/PlayerPosition.js";

export const SOCHI_TEAM_ID = "f0a29c70-6c62-4fd4-a2c9-7f2f6c4c7a13";
export const khlSeasonLabels = Object.freeze(["2025/2026", "2026/2027", "2027/2028", "2028/2029", "2029/2030"]);
export const positionByRussianLabel = Object.freeze({
  "ЦТР": PlayerPosition.CTR,
  "ЛНП": PlayerPosition.LW,
  "ПНП": PlayerPosition.RW,
  "ЗАЩ": PlayerPosition.DEF,
});
export const contractTypeByRussianLabel = Object.freeze({
  "односторонний": "one-way",
  "двухсторонний": "two-way",
  "трехсторонний": "three-way",
});
export const nationalityByRussianLabel = Object.freeze({
  "Россия": "RU",
  "Беларусь": "BY",
  "Канада": "CA",
  "США": "US",
});
