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
      sharedGoals: true,
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
          user_id: z.string(),
          role: z.nativeEnum(Role),
        })
      ),
    }),
  }),
  async (req, res) => {
    const { groupId } = req.params;
    const { users } = req.body;

    const updatedGroup = await prisma.group.update({
      where: { id: groupId },
      data: {
        users: {
          create: users,
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

    const updatedMembership = await prisma.group_Users.updateMany({
      where: {
        group_id: groupId,
        user_id: userId,
      },
      data: {
        role,
      },
    });

    if (updatedMembership.count === 0) {
      return res
        .status(404)
        .send("User not found in group or group not found.");
    }

    return res.status(200).json({ message: "Role updated successfully." });
  }
);

groupRouter.delete(
  "/:groupId/users/:userId",
  authenticationMiddleware,
  async (req, res) => {
    const { groupId, userId } = req.params;

    await prisma.group_Users.deleteMany({
      where: {
        group_id: groupId,
        user_id: userId,
      },
    });

    return res
      .status(200)
      .json({ message: "User removed from group successfully." });
  }
);

export { groupRouter };
