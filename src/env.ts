import { z } from "zod";
import dotenv from "dotenv";
dotenv.config();

export const env = z
  .object({
    DATABASE_URL: z.string(),
    JWT_SECRET: z.string(),
    PORT: z.string(),
  })
  .parse(process.env);
