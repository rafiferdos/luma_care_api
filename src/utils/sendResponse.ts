import type { Context } from 'hono'
import type {
  ClientErrorStatusCode,
  ServerErrorStatusCode,
  SuccessStatusCode
} from 'hono/utils/http-status'

type ApiSuccessStatus = Exclude<SuccessStatusCode, 204 | 205>
type ApiErrorStatus = ClientErrorStatusCode | ServerErrorStatusCode
type ApiStatus = ApiSuccessStatus | ApiErrorStatus

type ResponseHeaders =
  Headers | Record<string, string> | Array<[string, string]>

export type PaginationMeta = Readonly<{
  page: number
  limit: number
  total: number
  totalPages: number
}>

type SuccessOptions<S extends ApiSuccessStatus, TData, TMeta> = Readonly<{
  statusCode?: S
  message?: string
  data?: TData | null
  meta?: TMeta
  headers?: ResponseHeaders

  errors?: never
}>

type ErrorOptions<S extends ApiErrorStatus, TErrors> = Readonly<{
  statusCode: S
  message?: string
  errors?: TErrors
  headers?: ResponseHeaders

  data?: never
  meta?: never
}>

type SendResponseOptions<S extends ApiStatus, TData, TMeta, TErrors> = [
  S
] extends [ApiErrorStatus]
  ? ErrorOptions<Extract<S, ApiErrorStatus>, TErrors>
  : SuccessOptions<Extract<S, ApiSuccessStatus>, TData, TMeta>

const getDefaultMessage = (statusCode: ApiStatus) => {
  if (statusCode === 201) return 'Created successfully'
  if (statusCode === 202) return 'Request accepted'
  if (statusCode >= 200 && statusCode < 300) return 'Success'

  return 'Request failed'
}

export const sendResponse = <
  const S extends ApiStatus = 200,
  TData = never,
  TMeta = never,
  TErrors = never
>(
  c: Context,
  options?: SendResponseOptions<S, TData, TMeta, TErrors>
) => {
  const payload =
    options ?? ({} as SendResponseOptions<S, TData, TMeta, TErrors>)

  const statusCode = (payload.statusCode ?? 200) as S

  if (statusCode >= 200 && statusCode < 300) {
    const successPayload = payload as SuccessOptions<
      S & ApiSuccessStatus,
      TData,
      TMeta
    >

    return c.json(
      {
        success: true as const,
        message: successPayload.message ?? getDefaultMessage(statusCode),
        ...(successPayload.data !== undefined && {
          data: successPayload.data
        }),
        ...(successPayload.meta !== undefined && {
          meta: successPayload.meta
        })
      },
      {
        status: statusCode as S & ApiSuccessStatus,
        headers: successPayload.headers
      }
    )
  }

  const errorPayload = payload as ErrorOptions<S & ApiErrorStatus, TErrors>

  return c.json(
    {
      success: false as const,
      message: errorPayload.message ?? getDefaultMessage(statusCode),
      ...(errorPayload.errors !== undefined && {
        errors: errorPayload.errors
      })
    },
    {
      status: statusCode as S & ApiErrorStatus,
      headers: errorPayload.headers
    }
  )
}

export const sendNoContent = (
  c: Context,
  statusCode: 204 | 205 = 204,
  headers?: ResponseHeaders
) => {
  return c.body(null, {
    status: statusCode,
    headers
  })
}
