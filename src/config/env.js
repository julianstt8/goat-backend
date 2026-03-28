import dotenv from "dotenv";
dotenv.config();

const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 3000),
  host: process.env.HOST ?? "localhost",
  hostRemoto: process.env.HOST_REMOTO ?? "localhost",

  db: {
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT ?? 5432),
    name: process.env.DB_NAME ?? "goat",
    user: process.env.DB_USER ?? "goat_user",
    pass: process.env.DB_PASS ?? "goat_password",
    logging: String(process.env.DB_LOGGING ?? "false") === "true",
  },

  jwt: {
    secret: process.env.JWT_SECRET ?? "changeme",
    expiresIn: process.env.JWT_EXPIRES ?? "2h",
  },

  bcryptRounds: Number(process.env.BCRYPT_ROUNDS ?? 12),
};

export default env;
