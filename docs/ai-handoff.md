# AI Handoff

## Excel import fix

- Updated `apps/api/src/modules/excel/excel.router.ts` for the Additional Order import path.
- Additional Order sheets now fall back to the selected `siteId` when the sheet name does not resolve a site.
- Sheets with an unresolved site keyword are skipped with an error message instead of being imported with a null site.
- Added duplicate detection for Additional Order rows using a normalized composite key so re-importing the same exact row does not create duplicates.
- Duplicate rows are now counted in `skipped`.

## Validation

- Ran backend validation on `apps/api/src/modules/excel/excel.router.ts` with no errors reported.
