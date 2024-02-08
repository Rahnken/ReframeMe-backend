-- CreateTable
CREATE TABLE "User" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdOn" DATETIME NOT NULL,
    "lastLogin" DATETIME
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "isPrivate" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Goal_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("userId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GoalProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "goal_id" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "targetAmount" INTEGER NOT NULL,
    "completedAmount" INTEGER NOT NULL,
    CONSTRAINT "GoalProgress_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "Goal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SharedGoal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "goal_id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    CONSTRAINT "SharedGoal_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "Goal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SharedGoal_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "Group" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserProfiles" (
    "ProfileId" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "FirstName" TEXT,
    "LastName" TEXT,
    "DateOfBirth" DATETIME,
    "Country" TEXT,
    "TimeZone" TEXT,
    "Interests" TEXT,
    "Settings" TEXT,
    CONSTRAINT "UserProfiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("userId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Group_Users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "group_id" TEXT NOT NULL,
    CONSTRAINT "Group_Users_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "Group" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "GoalProgress_goal_id_weekNumber_key" ON "GoalProgress"("goal_id", "weekNumber");

-- CreateIndex
CREATE UNIQUE INDEX "SharedGoal_goal_id_group_id_key" ON "SharedGoal"("goal_id", "group_id");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfiles_userId_key" ON "UserProfiles"("userId");
