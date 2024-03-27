import { User } from "@prisma/client";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { z } from "zod";
import { NextFunction, Request, Response } from "express";
import { prisma } from "../../prisma/db.setup";
import type {} from "../app";

import dotenv from "dotenv";
dotenv.config();

const saltRounds = 12;

export const encryptPassword = (password: string) => {
  return bcrypt.hash(password, saltRounds);
};

export const createTokenUserInfo = (user: any) => {
  return {
    email: user.email,
    username: user.username,
    lastLogin: user.lastLogin,
    theme: user.profiles.userSettings.theme,
  };
};

const jwtInfoSchema = z.object({
  email: z.string().email(),
  username: z.string(),
  lastLogin: z.string().datetime(),
  iat: z.number(),
});

export const createUserJwtToken = (user: User) => {
  return jwt.sign(createTokenUserInfo(user), process.env.JWT_SECRET!);
};

export const getDataFromAuthToken = (token?: string) => {
  if (!token) return null;
  try {
    return jwtInfoSchema.parse(jwt.verify(token, process.env.JWT_SECRET!));
  } catch (e) {
    console.error(e);
    return null;
  }
};

export const authenticationMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const [, token] = req.headers.authorization?.split?.(" ") || [];
  const userJWTData = getDataFromAuthToken(token);
  if (!userJWTData) return res.status(401).send({ message: "Invalid token" });

  const user = await prisma.user.findFirst({
    where: {
      username: userJWTData.username,
    },
  });
  if (!user) return res.status(401).send({ message: "User not Found" });

  req.user = user;
  next();
};
