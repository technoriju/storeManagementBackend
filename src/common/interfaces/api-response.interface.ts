export interface ApiResponse<T> {
  statusCode: number;
  message: string | string[];
  data: T | null;
  timestamp?: string;
  path?: string;
}
