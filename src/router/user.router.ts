import { Router } from "express";
import { validateRequest } from "zod-express-middleware";
import { prisma } from "../../prisma/db.setup";
import { z } from "zod";
import bcrypt from "bcrypt";
import { encryptPassword } from "../utils/auth-utils";

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
    });

    if (!user) return res.status(404).send({ message: "User Not Found" });

    const isPasswordCorrect = await bcrypt.compare(
      password,
      user.hashedPassword
    );
    if (!isPasswordCorrect)
      res
        .status(401)
        .send({ message: "Invalid Credentials, please try again" });

    return res.status(200).send(user);
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
      },
    });
    if (!user)
      return res
        .send(400)
        .send({ message: "Something went wrong ... User was not Created " });

    return res.status(201).send(user);
  }
);

export { userRouter };

//
