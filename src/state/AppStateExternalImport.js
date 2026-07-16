export const collectSavedExternalPlayerIds = (savedExternalPlayers = []) =>
  new Set((savedExternalPlayers || []).map((player) => player?.id).filter(Boolean));

const LEGACY_BROKEN_EXTERNAL_RIGHTS_ID = "external-rights-undefined";
const hasStableExternalRightsId = (player) => player?.id && player.id !== LEGACY_BROKEN_EXTERNAL_RIGHTS_ID;

export const isExternalRightsSnapshot = (player) => {
  const career = player?.externalCareer;
  if (!hasStableExternalRightsId(player) || !career?.rightsTeamId) return false;
  return !["returned_khl", "khl_market"].includes(career.status);
};

export const collectSavedExternalPlayerSnapshots = (saved = {}) => {
  const snapshotsById = new Map();
  (saved.externalPlayers || []).forEach((player) => {
    if (hasStableExternalRightsId(player)) snapshotsById.set(player.id, player);
  });
  (saved.players || [])
    .filter((player) => !player?.teamId && isExternalRightsSnapshot(player))
    .forEach((player) => snapshotsById.set(player.id, player));
  return [...snapshotsById.values()];
};

export const mergeExternalRightsPlayers = (externalPlayers = [], activePlayers = []) => {
  const playersById = new Map();
  (externalPlayers || []).forEach((player) => {
    if (isExternalRightsSnapshot(player)) playersById.set(player.id, player);
  });
  (activePlayers || []).forEach((player) => {
    if (!player?.affiliation?.teamId && isExternalRightsSnapshot(player)) playersById.set(player.id, player);
  });
  return [...playersById.values()];
};

export const shouldRestoreExternalRightsPlayer = (player, activePlayerIds, savedExternalPlayerIds, retiredPlayerIds) =>
  Boolean(player?.id) &&
  !retiredPlayerIds.has(player.id) &&
  (!activePlayerIds.has(player.id) || savedExternalPlayerIds.has(player.id));

export const excludeExternalRightsPlayersFromActivePool = (players = [], externalPlayers = [], retiredPlayerIds = new Set()) => {
  const externalPlayerIds = new Set((externalPlayers || []).map((player) => player?.id).filter(Boolean));
  return (players || []).filter((player) =>
    player?.id &&
    !retiredPlayerIds.has(player.id) &&
    (player.affiliation?.teamId || !externalPlayerIds.has(player.id)),
  );
};
