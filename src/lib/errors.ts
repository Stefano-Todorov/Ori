/**
 * Sanitize database/internal error messages before returning them to clients.
 * Never expose raw Supabase or Postgres error details.
 */
export function sanitizeDbError(error: unknown): string {
  if (process.env.NODE_ENV === 'development' && error && typeof error === 'object' && 'message' in error) {
    console.error('[DB Error]', (error as { message: string }).message)
  }
  return 'An unexpected error occurred. Please try again.'
}
