const normalize = value => String(value || "").trim().toLowerCase().replaceAll("ё", "е").replace(/\s+/g, " ");

export const getPlayerIdentityKey = player => {
  if (!player?.id) return null;
  if (/^(junior-|system-fa-)/.test(player.id)) return `id:${player.id}`;
  const { firstName, lastName, birthDate } = player.identity || {};
  if (!firstName || !lastName || !/^\d{4}-\d{2}-\d{2}/.test(birthDate || "")) return `id:${player.id}`;
  return `person:${normalize(firstName)}:${normalize(lastName)}:${String(birthDate).slice(0, 10)}`;
};
