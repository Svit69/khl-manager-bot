export const CONFERENCE_LABELS = Object.freeze({
  east: "\u0412\u043e\u0441\u0442\u043e\u043a",
  west: "\u0417\u0430\u043f\u0430\u0434",
});

const CONFERENCE_BY_SHORT_NAME = Object.freeze({
  ADM: "east", AKB: "east", AMR: "east", AVG: "east", AVT: "east", BAR: "east",
  MMG: "east", NFK: "east", SIB: "east", SYU: "east", TRK: "east",
  CSK: "west", DMN: "west", DYN: "west", LDA: "west", LOK: "west", SCH: "west",
  SEV: "west", SHD: "west", SKA: "west", SPM: "west", TOR: "west",
});

export const getTeamConference = (team) => CONFERENCE_BY_SHORT_NAME[team?.shortName] || "west";
