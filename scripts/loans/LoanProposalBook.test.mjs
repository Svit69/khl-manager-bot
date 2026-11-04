import test from "node:test";
import assert from "node:assert/strict";
import { LoanProposalBook } from "../../src/loans/LoanProposalBook.js";

test("pending proposals survive reload without duplicates and expire once", () => {
  const book = new LoanProposalBook();
  const row = { id: "proposal", playerId: "player", fromTeamId: "owner", toTeamId: "borrower",
    season: "2026/2027", expiresAt: "2026-09-20T00:00:00Z" };
  book.add(row); book.add({ ...row, id: "duplicate" });
  assert.equal(book.exportProposals().length, 1);
  const restored = new LoanProposalBook(); restored.importProposals(JSON.parse(JSON.stringify(book.exportProposals())));
  assert.equal(restored.hasPending("player"), true);
  restored.expire("2026-09-21", "2026/2027"); restored.expire("2026-09-22", "2026/2027");
  assert.equal(restored.hasPending("player"), false);
  assert.equal(restored.exportProposals()[0].status, "expired");
});
