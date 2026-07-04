export const getNameFitClass = (name = "") => name.length > 28 ? "name-fit-xs" : name.length > 22 ? "name-fit-sm" : "";

export const splitPlayerDisplayName = (name = "") => {
  const [firstName = "", ...lastNameParts] = name.trim().split(/\s+/);
  return { firstName, lastName: lastNameParts.join(" ") || firstName };
};

export const formatInterestPercent = (score) => `${Math.max(0, Math.min(100, Math.round(Number(score) || 0)))}%`;

export const formatInterestReasons = (reasons = []) =>
  reasons.map((reason) => `${reason.value >= 0 ? "+" : ""}${reason.value} ${reason.text}`).join(" • ");
