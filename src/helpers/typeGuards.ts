import type { GameMessage } from '../interfaces/interfaces';
import { MessageType } from '../constants/constants';

const isGameMessage = (data: unknown): data is GameMessage => {
  return (
    typeof data === 'object' &&
    data !== null &&
    'type' in data &&
    typeof (data as Record<string, unknown>).type === 'string' &&
    (Object.values(MessageType) as string[]).includes((data as Record<string, unknown>).type as string)
  );
}

export default isGameMessage;
