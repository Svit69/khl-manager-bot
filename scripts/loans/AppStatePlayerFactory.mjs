import { createSkater } from "../../src/data/playerFactory.js";
import { PlayerPosition as P } from "../../src/models/PlayerPosition.js";
export const createAppStatePlayer = (team, position, index, strength) => {
  const id = `${team.id}-${position}-${index}`, isCandidate = team.id === "owner" && position === P.CTR && index === 5;
  const rating = isCandidate ? 68 : strength;
  return createSkater(team, "Test", id, position, "season-2026", {
    id, identity: { firstName: "Test", lastName: id, displayName: id,
      birthDate: isCandidate ? "2004-01-01" : "2000-06-15", nationality: "RU",
      primaryPosition: position, isGoalie: position === P.G },
    attributes: { shot: rating, speed: rating, physical: rating, defense: rating, skill: rating,
      reaction: rating, positioning: rating, athleticism: rating, puckControl: rating, mental: rating },
    potential: { potential: rating, growthRate: 0, peakAge: 28, declineRate: 0 },
    condition: { fatigueScore: 0, form: 1 }, career: { khlGamesPlayed: 50, seasonsPlayed: 2, reputation: 30 },
    affiliation: { teamId: team.id, contractId: `${id}-2026`, acquiredDay: 1 },
  });
};
