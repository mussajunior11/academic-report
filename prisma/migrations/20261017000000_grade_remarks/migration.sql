-- Per-grade report-card remarks. The academic master's and head master's remarks
-- are configured once per average grade (Settings → Report remarks) and are used
-- to auto-fill a student's report form.
ALTER TABLE "Grade" ADD COLUMN "academicMasterRemark" TEXT;
ALTER TABLE "Grade" ADD COLUMN "headMasterRemark" TEXT;

-- Backfill sensible defaults for existing grade rows (new rows are created with
-- these defaults by the grading service).
UPDATE "Grade" SET "academicMasterRemark" = CASE "code"
    WHEN 'A' THEN 'An excellent overall performance. Maintain this consistency and standard of work.'
    WHEN 'B' THEN 'A very good overall performance. Aim a little higher to reach the top grade.'
    WHEN 'C' THEN 'A good overall performance. More consistent effort will improve your results.'
    WHEN 'D' THEN 'A fair overall performance. You need to work harder and revise regularly.'
    ELSE 'A weak overall performance. Serious improvement and extra study are required.' END
WHERE "academicMasterRemark" IS NULL;

UPDATE "Grade" SET "headMasterRemark" = CASE "code"
    WHEN 'A' THEN 'Excellent result. Keep up the outstanding effort.'
    WHEN 'B' THEN 'A very good result. Well done — keep working hard.'
    WHEN 'C' THEN 'A good result. Push yourself for a higher grade next time.'
    WHEN 'D' THEN 'You can do much better. Increase your effort and focus.'
    ELSE 'You must work much harder to improve your results.' END
WHERE "headMasterRemark" IS NULL;
