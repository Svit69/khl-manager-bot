import { clamp } from "../contracts/SeasonUtils.js";

const MILLION = 1000000;
const roundMillions = (value) => Math.round((Number(value) || 0) / MILLION) * MILLION;

export class CoachContractService {
  getDemandRub(coach) {
    const overall = Number(coach?.overall) || 68;
    const games = Number(coach?.khlGamesCoached) || 0;
    const reputation = Math.min(18, games / 75);
    return roundMillions(clamp((12 + Math.max(0, overall - 62) * 1.9 + reputation) * MILLION, 10000000, 125000000));
  }

  buildOffer(coach, factor = 1, years = 2) {
    const demandRub = this.getDemandRub(coach);
    const salaryRub = roundMillions(demandRub * (Number(factor) || 1));
    const chance = this.getAcceptanceChance(coach, { salaryRub, years }, demandRub);
    return { years: Math.max(1, Number(years) || 1), salaryRub, demandRub, chance };
  }

  getAcceptanceChance(coach, offer, demandRub = this.getDemandRub(coach)) {
    const salaryRatio = (Number(offer?.salaryRub) || 0) / Math.max(1, demandRub);
    const years = Math.max(1, Number(offer?.years) || 1);
    const ambition = ((Number(coach?.overall) || 70) - 70) * 0.8;
    return Math.round(clamp(38 + (salaryRatio - 0.9) * 185 + Math.min(8, years * 2) - ambition, 6, 96));
  }

  decide(coach, offer) {
    const demandRub = this.getDemandRub(coach);
    const chance = this.getAcceptanceChance(coach, offer, demandRub);
    return { accepted: Math.random() * 100 <= chance, chance, demandRub };
  }
}
