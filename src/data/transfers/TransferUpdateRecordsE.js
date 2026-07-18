import { TransferStatus as S } from "./TransferStatus.js";

export const transferUpdateRecordsE = [
  { playerId: "barys-player-emil-galimov", status: S.FREE_AGENT },
  { playerId: "39000000-0000-4000-8000-000000000001", status: S.ACTIVE, to: "AVG" },
  { playerId: "ska-player-polyakov", status: S.ACTIVE, to: "TOR" },
  { playerId: "5b000000-0000-4000-8000-000000000002", status: S.ACTIVE, to: "SKA" },
  { playerId: "sib-player-shirokov", status: S.REMOVED },
  { playerId: "d3c1f6c9-6a1a-4d7a-bb6c-5b8c7d5a1b22", status: S.FREE_AGENT },
  { playerId: "d0e1f2a3-b4c5-6d7e-8f9a-0b1c2d3e4f5a", status: S.RESTRICTED_FREE_AGENT, to: "AVT", reputation: 10 },
  { playerId: "35000000-0000-4000-8000-000000000019", status: S.REMOVED },
  { playerId: "33000000-0000-4000-8000-000000000005", status: S.EXTERNAL, to: "MMG", league: "NHL", contractUntil: "2028/2029" },
  { playerId: "f1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c", status: S.REMOVED },
  { playerId: "4b000000-0000-4000-8000-000000000015", status: S.EXTERNAL, to: "DMN", league: "NHL", contractUntil: "2026/2027" },
  { playerId: "a4b5c6d7-e8f9-4a0b-8c1d-2e3f4a5b6c30", status: S.EXTERNAL, to: "TRK", league: "NHL", contractUntil: "2027/2028" },
  { playerId: "33000000-0000-4000-8000-000000000016", status: S.REMOVED },
];
