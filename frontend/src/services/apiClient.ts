import type { ApiErrorResponse } from '@/types/api';

export class ApiClientError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

type ApiErrorConstructor = new (
  statusCode: number,
  code: string,
  message: string,
  details?: unknown
) => ApiClientError;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';

export async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  ErrorType: ApiErrorConstructor = ApiClientError
): Promise<T> {
  const url = `${API_BASE_URL.replace(/\/+$/, '')}${endpoint}`;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const errorBody = data as ApiErrorResponse | null;
    throw new ErrorType(
      response.status,
      errorBody?.error?.code || 'UNKNOWN_ERROR',
      errorBody?.error?.message || `HTTP error ${response.status}`,
      errorBody?.error?.details
    );
  }

  return data as T;
}
