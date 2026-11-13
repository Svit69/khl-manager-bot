import test from "node:test";
import assert from "node:assert/strict";
import { createContractImportFixture } from "../contracts/ContractImportTestFixture.mjs";
import { createPlayerSnapshots, restorePlayerSnapshots } from "../../src/state/AppStatePersistence.js";

test("Traktor photo filenames are unique and replace saved placeholders", () => {
  const { teams, all } = createContractImportFixture();
  const roster = teams.find(team => team.shortName === "TRK").getRoster();
  const assignments = [
    ["Борис Катчук", "boris-katchouk"],
    ["Нэйтан Лежар", "nathan-legare"],
    ["Владислав Валенцов", "vladislav-valentsov"],
    ["Сергей Мыльников", "sergei-mylnikov"],
    ["Александр Шэн", "alexander-shen"],
    ["Алексей Савельев", "alexei-savelyev"],
    ["Степан Горбунов", "stepan-gorbunov"],
    ["Марк Родионов", "mark-rodionov"],
    ["Артём Удот", "artyom-udot"],
  ];
  for (const [name, filename] of assignments) {
    const player = roster.find(entry => entry.name === name);
    const expected = `./player-photo/${filename}.png`;
    assert.ok(player, name);
    assert.equal(player.identity.photoUrl, expected, name);
    assert.equal(all.filter(entry => entry.identity.photoUrl === expected).length, 1, filename);
    const snapshots = createPlayerSnapshots([player]);
    snapshots[0].identity.photoUrl = "./player-photo/default.png";
    snapshots[0].photoUrl = "./player-photo/default.png";
    restorePlayerSnapshots([player], snapshots);
    assert.equal(player.identity.photoUrl, expected, name);
  }
});
