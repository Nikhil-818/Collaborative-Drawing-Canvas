import type {User} from '@/lib/types';
import {Avatar, AvatarFallback} from '@/components/ui/avatar';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Users} from 'lucide-react';

type UserListProps = {
    users: User[];
};

export function UserList({users}: UserListProps) {
    return (
        <Card className="w-full h-full flex flex-col">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-headline">
                    <Users className="h-5 w-5"/>
                    Online ({users.length})
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
                <ul className="space-y-3">
                    {users.map((user) => (
                        <li key={user.id} className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 border">
                                <AvatarFallback style={{
                                    backgroundColor: user.color,
                                    color: 'white',
                                    fontWeight: 500,
                                    fontSize: '0.8rem'
                                }}>
                                    {user.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-sm">{user.name}</span>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
}
