"use client";

import {useState} from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Card, CardContent} from '@/components/ui/card';
import {Users, Plus} from 'lucide-react';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';

type RoomSelectorProps = {
    onSelectRoomAction: (roomId: string, options?: { roomType: 'public' | 'private'; password?: string }) => void;
    currentRoom?: string;
};

export function RoomSelector({onSelectRoomAction, currentRoom}: RoomSelectorProps) {
    const [customRoomId, setCustomRoomId] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [roomType, setRoomType] = useState<'public' | 'private'>('public');
    const [roomPassword, setRoomPassword] = useState('');

    const popularRooms = [
        {id: 'default', name: 'Main Room', description: 'Default collaborative space', type: 'public' as const}
    ];

    const handleSelectRoom = (roomId: string, type: 'public' | 'private' = 'public') => {
        onSelectRoomAction(roomId, {roomType: type});
    };

    const handleCustomRoom = () => {
        if (!customRoomId.trim()) return;
        if (roomType === 'private' && !roomPassword.trim()) return;
        onSelectRoomAction(customRoomId.trim(), {
            roomType,
            password: roomType === 'private' ? roomPassword.trim() : undefined
        });
        setCustomRoomId('');
        setRoomPassword('');
        setRoomType('public');
        setIsDialogOpen(false);
    };

    const canSubmit = customRoomId.trim().length > 0 && (roomType !== 'private' || roomPassword.trim().length > 0);

    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Users className="h-5 w-5"/>
                    Create or Join a Room
                </h3>
                {currentRoom && (
                    <p className="text-sm text-muted-foreground mb-4">
                        Current room: <span className="font-medium">{currentRoom}</span>
                    </p>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {popularRooms.map((room) => (
                    <Card
                        key={room.id}
                        className={`cursor-pointer transition-all hover:shadow-md ${
                            currentRoom === room.id ? 'border-primary ring-2 ring-primary' : ''
                        }`}
                        onClick={() => handleSelectRoom(room.id, room.type)}
                    >
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between gap-2">
                                <h4 className="font-medium mb-1">{room.name}</h4>
                                <span
                                    className="text-[10px] uppercase tracking-wide text-muted-foreground border rounded px-1.5 py-0.5">
                  Public
                </span>
                            </div>
                            <p className="text-xs text-muted-foreground">{room.description}</p>
                        </CardContent>
                    </Card>
                ))}

                <Card
                    className="cursor-pointer transition-all hover:shadow-md border-dashed"
                    onClick={() => setIsDialogOpen(true)}
                >
                    <CardContent className="p-4 flex flex-col items-center justify-center h-full">
                        <Plus className="h-8 w-8 mb-2 text-muted-foreground"/>
                        <h4 className="font-medium">Custom Room</h4>
                        <p className="text-xs text-muted-foreground text-center">Create your own</p>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create or Join Room</DialogTitle>
                        <DialogDescription>
                            Enter a unique room ID to create a private collaborative space, or rejoin an existing room.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="room-id">Room ID</Label>
                            <Input
                                id="room-id"
                                placeholder="e.g., project-alpha, team-meeting..."
                                value={customRoomId}
                                onChange={(e) => setCustomRoomId(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleCustomRoom();
                                    }
                                }}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Room Type</Label>
                            <Select value={roomType}
                                    onValueChange={(value) => setRoomType(value as 'public' | 'private')}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select room type"/>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="public">Public</SelectItem>
                                    <SelectItem value="private">Private</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {roomType === 'private' && (
                            <div className="space-y-2">
                                <Label htmlFor="room-password">Room Password</Label>
                                <Input
                                    id="room-password"
                                    type="password"
                                    placeholder="Enter password"
                                    value={roomPassword}
                                    onChange={(e) => setRoomPassword(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleCustomRoom();
                                        }
                                    }}
                                />
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCustomRoom} disabled={!canSubmit}>Create or Join</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
