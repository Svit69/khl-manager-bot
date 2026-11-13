import test from "node:test";
import assert from "node:assert/strict";
import { createFixture } from "./AppStateFixture.mjs";

test("mandatory return repairs a replaced or missing current-season contract from the agreement", () => {
  for (const missing of [false, true]) {
    const fixture = createFixture(), agreement = fixture.startLoan();
    const saved = JSON.parse(JSON.stringify(fixture.state.exportState()));
    const current = saved.contracts.contracts.find(row => row.id === agreement.originalContract.id);
    if (missing) saved.contracts.contracts = saved.contracts.contracts.filter(row => row !== current);
    else { current.id = "replacement"; current.salaryRub = 12500000; }
    fixture.state.importState(saved);
    fixture.calendar.index = Number.MAX_SAFE_INTEGER;
    assert.ok(fixture.state.advanceToNextSeason());
    const after = fixture.state.exportState();
    const contract = after.contracts.contracts.find(row => row.id === agreement.originalContract.id);
    assert.deepEqual(contract, agreement.originalContract);
    assert.equal(after.loans.agreements.find(row => row.id === agreement.id).status, "returned");
    assert.equal(fixture.player.affiliation.teamId, "owner");
  }
});
test("mandatory return reconciles duplicate placements without losing the played player", () => {
  const fixture = createFixture(), agreement = fixture.startLoan();
  fixture.teams[1].reservePlayers.push(fixture.player);
  fixture.teams[0].reservePlayers.push(fixture.player);
  fixture.calendar.index = Number.MAX_SAFE_INTEGER;
  assert.ok(fixture.state.advanceToNextSeason());
  const occurrences = fixture.teams.flatMap(team => [...team.getRoster(), ...team.juniorPlayers])
    .filter(player => player.id === fixture.player.id);
  assert.deepEqual(occurrences, [fixture.player]);
  assert.equal(fixture.player.affiliation.teamId, "owner");
  assert.equal(fixture.state.exportState().loans.agreements.find(row => row.id === agreement.id).status, "returned");
});
