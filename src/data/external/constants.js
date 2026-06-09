import { PlayerPosition } from "../../models/PlayerPosition.js";

export const EXTERNAL_TEAM_IDS = Object.freeze({
  AKB: "9f3f9b9a-6c57-49c6-a64d-2fa6e376a7b1",
  AVG: "d7f7d3be-4b8d-4a5c-9d2f-1ddbd9970b4d",
  AVT: "a4b4f445-2c38-41c5-a2d2-3aee8a0f5d2a",
  CSK: "1f9e53f8-c6b1-4d2d-8ae8-6f1fd72f3f62",
  DMN: "6b9a4d2c-5f18-41d4-9b65-3d71d8a4f2c0",
  DYN: "8a8b6a2c-9d03-4f74-a3f1-c84410f84d27",
  LOK: "5e7f6c2a-2d44-4d3a-9b2c-9f1a6e8d7c30",
  MMG: "7d4e3f2a-1b6c-4a9d-8e5f-2c3b4a5d6e7f",
  SEV: "c3e7f2a9-6a51-4f84-9c6d-87b5d8e4a901",
  SKA: "b81ef7c2-4a9a-4c0d-93e0-7b8ef6ad1946",
  SPM: "a9423c8e-6d40-4a2b-9c25-3df4a0a1d726",
  SYU: "3a2d2d4a-7b2b-4a2f-8a5c-8e8e8f9e0c0b",
  TOR: "2fd1e77d-8a6f-47fd-8d2b-5f2035f21f90",
  TRK: "4c9c3c3a-8f7a-4f5e-9c9a-6d6b6a5e4f3d",
});

export const positionByRussianLabel = Object.freeze({
  "ЦТР": PlayerPosition.CTR,
  "ЛНП": PlayerPosition.LW,
  "ПНП": PlayerPosition.RW,
  "ЗАЩ": PlayerPosition.DEF,
});

export const nationalityByRussianLabel = Object.freeze({
  "Россия": "RU",
  "Беларусь": "BY",
});

export const seasonByContractEndYear = Object.freeze({
  2026: "2025/2026",
  2027: "2026/2027",
  2028: "2027/2028",
  2029: "2028/2029",
});
