# Player Loans

## Rules

Reference: KHL Legal Regulations 2026/27, Article 41, pages 57-60:
https://cska-hockey.ru/upload/iblock/c35/gtnp5j7jxrr5gr1ptaks0zfpweo6ava2.pdf

- A valid owner contract must cover the current and following seasons.
- Age is the season start year minus the birth year, not the birthday age.
- Maximum four active incoming and four outgoing loans per club.
- Each direction allows three players aged up to 22 and one aged up to 24.
- The fourth slot may also contain an under-23 player.
- Maximum two outgoing agreements to the same receiving club per season.
- Returned agreements still count toward the same-pair seasonal limit.
- Transfers close January 25 at 23:59:59.999 Moscow time.
- Agreements end May 31; automatic return precedes next-season contract handling.
- Clubs and player must agree. No transfer fee, subloan, trade or borrower renewal.

## Game Implementation

- `loansEnabled` defaults to true, including legacy saves.
- The career settings toggle is available before selecting a club.
- Disabling new loans never cancels an existing player's mandatory return.
- Contracts contains owner/player/borrower selectors, terms, reasons and agreements.
- AI proposals involving the user require explicit acceptance or rejection.
- User-initiated agreements execute immediately after all consent checks pass.
- Consent is modeled through depth and projected playing role, not random rerolls.
- Early termination requires improved owner role and room under the owner's cap.
- The temporary agreement is separate from the unchanged future owner contracts.
- For this version, the annual salary is unchanged and entirely assigned to the borrower.
- The cap uses the full annual rate, without prorating the elapsed loan period.
- This cap treatment is an explicit game simplification, not exact KHL accounting.
- Save payload `loans` contains agreements, pending proposals and AI checkpoints.
- Roster movement changes only the departing slot and receiving reserve.
- Historic roster source notes are not automatically converted into loan agreements.

## AI and Verification

- Nine 60% opportunities and three rare 5% winter opportunities per season.
- Only eligible surplus players with better receiving roles are considered.
- Both current cap and future owner payroll/depth reserves are checked.
- No transaction is forced to satisfy a quota; initial/mature seasons can differ.
- Checkpoints and rejected/proposed player IDs survive saves and reloads.
- Focused tests live in `scripts/loans`; generated fixtures use the actual model APIs.
