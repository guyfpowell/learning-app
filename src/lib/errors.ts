export function extractError(err: unknown): string {
  const typed = err as { code?: string; response?: { data?: { error?: string; message?: string } } };

  if (typed?.code === 'ECONNABORTED') {
    return 'Request timed out. Please try again.';
  }
  if (typed?.code === 'ERR_NETWORK') {
    return 'Network error. Please check your connection.';
  }
  if (typed?.response?.data?.message) {
    return typed.response.data.message;
  }
  if (typed?.response?.data?.error) {
    return typed.response.data.error;
  }

  return 'Something went wrong. Please try again.';
}
