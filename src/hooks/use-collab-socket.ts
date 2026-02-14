"use client";

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import type {ClientMessage, ServerMessage} from '@/lib/collab-protocol';
import type {Path, Point, User, UserCursor, Shape, TextElement, ImageElement, SessionMeta} from '@/lib/types';

const DEFAULT_WS_URL = 'ws://localhost:9001';

type UseCollabSocketOptions = {
    name: string;
    color: string;
    enabled: boolean;
    roomId?: string;
    roomType?: 'public' | 'private';
    password?: string;
};

type ConnectionState = 'idle' | 'connecting' | 'open' | 'closed' | 'error';

type CollabState = {
    clientId: string | null;
    roomId: string | null;
    roomType: 'public' | 'private' | null;
    lastLoadedSessionId: string | null;
    paths: Path[];
    shapes: Shape[];
    texts: TextElement[];
    images: ImageElement[];
    users: User[];
    cursors: UserCursor[];
    redoCount: number;
    sessions: SessionMeta[];
    connectionState: ConnectionState;
};

export function useCollabSocket(
    {
        name,
        color,
        enabled,
        roomId = 'default',
        roomType = 'public',
        password = ''
    }: UseCollabSocketOptions) {
    const [state, setState] = useState<CollabState>({
        clientId: null,
        roomId: null,
        roomType: null,
        lastLoadedSessionId: null,
        paths: [],
        shapes: [],
        texts: [],
        images: [],
        users: [],
        cursors: [],
        redoCount: 0,
        sessions: [],
        connectionState: enabled ? 'connecting' : 'idle',
    });

    const socketRef = useRef<WebSocket | null>(null);

    const wsUrl = useMemo(() => process.env.NEXT_PUBLIC_WS_URL || DEFAULT_WS_URL, []);

    const updateState = useCallback((partial: Partial<CollabState>) => {
        setState((prev) => ({...prev, ...partial}));
    }, []);

    const sendMessage = useCallback((message: ClientMessage) => {
        const socket = socketRef.current;
        if (!socket || socket.readyState !== WebSocket.OPEN) {
            return false;
        }
        socket.send(JSON.stringify(message));
        return true;
    }, []);

    useEffect(() => {
        if (!enabled) {
            updateState({
                connectionState: 'idle',
                clientId: null,
                roomId: null,
                roomType: null,
                lastLoadedSessionId: null,
                paths: [],
                shapes: [],
                texts: [],
                images: [],
                users: [],
                cursors: [],
                redoCount: 0,
                sessions: []
            });
            return;
        }

        const socket = new WebSocket(wsUrl);
        socketRef.current = socket;
        updateState({connectionState: 'connecting'});

        socket.addEventListener('open', () => {
            updateState({connectionState: 'open'});
            sendMessage({type: 'join', name, color, roomId, roomType, password});
        });

        socket.addEventListener('message', (event) => {
            let message: ServerMessage;
            try {
                message = JSON.parse(event.data) as ServerMessage;
            } catch (error) {
                return;
            }

            if (!message) return;

            switch (message.type) {
                case 'welcome':
                    updateState({clientId: message.id, roomId: message.roomId, roomType: message.roomType || null});
                    break;
                case 'state':
                    updateState({
                        users: message.users,
                        cursors: message.cursors,
                        paths: message.paths,
                        shapes: message.shapes || [],
                        texts: message.texts || [],
                        images: message.images || [],
                        redoCount: message.redoCount,
                        sessions: message.sessions || [],
                        roomType: message.roomType || null,
                    });
                    break;
                case 'cursor':
                    setState((prev) => {
                        const nextCursors = [...prev.cursors];
                        const index = nextCursors.findIndex((cursor) => cursor.id === message.id);
                        const fallbackUser = prev.users.find((user) => user.id === message.id);
                        const nextCursor = {
                            id: message.id,
                            name: fallbackUser?.name || 'Anonymous',
                            color: fallbackUser?.color || '#4F46E5',
                            position: message.position,
                        };
                        if (index >= 0) {
                            nextCursors[index] = {...nextCursors[index], position: message.position};
                        } else {
                            nextCursors.push(nextCursor);
                        }
                        return {...prev, cursors: nextCursors};
                    });
                    break;
                case 'path:upsert':
                    setState((prev) => {
                        const nextPaths = [...prev.paths];
                        const index = nextPaths.findIndex((path) => path.id === message.path.id);
                        if (index >= 0) {
                            nextPaths[index] = message.path;
                        } else {
                            nextPaths.push(message.path);
                        }
                        return {...prev, paths: nextPaths};
                    });
                    break;
                case 'shape:upsert':
                    setState((prev) => {
                        const nextShapes = [...prev.shapes];
                        const index = nextShapes.findIndex((shape) => shape.id === message.shape.id);
                        if (index >= 0) {
                            nextShapes[index] = message.shape;
                        } else {
                            nextShapes.push(message.shape);
                        }
                        return {...prev, shapes: nextShapes};
                    });
                    break;
                case 'text:add':
                    setState((prev) => ({
                        ...prev,
                        texts: [...prev.texts, message.text],
                    }));
                    break;
                case 'image:add':
                    setState((prev) => ({
                        ...prev,
                        images: [...prev.images, message.image],
                    }));
                    break;
                case 'redo-count':
                    updateState({redoCount: message.redoCount});
                    break;
                case 'clear':
                    updateState({paths: [], shapes: [], texts: [], images: [], redoCount: 0});
                    break;
                case 'session-list':
                    updateState({sessions: message.sessions});
                    break;
                case 'session-loaded':
                    updateState({lastLoadedSessionId: message.sessionId});
                    break;
                default:
                    break;
            }
        });

        socket.addEventListener('close', () => {
            updateState({connectionState: 'closed'});
        });

        socket.addEventListener('error', () => {
            updateState({connectionState: 'error'});
        });

        return () => {
            socket.close();
        };
    }, [enabled, wsUrl, name, color, roomId, roomType, password, sendMessage, updateState]);

    const updateCursor = useCallback((position: Point) => {
        sendMessage({type: 'cursor', position});
    }, [sendMessage]);

    const upsertPath = useCallback((path: Path) => {
        sendMessage({type: 'path:upsert', path});
    }, [sendMessage]);

    const commitPath = useCallback((pathId: string) => {
        sendMessage({type: 'path:commit', id: pathId});
    }, [sendMessage]);

    const upsertShape = useCallback((shape: Shape) => {
        sendMessage({type: 'shape:upsert', shape});
    }, [sendMessage]);

    const commitShape = useCallback((shapeId: string) => {
        sendMessage({type: 'shape:commit', id: shapeId});
    }, [sendMessage]);

    const addText = useCallback((text: TextElement) => {
        sendMessage({type: 'text:add', text});
    }, [sendMessage]);

    const addImage = useCallback((image: ImageElement) => {
        sendMessage({type: 'image:add', image});
    }, [sendMessage]);

    const undo = useCallback(() => {
        sendMessage({type: 'undo'});
    }, [sendMessage]);

    const redo = useCallback(() => {
        sendMessage({type: 'redo'});
    }, [sendMessage]);

    const clear = useCallback(() => {
        sendMessage({type: 'clear'});
    }, [sendMessage]);

    const saveSession = useCallback((sessionName: string) => {
        sendMessage({type: 'save-session', name: sessionName});
    }, [sendMessage]);

    const loadSession = useCallback((sessionId: string) => {
        sendMessage({type: 'load-session', sessionId});
    }, [sendMessage]);

    return {
        ...state,
        updateCursor,
        upsertPath,
        commitPath,
        upsertShape,
        commitShape,
        addText,
        addImage,
        undo,
        redo,
        clear,
        saveSession,
        loadSession,
    };
}
