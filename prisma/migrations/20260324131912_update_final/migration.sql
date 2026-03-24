-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN "proposal" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "preferredPartners" TEXT;
ALTER TABLE "User" ADD COLUMN "userType" TEXT;
ALTER TABLE "User" ADD COLUMN "userTypeDetail" TEXT;
