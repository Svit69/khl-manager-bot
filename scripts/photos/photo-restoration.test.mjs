import test from "node:test";
import assert from "node:assert/strict";
import { createContractImportFixture } from "../contracts/ContractImportTestFixture.mjs";
import { createPlayerSnapshots, restorePlayerSnapshots } from "../../src/state/AppStatePersistence.js";
import { PlayerPhotoRestoration } from "../../src/state/PlayerPhotoRestoration.js";

test("real players use current database photos instead of saved placeholder or old filename", () => {
  const { all } = createContractImportFixture();
  for (const [name, oldUrl] of [["Ярослав Дёминский", "./player-photo/default.png"], ["Вячеслав Основин", "./player-photo/osnovin.png"]]) {
    const player = all.find(row => row.name === name), expected = player.identity.photoUrl;
    const snapshots = createPlayerSnapshots([player]);
    snapshots[0].identity.photoUrl = oldUrl; snapshots[0].photoUrl = oldUrl;
    restorePlayerSnapshots([player], snapshots);
    assert.equal(player.identity.photoUrl, expected, name);
    assert.equal(player.career.khlGamesPlayed, snapshots[0].career.khlGamesPlayed);
  }
});
test("generated player custom portraits are never replaced by a database seed", () => {
  for (const id of ["junior-custom", "system-fa-custom"]) {
    const player = { id, identity: { photoUrl: "./player-photo/custom.png" } };
    PlayerPhotoRestoration.restoreCurrentDatabasePhoto(player, "./player-photo/rus_61.png");
    assert.equal(player.identity.photoUrl, "./player-photo/custom.png");
  }
});
test("unknown players keep saved photos when the source has no individual portrait", () => {
  for (const source of [null, "./player-photo/default.png", "./player-photo/placeholder.png"]) {
    const player = { id: "unknown", identity: { photoUrl: "./player-photo/saved.png" } };
    PlayerPhotoRestoration.restoreCurrentDatabasePhoto(player, source);
    assert.equal(player.identity.photoUrl, "./player-photo/saved.png");
  }
});
