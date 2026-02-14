export type Point = { x: number; y: number };

export type ShapeType = 'rectangle' | 'circle' | 'triangle' | 'line';

export type Shape = {
    id: string;
    type: ShapeType;
    start: Point;
    end: Point;
    color: string;
    strokeWidth: number;
    filled: boolean;
    author: string;
    status?: 'in-progress' | 'committed';
};

export type TextElement = {
    id: string;
    position: Point;
    content: string;
    color: string;
    fontSize: number;
    author: string;
    status?: 'committed';
};

export type ImageElement = {
    id: string;
    position: Point;
    width: number;
    height: number;
    dataUrl: string;
    author: string;
    status?: 'committed';
};

export type DrawingElement = Path | Shape | TextElement | ImageElement;

export type Path = {
    id: string;
    type: 'path';
    points: Point[];
    color: string;
    strokeWidth: number;
    author: string;
    status?: 'in-progress' | 'committed';
};

export type User = {
    id: string;
    name: string;
    color: string;
};

export type UserCursor = User & {
    position: Point;
};

export type SessionMeta = {
    id: string;
    name: string;
    createdAt: number;
};

export type SessionData = {
    id: string;
    roomId: string;
    name: string;
    createdAt: number;
    elements: DrawingElement[];
};

export type PerformanceMetrics = {
    fps: number;
    latency: number;
    pointsRendered: number;
    elementsCount: number;
};
