export const createScoutingRecord = (name, slug, birthDate, positions, nationality, seasonsPlayed, khlGamesPlayed, attributes, potential, eliteProspectsId, evidence) => ({
  name, slug, birthDate, positions: positions.split(', '), nationality, seasonsPlayed, khlGamesPlayed,
  attributes, potential, source: `https://www.eliteprospects.com/player/${eliteProspectsId}/${slug}`, evidence,
});
