/*
  Warnings:

  - A unique constraint covering the columns `[group_id,user_id]` on the table `Group_Users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `user_id` to the `Group_Users` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Group_Users" ADD COLUMN     "user_id" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Group_Users_group_id_user_id_key" ON "Group_Users"("group_id", "user_id");

-- AddForeignKey
ALTER TABLE "Group_Users" ADD CONSTRAINT "Group_Users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
