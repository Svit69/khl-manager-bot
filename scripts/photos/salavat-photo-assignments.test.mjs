import test from "node:test";
import assert from "node:assert/strict";
import { createContractImportFixture } from "../contracts/ContractImportTestFixture.mjs";
import { createPlayerSnapshots, restorePlayerSnapshots } from "../../src/state/AppStatePersistence.js";

test("Salavat photo assignments match requested filenames and survive old saves", () => {
  const { teams, all } = createContractImportFixture();
  const roster = teams.find(team => team.shortName === "SYU").getRoster();
  const assignments = [
    ["Александр Алексеев", "alexander-alexeyev"],
    ["Никита Щербаков", "nikita-shcherbakov"],
    ["Максим Загребин", "maxim-zagrebin"],
    ["Мэттью Маджо", "matthew-maggio"],
    ["Денис Орлович-Грудков", "denis-orlovich-grudkov"],
    ["Глеб Кузьмин", "gleb-kuzmin"],
    ["Прохор Корбит", "prokhor-korbit"],
    ["Александр Черный", "alexander-cherny"],
    ["Артем Набиев", "artyom-nabiyev"],
    ["Виталий Будницкий", "vitaly-budnitsky"],
    ["Артур Фаизов", "artur-faizov"],
    ["Алан Шайхлисламов", "alan-shaikhlislamov"],
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
