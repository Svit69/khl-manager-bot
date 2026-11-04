import test from "node:test";
import assert from "node:assert/strict";
import { LoanCandidatePresenter } from "../../src/loans/LoanCandidatePresenter.js";

const buildMarket = (codes = [], eligible = codes.length === 0) => {
  const player = { id: "prospect", name: "Prospect", ovr: 70,
    identity: { birthDate: "2005-01-01", primaryPosition: "CTR" } };
  const context = { seasonLabel: "2026/2027", currentDate: "2026-09-01", activeTeamId: "user",
    contractService: { getContractForSeason: () => ({ salaryRub: 1000000 }) },
    teams: ["owner", "user"].map(id => ({ id, name: id, getRoster: () => [player] })) };
  const runtime = { activeAgreement: () => null, evaluate: () => ({ eligible, codes, reasons: codes }) };
  return LoanCandidatePresenter.build(runtime, context);
};
test("owner refusals and source rule failures never enter the catalog", () => {
  for (const code of ["OWNER_REFUSES", "AGE_LIMIT", "NEXT_SEASON_CONTRACT_REQUIRED", "DEADLINE_PASSED", "OUTGOING_LIMIT"]) {
    assert.equal(buildMarket([code]).length, 0, code);
  }
  assert.equal(buildMarket([], false).length, 0);
});
test("willing owners stay listed when the borrower cannot meet cap or role requirements", () => {
  for (const codes of [[], ["RECEIVER_SALARY_CAP"], ["PLAYER_REFUSES"], ["RECEIVER_SALARY_CAP", "PLAYER_REFUSES"]]) {
    const market = buildMarket(codes);
    assert.equal(market.length, 1);
    assert.equal(market[0].ownerTeamId, "owner");
    assert.deepEqual(market[0].destinations[0].codes, codes);
  }
  assert.equal(buildMarket(["OWNER_REFUSES", "RECEIVER_SALARY_CAP"]).length, 0);
});
