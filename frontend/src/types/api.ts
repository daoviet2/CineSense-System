export interface ApiErrorDetail {
  path?: (string | number)[];
  message: string;
  [key: string]: unknown;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: ApiErrorDetail[] | unknown;
}

export interface ApiErrorResponse {
  error: ApiErrorBody;
}
