export interface ApiResponse<T = undefined> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}
