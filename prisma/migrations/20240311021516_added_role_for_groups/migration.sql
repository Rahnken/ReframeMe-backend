/*
  Warnings:

  - Added the required column `role` to the `Group_Users` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MEMBER');

-- AlterTable
ALTER TABLE "Group_Users" ADD COLUMN     "role" "Role" NOT NULL;
