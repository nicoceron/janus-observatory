const credentialPattern = /\b(?:sk|pa)-[A-Za-z0-9_-]{12,}\b/g;

export function redactCredentials(value: string): string {
  return value.replace(credentialPattern, '[REDACTED]');
}

export class ProviderError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly status?: number;

  constructor(options: {
    message: string;
    code: string;
    retryable: boolean;
    status?: number;
    cause?: unknown;
  }) {
    super(redactCredentials(options.message), { cause: options.cause });
    this.name = 'ProviderError';
    this.code = options.code;
    this.retryable = options.retryable;
    this.status = options.status;
  }
}

export function providerHttpError(
  provider: string,
  status: number,
  detail?: string,
): ProviderError {
  const safeDetail = detail ? `: ${redactCredentials(detail).slice(0, 240)}` : '';
  return new ProviderError({
    message: `${provider} request failed with HTTP ${status}${safeDetail}`,
    code: `${provider.toUpperCase()}_HTTP_ERROR`,
    retryable: status === 408 || status === 409 || status === 429 || status >= 500,
    status,
  });
}
