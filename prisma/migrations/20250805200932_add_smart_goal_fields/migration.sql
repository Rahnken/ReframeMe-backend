-- AlterTable
ALTER TABLE "Goal" ADD COLUMN     "attainable" TEXT,
ADD COLUMN     "measurable" TEXT,
ADD COLUMN     "relevant" TEXT,
ADD COLUMN     "specific" TEXT,
ADD COLUMN     "timeBound" TEXT;

-- AlterTable
ALTER TABLE "UserSettings" ALTER COLUMN "theme" SET DEFAULT 'modernDark';
