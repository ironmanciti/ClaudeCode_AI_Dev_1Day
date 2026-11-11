import { Router } from "express";
import { prisma } from "../db.js";
import { HttpError } from "../errors.js";
import { createTaskSchema, idParamSchema, listQuerySchema, updateTaskSchema } from "../schemas/task.js";

export const tasksRouter = Router();

// 할 일이 없으면 404 오류를 던진다
async function findTaskOrThrow(id: number) {
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) {
    throw new HttpError(404, "NOT_FOUND", `id ${id}에 해당하는 할 일이 없습니다.`);
  }
  return task;
}

// 목록 조회 (?done=true|false)
tasksRouter.get("/", async (req, res) => {
  const { done } = listQuerySchema.parse(req.query);
  const tasks = await prisma.task.findMany({
    where: done === undefined ? {} : { done: done === "true" },
    orderBy: { id: "asc" },
  });
  res.status(200).json(tasks);
});

// 진행률 (/:id 보다 먼저 등록해야 "stats"가 id로 해석되지 않는다)
tasksRouter.get("/stats", async (_req, res) => {
  const [total, done] = await Promise.all([prisma.task.count(), prisma.task.count({ where: { done: true } })]);
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  res.status(200).json({ total, done, percent });
});

// 단건 조회
tasksRouter.get("/:id", async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  res.status(200).json(await findTaskOrThrow(id));
});

// 생성
tasksRouter.post("/", async (req, res) => {
  const data = createTaskSchema.parse(req.body);
  const task = await prisma.task.create({ data });
  res.status(201).location(`/api/tasks/${task.id}`).json(task);
});

// 수정
tasksRouter.patch("/:id", async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const data = updateTaskSchema.parse(req.body);
  await findTaskOrThrow(id);
  const task = await prisma.task.update({ where: { id }, data });
  res.status(200).json(task);
});

// 삭제
tasksRouter.delete("/:id", async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  await findTaskOrThrow(id);
  await prisma.task.delete({ where: { id } });
  res.status(204).end();
});
