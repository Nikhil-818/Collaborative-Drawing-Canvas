function upsertPath(room, path) {
    if (!path || !path.id) return null;
    const status = path.status || (room.committedIds.includes(path.id) ? 'committed' : 'in-progress');
    const nextPath = {...path, type: 'path', status};
    room.pathsById.set(path.id, nextPath);
    return nextPath;
}

function commitPath(room, pathId) {
    if (!pathId) return null;
    const existingPath = room.pathsById.get(pathId);
    if (!existingPath) return null;
    if (!room.committedIds.includes(pathId)) {
        room.committedIds.push(pathId);
    }
    room.redoStack = [];
    const committedPath = {...existingPath, status: 'committed'};
    room.pathsById.set(pathId, committedPath);
    return committedPath;
}

function upsertShape(room, shape) {
    if (!shape || !shape.id) return null;
    const status = shape.status || (room.committedIds.includes(shape.id) ? 'committed' : 'in-progress');
    const nextShape = {...shape, status};
    room.shapesById.set(shape.id, nextShape);
    return nextShape;
}

function commitShape(room, shapeId) {
    if (!shapeId) return null;
    const existingShape = room.shapesById.get(shapeId);
    if (!existingShape) return null;
    if (!room.committedIds.includes(shapeId)) {
        room.committedIds.push(shapeId);
    }
    room.redoStack = [];
    const committedShape = {...existingShape, status: 'committed'};
    room.shapesById.set(shapeId, committedShape);
    return committedShape;
}

function addText(room, text) {
    if (!text || !text.id) return null;
    const textElement = {...text, status: 'committed'};
    room.textsById.set(text.id, textElement);
    room.committedIds.push(text.id);
    room.redoStack = [];
    return textElement;
}

function addImage(room, image) {
    if (!image || !image.id) return null;
    const imageElement = {...image, status: 'committed'};
    room.imagesById.set(image.id, imageElement);
    room.committedIds.push(image.id);
    room.redoStack = [];
    return imageElement;
}

function undo(room) {
    const lastId = room.committedIds.pop();
    if (!lastId) return null;

    let element = null;
    if (room.pathsById.has(lastId)) {
        element = room.pathsById.get(lastId);
        room.pathsById.delete(lastId);
    } else if (room.shapesById.has(lastId)) {
        element = room.shapesById.get(lastId);
        room.shapesById.delete(lastId);
    } else if (room.textsById.has(lastId)) {
        element = room.textsById.get(lastId);
        room.textsById.delete(lastId);
    } else if (room.imagesById.has(lastId)) {
        element = room.imagesById.get(lastId);
        room.imagesById.delete(lastId);
    }

    if (element) {
        room.redoStack.push({id: lastId, element});
    }
    return element;
}

function redo(room) {
    const item = room.redoStack.pop();
    if (!item) return null;

    const {id, element} = item;
    const committedElement = {...element, status: 'committed'};

    if (element.type === 'path') {
        room.pathsById.set(id, committedElement);
    } else if (element.type) {
        room.shapesById.set(id, committedElement);
    } else if (element.content !== undefined) {
        room.textsById.set(id, committedElement);
    } else if (element.dataUrl !== undefined) {
        room.imagesById.set(id, committedElement);
    }

    room.committedIds.push(id);
    return committedElement;
}

function clear(room) {
    room.pathsById.clear();
    room.shapesById.clear();
    room.textsById.clear();
    room.imagesById.clear();
    room.committedIds = [];
    room.redoStack = [];
}

function saveSession(room, sessionName) {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const elements = [
        ...Array.from(room.pathsById.values()),
        ...Array.from(room.shapesById.values()),
        ...Array.from(room.textsById.values()),
        ...Array.from(room.imagesById.values()),
    ];

    room.sessions.set(sessionId, {
        name: sessionName,
        elements,
        createdAt: Date.now(),
    });

    return {sessionId, name: sessionName};
}

function loadSession(room, sessionId) {
    const session = room.sessions.get(sessionId);
    if (!session) return null;

    clear(room);

    session.elements.forEach((element) => {
        if (element.type === 'path') {
            room.pathsById.set(element.id, element);
        } else if (element.type) {
            room.shapesById.set(element.id, element);
        } else if (element.content !== undefined) {
            room.textsById.set(element.id, element);
        } else if (element.dataUrl !== undefined) {
            room.imagesById.set(element.id, element);
        }

        if (element.status === 'committed') {
            room.committedIds.push(element.id);
        }
    });

    return session.elements;
}

export {
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
