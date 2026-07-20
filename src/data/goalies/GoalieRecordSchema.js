export const goalieSeasons = ["2025/2026", "2026/2027", "2027/2028", "2028/2029", "2029/2030"];

export const goalieContractTypeByLabel = Object.freeze({
  "односторонний": "one-way",
  "двухсторонний": "two-way",
  "трехсторонний": "three-way",
});

export const readGoalieRecord = (row) => ({
  teamId: row[0],
  slug: row[1],
  firstName: row[2],
  lastName: row[3],
  birthDate: row[4],
  nationality: row[5],
  seasonsPlayed: row[6],
  khlGamesPlayed: row[7],
  reputation: row[8],
  reaction: row[9],
  positioning: row[10],
  athleticism: row[11],
  puckControl: row[12],
  mental: row[13],
  potential: row[14],
  contractType: goalieContractTypeByLabel[row[15]] || "one-way",
  salaries: row[16] || [],
});
