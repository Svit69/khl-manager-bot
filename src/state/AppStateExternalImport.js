export const collectSavedExternalPlayerIds = (savedExternalPlayers = []) =>
  new Set((savedExternalPlayers || []).map((player) => player?.id).filter(Boolean));

export const isExternalRightsSnapshot = (player) => {
  const career = player?.externalCareer;
  if (!player?.id || !career?.rightsTeamId) return false;
  return !["returned_khl", "khl_market"].includes(career.status);
};

export const collectSavedExternalPlayerSnapshots = (saved = {}) => {
  const snapshotsById = new Map();
  (saved.externalPlayers || []).forEach((player) => {
    if (player?.id) snapshotsById.set(player.id, player);
  });
  (saved.players || [])
    .filter((player) => isExternalRightsSnapshot(player))
    .forEach((player) => snapshotsById.set(player.id, player));
  return [...snapshotsById.values()];
};

export const mergeExternalRightsPlayers = (externalPlayers = [], activePlayers = []) => {
  const playersById = new Map();
  (externalPlayers || []).forEach((player) => {
    if (isExternalRightsSnapshot(player)) playersById.set(player.id, player);
  });
  (activePlayers || []).forEach((player) => {
    if (isExternalRightsSnapshot(player)) playersById.set(player.id, player);
  });
  return [...playersById.values()];
};

export const shouldRestoreExternalRightsPlayer = (player, activePlayerIds, savedExternalPlayerIds, retiredPlayerIds) =>
  Boolean(player?.id) &&
  !retiredPlayerIds.has(player.id) &&
  (!activePlayerIds.has(player.id) || savedExternalPlayerIds.has(player.id));

export const excludeExternalRightsPlayersFromActivePool = (players = [], externalPlayers = [], retiredPlayerIds = new Set()) => {
  const externalPlayerIds = new Set((externalPlayers || []).map((player) => player?.id).filter(Boolean));
  return (players || []).filter((player) => player?.id && !retiredPlayerIds.has(player.id) && !externalPlayerIds.has(player.id));
};
