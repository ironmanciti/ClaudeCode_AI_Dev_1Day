import { z } from "zod";

const PRIORITIES = ["HIGH", "MEDIUM", "LOW"] as const;

// 제목: 앞뒤 공백 제거 후 1~100자
const titleSchema = z
  .string({
    error: (issue) => (issue.input === undefined ? "title은 필수입니다." : "title은 문자열이어야 합니다."),
  })
  .trim()
  .min(1, { error: "title은 비어 있을 수 없습니다." })
  .max(100, { error: "title은 100자 이하여야 합니다." });

const prioritySchema = z.enum(PRIORITIES, {
  error: "priority는 HIGH, MEDIUM, LOW 중 하나여야 합니다.",
});

const bodyObjectError = { error: "요청 본문은 JSON 객체여야 합니다." };

// POST /api/tasks 본문
export const createTaskSchema = z.object(
  {
    title: titleSchema,
    priority: prioritySchema.optional(),
  },
  bodyObjectError,
);

// PATCH /api/tasks/:id 본문 (1개 이상 필수)
export const updateTaskSchema = z
  .object(
    {
      title: titleSchema.optional(),
      priority: prioritySchema.optional(),
      done: z.boolean({ error: "done은 true 또는 false여야 합니다." }).optional(),
    },
    bodyObjectError,
  )
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    error: "수정할 항목(title, priority, done)을 1개 이상 보내야 합니다.",
  });

// 경로 파라미터 :id (양의 정수)
export const idParamSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/, { error: "id는 양의 정수여야 합니다." })
    .transform(Number)
    .refine((n) => Number.isSafeInteger(n) && n > 0, { error: "id는 양의 정수여야 합니다." }),
});

// GET /api/tasks 쿼리 (?done=true|false)
export const listQuerySchema = z.object({
  done: z
    .enum(["true", "false"], { error: "done 필터는 true 또는 false여야 합니다." })
    .optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
