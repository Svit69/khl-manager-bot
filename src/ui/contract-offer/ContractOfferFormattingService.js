export class ContractOfferFormattingService {
  formatMillions(value) {
    const millions = (Number(value) || 0) / 1000000;
    return Number.isInteger(millions) ? String(millions) : millions.toFixed(1);
  }

  formatMillionsInput(value) {
    return this.formatMillions(value).replace(",", ".");
  }

  calculateAcceptanceChance(preview) {
    return Math.max(0, Math.min(100, Number(preview?.state?.chance) || 0));
  }
}
