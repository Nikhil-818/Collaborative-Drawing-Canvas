import type {
    Path,
    Point,
    User,
    UserCursor,
    Shape,
    TextElement,
    ImageElement,
    DrawingElement,
    SessionMeta
} from './types';

export type ClientMessage =
    | { type: 'join'; name: string; color: string; roomId?: string; roomType?: 'public' | 'private'; password?: string }
    | { type: 'cursor'; position: Point }
    | { type: 'path:upsert'; path: Path }
    | { type: 'path:commit'; id: string }
    | { type: 'shape:upsert'; shape: Shape }
    | { type: 'shape:commit'; id: string }
    | { type: 'text:add'; text: TextElement }
    | { type: 'image:add'; image: ImageElement }
    | { type: 'undo' }
    | { type: 'redo' }
    | { type: 'clear' }
    | { type: 'save-session'; name: string }
    | { type: 'load-session'; sessionId: string };

export type ServerMessage =
    | { type: 'welcome'; id: string; roomId: string; roomType?: 'public' | 'private' }
    | {
    type: 'state';
    users: User[];
    cursors: UserCursor[];
    paths: Path[];
    shapes: Shape[];
    texts: TextElement[];
    images: ImageElement[];
    redoCount: number;
    sessions: SessionMeta[];
    roomType?: 'public' | 'private'
}
    | { type: 'cursor'; id: string; position: Point }
    | { type: 'path:upsert'; path: Path }
    | { type: 'shape:upsert'; shape: Shape }
    | { type: 'text:add'; text: TextElement }
    | { type: 'image:add'; image: ImageElement }
    | { type: 'redo-count'; redoCount: number }
    | { type: 'clear' }
    | { type: 'session-saved'; sessionId: string; name: string }
    | { type: 'session-loaded'; sessionId: string; elements: DrawingElement[] }
    | { type: 'session-list'; sessions: SessionMeta[] }
    | { type: 'error'; message: string };
