export const GENDERS = ["MALE", "FEMALE"] as const;
export type Gender = (typeof GENDERS)[number];

export const STUDENT_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export type StudentStatus = (typeof STUDENT_STATUSES)[number];

export const RECORD_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export type RecordStatus = (typeof RECORD_STATUSES)[number];

export const EXAMINATION_STATUSES = ["DRAFT", "OPEN", "CLOSED"] as const;
export type ExaminationStatus = (typeof EXAMINATION_STATUSES)[number];

export const TERMS = [
  "TERM 1",
  "TERM 2",
  "QUARTER 1",
  "QUARTER 3",
] as const;
export type Term = (typeof TERMS)[number];

// Phase 1 initial configuration. Everything below is seeded into the database
// and remains fully configurable at runtime rather than hardcoded in logic.
export const DEFAULT_CLASS_LEVELS: { name: string; sortOrder: number }[] = [
  { name: "FORM 1", sortOrder: 1 },
  { name: "FORM 2", sortOrder: 2 },
  { name: "FORM 3", sortOrder: 3 },
  { name: "FORM 4", sortOrder: 4 },
];

export const DEFAULT_STREAMS: string[] = ["A", "B", "C", "D", "E"];

export const DEFAULT_SUBJECTS: { name: string; code?: string }[] = [
  { name: "CIVICS", code: "CIV" },
  { name: "HISTORY", code: "HIST" },
  { name: "GEOGRAPHY", code: "GEO" },
  { name: "KISWAHILI", code: "KIS" },
  { name: "ENGLISH LANGUAGE", code: "ENG" },
  { name: "PHYSICS", code: "PHY" },
  { name: "CHEMISTRY", code: "CHEM" },
  { name: "BIOLOGY", code: "BIO" },
  { name: "B MATHEMATICS", code: "B/MATH" },
  { name: "HTM", code: "HTM" },
  { name: "BIBLE KNOWLEDGE", code: "BK" },
  { name: "EDK", code: "EDK" },
  { name: "BUSINESS STUDIES", code: "BST" },
  { name: "COMMERCE", code: "COMM" },
  { name: "BOOK KEEPING", code: "BKPR" },
  { name: "AGRICULTURE", code: "AGRI" },
  { name: "LITERATURE IN ENGLISH", code: "LIT" },
  { name: "ICS", code: "ICS" },
];

export const DEFAULT_EXAMINATION_TYPES: string[] = [
  "MIDTERM 1ST QUARTER",
  "TERMINAL",
  "PRE-MOCK",
  "MIDTERM 3RD QUARTER",
  "PRE-NECTA",
];

// Fixed taxonomy of support-need categories (respectful, inclusive language).
// The ids are stable keys also used in `prisma/migrations/...` to seed the
// `SpecialNeedCategory` table, and in `src/lib/validation/schemas.ts`.
export const SPECIAL_NEED_KEYS = [
  "visual_impairment",
  "hearing_impairment",
  "physical_disability",
  "learning_difficulties",
  "neurodevelopmental_support",
  "speech_communication",
  "intellectual_disability",
  "chronic_health",
  "social_emotional_behavioural",
  "other",
] as const;
export type SpecialNeedKey = (typeof SPECIAL_NEED_KEYS)[number];

export const SPECIAL_NEED_CATEGORIES: readonly {
  key: SpecialNeedKey;
  label: string;
  description: string;
}[] = [
  {
    key: "visual_impairment",
    label: "Visual Impairment",
    description: "Blindness, low vision, or difficulty seeing standard print.",
  },
  {
    key: "hearing_impairment",
    label: "Hearing Impairment",
    description: "Deafness, partial hearing loss, or need for hearing support.",
  },
  {
    key: "physical_disability",
    label: "Physical or Mobility Disability",
    description: "Mobility limitations or difficulty using classroom facilities or writing tools.",
  },
  {
    key: "learning_difficulties",
    label: "Learning Difficulties",
    description: "Dyslexia, dyscalculia, dysgraphia, or other identified learning difficulties.",
  },
  {
    key: "neurodevelopmental_support",
    label: "Neurodevelopmental Support Needs",
    description: "Autism, ADHD, or other identified developmental conditions affecting learning or classroom participation.",
  },
  {
    key: "speech_communication",
    label: "Speech and Communication Difficulties",
    description: "Difficulty speaking, understanding language, or communicating effectively.",
  },
  {
    key: "intellectual_disability",
    label: "Intellectual Disability",
    description: "An identified intellectual disability requiring additional learning support.",
  },
  {
    key: "chronic_health",
    label: "Chronic Health or Medical Needs",
    description: "A documented condition requiring special care; exclude from manual work and punishments.",
  },
  {
    key: "social_emotional_behavioural",
    label: "Social, Emotional or Behavioural Support Needs",
    description: "Identified needs requiring additional support with emotional regulation, behaviour, or participation in learning.",
  },
  {
    key: "other",
    label: "Other Special Educational Needs",
    description: "A support need that does not fit the categories above. Add a short description.",
  },
];

export const USER_ROLES = ["ADMIN", "STAFF"] as const;
export type UserRole = (typeof USER_ROLES)[number];

// How a student↔subject registration came to exist. COMPULSORY rows are created
// and reconciled automatically from the subject's compulsory class/stream
// allocation; MANUAL rows are chosen by a user and are never removed by the
// automatic sync.
export const REGISTRATION_SOURCES = ["COMPULSORY", "MANUAL"] as const;
export type RegistrationSource = (typeof REGISTRATION_SOURCES)[number];

// Grading scales. The grade/division codes are fixed sets; the boundary scores
// are configurable per school (see src/lib/services/grading.ts).
export const GRADE_CODES = ["A", "B", "C", "D", "F"] as const;
export type GradeCode = (typeof GRADE_CODES)[number];

export const DIVISION_CODES = ["I", "II", "III", "IV", "0"] as const;
export type DivisionCode = (typeof DIVISION_CODES)[number];

export const DEFAULT_GRADES: {
  code: GradeCode;
  minScore: number;
  maxScore: number;
  points: number;
  remark: string;
  academicMasterRemark: string;
  headMasterRemark: string;
}[] = [
  {
    code: "A",
    minScore: 75,
    maxScore: 100,
    points: 1,
    remark: "Excellent",
    academicMasterRemark:
      "An excellent overall performance. Maintain this consistency and standard of work.",
    headMasterRemark: "Excellent result. Keep up the outstanding effort.",
  },
  {
    code: "B",
    minScore: 65,
    maxScore: 74,
    points: 2,
    remark: "Very Good",
    academicMasterRemark:
      "A very good overall performance. Aim a little higher to reach the top grade.",
    headMasterRemark: "A very good result. Well done — keep working hard.",
  },
  {
    code: "C",
    minScore: 55,
    maxScore: 64,
    points: 3,
    remark: "Good",
    academicMasterRemark:
      "A good overall performance. More consistent effort will improve your results.",
    headMasterRemark: "A good result. Push yourself for a higher grade next time.",
  },
  {
    code: "D",
    minScore: 45,
    maxScore: 54,
    points: 4,
    remark: "Satisfactory",
    academicMasterRemark:
      "A fair overall performance. You need to work harder and revise regularly.",
    headMasterRemark: "You can do much better. Increase your effort and focus.",
  },
  {
    code: "F",
    minScore: 0,
    maxScore: 44,
    points: 5,
    remark: "Poor",
    academicMasterRemark:
      "A weak overall performance. Serious improvement and extra study are required.",
    headMasterRemark: "You must work much harder to improve your results.",
  },
];

// Division bands on the total-points scale (lower points are better). The
// defaults describe a seven-subject system; the number of counted subjects and
// the ranges are configurable per school (see SchoolSettings.divisionSubjects).
export const DEFAULT_DIVISIONS: { code: DivisionCode; minPoints: number; maxPoints: number }[] = [
  { code: "I", minPoints: 7, maxPoints: 17 },
  { code: "II", minPoints: 18, maxPoints: 21 },
  { code: "III", minPoints: 22, maxPoints: 25 },
  { code: "IV", minPoints: 26, maxPoints: 33 },
  { code: "0", minPoints: 34, maxPoints: 35 },
];

export const DEFAULT_DIVISION_SUBJECTS = 7;

export const DEFAULT_PASS_MARK = 40;

// Academic calendar structure (per academic year). There are two terms per year
// and two quarters per term; the names are fixed but the start/end dates are
// configurable (see src/lib/services/terms.ts).
export const DEFAULT_TERMS: { sequence: number; name: string }[] = [
  { sequence: 1, name: "First Term" },
  { sequence: 2, name: "Second Term" },
];

export const DEFAULT_QUARTERS: { sequence: number; name: string; termSequence: number }[] = [
  { sequence: 1, name: "1st Quarter", termSequence: 1 },
  { sequence: 2, name: "2nd Quarter", termSequence: 1 },
  { sequence: 3, name: "3rd Quarter", termSequence: 2 },
  { sequence: 4, name: "4th Quarter", termSequence: 2 },
];

// Default administrator created by the seed. Overridable via SEED_ADMIN_* env
// variables. The password should be changed after the first login.
export const DEFAULT_ADMIN_NAME = "System Administrator";
export const DEFAULT_ADMIN_EMAIL = "admin@academic-report.local";
export const DEFAULT_ADMIN_PASSWORD = "Admin@12345";

export function labelStatus(status: string): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}
