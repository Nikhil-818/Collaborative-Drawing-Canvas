import http from 'http';
import {WebSocketServer} from 'ws';
import {
    getRoom,
    getOrCreateRoom,
    buildStatePayload,
    buildSessionList,
    getLatestSessionId,
    hashPassword,
    isPasswordValid,
    serializeRooms,
    hydrateRooms
} from './rooms.js';
import * as drawingState from './drawing-state.js';
import * as storage from './storage.js';

const USER_COLORS = [
    '#DC2626',
    '#D97706',
    '#65A30D',
    '#059669',
    '#0891B2',
    '#0284C7',
    '#4F46E5',
    '#7C3AED',
    '#C026D3',
    '#DB2777',
];

function pickUserColor(room) {
    const usedColors = new Set(Array.from(room.clients.values()).map((client) => client.color));
    for (const color of USER_COLORS) {
        if (!usedColors.has(color)) return color;
    }
    return USER_COLORS[room.clients.size % USER_COLORS.length];
}

const PORT = Number.parseInt(process.env.PORT || process.env.WS_PORT || '9001', 10);

function broadcast(room, message) {
    const payload = JSON.stringify(message);
    for (const client of room.clients.values()) {
        if (client.socket.readyState === 1) {
            client.socket.send(payload);
        }
    }
}

function send(socket, message) {
    if (socket.readyState === 1) {
        socket.send(JSON.stringify(message));
    }
}

const server = http.createServer((req, res) => {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('collab-draw websocket server');
});

const wss = new WebSocketServer({server});

let clientCounter = 0;

const persistedSnapshot = storage.loadRoomSnapshot();
hydrateRooms(persistedSnapshot);

wss.on('connection', (socket) => {
    const clientId = `user-${clientCounter++}`;
    let currentRoom = null;

    socket.on('message', (data) => {
        let message;
        try {
            message = JSON.parse(data.toString());
        } catch (error) {
            send(socket, {type: 'error', message: 'Invalid JSON payload.'});
            return;
        }

        if (!message || typeof message.type !== 'string') {
            send(socket, {type: 'error', message: 'Message type is required.'});
            return;
        }

        if (message.type === 'join') {
            const roomId = message.roomId || 'default';
            const requestedRoomType = message.roomType === 'private' ? 'private' : 'public';
            const requestedPassword = message.password || '';

            const existingRoom = getRoom(roomId);
            if (!existingRoom && requestedRoomType === 'private' && !requestedPassword.trim()) {
                send(socket, {type: 'error', message: 'Private rooms require a password.'});
                return;
            }

            if (existingRoom) {
                if (existingRoom.roomType === 'private' && !isPasswordValid(existingRoom, requestedPassword)) {
                    send(socket, {type: 'error', message: 'Invalid room password.'});
                    return;
                }
            }

            const currentRoomWasCreated = !existingRoom;
            currentRoom = getOrCreateRoom(roomId, {
                roomType: requestedRoomType,
                passwordHash: requestedRoomType === 'private' ? hashPassword(requestedPassword) : null,
            });

            if (currentRoomWasCreated) {
                storage.saveRoomSnapshot(serializeRooms());
            }

            const assignedColor = pickUserColor(currentRoom);

            const clientInfo = {
                id: clientId,
                name: message.name || 'Anonymous',
                color: assignedColor,
                position: {x: -100, y: -100},
                socket,
                roomId,
            };
            currentRoom.clients.set(clientId, clientInfo);
            send(socket, {type: 'welcome', id: clientId, roomId, roomType: currentRoom.roomType || 'public'});

            const hasLiveState =
                currentRoom.pathsById.size > 0 ||
                currentRoom.shapesById.size > 0 ||
                currentRoom.textsById.size > 0 ||
                currentRoom.imagesById.size > 0;
            if (!hasLiveState && currentRoom.clients.size === 1 && currentRoom.sessions.size > 0) {
                const latestSessionId = getLatestSessionId(currentRoom);
                if (latestSessionId) {
                    drawingState.loadSession(currentRoom, latestSessionId);
                }
            }

            broadcast(currentRoom, buildStatePayload(currentRoom));
            return;
        }

        if (!currentRoom) {
            send(socket, {type: 'error', message: 'Not joined to a room.'});
            return;
        }

        const clientInfo = currentRoom.clients.get(clientId);
        if (!clientInfo) {
            return;
        }

        switch (message.type) {
            case 'cursor': {
                clientInfo.position = message.position;
                broadcast(currentRoom, {type: 'cursor', id: clientId, position: message.position});
                break;
            }
            case 'path:upsert': {
                const nextPath = drawingState.upsertPath(currentRoom, message.path);
                if (!nextPath) return;
                broadcast(currentRoom, {type: 'path:upsert', path: nextPath});
                break;
            }
            case 'path:commit': {
                const committedPath = drawingState.commitPath(currentRoom, message.id);
                if (!committedPath) return;
                broadcast(currentRoom, {type: 'path:upsert', path: committedPath});
                broadcast(currentRoom, {type: 'redo-count', redoCount: currentRoom.redoStack.length});
                break;
            }
            case 'shape:upsert': {
                const nextShape = drawingState.upsertShape(currentRoom, message.shape);
                if (!nextShape) return;
                broadcast(currentRoom, {type: 'shape:upsert', shape: nextShape});
                break;
            }
            case 'shape:commit': {
                const committedShape = drawingState.commitShape(currentRoom, message.id);
                if (!committedShape) return;
                broadcast(currentRoom, {type: 'shape:upsert', shape: committedShape});
                broadcast(currentRoom, {type: 'redo-count', redoCount: currentRoom.redoStack.length});
                break;
            }
            case 'text:add': {
                const text = drawingState.addText(currentRoom, message.text);
                if (!text) return;
                broadcast(currentRoom, {type: 'text:add', text});
                broadcast(currentRoom, {type: 'redo-count', redoCount: currentRoom.redoStack.length});
                break;
            }
            case 'image:add': {
                const image = drawingState.addImage(currentRoom, message.image);
                if (!image) return;
                broadcast(currentRoom, {type: 'image:add', image});
                broadcast(currentRoom, {type: 'redo-count', redoCount: currentRoom.redoStack.length});
                break;
            }
            case 'undo': {
                drawingState.undo(currentRoom);
                broadcast(currentRoom, buildStatePayload(currentRoom));
                break;
            }
            case 'redo': {
                drawingState.redo(currentRoom);
                broadcast(currentRoom, buildStatePayload(currentRoom));
                break;
            }
            case 'clear': {
                drawingState.clear(currentRoom);
                broadcast(currentRoom, {type: 'clear'});
                broadcast(currentRoom, buildStatePayload(currentRoom));
                break;
            }
            case 'save-session': {
                const result = drawingState.saveSession(currentRoom, message.name);
                send(socket, {type: 'session-saved', sessionId: result.sessionId, name: result.name});
                broadcast(currentRoom, {type: 'session-list', sessions: buildSessionList(currentRoom)});
                storage.saveRoomSnapshot(serializeRooms());
                break;
            }
            case 'load-session': {
                const elements = drawingState.loadSession(currentRoom, message.sessionId);
                if (elements) {
                    broadcast(currentRoom, {type: 'session-loaded', sessionId: message.sessionId, elements});
                    broadcast(currentRoom, buildStatePayload(currentRoom));
                } else {
                    send(socket, {type: 'error', message: 'Session not found.'});
                }
                break;
            }
            default:
                send(socket, {type: 'error', message: `Unknown message type: ${message.type}`});
        }
    });

    socket.on('close', () => {
        if (currentRoom) {
            currentRoom.clients.delete(clientId);
            if (currentRoom.clients.size === 0) {
                drawingState.clear(currentRoom);
            } else {
                broadcast(currentRoom, buildStatePayload(currentRoom));
            }
        }
    });
});

server.listen(PORT, () => {
    console.log(`WebSocket server running on ws://localhost:${PORT}`);
});
