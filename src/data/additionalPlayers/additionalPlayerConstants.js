import { PlayerPosition } from "../../models/PlayerPosition.js";

export const additionalPlayerTeamIds = Object.freeze({
  "Динамо Москва": "8a8b6a2c-9d03-4f74-a3f1-c84410f84d27",
  "Адмирал": "6f0b6b2d-2534-4c8f-9e1b-1c2a6d7a9f41",
  "Динамо Минск": "6b9a4d2c-5f18-41d4-9b65-3d71d8a4f2c0",
  "СКА": "b81ef7c2-4a9a-4c0d-93e0-7b8ef6ad1946",
  "Автомобилист": "a4b4f445-2c38-41c5-a2d2-3aee8a0f5d2a",
  "Торпедо": "2fd1e77d-8a6f-47fd-8d2b-5f2035f21f90",
});

export const additionalPlayerPositionByLabel = Object.freeze({
  "ЦТР": PlayerPosition.CTR,
  "ЛНП": PlayerPosition.LW,
  "ПНП": PlayerPosition.RW,
  "ЗАЩ": PlayerPosition.DEF,
});

export const additionalPlayerNationalityByLabel = Object.freeze({
  "Россия": "RU",
  "Канада": "CA",
  "США": "US",
  "Словакия": "SK",
});

export const additionalPlayerContractTypeByLabel = Object.freeze({
  "односторонний": "one-way",
  "двухсторонний": "two-way",
  "трехсторонний": "three-way",
});

export const additionalPlayerSeasonByIndex = ["2025/2026", "2026/2027", "2027/2028", "2028/2029", "2029/2030"];
