import { createSkater } from "./playerFactory.js";
import { externalRightsProfiles } from "./external/index.js";

const seasonId = "season-2025";
const externalTeamInfo = { id: null, name: "НХЛ / АХЛ" };

export const externalPlayerProfiles = externalRightsProfiles;

export const createExternalPlayers = () =>
  externalPlayerProfiles.map((profile) =>
    createSkater(
      externalTeamInfo,
      profile.identity.firstName,
      profile.identity.lastName,
      profile.position,
      seasonId,
      profile,
    ),
  );
