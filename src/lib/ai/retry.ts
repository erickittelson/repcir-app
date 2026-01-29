/**
 * AI Retry Utility - Production Hardening
 * 
 * Provides exponential backoff retry logic for OpenAI API calls.
 * Handles transient errors like rate limits, timeouts, and network issues.
 */

export interface RetryOptions {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  // Specific error codes/types to retry on
  retryableErrors?: string[];
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  retryableErrors: [
    "rate_limit_exceeded",
    "timeout",
    "connection_error",
    "ECONNRESET",
    "ETIMEDOUT",
    "503",
    "429",
  ],
};

export class RetryError extends Error {
  constructor(
    message: string,
    public readonly attempts: number,
    public readonly lastError: Error
  ) {
    super(message);
    this.name = "RetryError";
  }
}

/**
 * Determines if an error is retryable
 */
function isRetryableError(error: unknown, retryableErrors: string[]): boolean {
  if (error instanceof Error) {
    const errorStr = error.message.toLowerCase();
    
    // Check for common retryable patterns
    if (
      errorStr.includes("rate limit") ||
      errorStr.includes("timeout") ||
      errorStr.includes("network") ||
      errorStr.includes("connection") ||
      errorStr.includes("temporarily unavailable") ||
      errorStr.includes("service unavailable")
    ) {
      return true;
    }
    
    // Check specific error codes
    for (const code of retryableErrors) {
      if (errorStr.includes(code.toLowerCase())) {
        return true;
      }
    }
    
    // Check for OpenAI-specific error structure
    const anyError = error as unknown as Record<string, unknown>;
    if (anyError.status === 429 || anyError.status === 503) {
      return true;
    }
    if (anyError.code && retryableErrors.includes(String(anyError.code))) {
      return true;
    }
  }
  
  return false;
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(attempt: number, options: RetryOptions): number {
  const exponentialDelay = options.initialDelayMs * Math.pow(2, attempt);
  const cappedDelay = Math.min(exponentialDelay, options.maxDelayMs);
  // Add jitter (±25%) to prevent thundering herd
  const jitter = cappedDelay * 0.25 * (Math.random() * 2 - 1);
  return Math.round(cappedDelay + jitter);
}

/**
 * Execute a function with exponential backoff retry
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts: RetryOptions = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error = new Error("Unknown error");
  
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on last attempt
      if (attempt === opts.maxRetries) {
        break;
      }
      
      // Don't retry non-retryable errors
      if (!isRetryableError(error, opts.retryableErrors || [])) {
        throw error;
      }
      
      // Calculate and wait for backoff delay
      const delay = calculateDelay(attempt, opts);
      console.warn(
        `[AI Retry] Attempt ${attempt + 1}/${opts.maxRetries + 1} failed, ` +
        `retrying in ${delay}ms: ${lastError.message}`
      );
      
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  
  throw new RetryError(
    `All ${opts.maxRetries + 1} attempts failed`,
    opts.maxRetries + 1,
    lastError
  );
}

/**
 * Create a retryable wrapper for a function
 */
export function makeRetryable<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  options: Partial<RetryOptions> = {}
): (...args: T) => Promise<R> {
  return (...args: T) => withRetry(() => fn(...args), options);
}

/**
 * Retry with custom handler for specific error types
 */
export async function withRetryAndFallback<T>(
  fn: () => Promise<T>,
  fallback: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  try {
    return await withRetry(fn, options);
  } catch (error) {
    console.warn("[AI Retry] All retries failed, using fallback:", error);
    return fallback();
  }
}
