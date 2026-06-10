const TIERS = Object.freeze([
  { limit: 3000000, picks: [], cash: 0, label: "Без компенсации" },
  { limit: 8000000, picks: ["3-й раунд"], cash: 0, label: "Пик 3-го раунда юниоров" },
  { limit: 15000000, picks: ["2-й раунд"], cash: 0, label: "Пик 2-го раунда юниоров" },
  { limit: 25000000, picks: ["1-й раунд"], cash: 0, label: "Пик 1-го раунда юниоров" },
  { limit: 40000000, picks: ["1-й раунд", "2-й раунд"], cash: 5000000, label: "Пики 1-го и 2-го раунда + 5 млн" },
  { limit: Infinity, picks: ["1-й раунд", "1-й раунд", "2-й раунд"], cash: 10000000, label: "Два 1-х раунда, 2-й раунд + 10 млн" },
]);

export class OfferSheetCompensationService {
  calculate(offer = {}) {
    const annualSalaryRub = Number(offer.salaryRub) || 0;
    const tier = TIERS.find((entry) => annualSalaryRub <= entry.limit) || TIERS[0];
    return {
      annualSalaryRub,
      picks: [...tier.picks],
      cashRub: tier.cash,
      label: tier.label,
    };
  }
}
