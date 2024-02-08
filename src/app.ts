import express from "express";

import "express-async-errors";
import { userRouter } from "./router/user.router";
import { goalRouter } from "./router/goal.router";

const app = express();
const port = process.env.PORT || 3000;
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.use("/user", userRouter);
app.use("/goals", goalRouter);

app.listen(port, () => {
  console.log(`Listening on localhost://${port} `);
});
