const AMUR_TEAM_ID = "a13b5e12-7d2f-4f58-b47f-7d4b9a1c2e33";

const convertMillionsToRubles = (millions) => Math.round(Number(millions) * 1000000);

const createAmurContractRecord = ([slug, playerId, season, salaryMillions, type = "one-way"]) => ({
  id: `amur-contract-update-${slug}-${season.slice(0, 4)}`,
  playerId,
  teamId: AMUR_TEAM_ID,
  season,
  salaryRub: convertMillionsToRubles(salaryMillions),
  type,
});

export const amurContractUpdates = [
  ["vasilevsky", "31000000-0000-4000-8000-000000000004", "2026/2027", 42],
  ["vasilevsky", "31000000-0000-4000-8000-000000000004", "2027/2028", 42],
  ["dergachev", "neftekhimik-player-dergachev", "2026/2027", 35],
  ["voynov", "f3a4b5c6-d7e8-4f9a-0b1c-2d3e4f5a6b7c", "2026/2027", 40],
].map(createAmurContractRecord);
