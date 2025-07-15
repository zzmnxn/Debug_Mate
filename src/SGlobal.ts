import "dotenv/config";

export const SGlobal = {
  env: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    PORT: process.env.PORT,
  },
};
