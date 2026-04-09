export const createPlayerSnapshots = (players) =>
  [...new Map((players || []).map((player) => [player.id, player])).values()].map((player) => ({
    id: player.id,
    fatigueScore: player.fatigueScore,
    form: player.form,
    injuryUntilDay: player.condition.injuryUntilDay,
    moodScore: player.moodScore,
    attributes: player.attributes.exportSnapshot(),
    potential: player.potential.exportSnapshot(),
    career: player.career?.exportSnapshot?.() || null,
    seasonStats: player.seasonStats.exportSnapshot(),
    teamId: player.affiliation?.teamId || null,
    contractId: player.affiliation?.contractId || null,
    acquiredDay: player.affiliation?.acquiredDay ?? null,
    expectedLineIndex: player.expectedLineIndex ?? null,
  }));

export const restorePlayerSnapshots = (players, snapshots) => {
  const snapshotById = new Map((snapshots || []).map((player) => [player.id, player]));
  (players || []).forEach((player) => {
    const snapshot = snapshotById.get(player.id);
    if (!snapshot) return;

    player.applyFatigue(snapshot.fatigueScore - player.fatigueScore);
    player.applyFormDelta(snapshot.form - player.form);
    if ("moodScore" in snapshot) player.applyMoodDelta(snapshot.moodScore - player.moodScore);
    if (snapshot.attributes) player.attributes.importSnapshot(snapshot.attributes);
    if (snapshot.potential) player.potential.importSnapshot(snapshot.potential);
    if (snapshot.career) player.career?.importSnapshot?.(snapshot.career);
    if (snapshot.seasonStats) player.seasonStats.importSnapshot(snapshot.seasonStats);
    if ("teamId" in snapshot) player.affiliation.teamId = snapshot.teamId;
    if ("contractId" in snapshot) player.affiliation.contractId = snapshot.contractId;
    if ("acquiredDay" in snapshot) player.affiliation.acquiredDay = snapshot.acquiredDay;
    if ("expectedLineIndex" in snapshot) player.expectedLineIndex = snapshot.expectedLineIndex;
  });
};

export const normalizeSeasonState = (savedSeasonState, seasonLabel) =>
  savedSeasonState && typeof savedSeasonState === "object"
    ? { ...savedSeasonState, seasonLabel: savedSeasonState.seasonLabel || seasonLabel }
    : { phase: "preseason", seasonLabel, previousSeasonLabel: null, preseasonOpen: false };
