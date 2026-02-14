"use client";

import React, {useCallback, useEffect, useRef, useState} from 'react';
import type {ImageElement, Path, Point, Shape, ShapeType, TextElement, User, UserCursor} from '@/lib/types';
import {MousePointer2} from 'lucide-react';
import {useDebouncedCallback} from 'use-debounce';

// Callback types for client component props
type PathCallback = (path: Path) => void;
type CommitCallback = (id: string) => void;
type ShapeCallback = (shape: Shape) => void;
type TextCallback = (text: TextElement) => void;
type ImageCallback = (image: ImageElement) => void;
type CursorCallback = (position: Point) => void;
type CountCallback = (count: number) => void;

type DrawingCanvasProps = {
    paths: Path[];
    shapes?: Shape[];
    texts?: TextElement[];
    images?: ImageElement[];
    onSetPathAction: PathCallback;
    onCommitPathAction?: CommitCallback;
    onSetShapeAction?: ShapeCallback;
    onCommitShapeAction?: CommitCallback;
    onAddTextAction?: TextCallback;
    onAddImageAction?: ImageCallback;
    color: string;
    strokeWidth: number;
    tool: 'brush' | 'eraser';
    shapeType?: ShapeType | null;
    cursors: UserCursor[];
    currentUser?: User;
    onCursorMoveAction: CursorCallback;
    backgroundColor: string;
    onPointsCountChangeAction?: CountCallback;
};

// Helper function to generate a simple unique ID
function generateId() {
    return Math.random().toString(36).substring(2, 11);
}

// Path optimization: Calculate the distance between two points
function getDistance(p1: Point, p2: Point): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
}

// Path optimization: Reduce points using a distance threshold
function optimizePath(points: Point[], threshold: number = 2): Point[] {
    if (points.length <= 2) return points;

    const optimized: Point[] = [points[0]];
    let lastPoint = points[0];

    for (let i = 1; i < points.length - 1; i++) {
        const distance = getDistance(lastPoint, points[i]);
        if (distance >= threshold) {
            optimized.push(points[i]);
            lastPoint = points[i];
        }
    }

    // Always include the last point for accuracy
    optimized.push(points[points.length - 1]);
    return optimized;
}

// Path optimization: Smooth drawing using quadratic curves
function drawPath(ctx: CanvasRenderingContext2D, path: Path) {
    if (path.points.length === 0) return;

    ctx.beginPath();
    ctx.strokeStyle = path.color;
    ctx.lineWidth = path.strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const points = path.points;

    if (points.length === 1) {
        // Single point - draw a dot
        ctx.arc(points[0].x, points[0].y, path.strokeWidth / 2, 0, Math.PI * 2);
        ctx.fillStyle = path.color;
        ctx.fill();
        return;
    }

    if (points.length === 2) {
        // Two points - simple line
        ctx.moveTo(points[0].x, points[0].y);
        ctx.lineTo(points[1].x, points[1].y);
        ctx.stroke();
        return;
    }

    // Multiple points - use quadratic curves for smoothness
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }

    // Draw the last segment
    const lastPoint = points[points.length - 1];
    const secondLastPoint = points[points.length - 2];
    ctx.quadraticCurveTo(secondLastPoint.x, secondLastPoint.y, lastPoint.x, lastPoint.y);

    ctx.stroke();
}

function drawShape(ctx: CanvasRenderingContext2D, shape: Shape) {
    ctx.strokeStyle = shape.color;
    ctx.fillStyle = shape.color;
    ctx.lineWidth = shape.strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const {start, end, type, filled} = shape;

    ctx.beginPath();

    switch (type) {
        case 'rectangle': {
            const width = end.x - start.x;
            const height = end.y - start.y;
            if (filled) {
                ctx.fillRect(start.x, start.y, width, height);
            } else {
                ctx.strokeRect(start.x, start.y, width, height);
            }
            break;
        }
        case 'circle': {
            const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
            ctx.arc(start.x, start.y, radius, 0, Math.PI * 2);
            if (filled) {
                ctx.fill();
            } else {
                ctx.stroke();
            }
            break;
        }
        case 'triangle': {
            const midX = start.x;
            const topY = start.y;
            const bottomY = end.y;
            const leftX = start.x - (end.x - start.x);
            const rightX = end.x;

            ctx.moveTo(midX, topY);
            ctx.lineTo(rightX, bottomY);
            ctx.lineTo(leftX, bottomY);
            ctx.closePath();

            if (filled) {
                ctx.fill();
            } else {
                ctx.stroke();
            }
            break;
        }
        case 'line': {
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.stroke();
            break;
        }
    }
}

function drawText(ctx: CanvasRenderingContext2D, text: TextElement) {
    ctx.fillStyle = text.color;
    ctx.font = `${text.fontSize}px Arial`;
    ctx.fillText(text.content, text.position.x, text.position.y);
}

function drawImage(ctx: CanvasRenderingContext2D, imageElement: ImageElement, loadedImages: Map<string, HTMLImageElement>) {
    const img = loadedImages.get(imageElement.id);
    if (img && img.complete) {
        ctx.drawImage(img, imageElement.position.x, imageElement.position.y, imageElement.width, imageElement.height);
    }
}

export function DrawingCanvas({
                                  paths,
                                  shapes = [],
                                  texts = [],
                                  images = [],
                                  onSetPathAction,
                                  onCommitPathAction,
                                  onSetShapeAction,
                                  onCommitShapeAction,
                                  color,
                                  strokeWidth,
                                  tool,
                                  shapeType = null,
                                  cursors,
                                  currentUser,
                                  onCursorMoveAction,
                                  backgroundColor,
                                  onPointsCountChangeAction,
                              }: DrawingCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isDrawing = useRef(false);
    const currentPath = useRef<Path | null>(null);
    const currentShape = useRef<Shape | null>(null);
    const [containerSize, setContainerSize] = useState({width: 0, height: 0});
    const containerRef = useRef<HTMLDivElement>(null);
    const loadedImages = useRef<Map<string, HTMLImageElement>>(new Map());

    const debouncedSetPath = useDebouncedCallback(onSetPathAction, 50);
    const debouncedSetShape = useDebouncedCallback((shape: Shape) => {
        if (onSetShapeAction) onSetShapeAction(shape);
    }, 50);

    const getCanvas = () => canvasRef.current;
    const getContext = () => getCanvas()?.getContext('2d');

    const handleResize = useCallback(() => {
        if (containerRef.current) {
            const {width, height} = containerRef.current.getBoundingClientRect();
            setContainerSize({width, height});
        }
    }, []);

    useEffect(() => {
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [handleResize]);

    // Load images
    useEffect(() => {
        images.forEach((imageElement) => {
            if (!loadedImages.current.has(imageElement.id)) {
                const img = new Image();
                img.src = imageElement.dataUrl;
                img.onload = () => {
                    loadedImages.current.set(imageElement.id, img);
                    redrawCanvas();
                };
            }
        });
    }, [images]);

    const redrawCanvas = useCallback(() => {
        const canvas = getCanvas();
        const ctx = getContext();
        if (!canvas || !ctx) return;

        canvas.width = containerSize.width;
        canvas.height = containerSize.height;

        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw all paths
        const displayedPaths = paths.filter(p => p.id !== currentPath.current?.id);
        displayedPaths.forEach(path => drawPath(ctx, path));

        // Draw the current path
        if (currentPath.current) {
            drawPath(ctx, currentPath.current as Path);
        }

        // Draw all shapes
        const displayedShapes = shapes.filter(s => s.id !== currentShape.current?.id);
        displayedShapes.forEach(shape => drawShape(ctx, shape));

        // Draw current shape
        if (currentShape.current) {
            drawShape(ctx, currentShape.current);
        }

        // Draw all text elements
        texts.forEach(text => drawText(ctx, text));

        // Draw all images
        images.forEach(image => drawImage(ctx, image, loadedImages.current));

        // Calculate total points for performance monitoring
        if (onPointsCountChangeAction) {
            const totalPoints = paths.reduce((sum, p) => sum + p.points.length, 0);
            onPointsCountChangeAction(totalPoints);
        }
    }, [paths, shapes, texts, images, backgroundColor, onPointsCountChangeAction, containerSize.width, containerSize.height]);

    useEffect(() => {
        redrawCanvas();
    }, [redrawCanvas]);

    const getPointFromEvent = (e: React.MouseEvent | React.TouchEvent): Point => {
        const canvas = getCanvas();
        if (!canvas) return {x: 0, y: 0};
        const rect = canvas.getBoundingClientRect();
        const touch = e.type.startsWith('touch') ? (e as React.TouchEvent).touches[0] : null;
        return {
            x: (touch ? touch.clientX : (e as React.MouseEvent).clientX) - rect.left,
            y: (touch ? touch.clientY : (e as React.MouseEvent).clientY) - rect.top,
        };
    };

    const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        if (!currentUser) return;
        isDrawing.current = true;
        const point = getPointFromEvent(e);

        // Handle shape drawing
        if (shapeType && onSetShapeAction) {
            const newShape: Shape = {
                id: generateId(),
                type: shapeType,
                start: point,
                end: point,
                color,
                strokeWidth,
                filled: false,
                author: currentUser.id,
                status: 'in-progress',
            };
            currentShape.current = newShape;
            onSetShapeAction(newShape);
            return;
        }

        // Handle path drawing (brush/eraser)
        const newPath: Path = {
            id: generateId(),
            type: 'path',
            points: [point],
            color: tool === 'eraser' ? backgroundColor : color,
            strokeWidth: tool === 'eraser' ? strokeWidth * 2 : strokeWidth,
            author: currentUser.id,
            status: 'in-progress',
        };
        currentPath.current = newPath;
        onSetPathAction(newPath);
    };

    const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
        const point = getPointFromEvent(e);
        onCursorMoveAction(point);

        if (!isDrawing.current) return;

        // Handle shape drawing
        if (currentShape.current && onSetShapeAction) {
            currentShape.current.end = point;
            debouncedSetShape(currentShape.current);
            redrawCanvas();
            return;
        }

        // Handle path drawing
        if (!currentPath.current?.points) return;

        // Path optimization: Only add a point if it's far enough from the last point
        const lastPoint = currentPath.current.points[currentPath.current.points.length - 1];
        const distance = getDistance(lastPoint, point);

        // Threshold of 1.5px to reduce redundant points while maintaining smoothness
        if (distance >= 1.5) {
            currentPath.current.points.push(point);
            debouncedSetPath(currentPath.current);
            redrawCanvas();
        }
    };

    const handlePointerUp = () => {
        if (!isDrawing.current) {
            isDrawing.current = false;
            return;
        }

        // Handle shape commit
        if (currentShape.current && onCommitShapeAction) {
            debouncedSetShape.flush();
            onCommitShapeAction(currentShape.current.id);
            isDrawing.current = false;
            currentShape.current = null;
            return;
        }

        // Handle path commit
        if (!currentPath.current) {
            isDrawing.current = false;
            currentPath.current = null;
            return;
        }

        // Path optimization: Reduce points before committing
        currentPath.current.points = optimizePath(currentPath.current.points, 2);

        debouncedSetPath.flush();
        onCommitPathAction?.(currentPath.current.id);
        isDrawing.current = false;
        currentPath.current = null;
    };

    const handlePointerLeave = () => {
        if (isDrawing.current) {
            handlePointerUp();
        }
        onCursorMoveAction({x: -100, y: -100}); // Hide cursor
    };

    return (
        <div ref={containerRef} className="relative w-full h-full rounded-lg shadow-inner bg-card overflow-hidden">
            <canvas
                ref={canvasRef}
                onMouseDown={handlePointerDown}
                onMouseMove={handlePointerMove}
                onMouseUp={handlePointerUp}
                onMouseLeave={handlePointerLeave}
                onTouchStart={handlePointerDown}
                onTouchMove={handlePointerMove}
                onTouchEnd={handlePointerUp}
                className="touch-none"
                style={{width: '100%', height: '100%'}}
            />
            {cursors.map((cursor) => (
                cursor.id !== currentUser?.id && cursor.position.x > 0 &&
                <div
                    key={cursor.id}
                    className="absolute pointer-events-none transition-transform duration-75 ease-linear"
                    style={{
                        left: cursor.position.x,
                        top: cursor.position.y,
                        transform: 'translate(-50%, -50%)',
                        color: cursor.color,
                        zIndex: 100,
                    }}
                >
                    <MousePointer2 className="h-6 w-6"/>
                    <span
                        className="absolute top-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-background px-2 py-1 text-xs shadow-md"
                        style={{color: cursor.color}}>
                  {cursor.name}
              </span>
                </div>
            ))}
        </div>
    );
}

