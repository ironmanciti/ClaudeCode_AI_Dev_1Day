import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";

describe("GET /health", () => {
  const app = createApp();

  it("GET /health 는 200과 status ok 를 반환한다", async () => {
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("없는 경로는 404 를 반환한다", async () => {
    const res = await request(app).get("/nope");

    expect(res.status).toBe(404);
  });
});
