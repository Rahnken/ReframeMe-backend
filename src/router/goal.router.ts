import { Router } from "express";
import { authenticationMiddleware } from "../utils/auth-utils";
import { prisma } from "../../prisma/db.setup";
import { z } from "zod";
import { validateRequest } from "zod-express-middleware";
import { createWeeklyGoalsArray } from "../utils/createWeeklyGoal";

const goalRouter = Router();

// Helper functions for computed fields
function calculateCurrentWeek(startDate: Date, cycleDuration: number): number {
  const today = new Date();
  const start = new Date(startDate);
  
  if (today < start) return 0;
  
  const daysDiff = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const weekNumber = Math.floor(daysDiff / 7) + 1;
  
  return Math.min(weekNumber, cycleDuration);
}

function isGoalActive(startDate: Date, endDate: Date): boolean {
  const today = new Date();
  return today >= startDate && today <= endDate;
}

function calculateDaysRemaining(endDate: Date): number {
  const today = new Date();
  const end = new Date(endDate);
  const daysDiff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, daysDiff);
}

// url../goals
goalRouter.get("/", authenticationMiddleware, async (req, res) => {
  const goals = await prisma.goal.findMany({
    where: {
      user_id: req.user!.user_id,
    },
    include: {
      goalWeeks: {
        orderBy: { weekNumber: 'asc' }
      },
      sharedGoals: true,
    },
  });

  // Add computed fields
  const goalsWithComputedFields = goals.map(goal => ({
    ...goal,
    currentWeek: calculateCurrentWeek(goal.startDate, goal.cycleDuration),
    isActive: isGoalActive(goal.startDate, goal.endDate),
    daysRemaining: calculateDaysRemaining(goal.endDate)
  }));

  return res.status(200).send(goalsWithComputedFields);
});
// url../goals/create
goalRouter.post(
  "/create",
  authenticationMiddleware,
  validateRequest({
    body: z.object({
      title: z.string(),
      description: z.string(),
      isPrivate: z.boolean(),
      weeklyTrackingTotal: z.number(),
      sharedToGroup: z.array(z.string()).optional(),
      // SMART Goal fields (optional)
      specific: z.string().optional(),
      measurable: z.string().optional(),
      attainable: z.string().optional(),
      relevant: z.string().optional(),
      timeBound: z.string().optional(),
      // Goal Cycle fields
      startDate: z.string(),
      endDate: z.string(),
      cycleDuration: z.number(),
    }),
  }),
  async (req, res) => {
    const { title, description, isPrivate, weeklyTrackingTotal, specific, measurable, attainable, relevant, timeBound, startDate, endDate, cycleDuration } = req.body;
    const weeklyGoalProgress = createWeeklyGoalsArray(weeklyTrackingTotal, cycleDuration);
    const newGoal = await prisma.goal.create({
      data: {
        title: title,
        description: description,
        user_id: req.user!.user_id,
        isPrivate: isPrivate,
        // Include SMART goal fields
        specific: specific,
        measurable: measurable,
        attainable: attainable,
        relevant: relevant,
        timeBound: timeBound,
        // Goal Cycle fields
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        cycleDuration: cycleDuration,
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
    const sharedGroups = req.body.sharedToGroup;
    console.log(sharedGroups);
    if (sharedGroups) {
      for (const groupId of sharedGroups) {
        await prisma.sharedGoal.create({
          data: { goal_id: newGoal.id, group_id: groupId },
        });
      }
    }

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
      goalWeeks: {
        orderBy: { weekNumber: 'asc' }
      },
      sharedGoals: true,
    },
  });
  if (!goal)
    return res
      .status(400)
      .send({ message: "Could not find goal matching that id" });

  // Add computed fields
  const goalWithComputedFields = {
    ...goal,
    currentWeek: calculateCurrentWeek(goal.startDate, goal.cycleDuration),
    isActive: isGoalActive(goal.startDate, goal.endDate),
    daysRemaining: calculateDaysRemaining(goal.endDate)
  };

  return res.status(200).send(goalWithComputedFields);
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
      // SMART Goal fields
      specific,
      measurable,
      attainable,
      relevant,
      timeBound,
      // Goal Cycle fields
      startDate,
      endDate,
      cycleDuration,
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
      // If cycleDuration is being changed, handle goalWeeks adjustments
      if (cycleDuration) {
        const existingGoal = await prisma.goal.findUnique({
          where: { id },
          include: { goalWeeks: true }
        });

        if (existingGoal && cycleDuration !== existingGoal.cycleDuration) {
          if (cycleDuration > existingGoal.cycleDuration) {
            // Add new weeks
            const newWeeks = [];
            for (let week = existingGoal.cycleDuration + 1; week <= cycleDuration; week++) {
              newWeeks.push({
                goal_id: id,
                weekNumber: week,
                targetAmount: weeklyTrackingTotal || existingGoal.goalWeeks[0]?.targetAmount || 1,
                completedAmount: 0,
                achieved: false
              });
            }
            await prisma.goalProgress.createMany({ data: newWeeks });
          } else {
            // Remove excess weeks
            await prisma.goalProgress.deleteMany({
              where: {
                goal_id: id,
                weekNumber: { gt: cycleDuration }
              }
            });
          }
        }
      }

      // Update targetAmount for all weeks if changed
      if (weeklyTrackingTotal) {
        await prisma.goalProgress.updateMany({
          where: { goal_id: id },
          data: { targetAmount: weeklyTrackingTotal }
        });
      }

      const updatedGoal = await prisma.goal.update({
        where: { id },
        data: {
          title,
          description,
          isPrivate,
          // Include SMART goal fields
          specific,
          measurable,
          attainable,
          relevant,
          timeBound,
          // Goal Cycle fields
          ...(startDate && { startDate: new Date(startDate) }),
          ...(endDate && { endDate: new Date(endDate) }),
          ...(cycleDuration && { cycleDuration }),
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
    const { id, completedAmount, feedback, targetAmount, achieved, notes } = req.body;
    const updateValues = {
      completedAmount: completedAmount,
      feedback: feedback,
      targetAmount: targetAmount,
      achieved: achieved,
      notes: notes,
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

// Get all progress for a goal
goalRouter.get(
  "/:goal_id/progress",
  authenticationMiddleware,
  async (req, res) => {
    const { goal_id } = req.params;
    
    const progress = await prisma.goalProgress.findMany({
      where: {
        goal_id: goal_id,
      },
      orderBy: {
        weekNumber: 'asc',
      },
    });

    return res.status(200).send(progress);
  }
);

// Save weekly achievement status and notes
goalRouter.post(
  "/:goal_id/progress/week",
  authenticationMiddleware,
  validateRequest({
    body: z.object({
      weekNumber: z.number(),
      achieved: z.boolean(),
      notes: z.string().optional(),
      completedAmount: z.number().optional(),
      targetAmount: z.number().optional(),
    }),
  }),
  async (req, res) => {
    const { goal_id } = req.params;
    const { weekNumber, achieved, notes, completedAmount, targetAmount } = req.body;

    try {
      // Check if progress already exists for this goal/week
      const existingProgress = await prisma.goalProgress.findUnique({
        where: {
          goal_id_weekNumber: {
            goal_id: goal_id,
            weekNumber: weekNumber,
          },
        },
      });

      if (existingProgress) {
        // Update existing progress
        const updatedProgress = await prisma.goalProgress.update({
          where: {
            goal_id_weekNumber: {
              goal_id: goal_id,
              weekNumber: weekNumber,
            },
          },
          data: {
            achieved,
            notes,
            completedAmount: completedAmount ?? existingProgress.completedAmount,
            targetAmount: targetAmount ?? existingProgress.targetAmount,
          },
        });
        return res.status(200).send(updatedProgress);
      } else {
        // Create new progress entry
        const newProgress = await prisma.goalProgress.create({
          data: {
            goal_id,
            weekNumber,
            achieved,
            notes,
            completedAmount: completedAmount ?? 0,
            targetAmount: targetAmount ?? 1,
          },
        });
        return res.status(201).send(newProgress);
      }
    } catch (error) {
      console.error("Failed to save weekly progress", error);
      return res.status(400).send({ message: "Could not save weekly progress" });
    }
  }
);

// Update specific week progress
goalRouter.put(
  "/:goal_id/progress/week/:weekNumber",
  authenticationMiddleware,
  validateRequest({
    body: z.object({
      achieved: z.boolean().optional(),
      notes: z.string().optional(),
      completedAmount: z.number().optional(),
      targetAmount: z.number().optional(),
    }),
  }),
  async (req, res) => {
    const { goal_id, weekNumber } = req.params;
    const { achieved, notes, completedAmount, targetAmount } = req.body;

    try {
      const updatedProgress = await prisma.goalProgress.update({
        where: {
          goal_id_weekNumber: {
            goal_id: goal_id,
            weekNumber: parseInt(weekNumber),
          },
        },
        data: {
          ...(achieved !== undefined && { achieved }),
          ...(notes !== undefined && { notes }),
          ...(completedAmount !== undefined && { completedAmount }),
          ...(targetAmount !== undefined && { targetAmount }),
        },
      });

      return res.status(200).send(updatedProgress);
    } catch (error) {
      console.error("Failed to update weekly progress", error);
      return res.status(400).send({ message: "Could not update weekly progress" });
    }
  }
);

// Get specific week progress
goalRouter.get(
  "/:goal_id/progress/week/:weekNumber",
  authenticationMiddleware,
  async (req, res) => {
    const { goal_id, weekNumber } = req.params;
    
    try {
      const progress = await prisma.goalProgress.findUnique({
        where: {
          goal_id_weekNumber: {
            goal_id: goal_id,
            weekNumber: parseInt(weekNumber),
          },
        },
      });

      if (!progress) {
        return res.status(404).send({ message: "Progress not found for this week" });
      }

      return res.status(200).send(progress);
    } catch (error) {
      console.error("Failed to get weekly progress", error);
      return res.status(400).send({ message: "Could not get weekly progress" });
    }
  }
);

// Batch update multiple weeks progress
goalRouter.post(
  "/:goal_id/progress/batch",
  authenticationMiddleware,
  validateRequest({
    body: z.object({
      weekProgress: z.record(z.object({
        achieved: z.boolean(),
        notes: z.string().optional(),
      })),
    }),
  }),
  async (req, res) => {
    const { goal_id } = req.params;
    const { weekProgress } = req.body;

    try {
      const updates = [];
      
      for (const [weekNumberStr, progressData] of Object.entries(weekProgress)) {
        const weekNumber = parseInt(weekNumberStr);
        
        // Use upsert to either create or update
        const upsertResult = prisma.goalProgress.upsert({
          where: {
            goal_id_weekNumber: {
              goal_id: goal_id,
              weekNumber: weekNumber,
            },
          },
          update: {
            achieved: progressData.achieved,
            notes: progressData.notes,
          },
          create: {
            goal_id,
            weekNumber,
            achieved: progressData.achieved,
            notes: progressData.notes,
            targetAmount: 1, // Default value
            completedAmount: progressData.achieved ? 1 : 0,
          },
        });
        
        updates.push(upsertResult);
      }

      const results = await prisma.$transaction(updates);
      return res.status(200).send(results);
    } catch (error) {
      console.error("Failed to batch update progress", error);
      return res.status(400).send({ message: "Could not batch update progress" });
    }
  }
);

goalRouter.delete(
  "/:goal_id/delete",
  authenticationMiddleware,
  async (req, res) => {
    const { goal_id } = req.params;

    try {
      await prisma.$transaction([
        prisma.sharedGoal.deleteMany({
          where: {
            goal_id: goal_id,
          },
        }),
        prisma.goalProgress.deleteMany({
          where: {
            goal_id: goal_id,
          },
        }),
        prisma.goal.delete({
          where: {
            id: goal_id,
          },
        }),
      ]);
      return res.status(200).send({ message: "Goal deleted successfully" });
    } catch (error) {
      console.error("Failed to delete goal", error);
      return res.status(400).send({ message: "Could not delete that goal" });
    }
  }
);

export { goalRouter };
