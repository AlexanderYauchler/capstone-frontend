# CoSign frontend UX research and improvement backlog

**Author:** Sanjana Gondariya  
**Audit date:** November 15, 2026  
**Repository:** `AlexanderYauchler/capstone-frontend`  
**Audited baseline:** `origin/main` at `f3e3294` (November 13, 2026)

## Scope and evidence rules

This report audits the existing React and TypeScript frontend and compares it with public information from Epic MyChart, Abridge, Nabla, OpenMRS, and Parkview Health. It does not treat marketing claims as independently proven product performance. Product observations below come from public product pages, public help material, published documentation, or a public research article.

Authenticated Epic, Abridge, Nabla, and Parkview clinician screens were not accessed. MyChart and Parkview observations are patient/public-site benchmarks, not observations of their internal clinician tools. Recommendations are labeled separately from observed product behavior.

The repository was inspected without changing application code or checking out another branch. The current `origin/main` tree was exported to a temporary directory for validation. The working branch was not rebased, merged, or pushed.

## Executive summary

CoSign is not a placeholder frontend. The main branch already implements the complete synthetic clinician demonstration flow: dashboard, session directory, consented capture, recording/upload/simulated audio, processing, SOAP editing, transcript provenance, clarification, revision history, approval, patient release, privacy verification, patient portal, analytics, administration, and settings.

The strongest next step is therefore not a redesign or rebuild. It is a focused usability and quality sprint that:

1. restores a real desktop note-and-evidence split view;
2. improves keyboard semantics, touch targets, and chart responsiveness;
3. reduces dashboard and review-page friction without removing safety gates;
4. makes silently applied recording metadata visible;
5. adds missing export/print affordances already identified in the design inventory; and
6. adds end-to-end accessibility and responsive checks so recent navigation/deployment work cannot regress.

## Repository and architecture audit

### Current architecture

| Concern | Existing implementation |
|---|---|
| Runtime/UI | React 19, TypeScript 6, Vite 8 |
| Routing | React Router 7 with role guards, route error recovery, route-level lazy loading, and a base path for GitHub Pages |
| Server state | TanStack Query with centralized invalidation for workflow mutations |
| Styling | Tailwind CSS 4 plus shared design tokens in `src/design-system/tokens.css` |
| UI primitives | Shared buttons, cards, badges, page headers, dialogs, drawers, progress, timelines, and SVG charts; Radix dialog primitives |
| Domain safety | Typed models plus state-machine guards for ownership, revision checks, clarification blockers, approval, and release |
| Service boundary | Pages depend on `ICoSignServices`; demo and provisional connected adapters implement the same contract |
| Demo data | Deterministic synthetic fixtures; serializable state in `sessionStorage`; audio blobs only in memory |
| Tests | Vitest, Testing Library, jsdom, JSX accessibility linting |

The architecture is appropriately modular for a capstone. Pages do not import the demo store directly, clinical safety rules are not embedded only in UI components, and connected-mode replacement is isolated behind service contracts. These are strengths to preserve.

### Existing feature inventory

| Area | What already works on `main` | Important limitation |
|---|---|---|
| Clinician dashboard | Dynamic KPI cards, priority clarification, actionable breakdown, queue tabs, table actions, errors/loading | Dense and repeats the New recording action; greeting is always “Good morning” |
| Clinical sessions | Search, status/date filters, sorting, URL-backed state, responsive table, empty/error states | No pagination is needed for the current small demo, but should be revisited for a real API |
| Recording | Patient/visit setup, consent gate, microphone selection, pause/resume/stop, upload, playback, simulated audio, retry/error handling, leave guard | Real upload/transcription is not connected; several visit metadata fields are applied but hidden |
| Processing | Simulated multi-stage progress, retry limit, interruption recovery | No real pipeline; regenerated demo text is unchanged |
| SOAP review | Editable SOAP sections, provenance links, original AI comparison, revision history, unsaved-change guard | Desktop still uses mutually exclusive tabs instead of simultaneous note/evidence review |
| Clarifications | Per-question and bulk save, chart-verified helper text, transcript jump, reopen/edit, approval blocking | Evidence inspection moves the user away from the note because of the all-width tab layout |
| Approval/release | Readiness checklist, confirmation dialogs, revision locking, separate patient release, audit trail | Post-finalization addenda/amendments are deferred |
| Review queue | Groups reports by clinician next action | Completed reports remain expanded with all actionable groups, increasing page length |
| Patient portal | Released-only reports, overview/history, patient-safe detail view | Print/download dialog is not implemented |
| Analytics | Cohort and monthly views, URL filters, suppression, KPIs, charts, data tables, empty/error states | No saved views or export; SVG labels shrink substantially on narrow screens |
| Admin/settings | Overview, role matrix, audit log, template/microphone/density preferences | Connected backend is still provisional |

### Verification results

- `npm run lint`: passed on the current main snapshot.
- `npm run build`: passed; route chunks were generated and no emitted chunk exceeded 500 kB.
- `npm test -- --run`: one first full-suite run failed the mobile-drawer navigation test (70/71), while the isolated test and a second full run passed (71/71). This is evidence of an intermittent async/navigation test, not a consistently broken drawer.
- Visual review: login, dashboard, recording setup, CS-1042 review, and cohort analytics were inspected at a 1280 × 720 browser viewport. Existing tablet screenshots of review and approval were also inspected.
- Static responsive review: breakpoint classes and overflow behavior were reviewed across clinician, analytics, patient, admin, and shared layout components.

### Recent commit review

Recent work should not be duplicated:

- `6e0ce8d`, `ad003f3`, and `641858b` redesigned SOAP review, transcript evidence, and clarification.
- `a43ba01` hardened recording routes, dialogs, navigation focus/scroll, preferences, failures, code splitting, and tests.
- `d7327f1` substantially improved the patient portal and analytics UI.
- `1370ff7` through `a154e43` addressed GitHub Pages base-path/deployment behavior.
- `146e06a` and `f3e3294` added analytics sorting and dashed-line support.

## Audit findings

### What should be preserved

- The four-stage clinician workflow and separate approval/release decisions.
- Revision-aware mutations and explicit clinician ownership checks.
- Visible simulated-data and simulated-AI labeling.
- Transcript provenance, per-question clarification, and approval blockers.
- URL-backed session and analytics filters.
- Text-and-icon statuses, chart data tables, skip link, reduced-motion support, and route focus restoration.
- The service-contract boundary between UI and future backend work.

### UX and accessibility issues

1. **The documented side-by-side review does not exist at desktop width.** `ClinicalSessionDetailPage.tsx` renders one column and uses the Report, Transcript, and Pipeline tabs at every breakpoint. This makes linked evidence verification serial instead of comparative.
2. **Several custom tablists are incomplete ARIA tab widgets.** Dashboard queue tabs and review workbench tabs lack associated `tabpanel` elements, `aria-controls`, roving focus, and arrow-key navigation.
3. **The clinician dashboard has competing primary actions and high initial density.** New recording appears in the global header and the hero, while the hero also contains Manage all sessions and Review priority. KPI, priority, breakdown, and queue sections compete above the fold.
4. **Recording metadata is applied invisibly.** Department, report template, and symptom controls remain in component state, but their controls are hidden. A clinician cannot confirm or correct these defaults before starting the encounter.
5. **Review actions are not actually persistent.** The code calls the top card a persistent action bar, but it is not sticky. On long clarification/SOAP pages the save state and main action leave the viewport.
6. **Chart interaction is primarily mouse-hover based.** Data tables make values available, but line/column chart hit areas are not keyboard focusable and SVG text scales down with the whole chart on mobile.
7. **Some small controls need a target-size audit.** Utility-bar role switches, small filter pills, dismiss buttons, and inline actions may rely on spacing exceptions rather than consistently meeting the WCAG 2.2 24 × 24 CSS-pixel minimum.
8. **Documentation has drifted.** `docs/demo-walkthrough.md` still says density is not applied and the bundle is monolithic, while both were fixed. `docs/implementation-status.md` reports older test counts and an older baseline.

### Incomplete or deferred functionality

- Connected mode intentionally rejects every service call until backend integration.
- Real server upload, transcription, AI drafting, authentication, authorization, and de-identification are outside the current frontend implementation.
- Request changes preserves feedback/history but regenerates the same demo text.
- Patient print/download, analytics export, and analytics saved views are not implemented.
- Post-finalization addenda/amendments are not implemented.
- No browser end-to-end, automated accessibility, or visual-regression suite is configured in CI. The deploy workflow runs the production build but not lint or tests.

## Public-product benchmark

### Observed patterns

| Product | Verified public observations | Relevance and limits |
|---|---|---|
| Epic MyChart | Groups patient work into health, messaging, scheduling, billing, sharing, and preferences; exposes visit summaries, clinical notes, medications, results, proxy access, notification preferences, and record sharing/download functions. | Strong benchmark for CoSign’s patient portal and task grouping. MyChart is patient-facing; it is not evidence for a clinician AI note-review workflow. |
| Abridge | Publicly describes capture in Epic Haiku and verification of AI drafts in Hyperspace using Linked Evidence. Its product page emphasizes EHR-integrated, evidence-based notes. A published JAMIA Open workflow description reports a web editor where a clinician can edit the draft and open related transcript/audio evidence with one click. | Closest public benchmark for CoSign’s note-and-transcript review. Authenticated product screens were not accessed. |
| Nabla | Public help material describes section-level note editing, dictation for edits, copying individual sections or the whole note, configurable templates, post-generation template updates, regeneration with highlighted edits and undo, patient instructions, and consent guidance. | Strong benchmark for edit efficiency, template control, transparent regeneration, and patient-ready output. Authenticated screens were not accessed. |
| OpenMRS | O3 documentation describes an active-visits and appointments home dashboard, patient banner/flags, visit notes, tasks, tests, charts/tables, configurable forms, modular extension slots, and a shared Carbon-based design system. | Strong benchmark for configurable clinical workflow and patient-context continuity. Public docs do not show an ambient-AI clarification/approval flow. |
| Parkview Health | The public site has a skip link, two-level navigation, short primary navigation, and one prominent Find Care action. Public Parkview MyChart material emphasizes summaries, results, secure messaging, appointments, refills, proxy access, help resources, and both desktop/mobile guidance. | Useful for CoSign’s visual hierarchy, plain language, support, and patient experience. No internal Parkview clinician system was inspected. |

### Comparison with CoSign

| Focus area | CoSign today | Benchmark lesson | Recommendation status |
|---|---|---|---|
| Clinician workflow efficiency | Strong state-driven queue and four-stage flow; dashboard is dense | OpenMRS prioritizes today’s active visits/appointments; Parkview uses one prominent action | Simplify action hierarchy; do not replace the queue |
| Clinical documentation | Complete SOAP editor and revisions | Nabla supports direct section editing and configurable note styles | Surface the already-applied template and make long-form actions persistent |
| AI note review | Strong provenance model but panels are exclusive tabs | Abridge’s public workflow centers linked evidence during review | Restore simultaneous desktop note/evidence review |
| Clarification/approval | Safer and more explicit than the public materials reviewed | Abridge/Nabla both keep clinicians in control of generated notes | Preserve blockers and confirmation dialogs; improve navigation only |
| Analytics | Internally consistent, privacy-suppressed cohort/monthly views | OpenMRS uses both tables and charts; MyChart exposes download/share patterns | Improve mobile charts, then add suppression-safe export |
| Accessibility | Good baseline: labels, focus outlines, skip link, status text, data tables | W3C requires complete keyboard behavior for custom tabs and minimum target sizing | Complete semantics and automate checks |
| Navigation/visual consistency | Shared tokens/components and role-scoped navigation | Parkview uses short navigation and a single dominant action | Reduce repeated primary actions and update stale documentation |

## Prioritized improvement backlog

Difficulty uses **S** (small), **M** (medium), and **L** (large). Estimates are student implementation hours including tests and manual verification.

### 1. P0 — Stabilize main navigation and deployment-path tests

- **Current issue:** The first main-branch full test run intermittently failed after the mobile drawer navigated to the lazy-loaded sessions page; reruns passed. Recent base-path commits are not covered by focused router tests.
- **Proposed solution:** Make the navigation test await the route transition deterministically, add basename/deep-link tests, and run typecheck, lint, tests, and build before deployment.
- **Affected files/pages:** `src/app/__tests__/app-navigation.test.tsx`, `src/app/App.tsx`, `vite.config.ts`, `.github/workflows/deploy.yaml` or a new checks workflow.
- **Research justification:** Reliable navigation is foundational; this item is based on repository evidence rather than a competitor feature.
- **Difficulty:** S
- **Estimate:** 4–6 hours
- **Acceptance criteria:** Five consecutive full test runs pass; root and GitHub Pages basename routes resolve; CI blocks deployment on typecheck/lint/test/build failure.
- **Overlap:** Extends existing unit/component tests and deployment work; does not duplicate them.

### 2. P0 — Restore a true desktop note-and-evidence review layout

- **Current issue:** Report, transcript, and pipeline are exclusive tabs at all widths, despite code comments and documentation describing a two-column workbench.
- **Proposed solution:** At `xl` desktop widths, show SOAP/clarifications and a sticky transcript/evidence pane together; retain the current tabs for tablet and mobile. Keep pipeline status in a collapsible secondary card.
- **Affected files/pages:** `ClinicalSessionDetailPage.tsx`, `TranscriptEvidencePanel.tsx`, `SoapReportEditorPanel.tsx`, `clinical-review-workbench.test.tsx`.
- **Research justification:** Abridge publicly emphasizes Linked Evidence during draft verification; its published workflow description supports one-click access to transcript/audio evidence while editing.
- **Difficulty:** M
- **Estimate:** 12–16 hours
- **Acceptance criteria:** At 1280px and wider, note and selected evidence remain visible simultaneously; selecting a source scrolls/highlights the matching transcript; at 1023px and below the existing tabs remain usable; no horizontal page overflow.
- **Overlap:** Reuses all existing editor, transcript, provenance, and mobile-tab functionality.

### 3. P0 — Complete keyboard and screen-reader behavior for custom tabs

- **Current issue:** Review and dashboard tablists do not implement the complete WAI-ARIA tab pattern.
- **Proposed solution:** Create a small shared accessible tabs utility with `tablist`, `tab`, `tabpanel`, `aria-controls`, `aria-labelledby`, roving `tabIndex`, and Arrow/Home/End behavior. Use pressed buttons instead where content is only filtered and does not behave as a tab panel.
- **Affected files/pages:** `ClinicalSessionDetailPage.tsx`, `ClinicianDashboardPage.tsx`, potentially `AnalyticsPage.tsx`, shared design-system components.
- **Research justification:** The W3C ARIA Authoring Practices tab pattern specifies associated tab panels and arrow-key focus behavior.
- **Difficulty:** M
- **Estimate:** 8–12 hours
- **Acceptance criteria:** Keyboard users can move within each tablist with arrow keys; only the active tab is in the normal tab sequence; each tab controls a named panel; screen-reader labels announce selection and panel relationships.
- **Overlap:** Corrects semantics around existing tab/filter behavior; no feature duplication.

### 4. P1 — Make review status and actions persistent on long notes

- **Current issue:** Save state, Request changes, and Save Draft leave the viewport during long clarification and SOAP review.
- **Proposed solution:** Add a compact sticky review toolbar on desktop and a bottom action bar on small screens showing revision, unsaved state, open blockers, Save, and Continue to final review. Disable Save when there is nothing new to save unless “mark reviewed” is intentionally separated.
- **Affected files/pages:** `ClinicalSessionDetailPage.tsx`, `SoapReportEditorPanel.tsx`, `tokens.css`.
- **Research justification:** Nabla’s public workflow supports direct section editing and completion actions close to the note. AHRQ usability guidance recommends keeping task-relevant information and controls available and limiting unnecessary navigation effort.
- **Difficulty:** M
- **Estimate:** 8–12 hours
- **Acceptance criteria:** Save/blocker status remains visible while editing any SOAP section; bar never covers focused fields; mobile safe-area spacing is respected; existing unsaved-change guards and revision rules still pass.
- **Overlap:** Consolidates existing duplicate Save controls; does not change domain logic.

### 5. P1 — Expose applied recording metadata and template choice

- **Current issue:** Department, report template, and primary symptom are present in state but hidden in the encounter form, so defaults can silently shape the generated record.
- **Proposed solution:** Show a concise “Visit details” summary with an Edit disclosure. Keep patient, visit reason, category, department, symptom, and note template visible before consent confirmation.
- **Affected files/pages:** `CaptureEncounterForm.tsx`, `ClinicalRecordingStudio.tsx`, `SettingsPage.tsx`, capture tests.
- **Research justification:** Nabla publicly supports configurable note templates and custom instructions; OpenMRS uses configurable clinical forms. Both patterns favor visible configuration over silent defaults.
- **Difficulty:** S
- **Estimate:** 6–8 hours
- **Acceptance criteria:** Clinician can review and change all metadata for a new encounter; existing visits remain immutable where required; the saved session and generated report use the displayed values; no hidden form controls remain.
- **Overlap:** Surfaces existing fields and preferences rather than adding a second setup flow.

### 6. P1 — Simplify dashboard action hierarchy

- **Current issue:** New recording appears in both global navigation and the dashboard hero; three hero actions compete with the priority review task, and the queue begins below several summary blocks.
- **Proposed solution:** Keep New recording as the single global primary action. Make the hero’s primary action the highest-priority clinical task, demote Manage all sessions to a text link, and collapse or move the breakdown into the existing Reports & review page.
- **Affected files/pages:** `ClinicianDashboardPage.tsx`, `TopBar.tsx`, `ReviewQueuePage.tsx`, dashboard tests.
- **Research justification:** Parkview’s public navigation uses one prominent action; OpenMRS surfaces today’s active visits and appointments on the home dashboard.
- **Difficulty:** S
- **Estimate:** 6–10 hours
- **Acceptance criteria:** Exactly one visually dominant New recording action appears in the desktop header/dashboard region; the top actionable visit is reachable in one click; KPI values and queue filters remain unchanged; mobile layout remains scroll-safe.
- **Overlap:** Reprioritizes existing links and sections; no route or queue rebuild.

### 7. P1 — Improve clarification navigation without weakening safety gates

- **Current issue:** Long question cards repeat context, and transcript inspection changes tabs. There is no “next unresolved” control after saving one answer.
- **Proposed solution:** Add previous/next unresolved navigation, a compact question index, and persistent selected-evidence context. Keep per-question Save, bulk Save, reopen, minimum response validation, and approval blocking.
- **Affected files/pages:** `ClarificationWorkbenchPanel.tsx`, `ClinicalSessionDetailPage.tsx`, `TranscriptEvidencePanel.tsx`.
- **Research justification:** Abridge’s linked evidence pattern emphasizes quick verification; Nabla’s editor emphasizes section-by-section review. CoSign’s explicit clarification safety model is already stronger and should be preserved.
- **Difficulty:** M
- **Estimate:** 8–12 hours
- **Acceptance criteria:** User can move through unresolved questions without returning to the top; saved answers update counts and focus predictably; source evidence remains highlighted; approval remains blocked until all questions are saved.
- **Overlap:** Extends the existing clarification workbench; does not replace it.

### 8. P1 — Make analytics charts responsive and keyboard-operable

- **Current issue:** SVG charts scale their 11-unit labels with the entire 640-unit view box, making labels very small on phones. Tooltips respond to mouse hover but not keyboard focus or touch.
- **Proposed solution:** Use responsive label density or a minimum plot width with contained horizontal scrolling, add focusable data points/hit targets with accessible names, and support tap/focus tooltips. Keep the existing table toggle.
- **Affected files/pages:** `ColumnChart.tsx`, `LineChart.tsx`, `chart-utils.tsx`, `AnalyticsPage.tsx`.
- **Research justification:** OpenMRS documents both tabular and chart views; W3C keyboard guidance requires custom interactive widgets to provide keyboard behavior.
- **Difficulty:** M
- **Estimate:** 8–12 hours
- **Acceptance criteria:** Axis/category text remains legible at 375px; every plotted value is reachable with keyboard and touch; tooltip state is not hover-only; data tables still expose all values; suppression labels remain intact.
- **Overlap:** Improves existing charts and accessible tables.

### 9. P1 — Audit and normalize interactive target sizes

- **Current issue:** Several utility links, pills, dismiss controls, and small inline actions may be below 24 × 24 CSS pixels or depend on spacing exceptions.
- **Proposed solution:** Add a shared minimum interactive target token/class, enlarge hit areas without increasing visual density, and test the utility bar, filters, chart controls, evidence chips, dialogs, and mobile drawer.
- **Affected files/pages:** `tokens.css`, `TopBar.tsx`, `DemoSimulationBar.tsx`, chart components, dashboard/session filters, review panels.
- **Research justification:** WCAG 2.2 Success Criterion 2.5.8 defines a 24 × 24 CSS-pixel minimum target with limited exceptions.
- **Difficulty:** S
- **Estimate:** 5–8 hours
- **Acceptance criteria:** All non-inline interactive controls meet the minimum or have a documented spacing/equivalent-control exception; focus outlines remain visible; no new wrapping or overflow at 375px.
- **Overlap:** Extends the existing focus and accessibility token system.

### 10. P1 — Add end-to-end responsive and accessibility checks

- **Current issue:** Existing tests cover domain and component behavior well, but no real-browser suite checks focus order, dialogs, deep links, mobile/tablet layout, chart tables, or the full approval/release path.
- **Proposed solution:** Add a small Playwright suite at 375, 768, and 1280 widths plus automated axe checks on representative states. Run it in CI after unit tests.
- **Affected files/pages:** New end-to-end test configuration/specs, CI workflow, critical clinician and analytics routes.
- **Research justification:** The intermittent navigation test and current manual-only accessibility notes show the value of browser-level regression coverage.
- **Difficulty:** M
- **Estimate:** 12–16 hours
- **Acceptance criteria:** CI covers login→dashboard, recording consent gate, review/clarification, approval/release, analytics table toggle, invalid routes, and mobile navigation; no serious/critical axe findings on audited pages.
- **Overlap:** Complements rather than replaces the 71 Vitest tests.

### 11. P2 — Add suppression-safe analytics export and saved-view shortcuts

- **Current issue:** Analytics filters are shareable through the URL, but there is no explicit copy-view control, saved view, or export. Existing documentation lists these as deferred.
- **Proposed solution:** Start with “Copy link to this view” and CSV export of the currently displayed aggregate tables. Preserve suppressed values as `Suppressed (<5)` rather than exposing counts.
- **Affected files/pages:** `AnalyticsPage.tsx`, analytics service contract/model, analytics tests.
- **Research justification:** MyChart publicly supports downloading/sending visit summaries; Nabla exposes copy/export patterns. For CoSign, export must remain aggregate and suppression-aware.
- **Difficulty:** M
- **Estimate:** 10–14 hours
- **Acceptance criteria:** Export matches active filters and view; suppressed cells never reveal hidden counts; filename includes view/date scope; copied URL restores the same filters; export is unavailable while data is loading/erroring.
- **Overlap:** Extends existing URL filters and tables; no duplicate analytics engine.

### 12. P2 — Add patient-safe print/download for released reports

- **Current issue:** The patient report detail page is complete, but the planned print dialog is missing.
- **Proposed solution:** Add Print/Save as PDF using a patient-specific print layout and a confirmation explaining what is included. Reuse the released report model only.
- **Affected files/pages:** `PatientReportDetailPage.tsx`, `tokens.css`, patient portal tests.
- **Research justification:** MyChart publicly supports viewing, downloading, and sending visit summaries; Nabla publicly supports editable patient instructions and PDF generation.
- **Difficulty:** S–M
- **Estimate:** 6–10 hours
- **Acceptance criteria:** Printed output contains patient name, encounter, clinician-approved summary, medications/instructions, and release metadata; it excludes transcript, raw audio, internal clarification notes, and unreleased content; print preview works at Letter/A4 widths.
- **Overlap:** Implements a documented deferred Figma item; it does not replace the patient report page.

### 13. P2 — Add revision-to-revision change highlighting

- **Current issue:** CoSign can compare against the original AI draft and list revisions, but Request changes produces identical demo text and there is no general revision diff.
- **Proposed solution:** Add a read-only section diff between the current and selected revision. For the demo regeneration path, apply a clearly labeled deterministic change derived from the request reason or keep the same text but explicitly say “No text changed.”
- **Affected files/pages:** `SoapReportEditorPanel.tsx`, `ClinicalSessionDetailPage.tsx`, demo review service/fixtures, revision tests.
- **Research justification:** Nabla publicly documents highlighted edits after regeneration and Undo. Transparent changes reduce the effort required to verify regenerated content.
- **Difficulty:** M
- **Estimate:** 12–16 hours
- **Acceptance criteria:** Additions/removals are perceivable without color alone; screen readers receive a text summary; original/current revision labels are unambiguous; no prior revision is overwritten.
- **Overlap:** Extends the existing original-draft comparison and revision history.

### 14. P2 — Reconcile implementation documentation with main

- **Current issue:** Test counts, density behavior, and bundle/code-splitting notes are stale across existing docs.
- **Proposed solution:** Update the walkthrough/status documents, add a compact implemented/deferred matrix, and link this research report from the README.
- **Affected files/pages:** `README.md`, `docs/demo-walkthrough.md`, `docs/implementation-status.md`, `docs/frontend-architecture.md`.
- **Research justification:** Prevents future contributors from rebuilding completed work or reporting fixed limitations.
- **Difficulty:** S
- **Estimate:** 3–5 hours
- **Acceptance criteria:** Documents match current routes, 71-test baseline, applied density, route chunks, analytics/patient redesign, and known connected-mode limits.
- **Overlap:** Maintenance of existing documentation; no application change.

## Recommended 2–3 week implementation plan

The recommended single-student core is approximately 54–79 hours, with a 6–8 hour browser-test slice if capacity remains:

### Week 1 — safety and review foundation

- Backlog 1: stabilize navigation/base-path tests.
- Backlog 2: desktop note-and-evidence layout.
- Backlog 3: accessible tab behavior.

### Week 2 — workflow efficiency

- Backlog 4: persistent review actions.
- Backlog 5: visible recording metadata.
- Backlog 9: target-size audit while the shared controls are already being touched.

### Week 3 — responsive quality and regression coverage

- Backlog 8: responsive, keyboard-operable charts.
- Backlog 10: a focused smoke/axe subset, scaled to 6–8 hours if capacity allows.
- Backlog 14: documentation reconciliation.

Backlogs 6, 7, and 11–13 are good stretch items or a follow-on sprint. Export and print are more valuable than additional decorative redesign. Connected-mode API work should be planned with the backend team and is not included in this frontend-only sprint.

## Sources

### Product sources

- [Epic MyChart — Explore features](https://www.mychart.org/l/en-us/explore/)
- [Epic — Patient Experience](https://www.epic.com/software/patient-experience/)
- [Abridge — Generative AI for Clinical Conversations](https://www.abridge.com/product)
- [JAMIA Open — clinician perspectives and Abridge workflow](https://academic.oup.com/jamiaopen/article/8/1/ooaf013/8029407)
- [Nabla — Reviewing and editing generated notes](https://help.nabla.com/en/articles/4857090)
- [Nabla — Choosing a note template](https://help.nabla.com/en/articles/4856834)
- [Nabla — Regenerating a note](https://help.nabla.com/en/articles/5157570)
- [Nabla — Patient instructions](https://help.nabla.com/en/articles/769346)
- [OpenMRS O3 — Introduction and principles](https://o3-docs.openmrs.org/en-US/docs/introduction/)
- [OpenMRS O3 — Key repositories and UI modules](https://o3-docs.openmrs.org/en-US/docs/key-repositories/)
- [OpenMRS Guide — Patient dashboard](https://guide.openmrs.org/collecting-data/the-patient-dashboard-in-depth/)
- [Parkview Health — Public home page](https://www.parkview.com/)
- [Parkview Health — MyChart information](https://www.parkview.com/medical-services/virtual-health/mychart)
- [Parkview Health — MyChart Help Center](https://www.parkview.com/medical-services/virtual-health/mychart/mychart-help-center)

### Accessibility and usability sources

- [W3C WAI — Tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)
- [W3C WAI — WCAG 2.2 target size minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum)
- [W3C WAI — Developing a keyboard interface](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)
- [AHRQ — Electronic Health Record Usability: Evaluation and Use Case Framework](https://digital.ahrq.gov/sites/default/files/docs/citation/09-10-0091-1-EF.pdf)

