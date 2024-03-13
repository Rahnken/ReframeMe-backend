import { Router } from "express";
import { authenticationMiddleware } from "../utils/auth-utils";
import { prisma } from "../../prisma/db.setup";
import { z } from "zod";
import { validateRequest } from "zod-express-middleware";
import { createWeeklyGoalsArray } from "../utils/createWeeklyGoal";

const goalRouter = Router();

goalRouter.get("/", authenticationMiddleware, async (req, res) => {
  const goals = await prisma.goal.findMany({
    where: {
      user_id: req.user!.user_id,
    },
    include: {
      goalWeeks: true,
      sharedGoals: true,
    },
  });

  return res.status(200).send(goals);
});

goalRouter.post(
  "/create",
  authenticationMiddleware,
  validateRequest({
    body: z.object({
      title: z.string(),
      description: z.string(),
      isPrivate: z.boolean(),
      weeklyTrackingTotal: z.number(),
    }),
  }),
  async (req, res) => {
    const { title, description, isPrivate, weeklyTrackingTotal } = req.body;
    const weeklyGoalProgress = createWeeklyGoalsArray(12, weeklyTrackingTotal);
    const newGoal = await prisma.goal.create({
      data: {
        title: title,
        description: description,
        user_id: req.user!.user_id,
        isPrivate: isPrivate,
        goalWeeks: {
          createMany: {
            data: [...weeklyGoalProgress],
          },
        },
      },
      include: {
        goalWeeks: true,
      },
    });

    if (!newGoal)
      return res
        .status(400)
        .send({ message: "Something went wrong ... Goal was not created" });

    return res.status(201).send(newGoal);
  }
);
goalRouter.get("/:goal_id", authenticationMiddleware, async (req, res) => {
  const { goal_id } = req.params;
  const goal = await prisma.goal.findFirst({
    where: {
      id: goal_id,
    },
    include: {
      goalWeeks: true,
      sharedGoals: true,
    },
  });
  if (!goal)
    return res
      .status(400)
      .send({ message: "Could not find goal matching that id" });
  return res.status(200).send(goal);
});

goalRouter.patch(
  "/:goal_id/edit",
  authenticationMiddleware,
  async (req, res) => {
    const {
      id,
      title,
      description,
      isPrivate,
      weeklyTrackingTotal,
      sharedGroups, // Assume this is an array of group IDs to share with
    } = req.body;

    // Fetch current shared groups for the goal
    const currentShared = await prisma.sharedGoal.findMany({
      where: { goal_id: id },
      select: { group_id: true },
    });
    const currentGroupIds = currentShared.map((sg) => sg.group_id);

    // Determine which groups to connect and disconnect
    const newGroupIds: string[] = sharedGroups.map((sg: string) => sg);
    const groupsToConnect = newGroupIds.filter(
      (id: string) => !currentGroupIds.includes(id)
    );
    const groupsToDisconnect = currentGroupIds.filter(
      (id) => !newGroupIds.includes(id)
    );
    // Delete shared goals that are not in the new groups
    for (const groupId of groupsToDisconnect) {
      await prisma.sharedGoal.deleteMany({
        where: { goal_id: id, group_id: groupId },
      });
    }

    // Connect to new groups
    for (const groupId of groupsToConnect) {
      await prisma.sharedGoal.create({
        data: { goal_id: id, group_id: groupId },
      });
    }

    try {
      const updatedGoal = await prisma.goal.update({
        where: { id },
        data: {
          title,
          description,
          isPrivate,
          goalWeeks: {
            updateMany: {
              where: { goal_id: id },
              data: { targetAmount: weeklyTrackingTotal },
            },
          },
        },
        include: {
          goalWeeks: true,
          sharedGoals: true,
        },
      });

      return res.status(200).send(updatedGoal);
    } catch (error) {
      console.error("Failed to update goal with shared groups", error);
      return res.status(400).send({ message: "Could not update that goal" });
    }
  }
);

goalRouter.get(
  "/:goal_id/:weekNumber",
  authenticationMiddleware,
  async (req, res) => {
    const { goal_id, weekNumber } = req.params;
    const weekGoal = await prisma.goalProgress.findFirst({
      where: {
        goal_id: goal_id,
        weekNumber: parseInt(weekNumber),
      },
    });

    if (!weekGoal)
      return res.status(400).send({ message: "Could not find that week goal" });

    return res.status(200).send(weekGoal);
  }
);
goalRouter.patch(
  "/:goal_id/:weekNumber",
  authenticationMiddleware,
  async (req, res) => {
    const { goal_id, weekNumber } = req.params;
    const { id, completedAmount, feedback, targetAmount } = req.body;
    const updateValues = {
      completedAmount: completedAmount,
      feedback: feedback,
      targetAmount: targetAmount,
    };
    const updateWeek = await prisma.goalProgress.update({
      where: {
        goal_id: goal_id,
        weekNumber: parseInt(weekNumber),
        id: id,
      },
      data: { ...updateValues },
    });
    if (!updateWeek)
      return res.status(400).send({ message: "Unable to update week" });

    return res.status(201).send(updateWeek);
  }
);
export { goalRouter };
