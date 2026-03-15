import request from "supertest";
import { createApp } from "../src/app.js";

describe("Security smoke tests", () => {
  const app = createApp();

  it("should rate limit or at least respond to /forums", async () => {
    const res = await request(app).get("/forums");
    expect([200, 429]).toContain(res.statusCode);
  });

  it("should block unauthorized post creation", async () => {
    const res = await request(app).post("/posts").send({ threadId: 1, text: "hi" });
    expect(res.statusCode).toBe(401);
  });
});
