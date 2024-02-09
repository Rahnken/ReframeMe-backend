import bcrypt from "bcrypt";

const saltRounds = 12;

export const encryptPassword = (password: string) => {
  return bcrypt.hash(password, saltRounds);
};
