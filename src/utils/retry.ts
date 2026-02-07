type RetryOptions = {
  retries?: number;
  baseDelayMs?: number;
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  { retries = 2, baseDelayMs = 300 }: RetryOptions = {}
): Promise<T> {
  let attempt = 0;
  let lastError: unknown;
  while (attempt <= retries) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === retries) break;
      const delay = baseDelayMs * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
      attempt += 1;
    }
  }
  throw lastError;
}
