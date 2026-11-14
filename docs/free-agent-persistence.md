# Free Agent Persistence

- A release cancels the seed contracts permanently, even after a new signing.
- Restoring a roster or moving a signed player must not clear that cancellation.
- Legacy saves infer canceled seed deals from overlapping replacement contracts
  at another club, while respecting seed contracts already reassigned by trades.
- Repeated player-season replacement rows resolve to the latest saved agreement.
- Player ownership is restored from the active current-season contract; duplicate
  lineup/reserve references are removed without resetting valid custom lineups.
- AI cap compliance cannot release a player currently owned by another club.
- Market availability excludes roster claims by ID and real-player identity
  (first name, last name, birth date). Generated players remain distinct by ID.
- Both the market and contract service reject repeat signings.
- Run regression coverage with `npm run test:free-agents`.
