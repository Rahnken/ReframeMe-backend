import { prisma } from "./db.setup";

const clearDB = async () => {
  console.log(" Dropping DB for clean migrations");
  await prisma.userProfiles.deleteMany();
  await prisma.userSettings.deleteMany();
  await prisma.goalProgress.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.user.deleteMany();

  console.log("All Gone, time to reseed");
};

export { clearDB };
