import { z } from "zod";
import { prisma } from "./db.setup";
import bcrypt from "bcrypt";
const clearDB = async () => {
  await prisma.goal.deleteMany();
  await prisma.user.deleteMany();
};

const seedDB = async () => {
  console.log("Starting to seed DB...");
  await clearDB();

  // Create Eric
  const eric = await prisma.user.create({
    data: {
      username: "EDonn1",
      email: "eric@eric.com",
      hashedPassword: await bcrypt.hash("p@$$word!?", 12).then((hash) => hash),
    },
  });
  // Create jon
  const jon = await prisma.user.create({
    data: {
      username: "JHiggz",
      email: "jon@jon.com",
      hashedPassword: await bcrypt.hash("p@$$w0rd2", 12).then((hash) => hash),
    },
  });
  const ericUserSettings = await prisma.userSettings.create({
    data: {
      theme: "dark",
    },
  });

  const ericProfile = await prisma.userProfiles.create({
    data: {
      firstName: "Eric",
      lastName: "Donnelly",
      dateOfBirth: new Date("1993-12-30").toISOString(),
      country: "Canada",
      timezone: "GMT-5",
      user_id: eric.userId,
      userSetting_id: ericUserSettings.userSetting_id,
    },
  });
};

seedDB()
  .then(() => {
    console.log("Seeding complete");
  })
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
