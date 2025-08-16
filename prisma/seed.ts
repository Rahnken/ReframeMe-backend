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

  const goalOneWeekly = createWeeklyGoalsArray(12, 1).map((week, index) => ({
    ...week,
    achieved: index < 3, // First 3 weeks achieved
    notes: index < 3 ? `Week ${index + 1}: Made good progress towards weight loss goal` : null,
  }));

  const ericGoalOne = await prisma.goal.create({
    data: {
      title: "Lose 12 Pounds",
      description: "Lose an average of 1 pound each week",
      isPrivate: true,
      user_id: eric.user_id,
      // SMART Goal fields
      specific: "Lose 12 pounds of body weight through diet and exercise",
      measurable: "Track weight loss weekly, aiming for 1 pound per week",
      attainable: "Based on recommended healthy weight loss of 1-2 pounds per week",
      relevant: "Improve overall health and fitness to feel more energetic",
      timeBound: "Achieve goal within 12 weeks, by end of quarter",
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
  const goalTwoWeekly = createWeeklyGoalsArray(15 * 7).map((week, index) => ({
    ...week,
    achieved: index < 5, // First 5 weeks achieved
    notes: index < 5 ? `Week ${index + 1}: Completed daily pushup routine successfully` : null,
  }));
  const ericGoalTwo = await prisma.goal.create({
    data: {
      title: "Do 15 Pushups each day",
      description: "Generate Muscle by doing 15 pushups every day",
      isPrivate: true,
      user_id: eric.user_id,
      // SMART Goal fields
      specific: "Complete 15 pushups every single day to build upper body strength",
      measurable: "Track daily completion of 15 pushups, totaling 105 per week",
      attainable: "Starting with current fitness level, 15 pushups is achievable",
      relevant: "Build muscle strength and improve overall fitness for daily activities",
      timeBound: "Maintain consistency for 12 weeks to see muscle development",
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
