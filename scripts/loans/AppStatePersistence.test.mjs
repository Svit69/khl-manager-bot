import assert from "node:assert/strict";
import test from "node:test";
import { createFixture } from "./AppStateFixture.mjs";
test("real AppState persists loan ownership, current contract, and future owner", () => {
  const fixture = createFixture(), agreement = fixture.startLoan();
  const saved = JSON.parse(JSON.stringify(fixture.state.exportState()));
  const restored = createFixture(); restored.state.importState(saved);
  const exported = restored.state.exportState(), rows = exported.contracts.contracts;
  assert.equal(exported.loans.agreements.find(row => row.id === agreement.id).status, "active");
  assert.equal(rows.find(row => row.playerId === fixture.player.id && row.season === "2026/2027").teamId, "borrower");
  assert.equal(rows.find(row => row.playerId === fixture.player.id && row.season === "2027/2028").teamId, "owner");
  const appearances = restored.teams.flatMap(team => team.getRoster()).filter(row => row.id === fixture.player.id);
  assert.equal(appearances.length, 1); assert.equal(appearances[0].affiliation.teamId, "borrower");
  restored.state.setActiveTeamId("borrower");
  assert.equal(restored.state.getLoanView().incoming[0].id, agreement.id);
});
test("legacy saves default loans on; explicit disable survives save and blocks submission", () => {
  const legacy = createFixture(), saved = legacy.state.exportState();
  delete saved.loans; delete saved.gameSettings.loansEnabled;
  legacy.state.importState(saved);
  assert.equal(legacy.state.gameSettings.loansEnabled, true);
  const disabled = createFixture({ loansEnabled: false });
  assert.equal(disabled.state.getLoanView().enabled, false);
  assert.equal(disabled.state.submitLoanProposal({ playerId: disabled.player.id, borrowingTeamId: "borrower" }).accepted, false);
  const restored = createFixture(); restored.state.importState(JSON.parse(JSON.stringify(disabled.state.exportState())));
  assert.equal(restored.state.gameSettings.loansEnabled, false);
});
test("saved custom user lineup remains unchanged after restoring an active loan", () => {
  const fixture = createFixture(); fixture.startLoan();
  const line = fixture.teams[0].lines[0].players;
  [line[0], line[1]] = [line[1], line[0]];
  const saved = JSON.parse(JSON.stringify(fixture.state.exportState()));
  const restored = createFixture(); restored.state.importState(saved);
  const expected = saved.rosters.find(row => row.teamId === "owner");
  const actual = restored.state.exportState().rosters.find(row => row.teamId === "owner");
  assert.deepEqual(actual, expected);
});
