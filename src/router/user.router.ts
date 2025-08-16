import { Router } from "express";
import { validateRequest } from "zod-express-middleware";
import { prisma } from "../../prisma/db.setup";
import { z } from "zod";
import bcrypt from "bcrypt";
import {
  encryptPassword,
  createUserJwtToken,
  createTokenUserInfo,
  authenticationMiddleware,
} from "../utils/auth-utils";

const userRouter = Router();

userRouter.get("/", (req, res) => {
  res.send({ message: "Try the /login or /register routes" });
});

userRouter.post(
  "/login",
  validateRequest({
    body: z.object({
      username: z.string(),
      password: z.string(),
    }),
  }),
  async (req, res) => {
    const { username, password } = req.body;
    const user = await prisma.user.findFirst({
      where: {
        username: username,
      },
      include: {
        profiles: {
          include: {
            userSettings: true,
          },
        },
      },
    });

    if (!user) return res.status(404).send({ message: "User Not Found" });

    const isPasswordCorrect = await bcrypt.compare(
      password,
      user.hashedPassword
    );
    if (!isPasswordCorrect)
      return res
        .status(401)
        .send({ message: "Invalid Credentials, please try again" });
    await prisma.user.update({
      data: {
        lastLogin: new Date().toISOString(),
      },
      where: {
        user_id: user.user_id,
      },
    });
    const userInfo = createTokenUserInfo(user);
    const token = createUserJwtToken(user);
    return res.status(200).send({ token, userInfo });
  }
);

userRouter.post(
  "/register",
  validateRequest({
    body: z
      .object({
        username: z.string(),
        email: z.string().email(),
        password: z.string(),
      })
      .strict(),
  }),
  async (req, res) => {
    const { username, email, password } = req.body;
    
    try {
      const user = await prisma.user.create({
        data: {
          username: username,
          email: email,
          hashedPassword: await encryptPassword(password),
          profiles: {
            create: {
              userSettings: {
                create: {},
              },
            },
          },
        },
        include: {
          profiles: {
            include: {
              userSettings: true,
            },
          },
        },
      });

      return res.status(201).send({ user, message: "User created successfully" });
    } catch (error: any) {
      if (error.code === 'P2002') {
        // Prisma unique constraint error
        if (error.meta?.target?.includes('username')) {
          return res.status(409).json({
            error: "Username already exists. Please choose a different username."
          });
        }
        if (error.meta?.target?.includes('email')) {
          return res.status(409).json({
            error: "Email already exists. Please use a different email."
          });
        }
      }

      // Generic error handling
      console.error('User creation error:', error);
      return res.status(500).json({
        error: "An error occurred while creating your account. Please try again."
      });
    }
  }
);
userRouter.get("/userInfo", authenticationMiddleware, async (req, res) => {
  const user = await prisma.userProfiles.findFirst({
    where: {
      user_id: req.user?.user_id,
    },
    include: {
      userSettings: true,
    },
  });
  if (!user) return res.status(400).send({ message: "User not found " });
  return res.status(200).send(user);
});
userRouter.patch("/userInfo", authenticationMiddleware, async (req, res) => {
  const { user_id } = req.user!;
  const { firstName, lastName, country, timezone, userSettings } = req.body;
  const updatedUser = await prisma.userProfiles.update({
    data: {
      firstName,
      lastName,
      country,
      timezone,
      userSettings: {
        update: userSettings,
      },
    },
    where: {
      user_id,
    },
    include: {
      userSettings: true,
    },
  });
  if (!updatedUser)
    return res.status(400).send({ message: "User not found or not updated" });
  return res.status(200).send(updatedUser);
});

// Email update endpoint
userRouter.patch(
  "/email",
  authenticationMiddleware,
  validateRequest({
    body: z.object({
      newEmail: z.string().email(),
      currentPassword: z.string(),
    }),
  }),
  async (req, res) => {
    const { newEmail, currentPassword } = req.body;
    const { user_id } = req.user!;

    try {
      // Get current user with password
      const currentUser = await prisma.user.findUnique({
        where: { user_id },
      });

      if (!currentUser) {
        return res.status(404).json({ error: "User not found" });
      }

      // Verify current password
      const isPasswordCorrect = await bcrypt.compare(
        currentPassword,
        currentUser.hashedPassword
      );

      if (!isPasswordCorrect) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }

      // Update email
      const updatedUser = await prisma.user.update({
        where: { user_id },
        data: { email: newEmail },
        include: {
          profiles: {
            include: {
              userSettings: true,
            },
          },
        },
      });

      // Generate new JWT token with updated email
      const userInfo = createTokenUserInfo(updatedUser);
      const token = createUserJwtToken(updatedUser);

      return res.status(200).json({
        message: "Email updated successfully",
        user: { user_id: updatedUser.user_id, username: updatedUser.username, email: updatedUser.email },
        token,
        userInfo,
      });
    } catch (error: any) {
      if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
        return res.status(409).json({
          error: "Email already exists. Please use a different email.",
        });
      }

      console.error("Email update error:", error);
      return res.status(500).json({
        error: "An error occurred while updating your email. Please try again.",
      });
    }
  }
);

// Username update endpoint
userRouter.patch(
  "/username",
  authenticationMiddleware,
  validateRequest({
    body: z.object({
      newUsername: z.string(),
      currentPassword: z.string(),
    }),
  }),
  async (req, res) => {
    const { newUsername, currentPassword } = req.body;
    const { user_id } = req.user!;

    try {
      // Get current user with password
      const currentUser = await prisma.user.findUnique({
        where: { user_id },
      });

      if (!currentUser) {
        return res.status(404).json({ error: "User not found" });
      }

      // Verify current password
      const isPasswordCorrect = await bcrypt.compare(
        currentPassword,
        currentUser.hashedPassword
      );

      if (!isPasswordCorrect) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }

      // Update username
      const updatedUser = await prisma.user.update({
        where: { user_id },
        data: { username: newUsername },
        include: {
          profiles: {
            include: {
              userSettings: true,
            },
          },
        },
      });

      // Generate new JWT token with updated username
      const userInfo = createTokenUserInfo(updatedUser);
      const token = createUserJwtToken(updatedUser);

      return res.status(200).json({
        message: "Username updated successfully",
        user: { user_id: updatedUser.user_id, username: updatedUser.username, email: updatedUser.email },
        token,
        userInfo,
      });
    } catch (error: any) {
      if (error.code === 'P2002' && error.meta?.target?.includes('username')) {
        return res.status(409).json({
          error: "Username already exists. Please choose a different username.",
        });
      }

      console.error("Username update error:", error);
      return res.status(500).json({
        error: "An error occurred while updating your username. Please try again.",
      });
    }
  }
);

// Password update endpoint
userRouter.patch(
  "/password",
  authenticationMiddleware,
  validateRequest({
    body: z.object({
      currentPassword: z.string(),
      newPassword: z.string().min(6),
    }),
  }),
  async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const { user_id } = req.user!;

    try {
      // Get current user with password
      const currentUser = await prisma.user.findUnique({
        where: { user_id },
      });

      if (!currentUser) {
        return res.status(404).json({ error: "User not found" });
      }

      // Verify current password
      const isPasswordCorrect = await bcrypt.compare(
        currentPassword,
        currentUser.hashedPassword
      );

      if (!isPasswordCorrect) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }

      // Hash new password and update
      const hashedNewPassword = await encryptPassword(newPassword);
      await prisma.user.update({
        where: { user_id },
        data: { hashedPassword: hashedNewPassword },
      });

      return res.status(200).json({
        message: "Password updated successfully",
      });
    } catch (error: any) {
      console.error("Password update error:", error);
      return res.status(500).json({
        error: "An error occurred while updating your password. Please try again.",
      });
    }
  }
);

// Get user notifications
userRouter.get("/notifications", authenticationMiddleware, async (req, res) => {
  const { user_id } = req.user!;

  try {
    const notifications = await prisma.notification.findMany({
      where: { user_id },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json(notifications);
  } catch (error) {
    console.error("Get notifications error:", error);
    return res.status(500).json({
      error: "An error occurred while fetching notifications.",
    });
  }
});

// Mark notification as read
userRouter.patch(
  "/notifications/:notificationId/read",
  authenticationMiddleware,
  async (req, res) => {
    const { notificationId } = req.params;
    const { user_id } = req.user!;

    try {
      const notification = await prisma.notification.update({
        where: {
          id: notificationId,
          user_id: user_id, // Ensure user owns the notification
        },
        data: { read: true },
      });

      return res.status(200).json(notification);
    } catch (error) {
      console.error("Mark notification read error:", error);
      return res.status(500).json({
        error: "An error occurred while updating the notification.",
      });
    }
  }
);

// Mark all notifications as read
userRouter.patch("/notifications/mark-all-read", authenticationMiddleware, async (req, res) => {
  const { user_id } = req.user!;

  try {
    await prisma.notification.updateMany({
      where: {
        user_id: user_id,
        read: false,
      },
      data: { read: true },
    });

    return res.status(200).json({
      message: "All notifications marked as read",
    });
  } catch (error) {
    console.error("Mark all notifications read error:", error);
    return res.status(500).json({
      error: "An error occurred while updating notifications.",
    });
  }
});

export { userRouter };
