import express from "express";

import "express-async-errors";
import { userRouter } from "./router/user.router";
import { goalRouter } from "./router/goal.router";
import cors from "cors";
import { User } from "@prisma/client";
import { groupRouter } from "./router/group.router";

const app = express();
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

const port = normalizePort(process.env.PORT || "3000");
app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.use("/user", userRouter);
app.use("/goals", goalRouter);
app.use("/groups", groupRouter);

app.listen(port, () => {
  if (process.env.NODE_ENV === "development") {
    console.log(`Listening on localhost://${port} `);
  }
});

function normalizePort(val: string): string | number | false {
  let port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}
