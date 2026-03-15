import dotenv from "dotenv";
dotenv.config({ override: true });

import { createApp } from "./app.js";

/**
 * 🛡️ Safety nets — Node.js must NEVER crash silently
 */
process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION:", err);
});

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
});

const port = Number(process.env.PORT ?? 3000);

const app = createApp();

app.listen(port, () => {
  console.log(`http://localhost:${port}`);
});
