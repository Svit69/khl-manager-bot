import { calculateAge, clamp, parseSeasonEnd } from "../contracts/SeasonUtils.js";

const STATUS_REASON = Object.freeze({
  nhl_regular: ["Роль в НХЛ", -28],
  nhl_depth: ["Глубина состава НХЛ", -12],
  ahl_leader: ["Сильная роль в АХЛ", 6],
  ahl_bubble: ["Нет стабильного места", 18],
  released: ["Свободен за океаном", 24],
});
const addReason = (reasons, text, value) => {
  if (value) reasons.push({ text, value: Math.round(value) });
  return value;
};
export class ExternalRightsInterestService {
  buildProfile(player, { seasonLabel, seasonDate, rightsTeam = null } = {}) {
    const career = player?.externalCareer || {};
    const reasons = [];
    const age = calculateAge(player?.identity?.birthDate, seasonDate);
    const ovr = Number(player?.ovr) || 0;
    const potential = Number(player?.potential?.potential) || ovr;
    const [statusText, statusValue] = STATUS_REASON[career.status] || ["Статус НХЛ / АХЛ", 0];
    const score = clamp(
      (Number(career.returnInterest) || 0) +
        addReason(reasons, statusText, statusValue) +
        addReason(reasons, "Возраст", age >= 28 ? 10 : age <= 22 ? -8 : 0) +
        addReason(reasons, "Потенциал", potential >= 84 ? -10 : potential <= 76 ? 6 : 0) +
        addReason(reasons, "Права клуба", rightsTeam ? 4 : 0) +
        addReason(reasons, "Сезоны вне КХЛ", Math.min(14, (Number(career.seasonsOutsideKhl) || 0) * 3)),
      0,
      100,
    );
    return { score: Math.round(score), label: this.#label(score), reasons: reasons.slice(0, 5) };
  }
  buildOfferWindow(player, seasonLabel) {
    const career = player?.externalCareer || {};
    if (career.lastKhlOfferSeason === seasonLabel) return { canOffer: false, label: "Оффер уже сделан в этом сезоне" };
    if (parseSeasonEnd(career.contractUntil) > parseSeasonEnd(seasonLabel)) {
      return { canOffer: false, label: `Контракт за океаном до ${career.contractUntil}` };
    }
    return { canOffer: true, label: "Можно сделать оффер" };
  }
  #label(score) {
    if (score >= 75) return "Высокий";
    if (score >= 50) return "Средний";
    if (score >= 25) return "Низкий";
    return "Минимальный";
  }
}
