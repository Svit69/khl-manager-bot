const SKA_TEAM_ID = "b81ef7c2-4a9a-4c0d-93e0-7b8ef6ad1946";

const convertMillionsToRubles = (millions) => Math.round(Number(millions) * 1000000);

const createSkaContractRecord = ([slug, playerId, season, salaryMillions, type = "one-way"]) => ({
  id: `ska-contract-update-${slug}-${season.slice(0, 4)}`,
  playerId,
  teamId: SKA_TEAM_ID,
  season,
  salaryRub: convertMillionsToRubles(salaryMillions),
  type,
});

export const skaContractUpdates = [
  ["bardakov", "external-rights-bardakov", "2025/2026", 50],
  ["bardakov", "external-rights-bardakov", "2026/2027", 50],
].map(createSkaContractRecord);
