# Parkview Health UX benchmark

Parkview Health (https://www.parkview.com/) is CoSign's only healthcare UX benchmark. This note records what was observed on Parkview's public home page on 2026-10-21 and how each observation shaped CoSign. CoSign borrows principles, not branding: no Parkview logos, imagery, copy, or page layouts are copied.

## What Parkview's site does (observed)

| Characteristic | Observation |
|---|---|
| Skip link | The first focusable element is "Skip to Main Content". |
| System notice | A dismissible status strip at the very top explains current service limitations in plain language. |
| Two-tier header | A slim utility row (Contact Us, Careers, Pay a Bill, MyChart Login, Search) above a white primary bar with a short list of main destinations. |
| Short primary navigation | Five main items (Find a Doctor, Locations, Medical Services, Patients & Visitors, Health Resources). |
| One prominent action | A single green "Find Care" button on the right of the header, the only filled button in the bar. |
| Green identity | Forest and kelly greens as the brand colour, white backgrounds, a warm accent used sparingly. |
| Plain-language headings | Short headings with a one-sentence explanation underneath ("From MyChart access to billing…, find the pieces of Parkview you need"). |
| Grouped quick links | Related tasks (MyChart, Pay a Bill, Billing FAQ) grouped into one block rather than scattered. |
| Card grids | Services shown as a grid of equal cards with a clear label and link. |
| Generous whitespace | Low information density; one idea per section. |
| Structured footer | Footer links grouped into labelled columns. |
| Privacy-first consent | Cookie banner offers Manage Choices, Agree, and Reject All with equal prominence. |

## Benchmark criteria used for CoSign

1. A first-time user can tell where they are (page title, breadcrumb, active nav item).
2. The most important action on each page is the most prominent element.
3. Navigation is short and only shows what the user can use.
4. Every section has a plain-language heading and a one-sentence purpose.
5. Status is communicated in words, not colour alone.
6. Content is grouped into cards with consistent spacing.
7. Keyboard users can skip repeated navigation and always see focus.
8. The layout works at phone width without sideways scrolling.

## How each characteristic informs CoSign

| Parkview principle | Applied in CoSign | Where |
|---|---|---|
| Skip link | Added "Skip to main content" | `AppShell.tsx` |
| System notice strip | Kept the mint demo notice with "Reset demo state", stating plainly that data is synthetic | `DemoSimulationBar.tsx` |
| Two-tier header | Utility row now holds the clearly labelled "Demo role:" switcher; the white bar holds role navigation | `TopBar.tsx` |
| Short primary nav | Clinician nav reduced to Dashboard, Clinical sessions, Reports & review, Analytics, Settings. The two analytics links were merged into one with in-page view tabs | `Sidebar.tsx` (`ROLE_NAV_ITEMS`) |
| One prominent action | "New recording" is the single filled green button in the clinician header and shows as active on the recording page | `TopBar.tsx` |
| Role-appropriate links | Footer no longer switches roles behind the scenes; it lists only the current role's pages | `ParkviewFooter.tsx` |
| Plain-language headings | New pages use `PageHeader`: breadcrumb, one `h1`, one-sentence description. Technical labels such as "Sequence 4A Recording Studio", "Negotiated MIME type", and "Honest lifecycle separation" were replaced with everyday wording | `PageHeader.tsx`, `ClinicalVisitCapturePage.tsx` |
| Grouped tasks | Review queue groups reports by what the clinician must do next (Needs your answers, Ready to approve, Approved not shared…) | `ReviewQueuePage.tsx` |
| Card grids | KPI cards and breakdown cards share one card style and spacing | `StatCard`, `BreakdownTable` |
| Green palette, sparing accent | Forest green for primary actions and the main chart series; orange kept for warnings; chart colours validated for colour-blind readers | `tokens.css` |
| Equal-weight consent choices | Destructive or irreversible actions (approve, release, request changes, discard) use confirmation dialogs with an equally visible Cancel | review and capture pages |

## Screens affected

Top bar, mobile drawer, footer, access-restricted page, clinician dashboard (button label), recording page, review workbench (processing panel, Request changes), new pages (review queue, visit summary, history, privacy check, analytics, admin, settings).

## Remaining differences and why

| Difference | Reason |
|---|---|
| CoSign shows more data per screen than Parkview | Clinical work needs dense tables; Parkview's home page is a marketing page. Density is limited by grouping and progressive disclosure (tabs, "Show data table"). |
| No photography or hero imagery | Not appropriate for a clinical tool, and Parkview's photos are copyrighted. |
| Rounded green header band on each page | Keeps CoSign's own identity, established before this work. |
| Typography uses system and Avenir-style fonts | Parkview's licensed web fonts are not used; the stack works offline. |
| Some long-standing pages (dashboard, review workbench) still use their original denser wording | They were already functional and tested; only the most confusing labels were changed to avoid regressions before the demo. |
