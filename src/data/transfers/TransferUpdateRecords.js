import { transferUpdateRecordsA } from "./TransferUpdateRecordsA.js";
import { transferUpdateRecordsB } from "./TransferUpdateRecordsB.js";
import { transferUpdateRecordsC } from "./TransferUpdateRecordsC.js";
import { transferUpdateRecordsD } from "./TransferUpdateRecordsD.js";
import { transferUpdateRecordsE } from "./TransferUpdateRecordsE.js";
import { transferUpdateRecordsF } from "./TransferUpdateRecordsF.js";
import { importedTransferRecords } from "../contractImport/transfers/index.js";

export const transferUpdateRecords = [
  ...transferUpdateRecordsA,
  ...transferUpdateRecordsB,
  ...transferUpdateRecordsC,
  ...transferUpdateRecordsD,
  ...transferUpdateRecordsE,
  ...transferUpdateRecordsF,
  ...importedTransferRecords,
];
