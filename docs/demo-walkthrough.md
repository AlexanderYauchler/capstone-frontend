# CoSign demo walkthrough

## Install and run

Requirements: Node.js 22.13+ or 24 (see `.nvmrc`). Node 20 also ran the dev server and tests during verification, but it is outside the supported range in `package.json`.

```bash
cd Capstone
npm install
npm run dev          # opens on http://localhost:5173 (Vite picks the next free port if busy)
```

Checks:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

## Demonstration roles

| Role | Persona | Home page |
|---|---|---|
| Clinician | Dr. Jordan Lee | `/clinician/dashboard` |
| Patient | Alex Morgan | `/patient` |
| Analyst | Sam Rivera | `/analyst/analytics` |
| Administrator | Taylor Brooks | `/admin` |

Switch roles from the login page, the "Demo role:" links in the top green bar, or the mobile menu. All people and data are fictional.

## Before you present

1. Open the app and select **Reset demo state** in the mint notice bar. This restores the seeded data (reference date Oct 6, 2026).
2. Use a desktop browser window at least 1280px wide.
3. If you will record live, use Chrome or Edge on `localhost` and allow the microphone once beforehand. If there is no microphone, use **No microphone? Use simulated demo audio**.

## Recommended order

### Part 1: Login and dashboard
1. Go to `/login` and select **Continue as Clinician**.
2. Point out the navigation (one active item) and the green **New recording** button.
3. On the dashboard, show the KPI cards (8 sessions today, 2 need review, 1 needs clarification, 3 released) and the queue filters.
4. Open **Reports & review** to show reports grouped by what to do next.

Expected: every count matches the queue below it.

### Part 2: Clinical session and recording
1. Select **New recording**.
2. Choose a patient (for example Casey Chen) and a category.
3. Tick the consent box. Point out that Start stays disabled until consent is confirmed.
4. Either **Start recording**, speak for a few seconds, **Pause/Resume**, **Stop**, listen back, then **Save recording to visit**, or select **No microphone? Use simulated demo audio**.
5. Select **Generate draft and review**.

Expected: the review page opens and shows "Preparing the draft report" with steps completing over about 6 seconds. Then a draft appears **for the patient you chose**, with one clarification question. The transcript is labeled as simulated.

### Part 3: AI-assisted clinician review
Use the seeded visit **CS-1042 (Alex Morgan)** so the patient portal step works afterward.

1. From the dashboard, open **Review priority CS-1042**.
2. Show the side-by-side layout: SOAP draft on the left, transcript evidence on the right. Click a source chip to jump to the transcript line.
3. Try **Approve**. It is blocked while questions are open.
4. Answer both clarification questions (or **Use chart-verified note**) and save each. The answers are added to the Plan.
5. Edit a SOAP section and **Save Draft**. A new revision appears in the history.
6. Optional: on CS-1047, show **Request changes**, which needs a written reason.
7. Select **Approve & Finalize**, then confirm.
8. Select **Release Report to Patient Portal**, then confirm.
9. Open **History** to show every revision and action.

### Part 4: Healthcare Analytics
1. Select **Analytics**.
2. *Patient population overview*: show the KPI cards, the "Visits over time" chart, and the breakdowns. Change **Date range** to Year to date, set **Diagnosis** to Diabetes, select **Apply filters**. Every number updates. Remove a filter using its chip.
3. Select **Show data table** on a chart to show the accessible table.
4. Switch to *Monthly operations*. Use **Previous month** / **Next month** or the Year and Month menus. Point out the shaded month on the trend chart and the highlighted row in the table.
5. Explain that operational metrics (sessions, completion, review time) are separate from population statistics, that counts below 5 are hidden, and that all data is synthetic.

### Part 5: Patient portal
1. Switch the demo role to **Patient**.
2. Show the released CS-1042 report now in the list, and open it.
3. Point out what is not shown: drafts, clarification notes, transcripts, and recordings.
4. Optional: visit `/clinician/dashboard` to show the "Access restricted" page.

### Part 6: Architecture
Use `docs/frontend-architecture.md`. The key points are:
- Modular React pages call typed service contracts.
- The demo runs on local services with synthetic data.
- Teammates' backend replaces the connected adapter without page changes.

## Resetting

**Reset demo state** in the mint bar restores the seed at any time. Closing the browser tab also clears it, because state lives in `sessionStorage`.

## Known limitations

- There is no real transcription or AI. Drafts for new visits are simulated templates by diagnosis category, and requesting changes produces a revised draft with the same text.
- Recorded audio stays in the browser tab and is lost on refresh. Nothing is uploaded.
- CS-1042's patient-facing medication line is fixed demo text and does not change with the clinician's answer.
- Population analytics excludes the last days before Oct 6 by default, because those visits are not yet privacy-verified. Tick "Include visits still awaiting review" to include them.
- The settings page saves preferences, but display density is not applied.
- Roles are switched in the browser; there is no real sign-in.
- The production bundle is one large chunk (Vite warns above 500 kB); route-level code splitting was not added.
