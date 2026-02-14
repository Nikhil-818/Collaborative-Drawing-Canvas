"use client";

import {useState, useEffect, useMemo, useCallback} from 'react';
import {DrawingCanvas} from '@/components/collab-draw/drawing-canvas';
import {EnhancedToolbar} from '@/components/collab-draw/toolbar';
import {UserList} from '@/components/collab-draw/user-list';
import {RoomSelector} from '@/components/collab-draw/room-selector';
import {PerformanceMonitor} from '@/components/collab-draw/performance-monitor';
import type {Path, Point, Shape, ShapeType} from '@/lib/types';
import {COLORS} from '@/components/collab-draw/constants';
import {useIsMobile} from '@/hooks/use-mobile';
import {TooltipProvider} from '@/components/ui/tooltip';
import {Button} from '@/components/ui/button';
import {useCollabSocket} from '@/hooks/use-collab-socket';
import {useToast} from '@/hooks/use-toast';

const BACKGROUND_COLOR_LIGHT = '#F0F0F0';
const BACKGROUND_COLOR_DARK = 'hsl(240 10% 3.9%)';

export default function EnhancedCollabDrawPage() {
    const [tool, setTool] = useState<'brush' | 'eraser'>('brush');
    const [strokeWidth, setStrokeWidth] = useState(10);
    const [backgroundColor, setBackgroundColor] = useState(BACKGROUND_COLOR_LIGHT);
    const [name, setName] = useState('');
    const [joined, setJoined] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState('');
    const [selectedRoomType, setSelectedRoomType] = useState<'public' | 'private'>('public');
    const [selectedRoomPassword, setSelectedRoomPassword] = useState('');
    const [shapeType, setShapeType] = useState<ShapeType | null>(null);
    const [showPerformance, setShowPerformance] = useState(true);
    const [pointsCount, setPointsCount] = useState(0);

    const isMobile = useIsMobile();
    const {toast} = useToast();

    useEffect(() => {
        const storedName = window.localStorage.getItem('collaborative_draw:name');
        if (storedName) setName(storedName);
    }, []);

    const displayName = name.trim() || 'Guest';

    const {
        clientId,
        roomId,
        roomType,
        lastLoadedSessionId,
        paths,
        shapes,
        texts,
        images,
        users,
        cursors,
        redoCount,
        sessions,
        connectionState,
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
    } = useCollabSocket({
        name: displayName,
        color: COLORS[0], // Server will assign actual color
        enabled: joined,
        roomId: selectedRoom || 'default',
        roomType: selectedRoomType,
        password: selectedRoomPassword,
    });

    const currentUser = useMemo(() =>
            clientId ? users.find(u => u.id === clientId) : undefined,
        [clientId, users]
    );


    const onlineUsers = useMemo(() => users, [users]);

    const hasCommittedPaths = useMemo(() => {
        return paths.some((path) => path.status === 'committed') ||
            shapes.some((shape) => shape.status === 'committed') ||
            texts.length > 0 ||
            images.length > 0;
    }, [paths, shapes, texts.length, images.length]);

    const totalElements = paths.length + shapes.length + texts.length + images.length;

    useEffect(() => {
        const updateBackgroundColor = () => {
            if (document.documentElement.classList.contains('dark')) {
                setBackgroundColor(BACKGROUND_COLOR_DARK);
            } else {
                setBackgroundColor(BACKGROUND_COLOR_LIGHT);
            }
        };
        updateBackgroundColor();
        const observer = new MutationObserver(updateBackgroundColor);
        observer.observe(document.documentElement, {attributes: true, attributeFilter: ['class']});
        return () => observer.disconnect();
    }, []);

    const handleSetPath = useCallback((path: Path) => {
        upsertPath(path);
    }, [upsertPath]);

    const handleCommitPath = useCallback((pathId: string) => {
        commitPath(pathId);
    }, [commitPath]);

    const handleSetShape = useCallback((shape: Shape) => {
        upsertShape(shape);
    }, [upsertShape]);

    const handleCommitShape = useCallback((shapeId: string) => {
        commitShape(shapeId);
    }, [commitShape]);

    const handleCursorMove = useCallback((position: Point) => {
        updateCursor(position);
    }, [updateCursor]);

    const handleSaveSession = useCallback((sessionName: string) => {
        saveSession(sessionName);
        toast({
            title: "Session Saved",
            description: `Your drawing has been saved as "${sessionName}"`,
        });
    }, [saveSession, toast]);

    const handleLoadSession = useCallback((sessionId: string) => {
        loadSession(sessionId);
        toast({
            title: "Session Loaded",
            description: "Your saved drawing has been restored",
        });
    }, [loadSession, toast]);

    const handleJoin = () => {
        const trimmedName = name.trim();
        if (trimmedName.length === 0) return;
        if (selectedRoom.trim().length === 0) return;
        window.localStorage.setItem('collaborative_draw:name', trimmedName);
        setName(trimmedName);
        setJoined(true);
    };

    const handleRoomChange = (newRoomId: string, options?: { roomType: 'public' | 'private'; password?: string }) => {
        setSelectedRoom(newRoomId);
        setSelectedRoomType(options?.roomType || 'public');
        setSelectedRoomPassword(options?.password || '');
    };

    if (isMobile === undefined) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-background">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"/>
            </div>
        );
    }

    if (!joined) {
        return (
            <div
                className="flex h-screen w-screen flex-col items-center justify-center bg-background text-foreground p-4">
                <div className="w-full max-w-4xl space-y-6">
                    <div className="flex flex-col items-center gap-4 rounded-xl border bg-card p-6 shadow-sm">
                        <h1 className="font-headline text-3xl font-bold text-primary">Collab Draw</h1>
                        <p className="text-center text-sm text-muted-foreground">
                            Real-time collaborative drawing canvas
                        </p>
                    </div>

                    <div className="rounded-xl border bg-card p-6 space-y-4">
                        <div className="space-y-3">
                            <label className="block text-sm font-medium" htmlFor="displayName">Your Name</label>
                            <input
                                id="displayName"
                                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                                value={name}
                                onChange={(event) => setName(event.target.value)}
                                placeholder="Enter your name"
                            />
                        </div>
                        <Button
                            onClick={handleJoin}
                            className="w-full"
                            disabled={name.trim().length === 0 || selectedRoom.trim().length === 0}
                        >
                            Join Room
                        </Button>
                        <p className="text-xs text-muted-foreground text-center">
                            Connection: {connectionState === 'open' ? '🟢 Connected' : `🔴 ${connectionState}`}
                        </p>
                    </div>

                    <div className="rounded-xl border bg-card p-6">
                        <RoomSelector onSelectRoomAction={handleRoomChange} currentRoom={selectedRoom || undefined}/>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <TooltipProvider>
            <div className="flex h-dvh w-screen flex-col bg-background font-body text-foreground">
                <header className="border-b bg-card p-2 shadow-sm shrink-0">
                    <div className="container mx-auto flex items-center justify-between gap-4">
                        <div>
                            <h1 className="font-headline text-xl font-bold text-primary">CollabDraw</h1>
                            <p className="text-xs text-muted-foreground flex items-center gap-2">
                                Room: {roomId} • {connectionState}
                                <span
                                    className="rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                  {roomType || selectedRoomType}
                </span>
                            </p>
                        </div>
                        <div className="hidden md:block">
                            <EnhancedToolbar
                                tool={tool}
                                setToolAction={setTool}
                                color={currentUser?.color || COLORS[0]}
                                strokeWidth={strokeWidth}
                                setStrokeWidthAction={setStrokeWidth}
                                clearAction={clear}
                                undoAction={undo}
                                redoAction={redo}
                                canUndo={hasCommittedPaths}
                                canRedo={redoCount > 0}
                                shapeType={shapeType}
                                setShapeTypeAction={setShapeType}
                                onSaveSessionAction={handleSaveSession}
                                onLoadSessionAction={handleLoadSession}
                                sessions={sessions}
                                lastLoadedSessionId={lastLoadedSessionId}
                                showPerformance={showPerformance}
                                setShowPerformanceAction={setShowPerformance}
                            />
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setJoined(false);
                                setSelectedRoom('');
                                setSelectedRoomPassword('');
                                setSelectedRoomType('public');
                            }}
                            className="hidden md:flex"
                        >
                            Exit Room
                        </Button>
                    </div>
                </header>

                <main className="flex flex-1 flex-col-reverse md:flex-row overflow-hidden">
                    <div className="flex-1 p-2 md:p-4 h-full w-full">
                        <DrawingCanvas
                            paths={paths}
                            shapes={shapes}
                            texts={texts}
                            images={images}
                            onSetPathAction={handleSetPath}
                            onCommitPathAction={handleCommitPath}
                            onSetShapeAction={handleSetShape}
                            onCommitShapeAction={handleCommitShape}
                            onAddTextAction={addText}
                            onAddImageAction={addImage}
                            color={currentUser?.color || COLORS[0]}
                            strokeWidth={strokeWidth}
                            tool={tool}
                            shapeType={shapeType}
                            cursors={cursors}
                            currentUser={currentUser}
                            onCursorMoveAction={handleCursorMove}
                            backgroundColor={backgroundColor}
                            onPointsCountChangeAction={setPointsCount}
                        />
                    </div>
                    <aside
                        className="w-full md:w-72 border-t md:border-t-0 md:border-l bg-card p-4 overflow-y-auto shrink-0">
                        <UserList users={onlineUsers}/>
                    </aside>
                </main>

                {isMobile && (
                    <footer className="border-t bg-card p-2 shadow-inner shrink-0">
                        <EnhancedToolbar
                            tool={tool}
                            setToolAction={setTool}
                            color={currentUser?.color || COLORS[0]}
                            strokeWidth={strokeWidth}
                            setStrokeWidthAction={setStrokeWidth}
                            clearAction={clear}
                            undoAction={undo}
                            redoAction={redo}
                            canUndo={hasCommittedPaths}
                            canRedo={redoCount > 0}
                            shapeType={shapeType}
                            setShapeTypeAction={setShapeType}
                            onSaveSessionAction={handleSaveSession}
                            onLoadSessionAction={handleLoadSession}
                            sessions={sessions}
                            lastLoadedSessionId={lastLoadedSessionId}
                            showPerformance={showPerformance}
                            setShowPerformanceAction={setShowPerformance}
                        />
                    </footer>
                )}

                {showPerformance && (
                    <PerformanceMonitor
                        elementsCount={totalElements}
                        pointsRendered={pointsCount}
                        enabled={showPerformance}
                    />
                )}
            </div>
        </TooltipProvider>
    );
}
