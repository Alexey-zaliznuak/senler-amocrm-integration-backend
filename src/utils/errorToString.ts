export function convertExceptionToString(error: unknown): string {
  if (error instanceof Error) {
    // Если это стандартная ошибка, используем message
    return error.message;
  } else if (typeof error === 'string') {
    // Если ошибка уже строка
    return error;
  } else if (typeof error === 'object' && error !== null) {
    // Попытка сериализовать объект
    try {
      return JSON.stringify(error, Object.getOwnPropertyNames(error));
    } catch {
      // Если сериализация не удалась, возвращаем общую информацию
      return `Несериализуемый объект ошибки: ${Object.prototype.toString.call(error)}`;
    }
  } else {
    // Все остальные случаи (числа, boolean и т.д.)
    return String(error);
  }
}
