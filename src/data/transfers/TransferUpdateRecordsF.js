import { TransferStatus as S } from "./TransferStatus.js";

export const transferUpdateRecordsF = [
  { playerId: "amur-player-nikita-yevseyev", status: S.ACTIVE, to: "AKB" },
  { playerId: "admiral-player-solyannikov", status: S.ACTIVE, to: "SCH" },
  { playerId: "39000000-0000-4000-8000-000000000008", status: S.REMOVED },
  { playerId: "4b000000-0000-4000-8000-000000000002", status: S.EXTERNAL, to: "DMN", league: "NHL", contractUntil: "2028/2029" },
  { playerId: "37000000-0000-4000-8000-000000000025", status: S.ACTIVE, to: "ADM" },
  { playerId: "severstal-player-tsitsyura", status: S.ACTIVE, to: "ADM" },
  { playerId: "severstal-player-vashchenko", status: S.ACTIVE, to: "ADM" },
  { playerId: "sib-player-koshelev", status: S.ACTIVE, to: "SIB" },
];
