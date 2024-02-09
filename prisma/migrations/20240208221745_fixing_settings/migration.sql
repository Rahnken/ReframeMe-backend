/*
  Warnings:

  - The primary key for the `UserProfiles` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `Country` on the `UserProfiles` table. All the data in the column will be lost.
  - You are about to drop the column `DateOfBirth` on the `UserProfiles` table. All the data in the column will be lost.
  - You are about to drop the column `FirstName` on the `UserProfiles` table. All the data in the column will be lost.
  - You are about to drop the column `Interests` on the `UserProfiles` table. All the data in the column will be lost.
  - You are about to drop the column `LastName` on the `UserProfiles` table. All the data in the column will be lost.
  - You are about to drop the column `ProfileId` on the `UserProfiles` table. All the data in the column will be lost.
  - You are about to drop the column `Settings` on the `UserProfiles` table. All the data in the column will be lost.
  - You are about to drop the column `TimeZone` on the `UserProfiles` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `UserProfiles` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[user_id]` on the table `UserProfiles` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userSetting_id]` on the table `UserProfiles` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[user_id,userSetting_id]` on the table `UserProfiles` will be added. If there are existing duplicate values, this will fail.
  - The required column `profile_id` was added to the `UserProfiles` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `userSetting_id` to the `UserProfiles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `UserProfiles` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "UserProfiles" DROP CONSTRAINT "UserProfiles_userId_fkey";

-- DropIndex
DROP INDEX "UserProfiles_userId_key";

-- AlterTable
ALTER TABLE "UserProfiles" DROP CONSTRAINT "UserProfiles_pkey",
DROP COLUMN "Country",
DROP COLUMN "DateOfBirth",
DROP COLUMN "FirstName",
DROP COLUMN "Interests",
DROP COLUMN "LastName",
DROP COLUMN "ProfileId",
DROP COLUMN "Settings",
DROP COLUMN "TimeZone",
DROP COLUMN "userId",
ADD COLUMN     "country" TEXT,
ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "profile_id" TEXT NOT NULL,
ADD COLUMN     "timezone" TEXT,
ADD COLUMN     "userSetting_id" TEXT NOT NULL,
ADD COLUMN     "user_id" TEXT NOT NULL,
ADD CONSTRAINT "UserProfiles_pkey" PRIMARY KEY ("profile_id");

-- CreateTable
CREATE TABLE "UserSettings" (
    "userSetting_id" TEXT NOT NULL,
    "theme" TEXT,
    "profileComplete" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("userSetting_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserProfiles_user_id_key" ON "UserProfiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfiles_userSetting_id_key" ON "UserProfiles"("userSetting_id");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfiles_user_id_userSetting_id_key" ON "UserProfiles"("user_id", "userSetting_id");

-- AddForeignKey
ALTER TABLE "UserProfiles" ADD CONSTRAINT "UserProfiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProfiles" ADD CONSTRAINT "UserProfiles_userSetting_id_fkey" FOREIGN KEY ("userSetting_id") REFERENCES "UserSettings"("userSetting_id") ON DELETE RESTRICT ON UPDATE CASCADE;
