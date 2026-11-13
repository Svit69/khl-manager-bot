import test from "node:test";
import assert from "node:assert/strict";
import { SeasonTransitionController } from "../../src/ui/SeasonTransitionController.js";

test("transition errors are handled and keep contract decisions available", () => {
  const previous = globalThis.window, previousError = console.error, alerts = [];
  globalThis.window = { alert: message => alerts.push(message) };
  console.error = () => {};
  try {
    const result = SeasonTransitionController.advance({ advanceToNextSeason() { throw new Error("LOAN_RETURN_FAILED: player: INVALID_PARTICIPANTS"); } });
    assert.equal(result, null);
    assert.equal(alerts.length, 1);
    assert.match(alerts[0], /INVALID_PARTICIPANTS/);
    const transition = {};
    assert.equal(SeasonTransitionController.advance({ advanceToNextSeason: () => transition }), transition);
  } finally {
    globalThis.window = previous;
    console.error = previousError;
  }
});
