import { z } from "zod";
import { prisma } from "./db.setup";

import { clearDB } from "./clearDB";
import { createWeeklyGoalsArray } from "../src/utils/createWeeklyGoal";
import { encryptPassword } from "../src/utils/auth-utils";

const seedDB = async () => {
  console.log("Starting to seed DB...");
  await clearDB();

  // Create Eric
  const eric = await prisma.user.create({
    data: {
      username: "EDonn1",
      email: "eric@eric.com",
      hashedPassword: await encryptPassword("P4$$word!?"),
    },
  });
  // Create jon
  const jon = await prisma.user.create({
    data: {
      username: "JHiggz",
      email: "jon@jon.com",
      hashedPassword: await encryptPassword("P@$$w0rd2"),
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
      user_id: eric.user_id,
      userSetting_id: ericUserSettings.userSetting_id,
    },
  });

  const goalOneWeekly = createWeeklyGoalsArray(12, 1);

  const ericGoalOne = await prisma.goal.create({
    data: {
      title: "Lose 12 Pounds",
      description: "Lose an average of 1 pound each week",
      isPrivate: true,
      user_id: eric.user_id,
      goalWeeks: {
        createMany: {
          data: [...goalOneWeekly],
        },
      },
    },
    include: {
      goalWeeks: true,
    },
  });
  const goalTwoWeekly = createWeeklyGoalsArray(12, 15 * 7);
  const ericGoalTwo = await prisma.goal.create({
    data: {
      title: "Do 15 Pushups each day",
      description: "Generate Muscle by doing 15 pushups every day",
      isPrivate: true,
      user_id: eric.user_id,
      goalWeeks: {
        createMany: {
          data: [...goalTwoWeekly],
        },
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
