import test from "node:test";
import assert from "node:assert/strict";
import { FreeAgentAvailability } from "../../src/state/FreeAgentAvailability.js";
import { ContractService } from "../../src/contracts/ContractService.js";

const player = (id, lastName = "Маклауд") => ({ id, identity: { firstName: "Майкл", lastName, birthDate: "1998-02-03" }, affiliation: { teamId: null } });
test("stale market copies are excluded by roster ID and real-player identity", () => {
  const owned = player("signed"); owned.affiliation.teamId = "club";
  const team = { getRoster: () => [owned], juniorPlayers: [] };
  assert.deepEqual(FreeAgentAvailability.select([player("signed"), player("old-id")], [team]), []);
  assert.equal(FreeAgentAvailability.select([player("real", "Другой")], [team]).length, 1);
  assert.equal(FreeAgentAvailability.select([player("junior-a"), player("junior-b")], []).length, 2);
  assert.equal(FreeAgentAvailability.select([player("a"), player("b")], []).length, 1);
});
test("contract-level guard rejects a second signing even from an unowned cloned object", () => {
  const service = new ContractService([]), original = player("signed"), team = { id: "club" };
  const context = { seasonLabel: "2026/2027", currentDate: "2026-09-01" };
  service.finalizeFreeAgentSigning(team, original, { years: 2, salaryRub: 5000000 }, context);
  const before = service.exportContracts();
  assert.equal(service.submitFreeAgentOffer(team, player("signed"), {}, context).decision, "unavailable");
  assert.throws(() => service.finalizeFreeAgentSigning(team, player("signed"), {}, context), /PLAYER_ALREADY_SIGNED/);
  assert.deepEqual(service.exportContracts(), before);
});
