import { Router } from "express";
import { authenticationMiddleware } from "../utils/auth-utils";
import { prisma } from "../../prisma/db.setup";
import { validateRequest } from "zod-express-middleware";
import { z } from "zod";
import { Role } from "@prisma/client";

const groupRouter = Router();

groupRouter.get("/", authenticationMiddleware, async (req, res) => {
  const groups = await prisma.group.findMany({
    where: {
      users: {
        some: { user_id: req.user?.user_id },
      },
    },
    include: {
      sharedGoals: true,
      users: {
        include: {
          user: true,
        },
      },
    },
  });
  return res.status(200).send(groups);
});

groupRouter.post(
  "/create",
  authenticationMiddleware,
  validateRequest({
    body: z.object({
      name: z.string(),
      description: z.string(),
    }),
  }),
  async (req, res) => {
    const { name, description } = req.body;

    const group = await prisma.group.create({
      data: {
        name,
        description,
        users: {
          create: {
            user_id: req.user!.user_id,
            role: "ADMIN",
          },
        },
      },
    });

    return res.status(201).json(group);
  }
);

groupRouter.get("/:groupId/", authenticationMiddleware, async (req, res) => {
  const { groupId } = req.params;
  const group = await prisma.group.findFirst({
    where: { id: groupId },
    include: {
      users: {
        include: {
          user: true,
        },
      },
      sharedGoals: {
        include: {
          goal: {
            include: {
              goalWeeks: true,
            },
          },
        },
      },
    },
  });
  if (!group)
    return res
      .status(400)
      .send({ message: "Could not find group matching that id" });
  return res.status(200).send(group);
});

groupRouter.post(
  "/:groupId/users",
  authenticationMiddleware,
  validateRequest({
    body: z.object({
      users: z.array(
        z.object({
          user_email: z.string().email(),
          role: z.nativeEnum(Role),
        })
      ),
    }),
  }),
  async (req, res) => {
    const { groupId } = req.params;
    const { users } = req.body;
    const userIds = await Promise.all(
      users.map(async (user) => {
        const existingUser = await prisma.user.findFirst({
          where: { email: user.user_email },
          select: { user_id: true },
        });
        return existingUser?.user_id;
      })
    );
    const validUserIds = userIds.filter((id) => id !== undefined);
    const userRecords = validUserIds.map((userId) => ({
      user_id: userId!,
      role: Role.MEMBER,
    }));
    const updatedGroup = await prisma.group.update({
      where: { id: groupId },
      data: {
        users: {
          create: userRecords.map((user) => ({
            user_id: user.user_id,
            role: user.role,
          })),
        },
      },
      include: {
        users: true,
      },
    });

    return res.status(200).json(updatedGroup);
  }
);

groupRouter.patch(
  "/:groupId/users/:userId",
  authenticationMiddleware,
  validateRequest({
    body: z.object({
      role: z.nativeEnum(Role),
    }),
  }),
  async (req, res) => {
    const { groupId, userId } = req.params;
    const { role } = req.body;
    console.log(userId);

    const memberToUpdate = await prisma.group_Users.findFirst({
      select: { id: true, role: true, user_id: true, group_id: true },
      where: {
        id: userId,
      },
    });
    console.log(memberToUpdate);
    if (!memberToUpdate)
      return res
        .status(404)
        .send({ message: "User not found in group or group not found." });

    const updatedMembership = await prisma.group_Users.update({
      where: {
        id: memberToUpdate?.id,
      },
      data: {
        role,
      },
    });
    console.log(updatedMembership);

    if (!updatedMembership)
      return res
        .status(404)
        .send({ message: "User not updated. Please try again." });

    return res.status(200).send({ message: "Role updated successfully." });
  }
);

groupRouter.delete(
  "/:groupId/users/:userId",
  authenticationMiddleware,
  async (req, res) => {
    const { groupId, userId } = req.params;
    try {
      const user = await prisma.group_Users.findFirst({
        select: { user_id: true },
        where: {
          id: userId,
        },
      });
      if (!user) {
        return res.status(404).json({ message: "User not found in group." });
      }
      const goals = await prisma.sharedGoal.findMany({
        where: {
          goal: {
            user_id: user.user_id,
          },
          group_id: groupId,
        },
        include: {
          goal: true,
        },
      });
      await prisma.sharedGoal.deleteMany({
        where: {
          goal: {
            user_id: user.user_id,
          },
          group_id: groupId,
        },
      });

      await prisma.group_Users.deleteMany({
        where: {
          group_id: groupId,
          id: userId,
        },
      });
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Failed to remove user from group." });
    }

    return res
      .status(200)
      .json({ message: "User removed from group successfully." });
  }
);

groupRouter.delete("/:groupId", authenticationMiddleware, async (req, res) => {
  const { groupId } = req.params;

  try {
    await prisma.$transaction([
      prisma.group_Users.deleteMany({
        where: {
          group_id: groupId,
        },
      }),
      prisma.sharedGoal.deleteMany({
        where: {
          group_id: groupId,
        },
      }),
      prisma.group.delete({
        where: {
          id: groupId,
        },
      }),
    ]);
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete group." });
  }

  return res.status(200).json({ message: "Group deleted successfully." });
});

export { groupRouter };
