import crypto from 'crypto';

function hashPassword(password) {
    if (!password) return null;
    return crypto.createHash('sha256').update(password).digest('hex');
}

function createRoom(options = {}) {
    return {
        clients: new Map(),
        pathsById: new Map(),
        shapesById: new Map(),
        textsById: new Map(),
        imagesById: new Map(),
        committedIds: [],
        redoStack: [],
        sessions: new Map(),
        roomType: options.roomType || 'public',
        passwordHash: options.passwordHash || null,
    };
}

const rooms = new Map();

function getRoom(roomId = 'default') {
    return rooms.get(roomId);
}

function getOrCreateRoom(roomId = 'default', options = {}) {
    if (!rooms.has(roomId)) {
        rooms.set(roomId, createRoom(options));
    }
    return rooms.get(roomId);
}

function isPasswordValid(room, password) {
    if (room.roomType !== 'private') return true;
    if (!room.passwordHash) return false;
    return hashPassword(password) === room.passwordHash;
}

function buildSessionList(room) {
    return Array.from(room.sessions.entries())
        .map(([id, session]) => ({id, name: session.name, createdAt: session.createdAt}))
        .sort((a, b) => b.createdAt - a.createdAt);
}

function buildStatePayload(room) {
    const committedSet = new Set(room.committedIds);
    const committedPaths = room.committedIds
        .map((id) => room.pathsById.get(id))
        .filter(Boolean);
    const inProgressPaths = [];
    for (const [id, path] of room.pathsById.entries()) {
        if (!committedSet.has(id)) {
            inProgressPaths.push(path);
        }
    }

    const users = [];
    const cursors = [];
    for (const client of room.clients.values()) {
        users.push({id: client.id, name: client.name, color: client.color});
        cursors.push({id: client.id, name: client.name, color: client.color, position: client.position});
    }

    const shapes = Array.from(room.shapesById.values());
    const texts = Array.from(room.textsById.values());
    const images = Array.from(room.imagesById.values());
    const sessions = buildSessionList(room);

    return {
        type: 'state',
        users,
        cursors,
        paths: [...committedPaths, ...inProgressPaths],
        shapes,
        texts,
        images,
        redoCount: room.redoStack.length,
        sessions,
        roomType: room.roomType || 'public',
    };
}

function getLatestSessionId(room) {
    const sessions = buildSessionList(room);
    return sessions.length > 0 ? sessions[0].id : null;
}

function serializeRooms() {
    const snapshot = {};
    for (const [roomId, room] of rooms.entries()) {
        const sessions = {};
        for (const [sessionId, session] of room.sessions.entries()) {
            sessions[sessionId] = {
                name: session.name,
                elements: session.elements,
                createdAt: session.createdAt,
            };
        }
        snapshot[roomId] = {
            roomType: room.roomType || 'public',
            passwordHash: room.passwordHash || null,
            sessions,
        };
    }
    return snapshot;
}

function hydrateRooms(snapshot = {}) {
    for (const [roomId, roomData] of Object.entries(snapshot)) {
        const room = createRoom({
            roomType: roomData.roomType || 'public',
            passwordHash: roomData.passwordHash || null,
        });
        if (roomData.sessions) {
            for (const [sessionId, session] of Object.entries(roomData.sessions)) {
                room.sessions.set(sessionId, {
                    name: session.name,
                    elements: session.elements || [],
                    createdAt: session.createdAt || Date.now(),
                });
            }
        }
        rooms.set(roomId, room);
    }
}

export {
    getRoom,
    getOrCreateRoom,
    buildStatePayload,
    buildSessionList,
    getLatestSessionId,
    hashPassword,
    isPasswordValid,
    serializeRooms,
    hydrateRooms,
    rooms,
};
