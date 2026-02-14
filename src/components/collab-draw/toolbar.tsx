"use client";

import {
    Brush,
    Eraser,
    Trash2,
    Minus,
    Plus,
    RotateCcw,
    RotateCw,
    Square,
    Circle,
    Triangle,
    Minus as LineIcon,
    Save,
    FolderOpen
} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Slider} from '@/components/ui/slider';
import {Separator} from '@/components/ui/separator';
import {Card, CardContent} from '@/components/ui/card';
import {Tooltip, TooltipContent, TooltipTrigger} from '../ui/tooltip';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger
} from '../ui/alert-dialog';
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter} from '../ui/dialog';
import {Input} from '../ui/input';
import {Label} from '../ui/label';
import {useState, useEffect} from 'react';
import type {ShapeType} from '@/lib/types';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '../ui/select';

type Tool = 'brush' | 'eraser';

type EnhancedToolbarProps = {
    tool: Tool;
    setToolAction: (tool: Tool) => void;
    color: string;
    strokeWidth: number;
    setStrokeWidthAction: (width: number) => void;
    clearAction: () => void;
    undoAction: () => void;
    redoAction: () => void;
    canUndo: boolean;
    canRedo: boolean;
    shapeType: ShapeType | null;
    setShapeTypeAction: (shape: ShapeType | null) => void;
    onSaveSessionAction?: (name: string) => void;
    onLoadSessionAction?: (sessionId: string) => void;
    sessions?: { id: string; name: string; createdAt: number }[];
    lastLoadedSessionId?: string | null;
    showPerformance: boolean;
    setShowPerformanceAction: (show: boolean) => void;
};

export function EnhancedToolbar(
    {
        tool,
        setToolAction,
        color,
        strokeWidth,
        setStrokeWidthAction,
        clearAction,
        undoAction,
        redoAction,
        canUndo,
        canRedo,
        shapeType,
        setShapeTypeAction,
        onSaveSessionAction,
        onLoadSessionAction,
        sessions = [],
        lastLoadedSessionId = null,
        showPerformance,
        setShowPerformanceAction,
    }: EnhancedToolbarProps) {
    const [sessionName, setSessionName] = useState('');
    const [saveDialogOpen, setSaveDialogOpen] = useState(false);
    const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);
    const [hasUserSelectedSession, setHasUserSelectedSession] = useState(false);

    // Update the dropdown when the sessions list changes (new session saved)
    useEffect(() => {
        if (!sessions.length) {
            setPendingSessionId(null);
            setHasUserSelectedSession(false);
            return;
        }

        const latestSessionId = sessions[0].id;

        // Only auto-select if the user hasn't manually selected a session and (no session is selected or the current selection is invalid)
        if (!hasUserSelectedSession && (!pendingSessionId || !sessions.some((session) => session.id === pendingSessionId))) {
            setPendingSessionId(latestSessionId);
        }
    }, [sessions, hasUserSelectedSession, pendingSessionId]);

    // Update dropdown when ANY user loads a session (including remote users)
    useEffect(() => {
        if (!lastLoadedSessionId) return;
        // Only auto-update if the user hasn't manually selected a different session
        if (!hasUserSelectedSession) {
            setPendingSessionId(lastLoadedSessionId);
        }
    }, [lastLoadedSessionId, hasUserSelectedSession]);

    const handleSaveSession = () => {
        if (sessionName.trim() && onSaveSessionAction) {
            onSaveSessionAction(sessionName.trim());
            setSessionName('');
            setSaveDialogOpen(false);
            setHasUserSelectedSession(false);
            setPendingSessionId(null);
        }
    };

    const handleLoadSession = () => {
        if (pendingSessionId && onLoadSessionAction) {
            onLoadSessionAction(pendingSessionId);
        }
    };

    return (
        <Card className="w-full shadow-none border-0 bg-transparent md:bg-card md:border md:shadow-sm">
            <CardContent className="p-1 md:p-2">
                <div className="flex flex-wrap items-center justify-center gap-1 md:gap-2">

                    {/* Drawing Tools */}
                    <div className="flex items-center gap-1">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant={tool === 'brush' && !shapeType ? 'secondary' : 'ghost'}
                                    size="icon"
                                    onClick={() => {
                                        setToolAction('brush');
                                        setShapeTypeAction(null);
                                    }}
                                    aria-label="Brush"
                                >
                                    <Brush/>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Brush</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant={tool === 'eraser' ? 'secondary' : 'ghost'}
                                    size="icon"
                                    onClick={() => {
                                        setToolAction('eraser');
                                        setShapeTypeAction(null);
                                    }}
                                    aria-label="Eraser"
                                >
                                    <Eraser/>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Eraser</p></TooltipContent>
                        </Tooltip>
                    </div>

                    <Separator orientation="vertical" className="h-8 mx-1"/>

                    {/* Shapes */}
                    <div className="flex items-center gap-1">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant={shapeType === 'rectangle' ? 'secondary' : 'ghost'}
                                    size="icon"
                                    onClick={() => {
                                        setShapeTypeAction(shapeType === 'rectangle' ? null : 'rectangle');
                                        setToolAction('brush');
                                    }}
                                    aria-label="Rectangle"
                                >
                                    <Square/>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Rectangle</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant={shapeType === 'circle' ? 'secondary' : 'ghost'}
                                    size="icon"
                                    onClick={() => {
                                        setShapeTypeAction(shapeType === 'circle' ? null : 'circle');
                                        setToolAction('brush');
                                    }}
                                    aria-label="Circle"
                                >
                                    <Circle/>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Circle</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant={shapeType === 'triangle' ? 'secondary' : 'ghost'}
                                    size="icon"
                                    onClick={() => {
                                        setShapeTypeAction(shapeType === 'triangle' ? null : 'triangle');
                                        setToolAction('brush');
                                    }}
                                    aria-label="Triangle"
                                >
                                    <Triangle/>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Triangle</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant={shapeType === 'line' ? 'secondary' : 'ghost'}
                                    size="icon"
                                    onClick={() => {
                                        setShapeTypeAction(shapeType === 'line' ? null : 'line');
                                        setToolAction('brush');
                                    }}
                                    aria-label="Line"
                                >
                                    <LineIcon/>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Line</p></TooltipContent>
                        </Tooltip>
                    </div>

                    <Separator orientation="vertical" className="h-8 mx-1"/>

                    {/* Undo/Redo */}
                    <div className="flex items-center gap-1">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={undoAction} disabled={!canUndo}
                                        aria-label="Undo">
                                    <RotateCcw/>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Undo</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={redoAction} disabled={!canRedo}
                                        aria-label="Redo">
                                    <RotateCw/>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Redo</p></TooltipContent>
                        </Tooltip>
                    </div>

                    <Separator orientation="vertical" className="h-8 mx-1"/>

                    {/* Color Indicator (Server-Assigned) */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="flex items-center justify-center h-10 w-10">
                                <div className="h-6 w-6 rounded-full border-2 border-border"
                                     style={{backgroundColor: tool === 'eraser' ? 'hsl(var(--background))' : color}}/>
                            </div>
                        </TooltipTrigger>
                        <TooltipContent><p>Your Color (Server-Assigned)</p></TooltipContent>
                    </Tooltip>

                    <Separator orientation="vertical" className="h-8 mx-1"/>

                    {/* Stroke Width */}
                    <div className="flex items-center gap-2 w-28 md:w-32">
                        <Minus className="h-5 w-5 shrink-0"/>
                        <Slider
                            min={1}
                            max={50}
                            step={1}
                            value={[strokeWidth]}
                            onValueChange={(value) => setStrokeWidthAction(value[0])}
                            aria-label="Stroke Width"
                        />
                        <Plus className="h-5 w-5 shrink-0"/>
                    </div>

                    <Separator orientation="vertical" className="h-8 mx-1"/>

                    {/* Session Management */}
                    {onSaveSessionAction && (
                        <>
                            <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <DialogTrigger asChild>
                                            <Button variant="ghost" size="icon" aria-label="Save Session">
                                                <Save/>
                                            </Button>
                                        </DialogTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Save Session</p></TooltipContent>
                                </Tooltip>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Save Drawing Session</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="session-name">Session Name</Label>
                                            <Input
                                                id="session-name"
                                                placeholder="Enter session name..."
                                                value={sessionName}
                                                onChange={(e) => setSessionName(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline"
                                                onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
                                        <Button onClick={handleSaveSession}>Save</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                            <div className="flex items-center gap-2">
                                <Select
                                    key={`session-${lastLoadedSessionId || pendingSessionId || 'none'}`}
                                    value={pendingSessionId ?? ''}
                                    onValueChange={(value) => {
                                        setPendingSessionId(value);
                                        setHasUserSelectedSession(true);
                                    }}
                                    disabled={!onLoadSessionAction || sessions.length === 0}
                                >
                                    <SelectTrigger className="h-9 w-[160px]">
                                        <SelectValue placeholder="Load session"/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {sessions.length === 0 ? (
                                            <SelectItem value="empty" disabled>
                                                No saved sessions
                                            </SelectItem>
                                        ) : (
                                            sessions.map((session) => (
                                                <SelectItem key={session.id} value={session.id}>
                                                    {session.name}
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleLoadSession}
                                    disabled={!pendingSessionId || !onLoadSessionAction}
                                    aria-label="Load Session"
                                >
                                    <FolderOpen className="h-4 w-4"/>
                                </Button>
                            </div>
                        </>
                    )}

                    {/* Performance Toggle */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant={showPerformance ? 'secondary' : 'ghost'}
                                size="icon"
                                onClick={() => setShowPerformanceAction(!showPerformance)}
                                aria-label="Toggle Performance Metrics"
                            >
                                <span className="text-xs font-mono">FPS</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Performance Metrics</p></TooltipContent>
                    </Tooltip>

                    <Separator orientation="vertical" className="h-8 mx-1"/>

                    {/* Clear Canvas */}
                    <AlertDialog>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" aria-label="Clear Canvas"><Trash2/></Button>
                                </AlertDialogTrigger>
                            </TooltipTrigger>
                            <TooltipContent><p>Clear Canvas</p></TooltipContent>
                        </Tooltip>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will permanently clear the canvas for everyone. This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={clearAction}>Clear</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </CardContent>
        </Card>
    );
}
