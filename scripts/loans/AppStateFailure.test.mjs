import assert from "node:assert/strict";
import test from "node:test";
import { ContractService } from "../../src/contracts/ContractService.js";
import { createFixture } from "./AppStateFixture.mjs";
test("season advancement must stop if an automatic loan return fails", () => {
  const fixture = createFixture(), agreement = fixture.startLoan();
  const original = ContractService.prototype.reassignSeasonContract;
  let failed = false;
  ContractService.prototype.reassignSeasonContract = function (playerId, season, teamId) {
    if (playerId === fixture.player.id && teamId === "owner") {
      failed = true; throw new Error("RETURN_STORAGE_FAILED");
    }
    return original.call(this, playerId, season, teamId);
  };
  fixture.calendar.index = Number.MAX_SAFE_INTEGER;
  try {
    try { fixture.state.advanceToNextSeason(); } catch (error) { assert.match(error.message, /RETURN|LOAN/i); }
    assert.equal(failed, true);
    assert.equal(fixture.calendar.seasonLabel, "2026/2027");
    assert.equal(fixture.state.exportState().loans.agreements.find(row => row.id === agreement.id).status, "active");
    assert.equal(fixture.player.affiliation.teamId, "borrower");
  } finally { ContractService.prototype.reassignSeasonContract = original; }
});
