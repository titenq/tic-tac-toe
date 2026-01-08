import type { PlayerSymbol } from '../types/types';
import { MessageType } from '../constants/constants';

export type GameMessage = 
  | { type: typeof MessageType.MOVE; index: number; symbol: PlayerSymbol }
  | { type: typeof MessageType.CHAT; text: string }
  | { type: typeof MessageType.RESET; nextToMove: PlayerSymbol }
  | { type: typeof MessageType.FULL }
  | { type: typeof MessageType.WELCOME }
  | { type: typeof MessageType.HELLO }
  | { type: typeof MessageType.TYPING; isTyping: boolean };

export interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
}
