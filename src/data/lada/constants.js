import { PlayerPosition } from "../../models/PlayerPosition.js";

export const LADA_TEAM_ID = "4f6c0a71-9e22-4a1a-8c1a-0e7d548a3b19";
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
});
