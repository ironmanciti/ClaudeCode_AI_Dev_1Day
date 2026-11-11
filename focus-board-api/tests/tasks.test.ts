import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db.js";

// spec.md 5장 테스트 계획을 그대로 구현한다 (N: 정상, B: 경계값, F: 실패)
const app = createApp();

// 할 일을 하나 생성하고 응답 본문을 돌려준다
async function createTask(title: string, priority?: "HIGH" | "MEDIUM" | "LOW") {
  const res = await request(app)
    .post("/api/tasks")
    .send(priority ? { title, priority } : { title });
  expect(res.status).toBe(201);
  return res.body as { id: number; title: string; priority: string; done: boolean };
}

// 테스트끼리 데이터가 섞이지 않도록 매번 테이블을 비운다 (test.db 전용, tests/setup.ts에서 확인)
beforeEach(async () => {
  await prisma.task.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("정상 케이스", () => {
  it("N1 할 일을 생성하고 단건 조회한다", async () => {
    const res = await request(app).post("/api/tasks").send({ title: "운동하기", priority: "HIGH" });

    expect(res.status).toBe(201);
    expect(res.headers.location).toBe(`/api/tasks/${res.body.id}`);
    expect(res.body).toMatchObject({ title: "운동하기", priority: "HIGH", done: false });
    expect(typeof res.body.id).toBe("number");
    expect(typeof res.body.createdAt).toBe("string");
    expect(typeof res.body.updatedAt).toBe("string");

    const getRes = await request(app).get(res.headers.location);
    expect(getRes.status).toBe(200);
    expect(getRes.body).toEqual(res.body);
  });

  it("N2 목록을 조회하고 done으로 필터링한다", async () => {
    const first = await createTask("할 일 1");
    await createTask("할 일 2");
    await createTask("할 일 3");
    await request(app).patch(`/api/tasks/${first.id}`).send({ done: true }).expect(200);

    const all = await request(app).get("/api/tasks");
    expect(all.status).toBe(200);
    expect(all.body).toHaveLength(3);

    const done = await request(app).get("/api/tasks?done=true");
    expect(done.status).toBe(200);
    expect(done.body).toHaveLength(1);
    expect(done.body.every((t: { done: boolean }) => t.done === true)).toBe(true);

    const notDone = await request(app).get("/api/tasks?done=false");
    expect(notDone.status).toBe(200);
    expect(notDone.body).toHaveLength(2);
    expect(notDone.body.every((t: { done: boolean }) => t.done === false)).toBe(true);
  });

  it("N3 할 일을 완료 처리한다", async () => {
    const task = await createTask("예제 코드 검토", "LOW");

    const res = await request(app).patch(`/api/tasks/${task.id}`).send({ done: true });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: task.id, title: "예제 코드 검토", priority: "LOW", done: true });

    const getRes = await request(app).get(`/api/tasks/${task.id}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.done).toBe(true);
  });

  it("N4 할 일을 삭제한다", async () => {
    const task = await createTask("삭제할 일");

    const res = await request(app).delete(`/api/tasks/${task.id}`);
    expect(res.status).toBe(204);
    expect(res.text).toBe("");

    const getRes = await request(app).get(`/api/tasks/${task.id}`);
    expect(getRes.status).toBe(404);
    expect(getRes.body.error.code).toBe("NOT_FOUND");
  });

  it("N5 진행률을 계산한다", async () => {
    const first = await createTask("할 일 1");
    await createTask("할 일 2");
    await createTask("할 일 3");
    await request(app).patch(`/api/tasks/${first.id}`).send({ done: true }).expect(200);

    const res = await request(app).get("/api/tasks/stats");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ total: 3, done: 1, percent: 33 });
  });
});

describe("경계값 케이스", () => {
  it("B1 title 100자는 허용한다", async () => {
    const res = await request(app).post("/api/tasks").send({ title: "가".repeat(100) });

    expect(res.status).toBe(201);
    expect(res.body.title).toHaveLength(100);
  });

  it("B2 title 101자는 거부한다", async () => {
    const res = await request(app).post("/api/tasks").send({ title: "가".repeat(101) });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(Array.isArray(res.body.error.details)).toBe(true);
    expect(await prisma.task.count()).toBe(0);
  });

  it("B3 priority를 생략하면 MEDIUM이 된다", async () => {
    const res = await request(app).post("/api/tasks").send({ title: "책 읽기" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ title: "책 읽기", priority: "MEDIUM", done: false });
  });

  it("B4 title 앞뒤 공백을 제거한다", async () => {
    const res = await request(app).post("/api/tasks").send({ title: "  운동하기  " });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe("운동하기");
  });

  it("B5 할 일이 없을 때 빈 목록과 0%를 반환한다", async () => {
    const list = await request(app).get("/api/tasks");
    expect(list.status).toBe(200);
    expect(list.body).toEqual([]);

    const stats = await request(app).get("/api/tasks/stats");
    expect(stats.status).toBe(200);
    expect(stats.body).toEqual({ total: 0, done: 0, percent: 0 });
  });
});

describe("실패 케이스", () => {
  it.each([
    { name: "빈 title", body: { title: "" } },
    { name: "title 누락", body: {} },
    { name: "공백만 있는 title", body: { title: "   " } },
    { name: "잘못된 priority", body: { title: "운동", priority: "URGENT" } },
  ])("F1 생성 본문이 잘못되면 400을 반환한다 ($name)", async ({ body }) => {
    const res = await request(app).post("/api/tasks").send(body);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(typeof res.body.error.message).toBe("string");
    expect(Array.isArray(res.body.error.details)).toBe(true);
    expect(await prisma.task.count()).toBe(0);
  });

  it("F2 깨진 JSON은 400을 반환한다", async () => {
    const res = await request(app)
      .post("/api/tasks")
      .set("Content-Type", "application/json")
      .send('{"title":');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_JSON");
  });

  it.each([
    { name: "빈 본문", body: {} },
    { name: "done 타입 오류", body: { done: "yes" } },
  ])("F3 수정 본문이 잘못되면 400을 반환한다 ($name)", async ({ body }) => {
    const task = await createTask("원본 할 일", "HIGH");

    const res = await request(app).patch(`/api/tasks/${task.id}`).send(body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");

    // 원본 데이터는 변경되지 않아야 한다
    const getRes = await request(app).get(`/api/tasks/${task.id}`);
    expect(getRes.body).toEqual(task);
  });

  it.each([
    { name: "GET 숫자 아닌 id", send: () => request(app).get("/api/tasks/abc") },
    { name: "PATCH 숫자 아닌 id", send: () => request(app).patch("/api/tasks/abc").send({ done: true }) },
    { name: "DELETE 숫자 아닌 id", send: () => request(app).delete("/api/tasks/abc") },
    { name: "잘못된 done 필터", send: () => request(app).get("/api/tasks?done=maybe") },
  ])("F4 잘못된 id·필터는 400을 반환한다 ($name)", async ({ send }) => {
    const res = await send();

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it.each([
    { name: "GET 없는 id", send: () => request(app).get("/api/tasks/9999") },
    { name: "PATCH 없는 id", send: () => request(app).patch("/api/tasks/9999").send({ done: true }) },
    { name: "DELETE 없는 id", send: () => request(app).delete("/api/tasks/9999") },
    { name: "없는 경로", send: () => request(app).get("/api/unknown") },
  ])("F5 없는 리소스·경로는 404를 반환한다 ($name)", async ({ send }) => {
    const res = await send();

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});
