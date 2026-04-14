export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: PaginatedMeta;
}
