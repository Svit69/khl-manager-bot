const getCompensationCount = (player, annualSalaryRub) => {
  const ovr = Number(player?.ovr) || 0;
  const potential = Number(player?.potential?.potential) || ovr;
  const salaryMln = (Number(annualSalaryRub) || 0) / 1000000;
  if (ovr < 70 && salaryMln < 8) return 0;
  if (ovr >= 82 || potential >= 86 || salaryMln >= 35) return 3;
  if (ovr >= 78 || potential >= 82 || salaryMln >= 20) return 2;
  return 1;
};

const formatJuniorLabel = (count) => {
  if (count <= 0) return "Без компенсации";
  if (count === 1) return "1 молодой игрок из системы";
  return `${count} молодых игрока из системы`;
};

export class OfferSheetCompensationService {
  calculate(offer = {}, player = null) {
    const annualSalaryRub = Number(offer.salaryRub) || 0;
    const juniorPlayerCount = getCompensationCount(player, annualSalaryRub);
    return {
      annualSalaryRub,
      juniorPlayerCount,
      picks: [],
      cashRub: 0,
      label: formatJuniorLabel(juniorPlayerCount),
    };
  }
}
