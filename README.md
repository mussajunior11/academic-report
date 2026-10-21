# Academic Report — Phase 1

> **Motto:** *Inspiring every step of learning.*

Academic Report is a web application for secondary school academic administration.
**Phase 1** delivers the school foundation: the dashboard plus full management of
students, classes & streams, subjects, examinations, terms & quarters, grading scales
and school settings — all backed by a real SQLite database. **Phase 2** adds
examination marks entry. **Phase 3** adds printable report forms: the grading scales
are applied to entered marks to produce per-student subject totals, averages,
grades/divisions and whole-class positions, together with academic/head master
remarks (see [Roadmap](#roadmap)).

---

## Tech stack

| Area          | Choice                                   |
| ------------- | ---------------------------------------- |
| Framework     | Next.js 16 (App Router, Server Actions)  |
| Language      | TypeScript                               |
| UI            | Tailwind CSS v4, React Hook Form         |
| Validation    | Zod                                      |
| Spreadsheets  | ExcelJS (student + marks templates)      |
| Database      | SQLite via Prisma 7 + better-sqlite3      |
| Tests         | Vitest (unit + integration)              |

---

## Getting started

### Prerequisites

- Node.js 22+ (developed on v24)
- npm

### Setup

```bash
npm install
copy .env.example .env      # macOS/Linux: cp .env.example .env
# set AUTH_SECRET in .env to a long random string (see Environment below)
npm run setup               # migrate + generate client + seed initial data
npm run dev
```

Open http://localhost:3100 and sign in with the default administrator:

> Academic Report runs on port **3100** by default so it never collides with other
> local apps (e.g. the Timetable app, which uses port 3000). Change the port with
> `npm run dev -- -p <port>` or by editing the `dev`/`start` scripts.

| Email                        | Password      |
| ---------------------------- | ------------- |
| `admin@academic-report.local` | `Admin@12345` |

`npm run setup` applies migrations, generates the Prisma client and seeds the school
with default configuration (class levels FORM 1–4, streams A–E, all class × stream
combinations, 18 subjects, 5 examination types and the administrator account).

The login page also displays these development credentials (development builds
only). Override them with the `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` environment
variables and change the password before using the app for real work.

To also create a few sample students while developing:

```bash
set SEED_DEV_DATA=true && npm run db:seed      # PowerShell
# SEED_DEV_DATA=true npm run db:seed           # bash
```

---

## Available scripts

| Script                | Description                                        |
| --------------------- | -------------------------------------------------- |
| `npm run dev`         | Start the development server                        |
| `npm run build`       | Generate the Prisma client and build for production |
| `npm run start`       | Start the production server                         |
| `npm run lint`        | Run ESLint                                          |
| `npm run typecheck`   | Run the TypeScript compiler (no emit)               |
| `npm test`            | Run the Vitest suite (unit + integration)           |
| `npm run db:migrate`  | Create/apply a new migration (`prisma migrate dev`) |
| `npm run db:deploy`   | Apply existing migrations                           |
| `npm run db:generate` | Regenerate the Prisma client                        |
| `npm run db:seed`     | Seed initial configuration / optional dev data      |
| `npm run db:studio`   | Open Prisma Studio                                  |
| `npm run db:reset`    | Drop, re-migrate and re-seed the database           |
| `npm run setup`       | deploy + generate + seed (one-shot bootstrap)       |

---

## Environment

Copy `.env.example` to `.env`. The important variables:

| Variable              | Purpose                                                     |
| --------------------- | ----------------------------------------------------------- |
| `DATABASE_URL`        | SQLite file location (`file:./prisma/dev.db`)               |
| `AUTH_SECRET`         | **Required.** Signs the session cookies; use a long random value |
| `SEED_SCHOOL_NAME`    | School name created by the seed                             |
| `SEED_SCHOOL_CODE`    | School code (used in student numbers, e.g. `ARS/2026/0001`) |
| `SEED_ACADEMIC_YEAR`  | Current academic year created by the seed                   |
| `SEED_ADMIN_EMAIL`    | Administrator email                                          |
| `SEED_ADMIN_PASSWORD` | Administrator password                                       |
| `SEED_DEV_DATA`       | `true` to also seed sample students                          |

Generate a suitable `AUTH_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

---

## Features (Phase 1)

- **Authentication** — session-based login with a seeded administrator; all app routes
  are protected by a `proxy.ts` guard and signed, HTTP-only session cookies.
- **Navigation** — the sidebar keeps Dashboard, Students, Exams, Marks Entry and Reports
  at the top level, while Classes, Subjects, Examination types, Terms, Quarter and
  Grading are grouped as expandable sub-items under **Settings**.
- **Dashboard** — live counts, a term & quarter progress card (days passed / remaining
  with progress bars), and a quick-actions card at the bottom.
- **Theme** — a royal blue (`#014BAA`) primary on a light cream (`#F8F3F0`) canvas:
  rounded card surfaces, soft shadows, KPI stat cards with icon accents, and royal-blue
  primary actions applied through the shared UI kit to every dashboard and module page.
  The sidebar background stays admin-configurable in **Settings**.
- **Students** — register, search, filter (class, stream, gender, status) and sort as a
  paginated list (25 per page, prev/next controls). Per-academic-year subject registration:
  compulsory subjects for the student's class (and stream) are pre-registered and shown as badges,
  and a **Register subjects** button opens a draggable floating window of subject tiles
  (dark grey = compulsory and locked, yellow = optional not registered, green = optional
  registered, marked `×`); tap an optional subject to register it and tap a registered one
  again to unregister it, then save. Compulsory subjects are always registered and cannot be
  removed here.
  Row actions use compact icon buttons (view, edit, support needs, power, delete).
  Status changes and deletes apply optimistically (the row updates instantly, then
  reconciles with the server); a route-level `loading.tsx` shows an instant spinner on
  navigation.
  Deactivate preserves the record for history, while delete removes it permanently
  (along with its registrations, support needs and marks). Support
  needs open a draggable floating window where one or more categories can be chosen
  (visual/hearing impairment, learning difficulties, chronic health, etc., with a
  description for "Other"); recorded needs appear as badges next to the name.
  **Bulk import** from an Excel template (download template → fill → choose file →
  review the parsed list, which flags blank/invalid class or stream per row → import the
  ready rows).
- **Classes & Streams** — manage class levels, streams and the valid class × stream
  combinations students can be assigned to.
- **Subjects** — manage subject names with a short code and an optional numeric code
  (shown after the short code); activate/deactivate; mark a subject as compulsory for a
  whole class or for specific streams of a class (using the class × stream combinations
  defined under **Classes & Streams**); delete subjects that have no registrations. The
  "Compulsory for" column shows each assignment as `CLASS` (whole class) or
  `CLASS · STREAM`. Saving an allocation applies it immediately to students in the
  current academic year — matching active students are registered automatically and
  students who no longer match are unregistered (user-chosen optional subjects are
  never removed). Row actions use compact icon buttons (edit, classes, power, delete).
- **Exams** — set up examinations per class, term and academic year; open/close
  or delete them (**Exams** in the sidebar). Each row's icon actions open a read-only
  **details page** (`/examinations/[id]` — exam info, marks-progress summary and quick
  links), download the **Excel marks template** (`/api/marks-entry/template`), and open a
  print-ready **results sheet** (`/examinations/[id]/results`) that the browser's print
  dialog saves as PDF. The details page also links to an **Entry status** report
  (`/examinations/[id]/entry-status`) summarising marks-entry completion per subject
  (stat cards for total subjects, total records, subjects completed and subjects pending,
  an overall completion bar, and a per-subject table with numeric code + name, registered
  students and a completion bar). **Print / Save as PDF** reproduces the on-screen report
  exactly (card borders, coloured progress bars preserved) via the browser's print dialog.
  The details page also links to a **Subject performance** report
  (`/examinations/[id]/subject-performance`) analysing each subject — subject code and
  name, students who sat split by gender (M/F/Total), GPA (mean grade points, A=1 … F=5,
  lower is better), rank by average (`3/10`), average score, the A–F grade distribution and
  the pass rate (sitters scoring at or above the configured pass mark) — printable/saveable
  as PDF exactly as shown. Each subject name links to an **individual subject page**
  (`/examinations/[id]/subject-performance/[subjectId]`) showing the subject name and code,
  centered cards showing each figure in large blue type with a small black label beneath — a
  **Total Sat** card (sat count plus a `{male}M/{female}F` breakdown line), then average, GPA,
  rank, passed, failed, pass-rate and fail-rate cards — a **Grade distribution by sex** table (Grade ·
  Male · Female · Total · %, with a total row; all columns centered)
  and a **Ranking** section listing six top/bottom-10 boards — top 10 overall, bottom 10
  overall, top/last 10 male and top/last 10 female (position as `#/total`, student, sex on the
  overall boards, stream, score, grade; every column centered except the student name) — followed by a
  **Full Results List** of every sitter (#, Student, Sex, Trade (placeholder), Score,
  colour-coded Grade — A green, B lime, C gold, D orange, F red — POS and POS-Sex, their
  position in the whole class and among their sex shown as `#/total` (e.g. `8/402`,
  `1/169`)) — all printable/saveable as PDF.
  The details page also links to a **Class results** report
  (`/examinations/[id]/class-results`), a printable whole-class summary with a headline
  card (class GPA, average and grade — the card filled with the grade's colour), a
  **Division Distribution** table (divisions I–IV and 0, plus INC for students graded in
  fewer than the required subjects and ABS for students who sat nothing — by sex, with a
  total row), a **Student Results** table (S/N, name, sex, division points, division, the
  full per-subject detail string `CODE-SCORE'GRADE' … AVG-<avg>'<grade>'`, position among
  the same sex and overall, plus placeholder View/Download actions) and a **Subject
  Analysis** table (code, name, registered/sat/absent, the A–F grade spread, pass/fail,
  average, GPA, a competency comment coloured by the subject's average grade and the
  subject's rank among subjects) — all saveable as PDF.
  Examination types (e.g. ANNUAL, TERMINAL, MIDTERM) are managed
  under **Settings → Examination types** (`/settings/examinations`) — add, rename,
  activate/deactivate, delete.
- **Marks Entry** — pick an examination and enter subject scores in a spreadsheet-style
  grid with frozen student columns. Cells are colour-coded (light green = registered and
  editable, grey = entered, light red = not registered) and save automatically when you
  leave a cell or press Enter, with keyboard navigation. Filter by subject, stream,
  student search or entry status, and watch a floating progress button. Scores are
  validated to 0–100 with at most one decimal place; blank is distinct from zero. A
  closed examination is read-only. If a class's students have no subject registrations
  yet, the page offers a **Register class subjects** button that registers the class's
  compulsory subjects for every active student in one step.
  A single round **Marks entry actions** button opens a floating window with
  **Download template** (a marks sheet for any combination of subjects and streams —
  student columns plus one column per subject, with the school logo and examination
  details in the header and any existing marks prefilled; when a **single** subject is
  chosen the sheet lists only the students registered for it, rather than listing
  everyone with locked cells), **Upload marks** (pick the
  filled-in file, review every parsed score in a table, then press the **Upload marks**
  button under it to import — the window then shows the summary and any skipped rows; blank
  cells clear a mark) and **Clear scores** (delete the stored marks for a selected set of
  subjects and streams in one step, leaving all other subjects and streams untouched). The
  grid refreshes in place after an upload or a clear — no manual page reload needed.
- **Reports** — pick an examination to see a whole-class results table (marks, grade,
  total, average, points, division and position), then open any student's **printable
  report form** (`/reports/[examinationId]/[studentId]`). The sheet follows the school's
  report template: school header (name, logo, contacts, printed date), student block,
  a SUBJECT · MARKS · GRADE · STATUS table, a TOTAL MARKS · AVERAGE · GRADE · POSITION ·
  DIVISION · POINTS summary, the grading and division scales, the term closes/reopens
  dates with holiday length, and Academic Master's + Head Master's remarks with
  signatures. The **system logo** is printed top-right and as a faint centred watermark,
  and an uploaded **Head master's signature** is stamped automatically above the Head
  Master's signature line so reports do not need to be signed by hand. Remarks are
  auto-filled from the configured remarks for the student's
  **average grade** (see Settings) and can be edited inline and saved per student; a
  **Print** button produces the A4 sheet. Positions are computed across the whole class
  (all streams) with ties sharing a rank.
- **Grading** — configure the grade scale (A–F) with the **points** and pass/status
  **remark** per grade, the division scale (I, II, III, IV, 0) as **points ranges**, and
  the number of **division subjects** (best subjects counted towards a division, default
  7). The minimum average score required to **pass** is editable too. Defaults are
  backfilled on first visit and every boundary is editable; scores are validated to fall
  between 0 and 100 with the minimum never exceeding the maximum.
- **Terms & Quarters** — set the start and end dates for the two terms of each academic
  year (First/Second Term) and their four quarters (1st–4th). Each period shows the days
  passed and remaining with a progress bar, and a term/quarter progress card appears on
  the dashboard. Names are fixed; only dates are editable.
- **Settings** — a collapsible **School information** section (school name, contact
  information, location and other details), a validated **school logo** upload
  (PNG/JPEG/WEBP/SVG, ≤ 2 MB) and a **system logo** upload shown at the top of the
  sidebar above "Academic Report" (and printed on report forms as the top-right logo and
  watermark). A **Head master's signature** upload (same file rules) is stamped above the
  Head Master's signature line on every report. A **Sidebar appearance** panel picks the sidebar
  background from a colour-swatch panel (or a custom colour) and sets its transparency
  (0% transparent → 100% solid); the navigation text switches between light and dark
  automatically for legibility. A **Report remarks** section configures, for each
  average grade (A–F), the **Academic Master's** and **Head Master's** remarks that are
  used to auto-fill report forms. A dedicated **Examination types** sub-page
  (`/settings/examinations`) manages the types available when creating examinations
  (add, rename, activate/deactivate, delete; a type in use cannot be deleted).

### Business rules

- A student may only be assigned to an **active** class × stream combination.
- A subject can be marked compulsory for a whole class (applies to every stream) or for
  one or more specific streams of a class; a stream must be part of a configured class ×
  stream combination. Only active subjects are auto-registered for students. Editing an
  allocation syncs it to students in the current academic year: it adds registrations for
  matching active students and removes ones it added earlier that no longer match, while
  leaving manually chosen optional subjects intact.
- A student's optional subject registrations can be added or removed from the details
  page; saving unregisters any optional subject that is no longer selected. Compulsory
  subjects are never dropped this way (they are re-derived from the allocation), and
  editing an allocation may register a removed subject again.
- Internal student numbers are generated automatically as `CODE/YEAR/0001`
  (e.g. `ARS/2026/0001`) and are unique per school.
- The optional admission number, when supplied, must be unique.
- Deactivating a student preserves historical records; a student can also be deleted
  permanently from the list, which removes their registrations, support needs and marks.
- Excel bulk import parses the file and shows a review list before anything is created.
  Each row is validated independently: a blank or inactive **class** or **stream**, an
  invalid gender or a missing name is reported per row, and only the ready rows are
  imported (row order is preserved for auto-numbering).
- All forms validate on the client (Zod + React Hook Form) **and** again on the server.
- A mark can only be entered when the examination is not closed, the student is in the
  examination's class, and the subject is registered for the student in that academic
  year. Concurrent edits are detected via an expected-score check.
- The marks template may be uploaded for an open examination only. Rows are matched to
  active students by full name and stream; a subject score is accepted only when that
  subject is registered for the student in the examination's year. A blank cell clears
  the stored mark, and unmatched or invalid rows are reported without aborting the rest.
- The downloaded marks template locks (greys out) each score cell for a subject the student
  is not registered to take, so those marks cannot be entered in the sheet; the server
  rejects any such score on upload as a backstop. When exactly one subject is selected the
  template is a per-subject mark list, so it includes only the students registered for that
  subject (requests for a subject no selected student takes are rejected).
- Scores can be cleared in bulk for an open examination by picking any subjects and
  streams; only the stored marks for the examination's own active students in those
  streams are deleted, and other subjects/streams are left untouched.
- A report form uses only the subjects a student is **registered** for in the
  examination's academic year; a missing mark is never treated as zero or a fail
  (it is simply not graded). The average and position use **all** graded subjects, while
  the **division** counts only the best *N* subjects by points (lowest points first,
  `N` = division subjects). A student graded in fewer than `N` subjects is shown as **INC**.
- Overall grade is the band that contains the average; the grade's configured remark is
  used as the subject STATUS. The Academic Master's and Head Master's remarks printed on a
  report form come from the remarks configured for the student's **average grade** in
  Settings; a remark saved on the individual report overrides them (and the built-in
  suggestion is used when neither is set). Positions rank every active student in the
  examination's class level (across all streams) by total marks; ties share a rank and the
  next rank is skipped (competition ranking).

---

## Project structure

```
prisma/
  schema.prisma          # data model
  migrations/            # SQL migrations
  seed.ts                # idempotent configuration seed
src/
  app/                   # App Router routes (server components + server actions)
    login/               # open-book sign-in page + login/logout server actions
    api/students/template/  # GET route handler (Excel template download)
    api/marks-entry/template/  # GET route handler (marks template download)
    (app)/               # protected layout (sidebar + header)
      page.tsx           # dashboard
      students/  classes/  subjects/  examinations/  marks-entry/  reports/  terms/  grading/  settings/
  components/
    layout/  ui/         # reusable UI kit (button, card, form, modal, toast, ...)
  lib/
    actions/             # runAction wrapper (structured, safe results)
    auth/                # password hashing, signed sessions, auth service
    db/                  # PrismaClient singleton
    excel/               # Excel template generation + workbook parsing
    services/            # server-side data access + business rules
    utils/               # pure helpers
    validation/          # Zod schemas + error helpers
  generated/prisma/      # generated Prisma client (do not edit)
  proxy.ts               # route protection (redirects to /login)
tests/                   # Vitest unit + integration tests
```

### Layering

`page.tsx` (server component) → `services/*` (Prisma + business rules) →
`actions.ts` (server actions wrapping services in `runAction`) → client form
components (React Hook Form + Zod). Server actions return a structured
`{ ok, message, fieldErrors }` result so the UI never sees raw database errors.

---

## Verification

```bash
npm run typecheck   # clean
npm run lint        # clean
npm test            # 173 tests across 10 files
npm run build       # production build succeeds
```

The integration test suite runs against a **real, freshly migrated SQLite database**
(`tests/.tmp/integration.db`) and exercises the student numbering, class-stream
validation, subject-registration, grading-configuration, term-schedule, marks-entry,
marks-import and report-form rules end to end. Test files run sequentially (`fileParallelism: false`) so the shared
database file never sees concurrent writes.

---

## Roadmap

- **Phase 1 (this release):** authentication, dashboard, students, classes & streams,
  subjects, examinations setup, terms & quarters, grading scales, settings.
- **Phase 2:** examination marks entry (done).
- **Phase 3:** printable report forms with grading applied — subject totals, averages,
  grades/divisions, positions, remarks and school header (done). Bulk printing and PDF
  export are next.
- **Later:** multiple users/roles, password reset, multi-school tenancy.

---

## Notes & limitations

- Phase 1 is **single-school**; the schema is already scoped by `schoolId` so
  multi-tenancy can be added later.
- Authentication is a single administrator account with cookie-based sessions. There
  are no roles/permissions or password-reset flow yet, and `AUTH_SECRET` must be set
  to a long random value in `.env` (it signs the session cookies).
- Uploaded logos are written to `public/uploads/` and referenced by URL (the file
  itself is never stored in the database).
- SQLite has no native enum type, so constrained columns are `String` and validated
  in the application layer.
- Terms & quarters are a schedule only (fixed names, editable dates). Day counts are
  computed on demand and ignore holidays, and there is no automatic term roll-over yet.
