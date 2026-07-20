const average = (values) => Math.round(values.reduce((sum, value) => sum + (Number(value) || 0), 0) / Math.max(1, values.length));

export const getDraftAttributeSummary = (player) => {
  const attrs = player?.attributes?.attributesJson || {};
  if (player?.identity?.primaryPosition === "ВРТ") {
    return {
      attack: average([attrs.puckControl, attrs.athleticism]),
      defense: average([attrs.reaction, attrs.positioning, attrs.mental]),
    };
  }
  return {
    attack: average([attrs.shot, attrs.speed, attrs.skill]),
    defense: average([attrs.defense, attrs.physical]),
  };
};
