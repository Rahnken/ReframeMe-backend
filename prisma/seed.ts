import { z } from "zod";
import { prisma } from "./db.setup";

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
    },
  });
  // Create jon
  const jon = await prisma.user.create({
    data: {
      username: "JHiggz",
      email: "jon@jon.com",
    },
  });
  const ericProfile = await prisma.userProfiles.create({
    data: {
      FirstName: "Eric",
      LastName: "Donnelly",
      DateOfBirth: new Date("1993-12-30").toISOString(),
      Country: "Canada",
      TimeZone: "GMT-5",
      userId: eric.userId,
      Settings: {
        theme: "dark",
        hasProfile: true,
      },
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
