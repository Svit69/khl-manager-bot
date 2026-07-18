import { PlayerPosition } from "../../models/PlayerPosition.js";

export const DRAGONS_TEAM_ID = "b44f32e2-3e66-4c78-9f2b-8f61c09a4d21";
export const khlSeasonLabels = Object.freeze(["2025/2026", "2026/2027", "2027/2028", "2028/2029", "2029/2030"]);
export const positionByRussianLabel = Object.freeze({ "ЦТР": PlayerPosition.CTR, "ЛНП": PlayerPosition.LW, "ПНП": PlayerPosition.RW, "ЗАЩ": PlayerPosition.DEF });
export const contractTypeByRussianLabel = Object.freeze({ "односторонний": "one-way", "двухсторонний": "two-way", "трехсторонний": "three-way" });
export const nationalityByRussianLabel = Object.freeze({ "Россия": "RU", "Канада": "CA", "США": "US", "Чехия": "CZ" });
