import { CONFERENCE_LABELS, getTeamConference } from "../data/teamConferences.js";

export const buildConferenceStandings = (standingsRows = [], teams = []) => {
  const teamById = new Map((teams || []).map((team) => [team.id, team]));
  const groups = [
    { key: "east", label: CONFERENCE_LABELS.east, rows: [] },
    { key: "west", label: CONFERENCE_LABELS.west, rows: [] },
  ];
  const groupByKey = new Map(groups.map((group) => [group.key, group]));
  standingsRows.forEach((row) => {
    const team = teamById.get(row.teamId) || row;
    const conference = getTeamConference(team);
    const targetGroup = groupByKey.get(conference) || groups[1];
    targetGroup.rows.push({ ...row, conference });
  });
  return groups.filter((group) => group.rows.length > 0);
};
