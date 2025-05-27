export function convertExceptionToString(exception: unknown): string {
  if (typeof exception === 'string') {
    return exception;
  }
  if (exception instanceof Error) {
    return exception.message;
  }
  if (typeof exception === 'string') {
    return exception;
  }
  if (typeof exception === 'object' && exception !== null) {
    try {
      return JSON.stringify(exception, Object.getOwnPropertyNames(exception));
    } catch {
      return `Not serializable exception: ${Object.prototype.toString.call(exception)}`;
    }
  }
  return String(exception);
}
