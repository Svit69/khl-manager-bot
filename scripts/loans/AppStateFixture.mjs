import assert from "node:assert/strict";
import { AppState } from "../../src/state/AppState.js";
import { SeasonCalendar } from "../../src/calendar/SeasonCalendar.js";
import { Team } from "../../src/models/Team.js";
import { PlayerPosition as P } from "../../src/models/PlayerPosition.js";
import { buildCompetitiveLines } from "../../src/data/lineupBuilder.js";
import { createAppStatePlayer } from "./AppStatePlayerFactory.mjs";
export const createFixture = ({ loansEnabled = true, activeTeamId = "owner" } = {}) => {
  const teams = ["owner", "borrower"].map(id => {
    const info = { id, name: id, shortName: id, city: id, country: "RU", isPlayable: true };
    const counts = id === "owner" ? [6, 5, 5, 8, 3] : [4, 4, 4, 8, 3];
    const players = [P.CTR, P.LW, P.RW, P.DEF, P.G].flatMap((position, group) =>
      Array.from({ length: counts[group] }, (_, index) => createAppStatePlayer(info, position, index, id === "owner" ? 80 : 60)));
    const lineup = buildCompetitiveLines(players);
    return new Team(info, lineup.lines, lineup.reservePlayers);
  });
  const contracts = teams.flatMap(team => team.getRoster().flatMap(player => [2026, 2027].map(year => ({
    id: `${player.id}-${year}`, playerId: player.id, teamId: team.id, season: `${year}/${year + 1}`,
    salaryRub: 500000, type: "one_way" }))));
  const calendar = new SeasonCalendar(teams, 2026), state = new AppState(teams, calendar, contracts);
  state.updateGameSettings({ loansEnabled, coachesEnabled: false, restrictedFreeAgencyEnabled: false });
  state.setActiveTeamId(activeTeamId);
  const player = teams[0].getRoster().find(row => row.identity.primaryPosition === P.CTR && row.ovr === 68);
  const startLoan = () => {
    const result = state.submitLoanProposal({ playerId: player.id, borrowingTeamId: "borrower" });
    assert.equal(result.accepted, true, result.message);
    return result.agreement;
  };
  return { state, calendar, teams, player, startLoan };
};
