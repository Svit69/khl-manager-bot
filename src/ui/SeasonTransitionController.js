export class SeasonTransitionController {
  static advance(state, options = {}) {
    try {
      return state.advanceToNextSeason(options);
    } catch (error) {
      console.error("Season transition failed", error);
      const details = error?.message || "UNKNOWN_ERROR";
      window.alert(`Не удалось перейти в новый сезон. Решения по контрактам сохранены на экране.\n${details}`);
      return null;
    }
  }
}
