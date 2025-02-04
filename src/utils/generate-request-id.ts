import { v4 as uuidv4 } from 'uuid';

export function generateRequestId(): string {
  return uuidv4();
}
