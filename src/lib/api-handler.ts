import { NextResponse } from "next/server"

type RouteHandler<T = unknown> = (
  request: Request,
  context?: T,
) => Promise<Response> | Response

export function withErrorHandler<T = unknown>(handler: RouteHandler<T>): RouteHandler<T> {
  return async (request: Request, context?: T) => {
    try {
      return await handler(request, context)
    } catch (error) {
      const url = request.url
      const timestamp = new Date().toISOString()
      console.error(
        `[API ERROR] ${timestamp} - Path: ${url}`,
        error,
      )
      return NextResponse.json(
        { error: "Erro interno do servidor" },
        { status: 500 },
      )
    }
  }
}

