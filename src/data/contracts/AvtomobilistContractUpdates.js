const AVT_TEAM_ID = "a4b4f445-2c38-41c5-a2d2-3aee8a0f5d2a";

const convertMillionsToRubles = (millions) => Math.round(Number(millions) * 1000000);

const createAvtomobilistContractRecord = ([slug, playerId, season, salaryMillions, type = "one-way"]) => ({
  id: `avt-contract-update-${slug}-${season.slice(0, 4)}`,
  playerId,
  teamId: AVT_TEAM_ID,
  season,
  salaryRub: convertMillionsToRubles(salaryMillions),
  type,
});

export const avtomobilistContractUpdates = [
  ["gross", "f3a4b5c6-d7e8-4f9a-8b0c-1d2e3f4a5b10", "2026/2027", 66],
  ["gross", "f3a4b5c6-d7e8-4f9a-8b0c-1d2e3f4a5b10", "2027/2028", 66],
  ["karpukhin", "35000000-0000-4000-8000-000000000007", "2026/2027", 70],
  ["karpukhin", "35000000-0000-4000-8000-000000000007", "2027/2028", 70],
  ["karpukhin", "35000000-0000-4000-8000-000000000007", "2028/2029", 70],
  ["barabanov", "35000000-0000-4000-8000-000000000002", "2026/2027", 100],
  ["barabanov", "35000000-0000-4000-8000-000000000002", "2027/2028", 100],
  ["shashkov", "b1c2d3e4-f5a6-7b8c-9d0e-1f2a3b4c5d6e", "2026/2027", 23],
  ["shashkov", "b1c2d3e4-f5a6-7b8c-9d0e-1f2a3b4c5d6e", "2027/2028", 23],
  ["kadeykin", "c3d4e5f6-a7b8-4c9d-8e0f-1a2b3c4d5ea0", "2026/2027", 60],
  ["kadeykin", "c3d4e5f6-a7b8-4c9d-8e0f-1a2b3c4d5ea0", "2027/2028", 60],
  ["slepyshev", "39000000-0000-4000-8000-000000000021", "2026/2027", 20],
  ["denezhkin", "a3b4c5d6-e7f8-9a0b-1c2d-3e4f5a6b7c8d", "2026/2027", 18],
  ["denezhkin", "a3b4c5d6-e7f8-9a0b-1c2d-3e4f5a6b7c8d", "2027/2028", 18],
].map(createAvtomobilistContractRecord);
