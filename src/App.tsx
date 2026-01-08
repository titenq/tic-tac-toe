import { useState, useEffect, useRef, useCallback } from 'react';
import Peer, { type DataConnection } from 'peerjs';
import i18n from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import './App.css';
import translations from './translations/translations';
import type { PlayerSymbol } from './types/types';
import type { Particle } from './interfaces/interfaces';
import {
  MessageType,
  SoundEffect,
  GameStatus,
  ROOM_PREFIX,
  WINNING_COMBINATIONS,
} from './constants/constants';
import isGameMessage from './helpers/typeGuards';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: translations,
    fallbackLng: "en",
    interpolation: {
      escapeValue: false,
    },
  });

const TicTacToe: React.FC = () => {
  const { t } = useTranslation();
  const [roomNumber, setRoomNumber] = useState(1);
  const [status, setStatus] = useState<GameStatus>(GameStatus.SEARCHING);
  const [board, setBoard] = useState<PlayerSymbol[]>(Array(9).fill(null));
  const [mySymbol, setMySymbol] = useState<PlayerSymbol>(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [winner, setWinner] = useState<PlayerSymbol | 'Draw'>(null);
  const [score, setScore] = useState({ X: 0, O: 0 });
  const [chatMessages, setChatMessages] = useState<{
    text: string,
    isMe: boolean,
    isSystem?: boolean,
  }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [nextStarter, setNextStarter] = useState<PlayerSymbol>('X');
  const [particles, setParticles] = useState<Particle[]>([]);
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });
  const [isClicking, setIsClicking] = useState(false);
  const [isOpponentTyping, setIsOpponentTyping] = useState(false);

  const isHandlingConnection = useRef(false);
  const peerRef = useRef<Peer | null>(null);
  const connectionRef = useRef<DataConnection | null>(null);
  const mySymbolRef = useRef<PlayerSymbol>(null);
  const boardRef = useRef<PlayerSymbol[]>(board);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef(status);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    mySymbolRef.current = mySymbol;
  }, [mySymbol]);

  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  useEffect(() => {
    const move = (e: MouseEvent) => setCursorPos({
      x: e.clientX,
      y: e.clientY,
    });

    const down = () => setIsClicking(true);
    const up = () => setIsClicking(false);

    window.addEventListener('mousemove', move);
    window.addEventListener('mousedown', down);
    window.addEventListener('mouseup', up);

    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mousedown', down);
      window.removeEventListener('mouseup', up);
    };
  }, []);

  const createExplosion = useCallback((winnerSymbol: PlayerSymbol) => {
    const color = winnerSymbol === 'X' ? '#ff2d55' : '#007aff';
    const newParticles = Array
      .from({ length: 40 })
      .map((_, i) => ({
        id: Date.now() + i,
        x: Math.random() * 300 - 150,
        y: Math.random() * 300 - 150,
        color,
      }));

    setParticles(newParticles);
    setTimeout(() => setParticles([]), 1000);
  }, []);

  const playSound = useCallback((type: SoundEffect) => {
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain); gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);

      if (type === SoundEffect.CLICK) {
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      } else if (type === SoundEffect.VICTORY) {
        osc.frequency.setValueAtTime(523, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1046, ctx.currentTime + 0.5);
      } else {
        osc.type = 'square'; osc.frequency.setValueAtTime(220, ctx.currentTime);
      }

      osc.start(); osc.stop(ctx.currentTime + (type === SoundEffect.VICTORY ? 0.5 : 0.1));
    } catch (error) {
      console.error(error);
    }
  }, []);

  const renderSymbol = (symbol: PlayerSymbol | 'Draw') => {
    if (symbol === 'X') return '✕';
    if (symbol === 'O') return '◯';
    return symbol;
  };

  const checkWinner = useCallback((squares: PlayerSymbol[]) => {
    for (const [indexA, indexB, indexC] of WINNING_COMBINATIONS) {
      if (
        squares[indexA] &&
        squares[indexA] === squares[indexB] &&
        squares[indexA] === squares[indexC]
      ) {
        return squares[indexA];
      }
    }

    return squares.includes(null) ? null : 'Draw';
  }, []);

  const endGame = useCallback((newBoard: PlayerSymbol[]) => {
    const gameResult = checkWinner(newBoard);

    if (gameResult) {
      setWinner(gameResult);

      if (gameResult !== 'Draw') {
        setScore((prevScore) => ({
          ...prevScore,
          [gameResult]: prevScore[gameResult] + 1,
        }));
        playSound(SoundEffect.VICTORY);
        createExplosion(gameResult);
      }
    }
  }, [checkWinner, playSound, createExplosion]);

  useEffect(() => {
    let activePeer: Peer | null = null;
    let mounted = true;

    const setup = (conn: DataConnection) => {
      connectionRef.current = conn;

      if (mounted) {
        setStatus(GameStatus.PLAYING);
        setBoard(Array(9).fill(null));
        setWinner(null);
        setNextStarter('O');
        setIsMyTurn(mySymbolRef.current === 'X');
      }

      conn.on('data', (data: unknown) => {
        if (!mounted || !isGameMessage(data)) {
          return;
        }

        if (data.type === MessageType.MOVE) {
          playSound(SoundEffect.CLICK);

          const newBoard = [...boardRef.current];

          newBoard[data.index] = data.symbol;

          setBoard(newBoard);
          endGame(newBoard);
          setIsMyTurn(true);
        } else if (data.type === MessageType.CHAT) {
          setChatMessages((prev) => [
            ...prev,
            {
              text: data.text,
              isMe: false,
            },
          ]);
        } else if (data.type === MessageType.RESET) {
          playSound(SoundEffect.RESET);
          setBoard(Array(9).fill(null));
          setWinner(null);

          const amINext = data.nextToMove === mySymbolRef.current;

          setIsMyTurn(amINext);
          setNextStarter(data.nextToMove === 'X' ? 'O' : 'X');
        } else if (data.type === MessageType.TYPING) {
          setIsOpponentTyping(data.isTyping);
        }
      });

      conn.on('close', () => {
        if (!mounted) {
          return;
        }

        setStatus(GameStatus.DISCONNECTED);
        setChatMessages(prev => [...prev, {
          text: i18n.t('opponentLeft'),
          isMe: false,
          isSystem: true,
        }]);
      });

      if (conn.peerConnection) {
        conn.peerConnection.oniceconnectionstatechange = () => {
          if (
            conn.peerConnection?.iceConnectionState === 'disconnected' ||
            conn.peerConnection?.iceConnectionState === 'failed' ||
            conn.peerConnection?.iceConnectionState === 'closed'
          ) {
            conn.close();

            if (mounted) {
              setStatus(GameStatus.DISCONNECTED);
            }
          }
        };
      }
    };

    window.addEventListener('beforeunload', () => {
      connectionRef.current?.close();
      activePeer?.destroy();
    });

    const tryJoin = (roomIndex: number) => {
      if (!mounted) {
        return;
      }

      setRoomNumber(roomIndex);
      setStatus(GameStatus.SEARCHING);

      const roomId = `${ROOM_PREFIX}room-${roomIndex}`;
      const peer = new Peer(roomId);

      activePeer = peer;

      peer.on('error', (error) => {
        if (!mounted) {
          return;
        }

        if (error.type === 'unavailable-id') {
          peer.destroy();

          const guestPeer = new Peer();

          activePeer = guestPeer;

          peerRef.current = guestPeer;

          guestPeer.on('open', () => {
            if (!mounted) {
              return;
            }

            const conn = guestPeer.connect(roomId, { reliable: true });

            const connectionTimeout = setTimeout(() => {
              if (statusRef.current === GameStatus.SEARCHING) {
                conn.close();
                guestPeer.destroy();

                tryJoin(roomIndex + 1);
              }
            }, 3000);

            conn.on('open', () => {
              clearTimeout(connectionTimeout);

              if (!mounted) {
                return;
              }

              setStatus(GameStatus.CONNECTING);

              const handshakeHandler = (data: unknown) => {
                if (isGameMessage(data)) {
                  if (data.type === MessageType.FULL) {
                    conn.off('data', handshakeHandler);
                    conn.removeAllListeners('close');
                    conn.close();
                    guestPeer.destroy();
                    tryJoin(roomIndex + 1);
                  } else if (data.type === MessageType.WELCOME) {
                    conn.off('data', handshakeHandler);
                    setMySymbol('O');
                    setup(conn);
                  }
                }
              };

              conn.on('data', handshakeHandler);
              conn.send({ type: MessageType.HELLO });
            });

            conn.on('close', () => {
              if (statusRef.current === GameStatus.SEARCHING || statusRef.current === GameStatus.CONNECTING) {
                guestPeer.destroy();
                tryJoin(roomIndex + 1);
              }
            });
          });
        } else {
          console.error("Peer Error:", error);
        }
      });

      peer.on('open', () => {
        if (!mounted) {
          return;
        }

        peerRef.current = peer;

        setStatus(GameStatus.WAITING);
        setMySymbol('X');

        peer.on('connection', (conn) => {

          if (statusRef.current !== GameStatus.WAITING || isHandlingConnection.current) {
            conn.on('open', () => {
              conn.send({ type: MessageType.FULL });
              setTimeout(() => conn.close(), 500);
            });

            return;
          }

          isHandlingConnection.current = true;
          setStatus(GameStatus.CONNECTING);

          const hostHandshakeHandler = (data: unknown) => {
            if (isGameMessage(data)) {
              if (data.type === MessageType.HELLO) {
                conn.off('data', hostHandshakeHandler);
                conn.send({ type: MessageType.WELCOME });
                setup(conn);
                isHandlingConnection.current = false;
              }
            }
          };

          conn.on('data', hostHandshakeHandler);

          conn.on('close', () => {
            if (statusRef.current === GameStatus.CONNECTING) {
              setStatus(GameStatus.WAITING);
              isHandlingConnection.current = false;
            }
          });
        });
      });
    };

    tryJoin(1);

    return () => {
      mounted = false;
      activePeer?.destroy();
      connectionRef.current?.close();
    };
  }, [endGame, playSound]);

  const handleCellClick = (i: number) => {
    if (status !== GameStatus.PLAYING || !isMyTurn || board[i] || winner) {
      return;
    }
    playSound(SoundEffect.CLICK);
    const newBoard = [...board];
    newBoard[i] = mySymbol;
    setBoard(newBoard);
    setIsMyTurn(false);
    connectionRef.current?.send({ type: MessageType.MOVE, index: i, symbol: mySymbol });
    endGame(newBoard);
  };

  const handleReset = () => {
    playSound(SoundEffect.RESET);

    const starter = nextStarter;

    setBoard(Array(9).fill(null));
    setWinner(null);
    setIsMyTurn(mySymbol === starter);

    setNextStarter(starter === 'X' ? 'O' : 'X');

    connectionRef.current?.send({ type: MessageType.RESET, nextToMove: starter });
  };

  useEffect(() => {
    if (status !== GameStatus.PLAYING || !connectionRef.current) return;

    const isTyping = chatInput.length > 0;
    connectionRef.current.send({ type: MessageType.TYPING, isTyping });

    const timeout = setTimeout(() => {
      if (isTyping) {
        connectionRef.current?.send({ type: MessageType.TYPING, isTyping: false });
      }
    }, 3000);

    return () => clearTimeout(timeout);
  }, [chatInput, status]);

  return (
    <div className="wrapper">
      <div className="particle-container">
        {particles.map(p => (

          <span
            key={p.id}
            className="particle"
            style={{
              backgroundColor: p.color,
              boxShadow: `0 0 10px ${p.color}`,
              '--tx': `${p.x}px`,
              '--ty': `${p.y}px`
            } as React.CSSProperties}
          />
        ))}
      </div>

      <div
        className={`custom-cursor ${isClicking ? 'clicking' : ''}`}
        style={{ left: cursorPos.x, top: cursorPos.y }}
      >
        <span className="custom-cursor-symbol">{renderSymbol(mySymbol) || '?'}</span>
      </div>

      <div className="game-section">
        <h1 className="game-title">{t('title')}</h1>
        <div className="hud glass-panel">
          <div className="hud-row">
            <span>{t('room')} {roomNumber}</span>
          </div>

          <div style={{ textAlign: 'center', marginTop: 5 }}>
            <div style={{ fontSize: '0.75rem', color: '#aaa', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '5px' }}>
              {t('score')}
            </div>
            <div className="hud-title">
              <span className="hud-symbol x">{renderSymbol('X')}</span>: {score.X} &nbsp;<span style={{ opacity: 0.3 }}>|</span>&nbsp; <span className="hud-symbol o">{renderSymbol('O')}</span>: {score.O}
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: 10 }}>
            <span className="status-badge" style={{
              color: winner ? 'var(--neon-green)' : (isMyTurn ? 'var(--neon-blue)' : '#888'),
              border: `1px solid ${winner ? 'var(--neon-green)' : (isMyTurn ? 'var(--neon-blue)' : 'transparent')}`
            }}>
              {status === GameStatus.DISCONNECTED ? (
                <span style={{ color: 'red' }}>{t('opponentLeft')}</span>
              ) : winner ? (
                winner === 'Draw' ? t('draw') : t('win', { symbol: renderSymbol(winner as PlayerSymbol) })
              ) : (status === GameStatus.PLAYING ? (isMyTurn ? t('yourTurn') : t('opponentTurn')) : (status === GameStatus.SEARCHING ? t('searching') : (status === GameStatus.CONNECTING ? t('connecting') : t('waiting'))))}
            </span>
          </div>
        </div>

        {status === GameStatus.DISCONNECTED && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10 }}>
            <button className="reset-btn" onClick={() => window.location.reload()}>{t('joinNew')}</button>
          </div>
        )}

        <div className="grid">
          {board.map((symbol, i) => <div key={i} className={`cell ${symbol}`} onClick={() => handleCellClick(i)}>{renderSymbol(symbol)}</div>)}
        </div>

        {winner && <button className="reset-btn" onClick={handleReset}>{t('reset')}</button>}
      </div>

      <div className="side-section">
        <div className="flags">
          <span className={`flag ${i18n.language.startsWith('en') ? 'active' : ''}`} onClick={() => i18n.changeLanguage('en')}>🇺🇸</span>
          <span className={`flag ${i18n.language.startsWith('pt') ? 'active' : ''}`} onClick={() => i18n.changeLanguage('pt')}>🇧🇷</span>
          <span className={`flag ${i18n.language.startsWith('es') ? 'active' : ''}`} onClick={() => i18n.changeLanguage('es')}>🇪🇸</span>
        </div>

        <div className="chat glass-panel">
          <div className="msgs">
            {chatMessages.map((m, i) => (
              <div key={i} className={`bubble ${m.isSystem ? 'system' : (m.isMe ? 'me' : 'opponent')}`}>
                {m.text}
              </div>
            ))}
            {isOpponentTyping && (
              <div className="bubble opponent typing-indicator">
                <div className="typing-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={(e) => {
            e.preventDefault(); if (!chatInput) return;
            connectionRef.current?.send({ type: MessageType.CHAT, text: chatInput });
            setChatMessages(prev => [...prev, { text: chatInput, isMe: true }]);
            setChatInput('');
          }} className="input-area">
            <input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder={t('placeholder')} />
            <button type="submit">💬</button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TicTacToe;
