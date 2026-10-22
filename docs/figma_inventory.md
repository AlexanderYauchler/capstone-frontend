# CoSign — Verified Figma Inventory (Sequence 1)

**File:** `YHBsEkkJpqiJYimSFCDJXc` · **Canvas:** `11:2` "CoSign - Connected prototype"
**Contents found:** 62 top-level frames (all 1280×900), 9 shared component symbols, 7 section labels.

## How each item was verified

| Marker | Meaning | How it was obtained |
|---|---|---|
| 👁 | **Screenshot checked** | `get_screenshot` was rendered and viewed (16 frames) |
| 📄 | **Structure and text verified** | Every text layer and component instance read with `get_metadata` (all 62 frames) |
| 🔶 | **Navigation inferred** | Worked out from button labels, the `[tag]` in each frame name, and the frame numbering. **Not confirmed from Figma prototype links.** |

> [!WARNING]
> **Prototype links (reactions) could not be read.** `get_metadata` does not return prototype links. `get_design_context` timed out three times (3 min each) on `14:163`, `14:233`, and `11:39`. The design-to-code guidance resource (`skill://figma/figma-design-to-code/SKILL.md`) came back empty. As a result, **every navigation target below is inferred (🔶)**. Text, structure, colors, and fonts are verified. If you can export the prototype flow (or show me a few connections), I'll update the inferred links before Sequence 3.

### Design variables (verified with `get_variable_defs` on `12:60`)

| Token | Value | Token | Value |
|---|---|---|---|
| `cosign-brand` | `#146b70` (teal) | `cosign-canvas` | `#f3f7f7` |
| `cosign-nav` | `#103d43` | `cosign-surface` / `white` | `#ffffff` |
| `cosign-navText` | `#d5e9e8` | `cosign-border` | `#dce6e7` |
| `cosign-brandSoft` | `#e6f3f1` | `cosign-ink` | `#152f35` |
| `cosign-muted` | `#526b73` | `cosign-warning` / `warningSoft` | `#8c530a` / `#fff3dc` |
| `cosign-success` / `successSoft` | `#276749` / `#e8f4ed` | `radius-8` / `radius-12` | 8 / 12 |
| Type: Title | Inter SemiBold 28 | Type: Heading | Inter SemiBold 18 |
| Type: Body | Inter Regular 14 | Type: Label / Button | Inter Medium 13 / SemiBold 13 |
| Type: Caption | Inter Regular 12 | Line height | 1.45 throughout |

The prototype has **no danger/error, info, or focus tokens**, even though a `CoSign/Danger` button symbol exists.

### Shared component symbols (📄)

| Node | Name | React counterpart |
|---|---|---|
| `11:39` | CoSign/Primary | `Button variant="primary"` |
| `11:41` | CoSign/Secondary | `Button variant="secondary"` (outline) |
| `11:43` | CoSign/Danger | `Button variant="danger"` |
| `11:45` | CoSign/Soft | `Button variant="soft"` |
| `11:47` / `11:49` | CoSign/Nav, Nav active | `SidebarNavItem` (uses `aria-current="page"`) |
| `11:51` / `11:53` / `11:55` | Badge warning / success / neutral | `StatusBadge` (expanded into a semantic status map) |

> [!NOTE]
> In the layer tree, buttons **and status chips** are both instances named `Action • …` (for example `Action • Processing` and `Action • Needs review`). In the screenshots they look like 44 px rounded rectangles, the same as buttons. React will separate non-interactive `StatusBadge` from `Button`.

### Shared layout used in every full-page frame (👁 📄)
- **Sidebar** (208 px, `#103d43`): CoSign wordmark, a workspace label (e.g. "CLINICIAN WORKSPACE"), the org name "Northfield Primary Care", role-specific nav items, a "CAPSTONE PROTOTYPE · Fictional data • Simulated actions" note, the user's name, and "Switch account".
- **Top bar** (92 px): breadcrumb "Northfield / {Role} workspace", a "Local workspace" chip, and the fixed date **Oct 6, 2026**.
- **Content area**: page title (28) and subtitle, then cards (radius 12, border `#dce6e7`, padding about 20).
- **Recurring blocks**: `VisitContextBar` (CS-ID · patient · visit type · duration · status chip), `CalloutBanner` (warning/success/info tint, message, optional action), `StatCard`, `StepProgress` (pipeline), `SoapReportView`, `Timeline`, and an action-button row.

**Navigation by role (📄):**
- **Clinician:** Dashboard · Clinical sessions · Analytics · Settings
- **Patient:** Overview · My reports · Report history
- **Analyst:** Analytics · Saved views
- **Administrator:** Workspace · Users & access · Audit log · Settings

---

## Section 01: Entry and workspaces

| # | Frame | Node | Role | Purpose and verified content | Controls → inferred target 🔶 | Verified |
|---|---|---|---|---|---|---|
| 01 | Connected care [login] | `12:2` | All | Demo role picker. Hero banner "Care first. Documentation follows." with steps 01 Consent & capture / 02 Draft & review / 03 Approve & release. Four role cards. Footer: "Demonstration access only. The application will authenticate users and enforce role permissions." | Continue as Clinician → `12:60`; Continue as Patient → `16:727`; Explore administrator view → `17:533`; Explore analyst view → `16:529` | 👁 📄 |
| 02 | Good morning, Dr. Lee [dashboard] | `12:60` | Clinician | Quick actions; 4 stat cards (Today's sessions **8**, Needs review **2**, Clarification needed **1** "2 questions", Released today **3**); warning callout "CS-1042 needs your attention"; sessions table (CS-1048 Processing, CS-1047 Needs review, CS-1042 Clarification needed, CS-1045 Processing interrupted, CS-1043 Released) | Record clinical visit → `12:338`; Upload recording → `13:491`; View all sessions → `12:181`; Continue review → `14:163`; table row actions → `19:811` / `19:766` / `14:163` / `19:856` / `19:901`; search, status, and date filters → `12:277` | 👁 📄 |
| 03 | Clinical sessions [sessions] | `12:181` | Clinician | Full sessions list (same 5 rows) with New clinical visit and Upload recording | New clinical visit → `12:338`; Upload → `13:491`; filters → `12:277` | 📄 |
| 04 | Filtered clinical sessions [filtered] | `12:277` | Clinician | Active-filter callout "CS-1042 • Needs clarification", removable filter chips, "1 result", Clear filters | Clear filters → `12:181`; Review visit → `14:163` | 📄 |
| 59 | Hypertension follow-up [session1047] | `19:766` | Clinician | Placeholder detail page for a secondary session: "Needs review" | Return to sessions → `12:181`; Explore CS-1042 workflow → `14:163` | 📄 |
| 60 | Acute visit [session1048] | `19:811` | Clinician | Placeholder: "Processing" (transcription in progress) | same | 📄 |
| 61 | Primary care visit [session1045] | `19:856` | Clinician | Placeholder: "Needs retry" (07:10 recording preserved) | same | 📄 |
| 62 | Wellness consultation [session1043] | `19:901` | Clinician | Placeholder: "Released" | same | 📄 |

**States shown:** filtered and empty-filter (filtered only, no zero-result frame), plus status chips for 5 stages.
**Reuse:** the `SessionTable` and filter bar appear on both the dashboard and the sessions page. Frames 59–62 should become **one** status-aware `SessionDetailPage`.
**Gaps and ambiguities:**
- The dashboard says "Today's sessions 8" but the table shows 5 rows. "Released today 3" appears with only 1 released row.
- The session table has no patient-name column. CS-1043 "Wellness consultation" conflicts with Alex Morgan's wellness report dated **Aug 2** unless CS-1043 belongs to another patient.
- No zero-results state, pagination, or sorting is shown.
- The search box is drawn as a button.

## Section 02: Consent, recording, and recovery

| # | Frame | Node | Purpose and verified content | Controls → inferred target 🔶 | Verified |
|---|---|---|---|---|---|
| 05 | Start a clinical visit [newvisit] | `12:338` | Visit details card: Patient "Alex Morgan · Demo patient", Visit type, Microphone, Report template. Warning "☐ Patient consent has not yet been confirmed". "Recording is unavailable until consent is confirmed." | Confirm patient consent → `12:401`; Microphone field → `12:530`; Template field → `12:544`; Cancel → `12:60`; Upload existing audio → `13:491` | 👁 📄 |
| 06 | Ready to record [consent] | `12:401` | "Consent confirmed. Your microphone is ready." Input detected; "Your recording and processing stay within the clinic's local work[space]"; "This confirmation applies to the current demo visit." | Start recording → `13:91`; Back to visit details → `12:338` | 📄 |
| 07 | microphone (dialog) | `12:530` | Radio options: MacBook microphone (selected) / External USB microphone; "Input detected. Check placement and background noise…" | Use selected device / Cancel → back | 📄 |
| 08 | template (dialog) | `12:544` | Only **SOAP · Standard clinical note** offered | Use SOAP template / Cancel | 📄 |
| 09 | Record clinical visit [recording] | `13:91` | Recording indicator, timer **04:27**, waveform, "MacBook microphone • Input active • Audio quality: good", info "This prototype simulates recording controls and elapsed time." | Pause → `13:222`; Finish → `13:353`; Discard → `13:481` | 👁 📄 |
| 10 | Record clinical visit [paused] | `13:222` | "Recording paused", timer held at 04:27 | Resume → `13:91`; Finish → `13:353`; Discard → `13:481` | 📄 |
| 11 | Recording ready [preview] | `13:353` | CS-1042 08:42; "Audio validation: Format supported · Duration valid · Input captured"; "Recording preserved through processing… retry the same audio without re-recording" | Send for processing → `13:588`; Return to recording → `13:222` | 📄 |
| 12 | discard (dialog) | `13:481` | "Discard this recording? The current demo recording will be removed from the active visit." | Keep recording → back; Discard → `12:338` | 📄 |
| 13 | Upload a clinical recording [upload] | `13:491` | Demo file `diabetes-followup.wav · 08:42 · 14.2 MB`, "WAV format supported · Audio detected", consent confirmed | Upload & process → `13:588`; **Preview failed upload** → `13:545`; Cancel | 📄 |
| 14 | Upload interrupted [uploadfailure] | `13:545` | "Your selected file is retained." "No draft was created." "Last attempt interrupted at 62%" | Retry upload → `13:588`; Choose another file → `13:491` | 📄 |
| 15 | Preparing your clinical draft [processing] | `13:588` | `StepProgress`: Audio validation ✔, Speech transcription (in progress), Speaker attribution, Structured report, Clinician review (waiting). "You can leave this screen." | Continue demo to review → `14:163`; Back to sessions; **Preview recovery state** → `13:668` | 👁 📄 |
| 16 | Processing needs a retry [failure] | `13:668` | "Transcription interrupted • Retry limit reached. Automatic retries stopped. Resume from the failed stage…" "recording retained · No report finalized" | Retry failed stage → `13:588`; Review recording → `13:353`; Back to sessions | 📄 |

**Roles:** Clinician only.
**States shown:**
- Consent: not confirmed → confirmed
- Recording: recording / paused / preview / discard-confirm
- Upload: idle / failure (with %)
- Processing: per-stage waiting / running / done, and failure after automatic retries ran out

**Reuse:**
- `StepProgress` is shared by processing (`13:588`), regeneration (`14:837`), and privacy (`15:418`).
- `VisitContextBar` is reused.
- Dialogs use one `Dialog` primitive.

**Gaps:**
- No microphone-permission-denied state and no "no input device" state.
- No maximum recording length.
- No consent "declined" or "withdrawn" path.
- No patient or visit-type picker (both are fixed fields).
- Upload has no real file chooser and no wrong-format error.
- No cancellation during processing.
- "Preview …" buttons are demo-only shortcuts and should move into a Demo Controls panel.

## Section 03: Clinician review and evidence

| # | Frame | Node | Purpose and verified content | Controls → inferred target 🔶 | Verified |
|---|---|---|---|---|---|
| 17 | Review clinical visit [review] | `14:163` | Two panels: **Visit transcript** (speaker labels, clickable timestamps 00:28 / 01:25 / **03:18 highlighted amber** / 04:06) and **Structured SOAP report** ("AI draft v1 • Clinician approval required"). Warning: "The draft is blocked from approval until medication strength and allergy status are confirmed." Chip "2 clarifications". **No Approve button is present.** | Resolve questions → `14:785`; timestamps → `19:516` / `19:641` / `14:523` / `14:433`; Save draft → `14:343`; Edit report → `14:805`; Reject & regenerate → `14:823`; Collected data → `14:915` | 👁 📄 |
| 18 | clarify (dialog) | `14:785` | "Resolve clinical questions". Q1 metformin strength → "1,000 mg twice daily — confirmed from medication history". Q2 allergies → "No known drug allergies — confirmed with patient". "Demo answers are prefilled… the clinician remains responsible for review." | Apply responses → `14:253`; Return to review → `14:163` | 👁 📄 |
| 19 | Review clinical visit [reviewready] | `14:253` | "Ready for approval"; "All clarification questions resolved"; report shows "Clinician corrections applied • Draft v2"; Plan updated | **Approve report** → `14:978`; Save / Edit / Reject / Collected data | 📄 |
| 20 | edit (dialog) | `14:805` | "Edit clinical report. Clinician changes are recorded in the report history." Fields: **Plan / follow-up** and **Additional visit notes** only. "Demo edit: saves the corrected plan to draft v2." | Save corrections → `19:460`; Cancel | 📄 |
| 21 | Review clinical visit [saved] | `14:343` | "Draft saved • You can safely return later. Changes remain a draft and are excluded from patient reports and [analytics]." Still v1 with 2 clarifications. | same as 17 | 📄 |
| 22 | Draft saved [savedready] | `19:460` | "Saved · Ready for review"; "Corrections preserved. Saving does not finalize or release the report." Draft v2. | Continue review → `14:253`; Back to sessions | 📄 |
| 23 | reject (dialog) | `14:823` | "Request a new draft. Feedback returns to the report drafting agent. Nothing is finalized." Reason text (prefilled). "The recording and transcript are preserved." | Reject & regenerate → `14:837`; Keep current draft → back | 📄 |
| 24 | Regenerating the clinical draft [regenerating] | `14:837` | `StepProgress`: first 3 stages complete, Structured report in progress. "Your feedback is attached to this revision. The new draft still requires clinician review and approval." | Open revised demo draft → `14:253` (?); Back to sessions | 📄 |
| 25 | Collected data summary [summary] | `14:915` | Left: SOAP draft v1. Right: **Processing & provenance**: each finding with a source timestamp (Symptoms · 00:28, Medication · 03:18 "Strength unresolved", Allergies · 04:06, Orders). "Analytics: Blocked until approval and independent verification." Chip "Draft · Not finalized". | Return to clinician review → `14:163` | 👁 📄 |
| 26 | Inspect report evidence [source] | `14:523` | Audio at 03:18, "Illustrative playback selection", "Medication strength was not stated" plus patient quote | Play selected segment → `14:654`; Back to review; Resolve ambiguity → `14:785` | 📄 |
| 27 | Inspect report evidence [sourceplaying] | `14:654` | "▶ Selected audio segment. Playback state is illustrative." | Pause playback → `14:523`; Back; Resolve ambiguity | 📄 |
| 28 | Inspect report evidence [sourcesymptoms] | `19:516` | 00:28 patient quote; "Values are patient-reported" | Back to previous review | 📄 |
| 29 | Inspect report evidence [sourceglucose] | `19:641` | 01:25 patient quote, glucose 180–220 | Back to previous review | 📄 |
| 30 | Inspect report evidence [sourceallergy] | `14:433` | 04:06 clinician quote; "Allergy status is not established by this statement" | Back to previous review | 📄 |

**Roles:** Clinician only.
**Verified rules shown in the prototype:**
- Approval is **blocked while clarifications are open** (no Approve on `14:163`, Approve present on `14:253`).
- Saving ≠ finalizing (`14:343`, `19:460`).
- Rejecting means **regenerating**, not a terminal state.
- Evidence links each finding → transcript segment → audio offset.
- Revisions are numbered (v1 → v2).

**Reuse:**
- One `ReviewPage` with a state-driven banner and action bar covers 17, 19, 21, and 22.
- One `EvidencePanel` (side sheet) covers 26–30.
- `SoapReportView` appears in 17, 19, 21, 22, 25, 32, 34, and 42.

**Gaps:**
- The edit dialog edits only Plan and notes, not all SOAP sections.
- No unsaved-changes warning.
- No conflict state (two tabs or devices editing at once).
- No regeneration-failure frame.
- No way to edit or undo a clarification answer.
- Clarification answers are prefilled. A real form needs validation and free text.
- The action row sits below the 900 px fold. A sticky action bar is recommended.

## Section 04: Approval, release, and privacy

| # | Frame | Node | Purpose and verified content | Controls → inferred target 🔶 | Verified |
|---|---|---|---|---|---|
| 31 | confirm (dialog) | `14:978` | "Approve this report? You are signing the clinical report as Dr. Jordan Lee. **Approval finalizes the clinical report. Patient release is a sepa[rate step]**" | Approve & finalize → `15:277`; Continue reviewing | 📄 |
| 32 | Clinical report finalized [finalized] | `15:277` | Chip "Approved · Not released"; "Signed by Dr. Jordan Lee • Oct 6, 2026 at 10:08 AM". Next steps: Patient portal "Not yet released · Awaiting clinician action". Analytics pipeline "de-identified and independently verified before entering aggregate analytics". | Release to patient → `15:407`; View privacy processing → `15:418`; View report history → `23:796` | 👁 📄 |
| 33 | release (dialog) | `15:407` | "Alex Morgan · CS-1042 · Clinician-approved report v2". "Confirm that the report belongs to the selected patient and is re[ady]…" | Confirm release → `15:342`; Cancel | 📄 |
| 34 | Report released to patient [released] | `15:342` | "Only this finalized report is shared. The patient cannot view aud[io/transcripts]…"; "Released · Final report v2" | Preview patient report → `16:830`; privacy → `15:418`; history → `15:588` | 📄 |
| 35 | Preparing de-identified analytics [deid] | `15:418` | `StepProgress`: Clinician approval ✔ → De-identification (running) → Independent verification → Analytics publication. "The prototype does not expose an identified-to-de-identified record link." | View completed demo state → `15:531`; **Preview verification retry** → `15:487`; Back to report | 👁 📄 |
| 36 | Verification requires another pass [verifyretry] | `15:487` | "Publication held • No analytics record stored"; "De-identification → independent verification → correction → re-ve[rification]"; "Patient identity is not displayed in this pipeline view." | Retry privacy processing; Return to finalized report | 📄 |
| 37 | Privacy processing complete [verified] | `15:531` | Identifier removal Complete ("Safe Harbor categories checked"), Independent checks "2 passes — Different verification methods", Analytics state "Eligible — Separate data store"; "Two outputs, separate access" | Open healthcare analytics → `16:337`; Return to clinical report | 👁 📄 |
| 38 | Clinical report history [clinicalhistoryunreleased] | `23:796` | Timeline: 09:26 Draft v1 generated → 10:02 Clarification added → 10:05 Draft v2 saved → 10:08 Report approved → **Pending** patient release | Back to report; Review source draft | 📄 |
| 39 | Clinical report history [clinicalhistory] | `15:588` | Same timeline plus 10:10 Report released | same | 📄 |

**Roles:** Clinician only.
**Verified distinctions:**
- **Approved = finalized** (a single atomic action in Figma).
- **Finalized ≠ released**: release is a separate dialog and confirmation.
- **De-identified ≠ verified ≠ published**: verification and publication are separate stages.

**Reuse:** `Timeline` is shared with the patient history (43) and audit (55) screens.

**Gaps:**
- No amendment or addendum after finalization.
- No way to revoke a release.
- No release-failure state.
- It is unclear whether privacy processing starts automatically on finalization. Inferred: yes.
- "Safe Harbor categories checked" is a claim the demo can only simulate, so it must be labeled as simulated.

## Section 05: Patient report portal

| # | Frame | Node | Purpose and verified content | Controls → inferred target 🔶 | Verified |
|---|---|---|---|---|---|
| 40 | Welcome, Alex [patient] | `16:727` | Hero "Your latest visit report is ready." (Diabetes follow-up · Oct 6, 2026 · Dr. Jordan Lee); cards Your reports / Follow-up & next steps; info "Your clinical team controls report release" | Read your visit report → `16:830`; View all reports → `16:776`; Review next steps → `16:830` | 👁 📄 |
| 41 | My medical reports [reports] | `16:776` | List: Oct 6 Diabetes follow-up, Sep 18 Routine follow-up, Aug 2 Wellness consultation; "Recordings, transcripts, and unapproved drafts are restricted…" | Read report → `16:830` / `16:945` / `19:946` | 📄 |
| 42 | Your visit report [detail] | `16:830` | "Final report v2 · Released October 6, 2026 at 10:10 AM"; SOAP summary; **Your next steps** (Medication, Tests ordered, Follow-up, Questions) | View report history → `16:890`; Preview printable report → `16:987` | 👁 📄 |
| 43 | Report history [history] | `16:890` | Care timeline (released reports only) | Open report → 42/44/45; Back to overview; All medical reports | 📄 |
| 44 | Previous visit report [pastreport] | `16:945` | Sep 18 routine follow-up, narrative summary (not SOAP) | Latest visit report → `16:830`; Back to history | 📄 |
| 45 | Previous visit report [wellnessreport] | `19:946` | Aug 2 wellness consultation | same | 📄 |
| 46 | print (dialog) | `16:987` | "Printable report preview… no file is download[ed]" | Return to report; My reports | 📄 |

**Role:** Patient. **Verified rule:** patients see only **released, finalized** reports.
**Reuse:** `SoapReportView` in a patient variant, `Timeline`, and a report list.

**Gaps:**
- The SOAP section headings ("Subjective/Objective") are clinical jargon. The patient view may need plain-language labels.
- Past reports use a narrative format, not SOAP, which means the template type varies by report.
- No patient settings or profile.
- No unread or new indicator.
- "Questions?" has no contact action.

## Section 06: Aggregate analytics

| # | Frame | Node | Role | Purpose and verified content | Controls → inferred target 🔶 | Verified |
|---|---|---|---|---|---|---|
| 47 | Healthcare analytics [analytics] | `16:337` | Clinician | Info "Aggregate demo data • Approved and verified visits only. Patient-level records are unavailable. Counts under 5 are suppressed." Filters: **September 1–30, 2026**, Diagnosis ↓. Stats: Verified visits **240**; Follow-up documented **80% (192/240)**; Most common symptom **Fatigue 84 · 35%**; Small-group threshold **5**. Weekly bars 52/58/61/69. Symptoms Fatigue 84, Cough 60, Headache 48, Increased thirst 36, Other 12; "Rare combinations: Suppressed (<5)" | Date range; Diagnosis → `16:436`; Export aggregate → `16:713` | 👁 📄 |
| 48 | Healthcare analytics [analyticsfiltered] | `16:436` | Clinician | "September · Diabetes": 72 visits, 83% (60/72), weekly 15/18/17/22, symptoms Fatigue 32 / Increased thirst 24 / Other 16 | Reset filters → `16:337`; Export | 📄 |
| 49 | Healthcare analytics [analyst] | `16:529` | Analyst | Same as 47 inside the Analyst workspace (nav: Analytics, Saved views) | same | 📄 |
| 50 | Healthcare analytics [analystfiltered] | `16:624` | Analyst | Same as 48 | same | 📄 |
| 51 | export (dialog) | `16:713` | "Only the current de-identified aggregate view is included." `cosign-september-aggregate.csv` | Return to analytics; **Switch to analyst** | 📄 |

**Arithmetic check:** I verified the Figma numbers are internally consistent: 52+58+61+69 = 240; 84+60+48+36+12 = 240; 192/240 = 80%; 84/240 = 35%; 15+18+17+22 = 72; 32+24+16 = 72; 60/72 = 83.3%.

**Gaps:**
- No department filter, documentation-status filter, monthly view, or documentation-operations metrics (all requested).
- No "Saved views" screen exists even though it is in the analyst nav.
- Charts have no axis labels and no accessible table alternative.
- The export dialog's "Switch to analyst" purpose is unclear.
- Suppression of complementary cells (stopping someone working out a suppressed value from the totals) is not addressed.

## Section 07: Administration and preferences

| # | Frame | Node | Role | Purpose and verified content | Controls → inferred target 🔶 | Verified |
|---|---|---|---|---|---|---|
| 52 | Administration workspace [admin] | `17:533` | Admin | Stats: Active demo users 12; Local services Available ("Illustrative"); Audit access Read-only ("append-only"). Cards Users & access, Audit log. "Administrator access does not imply access to every clinical report." | Manage users → `17:592`; View audit activity → `17:659` | 👁 📄 |
| 53 | Users & access [users] | `17:592` | Admin | 4 demo users with role chips and scope text. "Role changes are illustrative and do not alter real accounts." | Preview role permissions → `17:648` | 📄 |
| 54 | permissions (dialog) | `17:648` | Admin | **Clinician:** record, review, edit, approve, and release assigned visits. **Patient:** view own finalized, released reports. **Analyst:** read verified, de-identified aggregate data. **Administrator:** manage accounts and inspect audit activity. "The production application must verify identity and permissions on every protected request." | Return to users; Switch demo role → `12:2` | 👁 📄 |
| 55 | Audit activity [audit] | `17:659` | Admin | Append-only timeline: 09:15 consent+recording → 09:26 Drafting agent created draft and flagged missing details → 10:02 answered clarifications → 10:05 saved corrected draft → 10:08 approved → 10:10 released | Manage user access → `17:592`; Administration overview → `17:533` | 📄 |
| 56 | Workspace settings [settings] | `17:413` | Clinician | Recording & review defaults (microphone, template, interface preference "Comfortable spacing · High-contrast labels"); Session & privacy text | Save preferences → `17:523` | 📄 |
| 57 | Workspace settings [adminsettings] | `17:468` | Admin | Same content in the Admin workspace | Save preferences → `17:523` | 📄 |
| 58 | preferencessaved (dialog) | `17:523` | Clinician/Admin | "Your illustrative demo preferences have been applied." | Back to settings; Back to dashboard | 📄 |

**Gaps:**
- Users have no create, deactivate, or edit actions.
- The audit log has no filtering or paging.
- Settings for analysts and patients are missing.
- A full dialog for "Preferences saved" is heavier than needed. A toast is recommended.

---

## Timeline consistency (verified across frames)

The demo story is internally consistent, and the React fixtures should reproduce it exactly:

| Time (Oct 6, 2026) | Event | Seen in |
|---|---|---|
| 09:15 | Consent confirmed, recording started | `17:659` |
| ~09:24 | Recording finished (08:42 duration) | derived |
| 09:26 | Draft v1 generated, 2 clarifications flagged | `15:588`, `17:659` |
| 10:02 | Clarifications answered | `15:588`, `17:659` |
| 10:05 | Draft v2 saved | `15:588`, `17:659` |
| 10:08 | Approved & finalized | `15:277`, `15:588` |
| 10:10 | Released to patient | `16:830`, `15:588` |

## Summary: 62 frames → 26 routes plus stateful components

See §2 of the [architecture plan](file:///Users/sanjana/.gemini/antigravity/brain/ad650021-1d91-4c58-ad1a-68789bed5b15/cosign_architecture_plan.md) for the full screen-to-route mapping.
