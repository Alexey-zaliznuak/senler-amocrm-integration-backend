import { AxiosError } from 'axios';

function safePlain<T>(value: T): unknown {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return '[Unserializable]';
  }
}

function safeStringify(value: unknown): string {
  const seen = new WeakSet();
  return JSON.stringify(value, (_k, v) => {
    if (typeof v === 'object' && v !== null) {
      if (seen.has(v)) return '[Circular]';
      seen.add(v);
    }

    if (v && typeof v === 'object' && (v as any).isAxiosError) {
      const e = v as any;
      return {
        isAxiosError: true,
        message: e.message,
        code: e.code,
        method: e.config?.method,
        url: e.config?.url,
        status: e.response?.status,
        statusText: e.response?.statusText,
        data: e.response?.data,
      };
    }
    return v;
  });
}

export function convertExceptionToString(exception: unknown): string {
  if (exception instanceof AxiosError) {
    const { message, code, config, response } = exception;
    return safeStringify({
      message,
      code,
      method: config?.method,
      url: config?.url,
      status: response?.status,
      statusText: response?.statusText,
      data: safePlain(response?.data),
    });
  }

  if (exception instanceof Error) {
    return exception.stack ?? exception.message;
  }

  if (typeof exception === 'string') {
    return exception;
  }

  if (typeof exception === 'object' && exception !== null) {
    try {
      return safeStringify(exception); // был JSON.stringify(...)
    } catch {
      return `Not serializable exception: ${Object.prototype.toString.call(exception)}`;
    }
  }

  return String(exception);
}
