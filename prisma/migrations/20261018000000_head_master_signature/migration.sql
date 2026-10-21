-- Head master's signature/stamp image, stamped onto report forms so the head
-- master does not have to sign every report by hand.
ALTER TABLE "SchoolSettings" ADD COLUMN "headMasterSignatureUrl" TEXT;
ALTER TABLE "SchoolSettings" ADD COLUMN "headMasterSignatureUpdatedAt" DATETIME;
