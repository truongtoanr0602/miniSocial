// ──────────────────────────────────────────
// API Response Types
// ──────────────────────────────────────────

/** Standard API response wrapper from Backend */
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
  meta?: Record<string, unknown>;
  error?: string;
}

/** Pagination metadata */
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Paginated API response */
export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationInfo;
}

/** Auth login response */
export interface LoginResponse {
  token: string;
  user: import("../types/models").IUser;
}

/** Auth register response */
export interface RegisterResponse {
  message: string;
}

/** Error response */
export interface ErrorResponse {
  success: false;
  message: string;
  error: string;
}
