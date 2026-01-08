export const ROOM_PREFIX = "titenq-v1-";

export const WINNING_COMBINATIONS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

export const MessageType = {
  MOVE: 'MOVE',
  CHAT: 'CHAT',
  RESET: 'RESET',
  FULL: 'FULL',
  WELCOME: 'WELCOME',
  HELLO: 'HELLO',
  TYPING: 'TYPING'
} as const;

export type MessageType = typeof MessageType[keyof typeof MessageType];

export const SoundEffect = {
  CLICK: 'click',
  VICTORY: 'victory',
  RESET: 'reset'
} as const;

export type SoundEffect = typeof SoundEffect[keyof typeof SoundEffect];

export const GameStatus = {
  CONNECTING: 'connecting',
  SEARCHING: 'searching',
  WAITING: 'waiting',
  PLAYING: 'playing',
  FULL: 'full',
  DISCONNECTED: 'disconnected'
} as const;

export type GameStatus = typeof GameStatus[keyof typeof GameStatus];
