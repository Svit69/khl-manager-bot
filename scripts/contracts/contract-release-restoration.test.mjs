import test from "node:test";
import assert from "node:assert/strict";
import { ContractReleaseRestoration } from "../../src/contracts/ContractReleaseRestoration.js";
import { ContractService } from "../../src/contracts/ContractService.js";

const original = { id: "base", playerId: "player", teamId: "old", season: "2026/2027", salaryRub: 95000000, type: "one-way" };
const replacement = { ...original, id: "signed", teamId: "buyer", salaryRub: 10000000 };
test("canceled base contracts are detected, but correctly traded base contracts stay active", () => {
  assert.ok(ContractReleaseRestoration.restore([], [original, replacement], [original]).has("player"));
  assert.equal(ContractReleaseRestoration.restore([], [{ ...original, teamId: "buyer" }, replacement], [original]).has("player"), false);
  assert.equal(ContractReleaseRestoration.restore([], [{ ...replacement, teamId: "old" }], [original]).size, 0);
});
test("an affected save keeps one latest replacement per player-season, never the canceled payroll", () => {
  const service = new ContractService([original]);
  const last = { ...replacement, id: "last", salaryRub: 12000000 };
  service.importContracts({ contracts: [original, replacement, last] });
  const active = service.getContractsForPlayer("player");
  assert.deepEqual(active, [last]);
  service.reassignPlayerContracts("player", "third");
  assert.equal(service.exportContracts().releasedPlayerIds.includes("player"), true);
  assert.equal(service.getContractForSeason("player", "2026/2027").teamId, "third");
});
