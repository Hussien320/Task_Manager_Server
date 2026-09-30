export class ApiException extends Error {
  status: number;
  errorType?: string;
  errors?: Array<{ path: string[]; message: string }>;

  constructor(
    message: string,
    status: number,
    errorType?: string,
    errors?: Array<{ path: string[]; message: string }>
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errorType = errorType;
    this.errors = errors;
  }
}