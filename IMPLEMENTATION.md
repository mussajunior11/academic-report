# Phase 1 — Implementation Report

*Academic Report — “Inspiring every step of learning.”*

This document summarises what was delivered in Phase 1, where the code lives, the
data model, how to run and verify the project, and what remains for later phases.

---

## 1. Deliverables

| Area | Status | Notes |
| ---- | ------ | ----- |
| Project scaffold | Done | Next.js 16 App Router, TypeScript, Tailwind v4, ESLint |
| Database & ORM | Done | SQLite + Prisma 7 (driver adapter), 14 migrations |
| Authentication | Done | Cookie sessions, seeded admin, proxy route protection |
| Seed data | Done | Idempotent configuration seed + admin + optional dev students |
| Dashboard | Done | Real DB counts, term & quarter progress, quick actions, empty states |
| App theme | Done | Royal blue (`#014BAA`) primary + light cream (`#F8F3F0`) canvas applied through the shared UI kit (buttons, cards, badges, alerts, forms, progress, toasts) and the dashboard hero/KPI cards, so every dashboard and module page shares the modern look; sidebar background stays admin-configurable |
| Students | Done | CRUD, filters/sort/pagination, soft status, subject registration (compulsory-by-class/stream pre-registered, optional-only floating tile window), multi-select support needs (movable popover), icon row actions, Excel bulk import with review step |
| Classes & Streams | Done | Class levels, streams and class × stream combinations |
| Subjects | Done | CRUD, search, short + numeric codes, activate/deactivate, safe delete, compulsory assignment per class or per class × stream (auto-applied to students), icon row actions |
| Examinations | Done | Setup per class/term/year, open/close lifecycle; examination types managed under **Settings → Examination types** (`/settings/examinations`) |
| Grading | Done | Grade scale (A–F) with a **points** value and pass/status **remark** per grade, division scale (I, II, III, IV, 0) as **points ranges**, the number of **division subjects** (best subjects counted, default 7) and the minimum average score for PASS; school-scoped, editable boundaries with seeded defaults |
| Terms & Quarters | Done | Two terms + four quarters per academic year (First/Second Term; 1st–4th Quarter) with editable start/end dates, auto day counts (passed/remaining) and dashboard progress |
| Settings | Done | Collapsible **School information** section, validated **school logo** + **system logo** uploads, and a **Sidebar appearance** card (colour swatch panel + transparency slider with live preview and auto-contrast nav text); examination-type management lives on its own sub-page `/settings/examinations` |
| Validation | Done | Zod schemas shared by client forms and server actions |
| Excel import | Done | Student template download route + ExcelJS parser + preview/review step + bulk student create |
| Marks template | Done | Per-examination marks sheet (chosen subjects × streams, logo header, prefilled marks; a single selected subject lists only the students registered for it) via download route + upload that creates/updates/clears marks with per-row issue reporting |
| Clear scores | Done | Per-examination "Clear scores" panel: pick any subjects × streams and delete the stored marks for those students only (other subjects/streams kept) |
| Reports | Done | `/reports` lists examinations; `/reports/[examinationId]` shows the whole-class results table (marks, grade, total, average, points, division, position); `/reports/[examinationId]/[studentId]` renders the printable A4 report form (school header, subject table, TOTAL/AVERAGE/GRADE/POSITION/DIVISION/POINTS summary, grading + division scales, term closes/reopens + holiday length, auto-filled editable Academic/Head Master remarks) with a Print button |
| Sidebar theme | Done | School-scoped sidebar background colour (hex) + opacity percentage, applied via inline rgba/backdrop-blur with automatic light/dark nav text |
| Login page | Done | Open-book sign-in: brand header + slogan, decorative left page (logo, illustration, wave), right page with heading, username + password fields (show/hide toggle), `Login` button and help section; two pages collapse to one on mobile; reuses the existing `loginAction` |
| Tests | Done | 173 tests (unit + integration against a real DB) |
| Docs | Done | `README.md` + this report |

---

## 2. Architecture

Request flow:

```
page.tsx (Server Component)
   └─ services/*            read models + business rules (Prisma)
   └─ actions.ts            Server Actions, wrapped in runAction()
        └─ client components React Hook Form + zodResolver
```

Key cross-cutting pieces:

- `src/lib/actions/run-action.ts` — wraps every mutation, converting thrown errors
  into `AppError` messages and revalidating affected paths. Server actions always
  return `{ ok, message, fieldErrors }`, never raw errors.
- `src/lib/errors.ts` — `AppError` + `toFriendlyError` mapping Prisma error codes
  (`P2002`, `P2003`, `P2025`, …) to user-safe messages.
- `src/lib/validation/schemas.ts` — single source of truth for input shapes and
  constraints; reused by client resolvers and re-validated on the server.
- `src/lib/services/*` — the only place that talks to Prisma; enforces rules such as
  active class × stream assignment and atomic subject registration (`students`, `subjects`,
  `examinations`, `examination-types`, `marks`, `grading`, `terms`, `school`, `reports`).
- `src/lib/auth/*` — `password.ts` (scrypt hashing), `session.ts` (HMAC-SHA256 signed
  tokens using the Web Crypto API, shared by the proxy guard and the server runtime),
  `service.ts` (`authenticateUser`) and `server.ts` (cookie read/write helpers).
- `src/proxy.ts` — Next.js 16's renamed (formerly `middleware`) request guard; it
  verifies the session cookie and redirects unauthenticated requests to `/login`.
  The protected layout re-checks the session server-side as defence in depth.

### Notable implementation decisions

- **Prisma 7 driver adapter.** `@prisma/adapter-better-sqlite3` with the
  `prisma-client` generator (output `src/generated/prisma`); the datasource URL is
  configured in `prisma.config.ts` via `DATABASE_URL`.
- **No Prisma enums (SQLite).** Constrained fields are `String` columns validated by
  Zod (`GENDERS`, `RECORD_STATUSES`, `EXAMINATION_STATUSES`, `TERMS`).
- **Classes page data.** Pages that read the database declare
  `export const dynamic = "force-dynamic"` so the admin UI always reflects current
  data (verified against the build route table).
- **Serializable props.** Zod schemas are never passed from server to client
  components; client wrappers (`classes-forms.tsx`, `student-form.tsx`, …) import the
  schema themselves.
- **Marks entry.** One `Mark` row per student × subject × examination. A missing row is
  "not entered" and an explicit `0` is a real score, so clearing a cell **deletes** the
  row rather than storing null; scores are normalised to one decimal place. The service
  enforces the examination is open, the student is in the examination's class and the
  subject is registered for that academic year, and detects concurrent edits by
  comparing a client-supplied `expectedScore` to the current value inside a transaction.
  The grid keeps filters, subject-column selection and the progress count client-side;
  each cell auto-saves on blur/Enter and the action performs no path revalidation so the
  grid's local state is not reset while typing.
- **Marks template.** `src/lib/excel/marks-workbook.ts` builds a per-examination workbook
  (`buildMarksTemplate`) with the school logo (PNG/JPEG/GIF read from `public/` — skipped
  for other types) and examination details in a title block, a frozen header row of
  `S/N · Student's Name · Gender · Class · Stream` plus one column per selected subject,
  decimal 0–100 data validation and existing marks prefilled; a second sheet documents the
  rules. Students are passed their registered `subjectIds`, so a subject the student does
  not take is greyed out and **locked** (the sheet is protected, editable cells are
  unlocked, and no validation rule is added) while the server still rejects such scores on
  import. `parseMarksWorkbook` locates the header row (so the title block is ignored),
  maps columns to fields/subjects and reads each row's scores. `importMarks` resolves
  subject headers by name or short code, matches rows to active students by full name and
  stream, rejects scores for unregistered subjects (reported per row), treats a blank cell
  as "clear" and applies creates/updates/deletes in one transaction, returning a summary
  plus per-row issues. The `GET /api/marks-entry/template` route filters subjects/streams
   by query params; when exactly one subject is selected it also narrows the student list to
   those registered for it (so the sheet has no locked columns) and returns 400 when none of
   the (stream-filtered) students take it. The upload runs through the `importMarksAction`
   server action.
- **Unified actions button.** A single round floating button (`MarksActions`, bottom-right
  of the marks grid) opens a draggable `FloatingWindow` listing **Download template**,
  **Upload marks** and **Clear scores**. Download and Clear swap the window to a
  subject/stream multi-select. **Upload marks** opens the hidden `.xlsx` picker; the
  `previewMarksAction` server action then parses the file and the review view renders its
  rows (name, class, stream and each subject's score — blank cells and invalid scores are
  flagged) so the user can inspect them. An **Upload marks** button sits below the table to
  commit the import, after which the table is replaced by the summary and skipped-row
  issues (clicking Upload marks again with no file re-opens the picker). Uploading and
  clearing call `router.refresh()`, and the grid syncs its local `scores` state (and the
  input values) whenever the reloaded `marks` prop changes, so uploads/clears appear in the
  grid immediately without a manual page reload.
- **Clear scores.** The **Clear scores** action opens a window with a
  subject and stream multi-select. `clearMarksAction` → `clearMarks()` deletes the stored
  marks for the chosen subjects and the active students in the chosen streams (matched on
  the examination's class), leaving other subjects and streams untouched, and refuses a
  closed examination or an empty subject selection.
- **Report forms.** `src/lib/services/reports.ts` turns an examination's marks into
  report data: each student's registered subjects are graded from their marks (a missing
  mark is "not graded", never a zero/fail), the average and total use **all** graded
  subjects, the overall grade is the band containing the average, and the **division**
  sums the best *N* subjects by points (`N` = `SchoolSettings.divisionSubjects`) — fewer
  than *N* graded subjects shows **INC**. Positions rank every active student in the
  examination's class level (across all streams) by total marks using competition ranking
  (ties share a rank, the next rank is skipped). The Academic Master's and Head Master's
  remarks are auto-filled from the remarks configured for the student's **average grade**
  (Settings → Report remarks) and can be overridden per student in `ReportRemark` (upsert on
  `[examinationId, studentId]`); the built-in suggestion is used when neither is set. The
  term closes/reopens dates and holiday length are
  derived from the examination's `term` mapped onto the year's term/quarter schedule, and
  dates print as `Weekday/DD/Month/YYYY`. The printable sheet reuses the shared UI kit and
  an `@media print` block in `globals.css` (`@page` A4, hides `.no-print` chrome).

---

## 3. Data model

Defined in `prisma/schema.prisma`; applied by migrations
`20261010085235_init`, `20261010094704_add_user`, `20261010104255_add_subject_class`,
`20261010114413_add_subject_numeric_code`, `20261010125857_add_student_special_needs`,
`20261010150000_add_special_need_categories`, `20261010160000_add_grading`,
`20261010170000_add_terms_quarters`, `20261011090000_add_marks`,
`20261011120000_add_subject_class_stream`, `20261011130000_add_registration_source`,
`20261011140000_add_system_logo`, `20261011150000_add_sidebar_theme`,
`20261016000000_report_form`, `20261017000000_grade_remarks` and
`20261018000000_head_master_signature` (16 migrations).

| Model | Purpose | Key constraints |
| ----- | ------- | --------------- |
| `User` | Application users / authentication | unique `email` |
| `School` | Tenancy root (single school in Phase 1) | unique `code` |
| `SchoolSettings` | One settings row per school (`passMark`, `divisionSubjects`, school `logoUrl`, sidebar `systemLogoUrl`, `headMasterSignatureUrl`, `sidebarColor` + `sidebarOpacity`) | unique `schoolId` |
| `AcademicYear` | Academic periods | unique `[schoolId, name]` |
| `ClassLevel` | e.g. FORM 1–4 | unique `[schoolId, name]` |
| `Stream` | e.g. A–E | unique `[schoolId, name]` |
| `ClassStream` | Valid class × stream combination | unique `[classLevelId, streamId]` |
| `Student` | Student records (soft status) | unique `[schoolId, studentNumber]`, `[schoolId, admissionNumber]` |
| `SpecialNeedCategory` | Fixed support-need taxonomy (seeded by migration) | unique `id` (stable key) |
| `StudentSpecialNeed` | Student ↔ support-need category (multi-select, optional note) | unique `[studentId, categoryId]` |
| `Subject` | Subjects (short `code` + numeric `numericCode`) | unique `[schoolId, name]`, `[schoolId, code]` |
| `SubjectClass` | Class (optionally narrowed to a stream) for which a subject is compulsory | unique `[subjectId, classLevelId, streamId]` |
| `StudentSubjectRegistration` | Student ↔ subject per academic year, with `source` (COMPULSORY auto / MANUAL) | unique `[studentId, subjectId, academicYearId]` |
| `ExaminationType` | e.g. TERMINAL, PRE-MOCK | unique `[schoolId, name]` |
| `Examination` | Exam setup | unique `[academicYearId, typeId, classLevelId, term]` |
| `Mark` | One score per student × subject × examination (0–100) | unique `[examinationId, studentId, subjectId]` |
| `Grade` | Grade band on the subject-mark scale (code + min/max score + `points` + pass/status `remark` + per-grade `academicMasterRemark` / `headMasterRemark`) | unique `[schoolId, code]` |
| `Division` | Division band on the summed-points scale (code + min/max points) | unique `[schoolId, code]` |
| `ReportRemark` | Per-student per-examination academic + head master remarks | unique `[examinationId, studentId]` |
| `Term` | Two terms per academic year (name + optional start/end dates) | unique `[academicYearId, sequence]` |
| `Quarter` | Four quarters per academic year, grouped under a term | unique `[termId, sequence]` |

---

## 4. Files

### Configuration
- `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`
- `prisma.config.ts`, `.env.example`, `vitest.config.mts`
- `.gitignore` (ignores local DB, uploads, test artifacts)

### Data layer
- `prisma/schema.prisma`, `prisma/migrations/*`, `prisma/seed.ts`
- `src/lib/db/prisma.ts`, `src/lib/constants.ts`, `src/lib/errors.ts`
- `src/lib/validation/schemas.ts`, `src/lib/validation/helpers.ts`
- `src/lib/utils/student-number.ts`, `src/lib/utils/cn.ts`, `src/lib/utils/term-days.ts`, `src/lib/utils/color.ts`
- `src/lib/services/{school,academic,students,examinations,marks,grading,terms,reports,dashboard}.ts`
- `src/lib/actions/run-action.ts`

### Authentication
- `src/lib/auth/{password,session,service,server}.ts`
- `src/proxy.ts`
- `src/app/login/{page.tsx,actions.ts}`
- `src/app/login/{open-book,brand-header,welcome-book-page,login-book-page,login-form,password-input,login-button,login-help,illustrations,login-icons}.tsx`

### UI kit & layout
- `src/components/ui/{button,card,collapsible-card,form,badge,feedback,submit-button,confirm-button,action-button,toast,modal,edit-dialog,crud-form,icons,floating-window,period-progress}.tsx`
- `src/components/layout/app-nav.tsx`
- `src/app/globals.css` — Tailwind v4 `@theme` design tokens: app palette (royal `#014baa`, cream `#f8f3f0`, soft tints) and the open-book login palette
- `src/app/layout.tsx`, `src/app/(app)/layout.tsx`

### Routes
- `src/app/(app)/page.tsx` — dashboard
- `students/` — `page.tsx`, `actions.ts`, `student-form.tsx`, `support-needs-popover.tsx`, `new/`, `[id]/`
  (`page.tsx`, `edit/`, `subject-registration.tsx`)
- `classes/` — `page.tsx`, `actions.ts`, `classes-forms.tsx`, `classes-rows.tsx`
- `subjects/` — `page.tsx`, `actions.ts`, `subjects-forms.tsx`
- `examinations/` — `page.tsx`, `actions.ts`, `examination-form.tsx`, `new/`, `[id]/` (`page.tsx` details, `edit/`, `results/` (`page.tsx`, `results-print-controls.tsx`))
- `marks-entry/` — `page.tsx`, `actions.ts`, `[examinationId]/` (`page.tsx`, `marks-grid.tsx`, `marks-actions.tsx` — the round button + window hosting download/upload/choose/review/clear)
- `reports/` — `page.tsx`, `actions.ts`, `[examinationId]/` (`page.tsx`), `[examinationId]/[studentId]/` (`page.tsx`, `print-button.tsx`, `remarks-editor.tsx`)
- `grading/` — `page.tsx`, `actions.ts`, `grading-form.tsx`
- `terms/` — `page.tsx`, `actions.ts`, `schedule-form.tsx`, `year-select.tsx`, `quarters/` (`page.tsx`)
- `settings/` — `page.tsx`, `actions.ts`, `settings-form.tsx`, `logo-uploader.tsx`, `sidebar-theme-picker.tsx`, `grade-remarks-form.tsx`, `examination-types.tsx`, `examinations/` (`page.tsx`)

### Tests
- `tests/validation.test.ts`, `tests/errors.test.ts`, `tests/student-number.test.ts`
- `tests/term-days.test.ts`
- `tests/auth.test.ts`, `tests/auth.integration.test.ts`
- `tests/students.integration.test.ts`
- `tests/students-import.test.ts` (Excel template build + workbook parsing round-trip)
- `tests/marks-import.test.ts` (marks template build + locked cells for unregistered
  subjects + parsing round-trip + `previewMarksAction`)
- `tests/{setup,global-setup,test-db}.ts`, `tests/stubs/server-only.ts`

---

## 5. Commands

```bash
npm install
copy .env.example .env
npm run setup          # migrate + generate + seed
npm run dev            # http://localhost:3100
```

Quality gates:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

---

## 6. Verification results

| Check | Result |
| ----- | ------ |
| `npm run typecheck` | Pass (no errors) |
| `npm run lint` | Pass (no warnings/errors) |
| `npm test` | **180 passed** / 10 files |
| `npm run build` | Success; proxy active, data routes render dynamically |
| Auth smoke test | `/` and `/students` redirect to `/login` (with `?next=`) when signed out; a valid session cookie renders `/` and `/settings` (200) and redirects `/login` → `/`. `GET /api/students/template` redirects (307) to `/login` when anonymous |
| Live smoke test | `/`, `/students`, `/students/new`, `/students/[id]`, `/students/[id]/edit`, `/classes`, `/subjects`, `/examinations`, `/examinations/new`, `/marks-entry`, `/terms`, `/terms/quarters`, `/grading`, `/settings`, `/settings/examinations` all return HTTP 200 when authenticated |
| Navigation smoke test | The sidebar renders top-level items **Dashboard**, **Students**, **Exams** and **Marks Entry** and **Reports** plus a **Settings** group containing sub-items **Classes, Subjects, Examination types, Terms, Quarter** and **Grading**. Opening any config route (e.g. `/classes`, `/grading`, `/settings/examinations`) marks **Settings** active and auto-expands its sub-items; opening `/examinations` marks the standalone **Exams** item active; the standalone Classes/Subjects/Terms/Grading top-level links are gone |
| Excel template smoke test | `GET /api/students/template` returns 200 with the xlsx MIME type and a valid workbook (sheets `Students` + `Instructions`, headers `Full Name/Gender/Class/Stream`, gender dropdown) |
| Excel import review smoke test | `/students` renders the **Bulk import students (Excel)** card with steps ending in "review the list below", a **Review list** button and a file picker. Choosing a workbook parses it server-side (no rows created) and shows the review table (`Row`, `Full name`, `Gender`, `Class`, `Stream`, `Problem`) with a summary banner: rows whose class/stream cell is blank show an italic red "missing" and a `... is missing.` problem (invalid ones show "was not found or is inactive"), ready rows are unshaded, and **Import N students** is enabled only when at least one row is ready |
| Students icon/support-needs smoke test | `/students` renders icon row actions (`View`, `Edit`, `Record support needs` / `Support needs: N recorded`, `Deactivate`, `Delete`) with SVG paths — one `Delete` button (red trash icon, confirm prompt) per student; a student linked to `visual_impairment`/`other` in dev DB shows the category badge and a `Support needs: 1 recorded` toggle; the detail page lists the categories with the "Other" description |
| Students pagination & instant actions smoke test | `/students` returns 200 in well under a second (the dev dataset has ~1014 students) and renders exactly **25** student rows with a **Page 1 of N** indicator plus a `Next` link to `/students?page=2`; `/students?page=2` stays 200 and shows a `Previous` link; `?page=999` is clamped to the last page and unmatched filters show the empty state. Status/delete row buttons update the row optimistically (`useOptimistic`) and then reconcile with `router.refresh()`; the `(app)` route-level `loading.tsx` renders a spinner for instant feedback on navigation |
| Subject registration smoke test | `/students/[id]` renders a **Register subjects** button and a server-rendered "Registered subjects" badge list that already includes the class's compulsory subjects (e.g. `BIOLOGY · BIO (033)`) for a student with no stored registrations; the RSC payload for the floating window carries `compulsoryIds`, `registeredIds` and the subject tiles (name, short code, numeric code) so optional tiles render amber (not registered) or green with an `×` badge (registered) and compulsory tiles render locked dark grey. Tapping a registered optional tile deselects it; saving unregisters the deselected optional subjects while compulsory registrations are preserved |
| Subject compulsory class/stream smoke test | `/subjects` returns 200; the row action opens a **Compulsory classes** dialog that lists each class level with a "whole class" checkbox and, indented, a checkbox per configured stream (from the class × stream combinations in Settings). Selecting a whole class disables its stream checkboxes; selecting a stream deselects the whole class. The "Compulsory for" column renders `FORM 1` for a whole-class assignment and `FORM 1 · A` for a stream-specific one. Saving applies the allocation to students in the current academic year: matching active students gain a `COMPULSORY` registration, students who no longer match lose the automatic one, and user-chosen `MANUAL` registrations are never touched — the toast reports the added/removed counts. Assignments are validated server-side (unknown class or a stream that is not a configured combination for that class are rejected) |
| Grading smoke test | `/grading` returns 200 and renders the "Grade scale", "Division scale" and "Minimum average score for PASS" cards (21 number inputs = 5 grades × 2 + 5 divisions × 2 + 1 pass mark); the RSC payload carries the backfilled configuration (`"code":"A"` … `"code":"0"`, `"passMark":40`), and the dev database gains the 5 grade + 5 division default rows on first visit; the "Grading" link is grouped under the sidebar **Settings** item |
| Terms & Quarters smoke test | `/terms` and `/terms/quarters` return 200 and render the two terms ("First Term", "Second Term") and the four quarters ("1st Quarter" … "4th Quarter") with date inputs; visiting `/terms` backfills the 2 term + 4 quarter rows for the current academic year in the dev database; the dashboard card "Term & quarter progress" renders each term/quarter with an "In progress" badge and day counts (e.g. 39 days passed / 66 remaining / 105 total for a 2026-09-01 → 2026-12-15 term); the sidebar groups **Classes, Subjects, Examination types, Terms, Quarter** and **Grading** as sub-items under the single **Settings** item, with **Exams** as a standalone top-level item |
| Examination types smoke test | `/settings/examinations` returns 200 and renders an "Examination types" card (add form + table of the seeded types with status badges and edit/activate/delete actions); `/settings` itself no longer shows the card. `/examinations/new` returns 200 and its "Examination details" form lists the types. A type inserted as `INACTIVE` in the dev database appears on `/settings/examinations` but is **omitted** from the `/examinations/new` type dropdown, confirming deactivation filters the create form while remaining reversible in Settings |
| School info / logo smoke test | `/settings` returns 200 and renders a collapsed **School information** button (clicking it reveals the school name / contact / location form), a **School logo** uploader, a **System logo** uploader and a **Head master's signature** uploader. Setting `SchoolSettings.systemLogoUrl` in the dev database makes the sidebar render `<img alt="System logo">` above the "Academic Report" text (both the desktop sidebar and the mobile header); clearing it falls back to the "AR" brand mark |
| Head master signature smoke test | `/settings` renders the **Head master's signature** uploader (label "No head master's signature" until one is set); setting `SchoolSettings.headMasterSignatureUrl` in the dev database makes `/reports/[examinationId]/[studentId]` render `<img alt="Head master's signature">` (max height 12, `object-contain`) centred just above the Head Master's signature line; clearing it removes the image and leaves a blank rule |
| Sidebar appearance smoke test | `/settings` returns 200 and renders the **Sidebar appearance** card (colour swatch panel, custom colour picker + hex field, transparency slider, live preview, Save / Reset). With the defaults the sidebar renders `background-color:rgba(255, 255, 255, 0.75)`; setting `SchoolSettings.sidebarColor='#1e293b'` + `sidebarOpacity=90` in the dev database makes the sidebar render `rgba(30, 41, 59, 0.9)` and switches the nav items to the light-text variant |
| Marks entry smoke test | With an open examination and registered subjects in the dev database, `/marks-entry` returns 200 and lists the examination with an "Enter marks" link; `/marks-entry/[examinationId]` returns 200 and renders the spreadsheet grid — frozen student columns (`#`, `Reg / Adm No`, `Full name`, `Gender`, `Class`, `Stream`), subject columns, green editable score inputs (`inputMode="decimal"`, one per student × registered subject), the colour legend, the filters toolbar, the round **Marks entry actions** button and the round progress button. When the class's students have no registrations the page shows a **Register class subjects** button instead; after it runs the grid shows a column per compulsory subject. After a bulk upload or a clear the grid refreshes its scores in place (no manual page reload). The "Marks Entry" item is present in the sidebar navigation |
| Marks template smoke test | With a registered student in the dev database, `/marks-entry/[examinationId]` renders the round **Marks entry actions** button whose window lists Download template / Upload marks / Clear scores (Upload marks opens the file picker then advances to a review view with an Upload marks button), and `GET /api/marks-entry/template?examinationId=…&subjects=…&streams=…` returns 200 with the xlsx MIME type and a valid workbook — sheets `Marks` + `Instructions`, a frozen header row `S/N · Student's Name · Gender · Class · Stream` plus one column per selected subject, one row per student (sorted, with any existing mark prefilled), a 0–100 decimal data-validation rule on the score cells, a protected sheet where cells for subjects a student is not registered for are greyed out and locked (no validation rule), and the school logo embedded when the school has a PNG/JPEG/GIF logo. Requesting the template for a **single** subject returns only the students registered for it (no locked columns) |
| Examination edit smoke test | `/examinations/[id]/edit` returns 200 and its RSC payload passes `id` into `ExaminationForm` (as `hiddenValues`), so saving submits the id and no longer returns "Please fix the highlighted fields." |
| Exams row actions smoke test | `/examinations` renders each row's actions as **icon-only** buttons (no text) with `title`/`aria-label` tooltips: **View** (`/examinations/[id]`), **Edit** (`/examinations/[id]/edit`), **Download Excel template with marks** (`/api/marks-entry/template?examinationId=[id]`), **Download PDF results** (`/examinations/[id]/results?print=1`), plus Open/Close and Delete; the `EyeIcon`, `FileSpreadsheetIcon` and `FilePdfIcon` SVG paths are present |
| Examination details smoke test | `/examinations/[id]` returns 200 and renders the exam header (type · class · term · year, status badge), an **Examination details** card (type, name, class, term, academic year, dates, status, created) and a **Marks progress** card with student/subject/entered counts, a completion bar and links to marks entry, the Excel template, class results and the print-ready results sheet; an unknown id returns 404 |
| Exam results PDF smoke test | `/examinations/[id]/results` returns 200 and renders a `.report-sheet` A4 results table (Pos, Student, Stream, Total, Average, Grade, Points, Division) with the school header, exam info, grading/division legend and a `no-print` **Print / Save as PDF** toolbar; `/examinations/[id]/results?print=1` renders the same sheet with the auto-print control (calls `window.print()` on mount) so the browser's print dialog saves it as PDF |
| Entry status PDF smoke test | `/examinations/[id]/entry-status` returns 200 and renders a `.report-sheet` with the school header/exam info, four stat cards (**Total subjects**, **Total records**, **Subjects completed**, **Subjects pending**), an **Overall entry completion** bar (`completed / total · %`), and a per-subject table — **Subject** (numeric code + name when set, else short code + name, e.g. `042 MATHEMATICS` or `HIST HISTORY`), **Students** (registered count) and **Completion status** (a percentage bar with the % and `completed/total` below) — plus a `no-print` **Print / Save as PDF** toolbar; `?print=1` auto-prints on mount. The sheet carries the `print-exact` modifier so printing reproduces the on-screen report (card border, padding and coloured bars preserved via `print-color-adjust: exact`). The **Examination details** page (`/examinations/[id]`) renders an **Entry Status** link to it |
| Subject performance PDF smoke test | `/examinations/[id]/subject-performance` returns 200 and renders a `.report-sheet` (school header + exam info + a `print-exact` modifier so printing matches the screen) with a legend (GPA = mean grade points A=1…F=5 lower is better, AVR = mean score of sitters, Pass % ≥ pass mark, Rank by average) and a 12-column table: **Code** (numeric code when set, else short code), **Subject**, **Sat M/F/T** (`male/female/total` students with a mark), **GPA** (2 dp), **Rank** (`rank/subjectCount`, competition ranking by average), **AVR** (mean score, 2 dp), the **A/B/C/D/F** grade counts, and **Pass %** (sitters scoring ≥ the configured pass mark); subjects with no marks are omitted and the footer shows the subject count, pass mark and generator. Subject names link to the individual subject page. `?print=1` auto-prints on mount, and the **Examination details** page renders a **Subject Performance** link to it |
| Individual subject performance smoke test | `/examinations/[id]/subject-performance/[subjectId]` returns 200 and renders a `.report-sheet` (school header, exam info, subject name + code) with eight centered cards, each showing its value in large blue type with a small black label beneath — a **Total Sat** card (sat count with a `{male}M/{female}F` breakdown line), then **Average**, **GPA**, **Rank** (`rank/subjectCount`), **Passed**, **Failed**, **Pass rate**, **Fail rate** — a **Grade distribution by sex** table (**Grade · Male · Female · Total · %** for A–F plus a total row) and a **Ranking** section of six top/bottom-10 boards — **Top 10 overall**, **Bottom 10 overall**, **Top 10 male**, **Last 10 male**, **Top 10 female**, **Last 10 female** — each a ranked table (Pos as `#/total` e.g. `1/402`, Student, Sex on the overall boards only, Stream, Score, Grade; equal scores share a position). A **Full Results List** below it lists every sitter with **#**, **Student**, **Sex**, **Trade** (placeholder, to be developed), **Score**, a colour-coded (bold) **Grade** letter (the letter itself is coloured — **A** `rgb(0,138,40)`, **B** `rgb(0,255,0)`, **C** `rgb(204,153,0)`, **D** `rgb(255,102,0)`, **F** `rgb(255,0,0)`), **POS** (position in the whole class shown as `#/total`, e.g. `8/402`) and **POS-Sex** (position among the sitter's own sex, e.g. `1/169`; equal scores share a position). Unknown exam/subject ids return 404; the ranking figures are consistent with the subject table (e.g. `042 MATHEMATICS`). `?print=1` auto-prints on mount |
| Class results PDF smoke test | `/examinations/[id]/class-results` returns 200 and renders a `.report-sheet` (school header, exam info and a `print-exact` modifier so printing matches the screen) with a headline card (class **GPA**, **Average** and **Grade**, the card filled in the grade's colour — A dark green, B lime, C yellow, D orange, F red — and the competency comment below), a **Division Distribution** table (per sex and a bottom Total row: divisions **I/II/III/IV/0** plus **INC** for students graded in fewer than the required subjects and **ABS** for students who sat nothing, each with a Total column; the grand total equals the class size, e.g. 402), a **Student Results** table (**S/N**, **Students** name + number, **Sex**, **Division Point** (best-N points), **Division**, **Detailed Results** — the per-subject string `CODE-SCORE'GRADE' … AVG-<avg>'<grade>'`, e.g. `BIO-59.6'C' … AVG-48.88'C'` — **POS-SEX**/**POS-OVR** competition ranks (`—` for students who sat nothing) and `no-print` **View**/**Download** placeholder actions) and a **Subject Analysis** table (**CODE**, **Subject Name**, **REG**, **SAT**, **ABS**, the **A/B/C/D/F** grade spread, **PASS**/**FAIL**, **AVR**, **GPA**, a **Competency** comment coloured by the subject's average grade and **Rank** `rank/subjectCount`). The **Examination details** page's **Class results** link points here; `?print=1` auto-prints on mount; an unknown id returns 404 |
| Report remarks smoke test | `/settings` returns 200 and renders a collapsed **Report remarks** section listing every grade (A–F) with its score range and two textareas (Academic Master's + Head Master's). The route's RSC payload carries the configured remark defaults; saving posts the per-grade remarks and revalidates `/settings` + `/reports` |
| Reports smoke test | `/reports` returns 200 (empty state when no examinations exist); with a seeded examination that has marks, `/reports/[examinationId]` returns 200 with the class results table and `/reports/[examinationId]/[studentId]` returns 200 rendering the printable sheet (student name, `TOTAL MARKS`, `DIVISION`, `POSITION`, `Academic Master` present) with the remarks auto-filled from the average grade's configured remarks (each remark field is a single-line input, `rows=1`); an unknown examination/student id returns 404; the sidebar shows a **Reports** item. Toasts carry `no-print`, so no "Remarks saved" text appears on the printed sheet |

Test coverage:

- **Validation** (62) — student, examination (date ordering, term enum),
  examination-type (required/normalised name, max length, status enum + default), subject
  (name, short code, digits-only numeric code), compulsory class/stream assignment
  (whole class plus stream-specific, default empty), support-need
  selection (multiple categories, unknown/duplicate keys, "Other" requires a
  description, default empty), settings (email), grading (grade/division band validation,
  default scale alignment and contiguity, min ≤ max, 0–100 range, integer pass mark /
  points / division-subject count, missing/duplicate/unknown codes), per-grade report
  remarks (per-grade remark list, missing remarks defaulting to empty strings, empty code
  rejected, 1000-character limit), term/quarter schedules (fixed 2-term / 4-quarter
  shape, optional dates, end ≥ start ordering, malformed date rejection), marks
  (`markScoreSchema` 0–100 bounds, one-decimal limit, non-numeric rejection;
  `saveMarkSchema` null score to clear, `expectedScore` default, required ids,
  out-of-range rejection), default values
  and normalisation, and support-need taxonomy consistency (categories ↔ keys).
- **Errors** (5) — `AppError` passthrough and Prisma error-code mapping.
- **Student numbers** (6) — formatting, overflow, invalid input, parsing.
- **Term days** (10) — `computeDayCounts` states (unscheduled, upcoming, ongoing,
  completed, boundaries, single-day, Date vs string input) and `progressPercent`
  (0 unscheduled, 50 mid-period, 100 complete).
- **Auth** (9) — scrypt hashing/verification and signed session tokens (round-trip,
  tampered payload/signature, expiry, malformed input).
- **Auth integration** (4) — `authenticateUser` against a real database (valid, wrong
  password, unknown email, case-insensitive email).
- **Students integration** (68) — sequential numbering, class-stream enforcement,
  subject registration (add and unregister optional subjects, compulsory registrations
  protected from removal), student deletion (cascades registrations and support needs;
  unknown id rejected), Excel import preview (blank/invalid class or stream flagged per
  row without creating anything), compulsory class/stream assignment (whole-class and
  stream-specific, deduplication, unknown class/stream rejection, listing active
  compulsory subjects for a class or student, excluding inactive ones, and automatic
  reconciliation of COMPULSORY registrations on edit — add on apply, remove on
  narrow/clear, MANUAL picks preserved), subject numeric-code
  create/update,
  safe subject deletion (blocked while registrations exist), multi-select support needs
  (record/replace, "Other" description required and persisted, unknown category or
  student rejected, seeded taxonomy), grading configuration (default band backfill on
  first load, custom boundaries + pass mark persisted and read back with a complete,
  de-duplicated code set), term schedule (2 terms + 4 quarters backfilled per year,
  idempotent, dates persisted and read back, foreign ids rejected), examination types
  (auto sort order + upper-cased names, duplicate rejection, rename, active-only
  filtering, delete blocked while an examination uses the type), examination deletion,
  marks entry (`getMarksEntry` grid payload + `canEdit`, `listMarksEntryExaminations`,
  `registerCompulsorySubjectsForExamination` (idempotent class-wide registration,
  plus stream-specific registration limited to matching students),
  score normalisation, create/update/clear round-trip, optimistic-concurrency rejection
  keeping the stored value, and rejection of closed examinations, students outside the
  examination's class, unregistered subjects and unknown examinations), Excel bulk
  import (gender normalisation, valid/invalid row handling, and the preview step that
  flags blank class/stream and creates nothing), marks-template import (creates,
  updates and clears marks in one upload, reports unmatched rows and unknown columns,
  skips scores for unregistered subjects, rejects out-of-range scores and refuses a
  closed examination) and clearing marks (deletes only the selected subjects/streams of
  the examination's own students, requires a subject and refuses closed/unknown
  examinations), plus the system-logo setting (store, read back and clear the sidebar
  logo URL), the head-master-signature setting (store, read back and clear the printed
  signature URL) and the sidebar theme (store/read back the colour + opacity, lowercasing the
  hex and clamping the opacity to 0–100), per-grade report remarks (default academic/head
  master remarks backfilled per grade, custom remarks saved and read back through the
  grading config, cleared remarks falling back), report forms (grade/points resolution, best-*N*
  division with the extra subject dropped, whole-class competition positions, auto-filled
  remarks and their upsert/round-trip, remarks auto-filled from the average grade's
  configured remarks, `INC` for too few graded subjects, unknown-examination
  rejection, the term closes/reopens + holiday-length break, and `formatReportDate`
  `Weekday/DD/Month/YYYY` formatting/null handling), and the marks-template download route
  (a single selected subject returns only the students registered for it with no locked
  cells, several subjects return every student with unregistered cells locked, and a
  single subject nobody in the selected stream takes is rejected) against a freshly
  migrated SQLite database.
- **Colour helpers** (5) — hex normalisation (short/long form, lowercasing, invalid
  rejection), hex → RGB channels, `rgba()` building with opacity clamping, and the
  luminance-based dark-colour test used to pick the sidebar text colour.
- **Student import workbook** (4) — template headers/instructions, filled-row
  round-trip, blank-row skipping and missing-column rejection.
- **Marks import workbook** (4) — template headers (fixed + per-subject) and prefilled
  marks, edited-sheet round-trip, header-row discovery after a title block, and
  missing-column rejection.

---

## 7. Limitations

- Authentication is a single administrator account with cookie sessions (8 h). There
  are no roles/permissions, password reset or account management UI yet.
- The app is single-school. `AUTH_SECRET` must be set to a long random value in `.env`.
- Report forms apply the configured grading scales (subject grades, averages,
  grades/divisions, points and positions) and print per student. The examination
  results sheet (`/examinations/[id]/results`) is print-ready and saved as PDF via the
  browser's print dialog. There is no server-generated `.pdf` file and no bulk/all-class
  print yet; subject positions are not shown, only the overall class position. Marks are
  stored per student × subject × examination; concurrent edits are detected via an
  expected-score check.
- Terms and quarters are a schedule only (names fixed; start/end dates editable). There
  is no automatic roll-over to the next term/quarter, and day counts are computed on
  demand from `Date.now()`; no holidays/exclusions are accounted for.
- Report output and bulk operations beyond student import are deferred (results are
  printed to PDF through the browser's print dialog). Student import accepts `.xlsx`
  files up to 5 MB and reports per-row issues.
- Logo uploads are stored on the local filesystem (`public/uploads/`) and referenced
  by URL; a production deployment would move this to object storage.
- SQLite is well suited to development but not concurrent multi-writer production
  workloads; the service layer is provider-agnostic enough to switch to Postgres.

---

## 8. Next phase (Phase 3 preview)

1. ~~Marks entry per examination, subject and student.~~ **Done.**
2. ~~Applying the configured grading scales to marks (subject totals, averages, grades and divisions).~~ **Done.**
3. ~~Printable report forms (per student) with points, divisions, positions and remarks.~~ **Done.**
4. Bulk/all-class printing and server-side PDF export; subject positions and rank lists.
5. User management: additional users, roles/permissions, password reset, multi-school.
