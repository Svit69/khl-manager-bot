import { PlayerPosition } from "../../models/PlayerPosition.js";

export const AMUR_TEAM_ID = "a13b5e12-7d2f-4f58-b47f-7d4b9a1c2e33";
export const khlSeasonLabels = Object.freeze(["2025/2026", "2026/2027", "2027/2028", "2028/2029", "2029/2030"]);
export const positionByRussianLabel = Object.freeze({ "ЦТР": PlayerPosition.CTR, "ЛНП": PlayerPosition.LW, "ПНП": PlayerPosition.RW, "ЗАЩ": PlayerPosition.DEF });
export const contractTypeByRussianLabel = Object.freeze({ "односторонний": "one-way", "двухсторонний": "two-way", "трехсторонний": "three-way" });
export const nationalityByRussianLabel = Object.freeze({ "Россия": "RU", "США": "US" });
