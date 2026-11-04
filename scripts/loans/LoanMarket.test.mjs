import test from "node:test";
import assert from "node:assert/strict";
import { createFixture } from "./AppStateFixture.mjs";
import { LoanUiController } from "../../src/ui/LoanUiController.js";
import { isAiLoanSurplus } from "../../src/loans/AiLoanRoles.js";

test("market contains only willing AI owners, with exactly their clubs", () => {
  const { state, teams, player } = createFixture({ activeTeamId: "borrower" });
  const view = state.getLoanView();
  assert.ok(view.candidates.some(row => row.playerId === player.id));
  assert.deepEqual(new Set(view.teams.map(team => team.id)), new Set(view.candidates.map(row => row.ownerTeamId)));
  for (const row of view.candidates) {
    assert.notEqual(row.ownerTeamId, state.activeTeamId);
    const owner = teams.find(team => team.id === row.ownerTeamId);
    assert.ok(isAiLoanSurplus(owner, owner.getRoster().find(item => item.id === row.playerId), state.exportState().currentDate || "2026-09-01"));
    assert.ok(row.destinations.every(destination => !destination.codes.includes("OWNER_REFUSES")));
  }
});
test("selection defaults to a market club and updates after a completed loan", () => {
  const { state, player } = createFixture({ activeTeamId: "borrower" });
  const controller = new LoanUiController();
  const view = controller.view(state);
  assert.equal(view.sourceTeamId, "owner");
  assert.equal(view.borrowingTeamId, "borrower");
  controller.change("loan-player", player.id);
  assert.equal(controller.view(state).playerId, player.id);
  assert.ok(state.submitLoanProposal({ playerId: player.id, borrowingTeamId: "borrower" }).accepted);
  const after = controller.view(state);
  assert.ok(!after.candidates.some(row => row.playerId === player.id));
  assert.equal(after.incoming.length, 1);
});
test("disabled loans expose no market clubs or players", () => {
  const { state } = createFixture({ activeTeamId: "borrower", loansEnabled: false });
  const view = new LoanUiController().view(state);
  assert.deepEqual(view.teams, []);
  assert.deepEqual(view.players, []);
  assert.equal(view.sourceTeamId, "");
  assert.equal(view.player, undefined);
});
