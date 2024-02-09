import bcrypt from "bcrypt";

bcrypt.hash("p@$$w0rd2", 12).then((hash) => console.log(hash));
