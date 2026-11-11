import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";

export type ErrorCode = "VALIDATION_ERROR" | "NOT_FOUND" | "INVALID_JSON" | "INTERNAL_ERROR";

// 상태 코드와 오류 코드를 함께 담는 HTTP 오류
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: unknown[],
  ) {
    super(message);
    this.name = "HttpError";
  }
}

// 등록되지 않은 경로 → 404
export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new HttpError(404, "NOT_FOUND", `요청한 경로를 찾을 수 없습니다: ${req.method} ${req.originalUrl}`));
};

// body-parser가 던지는 오류인지 확인
function isBodyParserError(err: unknown): err is { type: string; status: number } {
  return (
    typeof err === "object" &&
    err !== null &&
    typeof (err as { type?: unknown }).type === "string" &&
    typeof (err as { status?: unknown }).status === "number"
  );
}

// 모든 오류를 { error: { code, message, details? } } 형식으로 응답한다
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: err.issues[0]?.message ?? "요청 값이 올바르지 않습니다.",
        details: err.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
      },
    });
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) },
    });
    return;
  }

  if (isBodyParserError(err)) {
    if (err.type === "entity.parse.failed") {
      res.status(400).json({ error: { code: "INVALID_JSON", message: "요청 본문이 올바른 JSON 형식이 아닙니다." } });
      return;
    }
    // 본문 크기 초과 등 그 밖의 요청 본문 오류
    if (err.status >= 400 && err.status < 500) {
      res.status(err.status).json({ error: { code: "VALIDATION_ERROR", message: "요청 본문을 처리할 수 없습니다." } });
      return;
    }
  }

  console.error("예상하지 못한 서버 오류:", err);
  res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "서버 내부 오류가 발생했습니다." } });
};
