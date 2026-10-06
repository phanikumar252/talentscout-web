import type { SerializedError } from '@reduxjs/toolkit';
import type { ApiQueryError } from '@/api/apiSlice';

/** Human-readable message for RTK Query errors, thunk rejections and plain Errors. */
export function describeError(error: ApiQueryError | SerializedError | unknown): string {
  if (!error) return '';
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    if ('status' in error && error.status === 'FETCH_ERROR') return 'Cannot reach the server. Is the API running?';
    return error.message;
  }
  return 'Something went wrong';
}

export const errorCode = (error: unknown): string | undefined =>
  typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string' ? error.code : undefined;
