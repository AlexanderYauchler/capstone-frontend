# Implementation status

Verified on 2026-10-21. Baseline: local commit `5b3f5ff` (state before this work).

Test results key:
- **Auto** means covered by passing Vitest tests.
- **Browser** means checked by hand in a running dev server.
- **Not tested** means neither.

Final check results: `npm run typecheck` passed, `npm run lint` passed (0 problems; baseline had 3 errors), `npm run test` passed (56 of 56; baseline 38), and `npm run build` passed (with a chunk-size warning).

| Feature | Previous status | Changes made | Current status | Files | Tests | Outstanding limitations |
|---|---|---|---|---|---|---|
| Role selection / login | Done | None | Done | `features/auth/RoleSelectionPage.tsx` | Auto, Browser | Demo role switcher only |
| Role navigation | Done, but analytics split in two and footer switched roles silently | Single source of nav items; best-match active state; New recording CTA; footer limited to current role; labelled demo role switcher; skip link | Done | `design-system/layouts/Sidebar.tsx`, `TopBar.tsx`, `ParkviewFooter.tsx`, `AppShell.tsx` | Auto, Browser | — |
| Unauthorized URL handling | Basic guard | "Access restricted" page with Go to my workspace / Switch role / Return | Done | `app/router/RoleGuard.tsx` | Auto | Client-side only |
| Clinician dashboard | Done | Button renamed to New recording; reference date label derived from data | Done | `features/clinician/ClinicianDashboardPage.tsx`, `services/demo/demo-services.ts` | Auto, Browser | Greeting is always "Good morning" |
| Clinical sessions list | Done | None | Done | `ClinicalSessionsPage.tsx` | Auto | — |
| Recording page | Coded but unreachable; 3 lint errors; fake Blob fallback | Routed at `/new`, `/upload`, `/:id/record`; lint fixed; empty-audio validation; simulated audio option; Generate draft step; simpler wording | Done | `ClinicalVisitCapturePage.tsx` | Auto (consent gate, unsupported browser, permission denied, simulated flow), Browser (simulated flow) | Live mic capture not exercised in automated tests; audio not uploaded anywhere |
| Processing / retry | Static stage list only | Animated simulated pipeline, retry with limit, discard and re-record | Done (simulated) | `ProcessingStatusPanel.tsx`, `demo-services.ts` | Auto, Browser | No real pipeline |
| New-visit drafts | Copied CS-1042 / Alex Morgan's report into any new visit | Per-patient simulated draft built from the session | Done (simulated) | `services/demo/fixtures/simulated-draft.ts` | Auto, Browser | Template text by diagnosis category |
| Review workbench (edit, save, compare) | Done | Cache refresh fixed (`['sessions']` key was unused) | Done | `ClinicalSessionDetailPage.tsx`, `app/query-keys.ts` | Auto, Browser | — |
| Clarifications | Done; plan text replaced by fixed metformin text | Plan now shows the clinician's actual answers | Done | `domain/state-machines/index.ts` | Auto, Browser | — |
| Request changes (reject) | Domain logic only | Dialog with required reason, then simulated regeneration | Done (simulated) | `ClinicalSessionDetailPage.tsx`, `ProcessingStatusPanel.tsx` | Auto | Regenerated text equals the previous draft |
| Approve & finalize | Done | None | Done | `ClinicalSignOffAndReleasePanel.tsx` | Auto, Browser | — |
| Release to patient | Done | None | Done | same | Auto, Browser | — |
| Reports & review queue | Not built | New page grouping reports by next action | Done | `ReviewQueuePage.tsx` | Auto | — |
| Visit summary | Placeholder | New page | Done | `ClinicalSessionSubpages.tsx` | Browser (render) | Not tested for every state |
| Report history | Placeholder | Revisions and activity log | Done | same | Browser | — |
| Privacy check | Placeholder | Simulated two-pass check, failure demo | Done (simulated) | same | Browser (render) | No real de-identification |
| Patient portal | Done; hardcoded patient fallback | Fallback removed | Done | `features/patient/*` | Auto, Browser | Print dialog (Figma 46) not built |
| Analytics overview | Static numbers, no controls | Deterministic synthetic dataset, aggregation engine, filters, KPIs, column chart, breakdown tables, empty/suppressed states | Done | `domain/analytics/index.ts`, `features/analytics/*`, `services/demo/fixtures/analytics-dataset.ts`, `design-system/components/charts/*` | Auto (engine + UI), Browser | Synthetic only; no export dialog or saved views |
| Monthly analytics | Static table | Month/year selection, prev/next, 5 KPIs, trend line chart, diagnosis chart, month table | Done | same | Auto, Browser | Current month is partial (through Oct 6) |
| Administration | Placeholder | Overview, Users & access, Audit log with filter | Done | `features/admin/AdminPage.tsx` | Browser | Users are demo personas; no editing |
| Settings | Placeholder | Preferences form with save confirmation | Done | `features/settings/SettingsPage.tsx` | Browser | Density preference not applied |
| Responsive layout | Partly checked | All main routes checked at 375px with no horizontal scroll | Done | — | Browser | Tablet width not separately checked |
| Accessibility | Partial | Skip link, global focus outline, reduced motion, chart descriptions and tables, labelled filters, alerts | Improved | `tokens.css`, charts, pages | Lint (jsx-a11y), Browser | No screen-reader or contrast audit tool run |
| Documentation | Architecture plan, Figma inventory | Four new docs | Done | `docs/*.md` | — | — |

## Not implemented (out of frontend scope or deferred)

- Server upload, transcription, AI drafting, real de-identification, real authentication (teammates' backend).
- Analytics export dialog and saved views (Figma 49–51).
- Patient print dialog (Figma 46).
- Route-level code splitting.
