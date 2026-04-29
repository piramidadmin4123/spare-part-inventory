# AI Handoff

## Excel import fix

- Updated `apps/api/src/modules/excel/excel.router.ts` for the Additional Order import path.
- Additional Order sheets now fall back to the selected `siteId` when the sheet name does not resolve a site.
- Sheets with an unresolved site keyword are skipped with an error message instead of being imported with a null site.
- Added duplicate detection for Additional Order rows using a normalized composite key so re-importing the same exact row does not create duplicates.
- Duplicate rows are now counted in `skipped`.

## Serial number handling

- Changed spare-part serial handling from global uniqueness to per-site uniqueness.
- Excel import now creates the same serial number as separate records when the rows belong to different sites.
- Added warnings for cross-site serial collisions so the user can review suspicious duplicates instead of silently losing rows.

## Additional Order dedupe

- Added a normalized additional-order key helper in `apps/api/src/lib/additional-order-key.ts`.
- Additional Order import now checks existing site records with the normalized key before inserting.
- Additional Orders create/update routes now reject duplicate rows on the same site using the same normalized key.

## Validation

- Ran backend validation on `apps/api/src/modules/excel/excel.router.ts` with no errors reported.

## Additional Order dedupe — key alignment fix

- Removed the local `makeOrderKey`/`normalizeOrderText`/`normalizeOrderDecimal` helpers in `apps/api/src/modules/excel/excel.router.ts`.
- Excel import now builds dedupe keys with `buildAdditionalOrderKey` from `apps/api/src/lib/additional-order-key.ts`, the same function used to key `existingOrderKeys` (and the create/update routes).
- Root cause: the in-file `makeOrderKey` ordered fields as `siteId|type|brand|...` while `buildAdditionalOrderKey` orders them as `siteId|brand|type|...`, so existing-row keys never matched imported-row keys and duplicates were created on every re-import.
- Quantity is now normalized via `Math.trunc` (consistent with the helper), preventing `1` vs `1.0` mismatches.
- Tightened `aoSiteId` initial value from `siteId` (`string | undefined`) to `siteId ?? null` to satisfy the `string | null` annotation and unblock typecheck.
