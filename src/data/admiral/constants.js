import { PlayerPosition } from "../../models/PlayerPosition.js";

export const ADMIRAL_TEAM_ID = "6f0b6b2d-2534-4c8f-9e1b-1c2a6d7a9f41";
export const khlSeasonLabels = Object.freeze(["2025/2026", "2026/2027", "2027/2028", "2028/2029", "2029/2030"]);
export const positionByRussianLabel = Object.freeze({ "ЦТР": PlayerPosition.CTR, "ЛНП": PlayerPosition.LW, "ПНП": PlayerPosition.RW, "ЗАЩ": PlayerPosition.DEF });
export const contractTypeByRussianLabel = Object.freeze({ "односторонний": "one-way", "двухсторонний": "two-way", "трехсторонний": "three-way" });
export const nationalityByRussianLabel = Object.freeze({ "Россия": "RU", "Беларусь": "BY", "Казахстан": "KZ", "Канада": "CA", "Словакия": "SK", "Швеция": "SE", "Чехия": "CZ" });
