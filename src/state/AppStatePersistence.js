import { createSkater } from "../data/playerFactory.js";
import { normalizeHiddenTraits } from "../models/HiddenPlayerTraits.js";

const DEFAULT_ATTRIBUTES = Object.freeze({ shot: 65, speed: 65, physical: 65, defense: 65, skill: 65 });
const DEFAULT_POTENTIAL = Object.freeze({ potential: 68, growthRate: 0.2, peakAge: 27, declineRate: 0.4 });
const DEFAULT_CAREER = Object.freeze({ khlGamesPlayed: 0, seasonsPlayed: 0, reputation: 25 });
const seasonTag = (seasonLabel) => `season-${String(seasonLabel || "season").split("/")[0] || "1"}`;
const getSnapshotSeasonId = (snapshot, seasonLabel) => snapshot?.seasonStats?.seasonId || seasonTag(seasonLabel);

export const createPlayerSnapshots = (players) =>
  [...new Map((players || []).map((player) => [player.id, player])).values()].map((player) => ({
    id: player.id,
    identity: {
      firstName: player.identity?.firstName || null,
      lastName: player.identity?.lastName || null,
      displayName: player.identity?.displayName || player.name || null,
      birthDate: player.identity?.birthDate || null,
      nationality: player.identity?.nationality || null,
      primaryPosition: player.identity?.primaryPosition || null,
      secondaryPositions: player.identity?.secondaryPositions || [],
      photoUrl: player.identity?.photoUrl || null,
    },
    hiddenTraits: normalizeHiddenTraits(player.hiddenTraits),
    externalCareer: player.externalCareer ? { ...player.externalCareer } : null,
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

export const createMissingSavedPlayers = (snapshots, existingPlayers, seasonLabel) => {
  const existingIds = new Set((existingPlayers || []).map((player) => player?.id).filter(Boolean));
  return (snapshots || [])
    .filter((snapshot) => snapshot?.id && !existingIds.has(snapshot.id))
    .map((snapshot) => {
      const identity = snapshot.identity || {};
      const displayName = identity.displayName || "Системный игрок";
      const [fallbackFirstName, ...fallbackLastParts] = displayName.split(/\s+/);
      const position = identity.primaryPosition || "ЦТР";
      const profile = {
        id: snapshot.id,
        position,
        identity: {
          firstName: identity.firstName || fallbackFirstName || "Системный",
          lastName: identity.lastName || fallbackLastParts.join(" ") || "Игрок",
          displayName,
          birthDate: identity.birthDate || "2000-01-01",
          nationality: identity.nationality || "RU",
          isGoalie: Boolean(identity.isGoalie),
          photoUrl: identity.photoUrl || "./player-photo/default.png",
          primaryPosition: position,
          secondaryPositions: identity.secondaryPositions || [],
        },
        hiddenTraits: normalizeHiddenTraits(snapshot.hiddenTraits),
        externalCareer: snapshot.externalCareer ? { ...snapshot.externalCareer } : null,
        attributes: snapshot.attributes?.attributesJson || DEFAULT_ATTRIBUTES,
        potential: { ...DEFAULT_POTENTIAL, ...(snapshot.potential || {}) },
        condition: {
          fatigueScore: Number(snapshot.fatigueScore) || 0,
          form: Number(snapshot.form) || 1,
          injuryUntilDay: snapshot.injuryUntilDay || null,
        },
        career: { ...DEFAULT_CAREER, ...(snapshot.career || {}) },
        affiliation: {
          teamId: snapshot.teamId || null,
          contractId: snapshot.contractId || null,
          acquiredDay: snapshot.acquiredDay ?? null,
        },
      };
      const player = createSkater(
        { id: snapshot.teamId || null, name: "Сохранение" },
        profile.identity.firstName,
        profile.identity.lastName,
        position,
        getSnapshotSeasonId(snapshot, seasonLabel),
        profile,
      );
      if (snapshot.seasonStats) player.seasonStats.importSnapshot(snapshot.seasonStats);
      if ("expectedLineIndex" in snapshot) player.expectedLineIndex = snapshot.expectedLineIndex;
      return player;
    });
};

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
    if (snapshot.identity && "photoUrl" in snapshot.identity) player.identity.photoUrl = snapshot.identity.photoUrl;
    if (snapshot.identity && "secondaryPositions" in snapshot.identity) player.identity.secondaryPositions = snapshot.identity.secondaryPositions;
    if ("hiddenTraits" in snapshot) player.hiddenTraits = normalizeHiddenTraits(snapshot.hiddenTraits);
    if ("externalCareer" in snapshot) player.externalCareer = snapshot.externalCareer ? { ...snapshot.externalCareer } : null;
    if ("photoUrl" in snapshot) player.identity.photoUrl = snapshot.photoUrl;
    if ("teamId" in snapshot) player.affiliation.teamId = snapshot.teamId;
    if ("contractId" in snapshot) player.affiliation.contractId = snapshot.contractId;
    if ("acquiredDay" in snapshot) player.affiliation.acquiredDay = snapshot.acquiredDay;
    if ("expectedLineIndex" in snapshot) player.expectedLineIndex = snapshot.expectedLineIndex;
  });
};

export const normalizeSeasonState = (savedSeasonState, seasonLabel) =>
  savedSeasonState && typeof savedSeasonState === "object"
    ? {
      ...savedSeasonState,
      seasonLabel: savedSeasonState.seasonLabel || seasonLabel,
      preseasonDates: Array.isArray(savedSeasonState.preseasonDates) ? savedSeasonState.preseasonDates : [],
      preseasonOffers: Array.isArray(savedSeasonState.preseasonOffers) ? savedSeasonState.preseasonOffers : [],
      externalRightsOffers: Array.isArray(savedSeasonState.externalRightsOffers) ? savedSeasonState.externalRightsOffers : [],
      restrictedRightsOffers: Array.isArray(savedSeasonState.restrictedRightsOffers) ? savedSeasonState.restrictedRightsOffers : [],
      preseasonIndex: Number(savedSeasonState.preseasonIndex) || 0,
    }
    : {
      phase: "preseason",
      seasonLabel,
      previousSeasonLabel: null,
      preseasonOpen: false,
      preseasonDates: [],
      preseasonOffers: [],
      externalRightsOffers: [],
      restrictedRightsOffers: [],
      preseasonIndex: 0,
    };
