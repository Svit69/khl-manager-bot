import { HeadCoach } from "../../models/HeadCoach.js";
import { coachRecords } from "./coachRecords.js";

const slugify = (value) =>
  String(value || "").toLowerCase().replaceAll(" ", "-").replace(/[^\p{L}\p{N}-]/gu, "");

const buildRatings = (record) => ({
  tactics: record.tactics,
  offense: record.offense,
  defense: record.defense,
  discipline: record.discipline,
  playerDevelopment: record.development,
  lockerRoom: record.lockerRoom,
  conditioning: record.conditioning,
  playoffPoise: record.playoffPoise,
});

const buildPhotoUrl = (photo) =>
  photo ? `./coach-photo/${String(photo).toLowerCase()}.png` : "./player-photo/default.png";

export const createCoaches = (teams = []) => {
  const teamByShortName = new Map((teams || []).map((team) => [team.shortName, team]));
  return coachRecords.map((record) => {
    const team = record.team ? teamByShortName.get(record.team) : null;
    return new HeadCoach({
      id: `coach-${slugify(record.firstName)}-${slugify(record.lastName)}`,
      teamId: team?.id || null,
      firstName: record.firstName,
      lastName: record.lastName,
      photoUrl: buildPhotoUrl(record.photo),
      birthDate: record.birthDate,
      nationality: record.nationality,
      seasonsCoached: record.seasons,
      khlGamesCoached: record.games,
      style: record.style,
      ratings: buildRatings(record),
      contractUntil: record.contractUntil,
    });
  });
};
