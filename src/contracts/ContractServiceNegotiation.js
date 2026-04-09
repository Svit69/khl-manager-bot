import { getAcceptanceChance } from "./RenewalScoring.js";
import { clamp } from "./SeasonUtils.js";
import { roundSalaryRub } from "./ContractServiceShared.js";

export const isBlatantlyBadOffer = (preview) => {
  const salaryRatio = Number(preview?.salaryRatio) || 0;
  const termMod = Number(preview?.termMod) || 0;
  const roleScore = Number(preview?.roleScore) || 0;
  return salaryRatio < 0.75 || (salaryRatio < 0.85 && termMod < 0 && roleScore < -3);
};

export const buildCounterOffer = (preview) => {
  const wantsMoreMoney = preview.salaryRatio < 0.98 || preview.salaryScore < 6;
  const wantsDifferentTerm = (preview.termMod || 0) < 0;

  let years = clamp(preview.offer.years, 1, 4);
  let salaryRub = roundSalaryRub(preview.offer.salaryRub);

  if (wantsDifferentTerm) {
    if (preview.termPreference === "short") years = Math.min(years, 2);
    else if (preview.termPreference === "neutral") years = 3;
    else years = 4;
  }

  if (wantsMoreMoney) {
    const targetFactor = preview.salaryRatio < 0.85 ? 1.08 : preview.salaryRatio < 1 ? 1.03 : 1.01;
    const targetSalary = roundSalaryRub(preview.teamAdjustedDemand * targetFactor);
    salaryRub = Math.max(salaryRub, targetSalary);
  }

  if (years === preview.offer.years && salaryRub === preview.offer.salaryRub) {
    salaryRub = roundSalaryRub(Math.max(preview.offer.salaryRub, preview.teamAdjustedDemand));
  }

  if (wantsMoreMoney && wantsDifferentTerm) {
    return {
      years,
      salaryRub,
      style: "both",
      summary: "\u0418\u0433\u0440\u043e\u043a \u0445\u043e\u0447\u0435\u0442 \u0438\u0437\u043c\u0435\u043d\u0438\u0442\u044c \u0438 \u0441\u0440\u043e\u043a, \u0438 \u0437\u0430\u0440\u043f\u043b\u0430\u0442\u0443",
    };
  }

  if (wantsMoreMoney) {
    return {
      years,
      salaryRub,
      style: "salary",
      summary: "\u0418\u0433\u0440\u043e\u043a \u0433\u043e\u0442\u043e\u0432 \u043e\u0431\u0441\u0443\u0436\u0434\u0430\u0442\u044c \u043a\u043e\u043d\u0442\u0440\u0430\u043a\u0442, \u043d\u043e \u043f\u0440\u043e\u0441\u0438\u0442 \u0431\u043e\u043b\u044c\u0448\u0435 \u0434\u0435\u043d\u0435\u0433",
    };
  }

  if (wantsDifferentTerm) {
    return {
      years,
      salaryRub,
      style: "term",
      summary: "\u0418\u0433\u0440\u043e\u043a\u0443 \u043d\u0435 \u043d\u0440\u0430\u0432\u0438\u0442\u0441\u044f \u0441\u0440\u043e\u043a \u0438 \u043e\u043d \u043f\u0440\u043e\u0441\u0438\u0442 \u0434\u0440\u0443\u0433\u0443\u044e \u0441\u0442\u0440\u0443\u043a\u0442\u0443\u0440\u0443 \u043a\u043e\u043d\u0442\u0440\u0430\u043a\u0442\u0430",
    };
  }

  return {
    years,
    salaryRub,
    style: "close",
    summary: "\u0418\u0433\u0440\u043e\u043a \u0431\u043b\u0438\u0437\u043e\u043a \u043a \u0441\u043e\u0433\u043b\u0430\u0441\u0438\u044e, \u043d\u043e \u0445\u043e\u0447\u0435\u0442 \u0447\u0443\u0442\u044c \u043b\u0443\u0447\u0448\u0435\u0435 \u043f\u0440\u0435\u0434\u043b\u043e\u0436\u0435\u043d\u0438\u0435",
  };
};

export const getNegotiationDecision = (preview, player) => {
  const willingness = Number(preview?.willingness) || 0;
  const chance = getAcceptanceChance(willingness);
  const isStar = (player?.ovr || 0) >= 82;
  const isElite = (player?.ovr || 0) >= 84;
  const salaryRatio = Number(preview?.salaryRatio) || 0;
  const roleScore = Number(preview?.roleScore) || 0;
  const termMod = Number(preview?.termMod) || 0;
  const ufaStatus = preview?.ufaStatus;

  if (ufaStatus === "NSA" && willingness < 45) {
    return "reject";
  }
  if (willingness < 25) {
    return ufaStatus === "OSA" ? "counter" : "reject";
  }
  if (isStar && salaryRatio < 0.9) {
    return willingness >= 35 ? "counter" : ufaStatus === "OSA" ? "counter" : "reject";
  }
  if (isElite && termMod < 0 && roleScore < 0) {
    return "counter";
  }

  const acceptRoll = Math.random() * 100 < chance;
  if (acceptRoll && willingness >= 35) {
    return "accept";
  }

  if (willingness < 35) {
    return ufaStatus === "OSA" ? "counter" : "reject";
  }
  if (willingness < 60) {
    return "counter";
  }
  return "counter";
};
