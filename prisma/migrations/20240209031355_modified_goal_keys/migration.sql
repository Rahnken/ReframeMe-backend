/*
  Warnings:

  - You are about to drop the column `content` on the `Goal` table. All the data in the column will be lost.
  - Added the required column `description` to the `Goal` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Goal" DROP COLUMN "content",
ADD COLUMN     "description" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "GoalProgress" ADD COLUMN     "feedback" TEXT,
ALTER COLUMN "completedAmount" DROP NOT NULL;
