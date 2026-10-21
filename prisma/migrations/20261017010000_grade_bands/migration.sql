-- Correct the default subject-grade boundaries to the school's scale:
--   A 75-100, B 65-74, C 45-64, D 30-44, F 0-29.
-- Only rows still carrying the previous default bands are updated, so any
-- boundaries a school has customised are left untouched.
UPDATE "Grade" SET "minScore" = 45, "maxScore" = 64 WHERE "code" = 'C' AND "minScore" = 55 AND "maxScore" = 64;
UPDATE "Grade" SET "minScore" = 30, "maxScore" = 44 WHERE "code" = 'D' AND "minScore" = 45 AND "maxScore" = 54;
UPDATE "Grade" SET "minScore" = 0, "maxScore" = 29 WHERE "code" = 'F' AND "minScore" = 0 AND "maxScore" = 44;
