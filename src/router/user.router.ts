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
    if (!user)
      return res
        .status(400)
        .send({ message: "Something went wrong ... User was not Created " });

    return res.status(201).send(user);
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

export { userRouter };
