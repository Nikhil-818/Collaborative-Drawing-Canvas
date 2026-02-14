# Architecture: Real-Time Collaborative Drawing Canvas

## Data Flow Diagram

```
User 1 Drawing
  ↓
Mouse Events → Drawing Canvas Component
  ↓
Path Data (optimized points)
  ↓
WebSocket: path:upsert message → Server
  ↓
Server broadcasts to all users in room
  ↓
User 2 receives path:upsert
  ↓
Canvas re-renders with User 1's drawing
  ↓
User 1 finishes stroke (mouse up)
  ↓
WebSocket: path:commit message → Server
  ↓
Server adds to committed history
  ↓
Broadcast full state to all users
```

## WebSocket Protocol

### Client → Server Messages

```typescript
// When user joins
{
    type: 'join',
        name
:
    string,
        color
:
    string,
        roomId ? : string,
        roomType ? : 'public' | 'private',
        password ? : string
}

// Cursor movement
{
    type: 'cursor',
        position
:
    {
        x: number, y
    :
        number
    }
}

// Drawing in progress
{
    type: 'path:upsert',
        path
:
    {
        id: string,
            points
    :
        {
            x: number, y
        :
            number
        }
        [],
            color
    :
        string,
            strokeWidth
    :
        number,
            author
    :
        string
    }
}

// Stroke finished
{
    type: 'path:commit',
        id
:
    string
}

// Shape in progress
{
    type: 'shape:upsert',
        shape
:
    {
        id: string,
            type
    :
        'rectangle' | 'circle' | 'triangle' | 'line',
            start
    :
        {
            x: number, y
        :
            number
        }
    ,
        end: {
            x: number, y
        :
            number
        }
    ,
        color: string,
            strokeWidth
    :
        number
    }
}

// Shape finished
{
    type: 'shape:commit',
        id
:
    string
}

// Global undo
{
    type: 'undo'
}

// Global redo
{
    type: 'redo'
}

// Clear canvas
{
    type: 'clear'
}

// Save session
{
    type: 'save-session',
        name
:
    string
}

// Load session
{
    type: 'load-session',
        sessionId
:
    string
}
```

### Server → Client Messages

```typescript
// Connection established
{
    type: 'welcome',
        id
:
    string,
        roomId
:
    string,
        roomType
:
    'public' | 'private'
}

// Full state update
{
    type: 'state',
        users
:
    Array<{ id: string, name: string, color: string }>,
        cursors
:
    Array<{ id: string, name: string, color: string, position: { x, y } }>,
        paths
:
    Path[],
        shapes
:
    Shape[],
        redoCount
:
    number
}

// Cursor update
{
    type: 'cursor',
        id
:
    string,
        position
:
    {
        x: number, y
    :
        number
    }
}

// Path update
{
    type: 'path:upsert',
        path
:
    Path
}

// Shape update
{
    type: 'shape:upsert',
        shape
:
    Shape
}

// Redo count
{
    type: 'redo-count',
        redoCount
:
    number
}

// Canvas cleared
{
    type: 'clear'
}

// Error
{
    type: 'error',
        message
:
    string
}
```

## Canvas Mastery: How We Optimize Drawing

### Path Optimization

**Problem**: Mouse move events fire 60–120 times per second, creating too many points.

**Solution**: Distance-based point filtering

- Only add a point if it's ≥1.5px away from the last point
- Reduces point count by 40–60% without visible quality loss
- During mouse movement: local canvas redraws immediately
- Network update: batched every 50 ms (debounced)

### Layer Management for Undo/Redo

**Two-layer approach:**

1. **Committed layer**: Finalized strokes that can be undone
2. **In-progress layer**: Current drawing operation (not yet committed)

When the user finishes drawing → a path committed → added to history
When undo called → remove the last committed element from history

### Smooth Rendering

Use quadratic Bézier curves for smooth drawing:

- Single point: draw as a circle
- Two points: draw as line
- 3+ points: draw smooth curves using midpoints as control points

Result: Visually smooth strokes even with fewer points.

### High-Frequency Event Handling

**Three-layer throttling:**

1. **Distance threshold**: Only capture points 1.5px+ apart
2. **Debounce**: Batch updates every 50 ms for network send
3. **Immediate local render**: Canvas redraws on every mouse move

**Result**: 60–120 mouse events/sec → 10–20 network messages/sec = 85% reduction

## Real-Time Architecture

### Event Streaming Strategy

Different strategies for different message types:

**Immediate Send (State-changing):**

- `join`: User enters room
- `path:commit`: Stroke finalized
- `undo`/`redo`: History operation
- `clear`: Canvas cleared

**Batched Send (Debounced 50 ms):**

- `path:upsert`: Stroke in progress
- `cursor`: Cursor position updates

**Why 50ms?**

- 50ms = imperceptible to humans (3 frames at 60fps)
- Batches 3–5 mouse move events into one network message
- Local canvas updates instantly (no network wait)

### Handling Network Latency

**Client-Side Prediction:**

```
User draws → Local canvas updates immediately
           → Network message sent to server (50-500ms later)
           → Server broadcasts to other users
           → Other users see drawing 50-150ms later
```

User never waits for network round-trip - sees their drawing instantly.

**Server as Source of Truth:**

- Server owns all drawing states
- Server orders all commits
- Clients converge to server state
- No merge conflicts between users

### Data Serialization

Use JSON format (simple, debuggable):

```javascript
{
    type: 'path:upsert',
        path
:
    {
        id: 'abc123',
            points
    :
        [
            {x: 100, y: 200},
            {x: 102, y: 205},
            {x: 105, y: 210}
        ],
            color
    :
        '#FF0000',
            strokeWidth
    :
        3,
            author
    :
        'user-1'
    }
}
```

Points optimized to integers (no decimals), 30–50% smaller than the naive approach.

## State Synchronization: Global Undo/Redo

### LIFO Stack (Last In, First Out)

All drawing operations are stored in order:

```
[path1, path2, shape1, path3, text1, ...]
 ↑                                    ↑
oldest                             newest
```

**Undo**: Pop the last element, remove from canvas
**Redo**: Push an element back

### Handling Simultaneous Operations

**Example:**

```
T=0: User A draws path → committed, added to stack
T=50: User B draws shape → committed, added to stack
T=100: User C clicks undo
       → Removes User B's shape (last item)
       → Both User A and B see canvas without shape
```

**Why it works:**

- Server maintains single ordered stack per room
- Server broadcasts state after each operation
- All clients converge to the same state
- No client-side merging needed

### Conflict Resolution for Overlapping Drawing

**Approach: Server-Authoritative Ordering**

When User A and User B draw simultaneously in an overlapping area:

1. Both send `path:upsert` to server
2. Server receives both messages
3. Server maintains order they arrived
4. Server broadcasts to all clients in that order
5. All clients render in the same order → same result

No conflicts because the server decides order.

## Performance Decisions

### Why 50 ms Debounce?

- Balance between responsiveness and efficiency
- 50 ms = 1/20 second = imperceptible
- At 60 FPS, 50 ms = 3 frames (human brain sees as continuous)
- Batches 3–5 events into one network message

### Why 1.5 px Distance Threshold?

- Human eye can't distinguish 1.5 px differences in curves
- Captures more points during fast strokes (large movements)
- Captures fewer during slow movements (smaller distances)
- Automatically adapts to drawing speed

### Why JSON over Binary?

- Simplicity: Human-readable for debugging
- Debuggability: Can inspect network traffic easily
- Trade-off: 20–30% larger than binary, acceptable for typical strokes
- If needed, can add binary protocol later without API changes

### Why No Socket.io?

- Simpler protocol for our use case
- Native WebSockets sufficient for real-time drawing
- Smaller bundle size
- Better control over message format

## File Structure

**Frontend (src/)**

- `app/page.tsx`: Main part, state management
- `components/collab-draw/drawing-canvas.tsx`: Canvas rendering and drawing logic
- `components/collab-draw/toolbar.tsx`: Tool selection, colors, stroke width
- `components/collab-draw/user-list.tsx`: Display online users
- `hooks/use-collab-socket.ts`: WebSocket connection and state
- `lib/types.ts`: TypeScript type definitions
- `lib/collab-protocol.ts`: Message type definitions

**Backend (server/)**

- `server.js`: HTTP + WebSocket server setup
- `rooms.js`: Room management and state per room
- `drawing-state.js`: Path/shape/text commit logic and undo/redo
- `storage.js`: Save/load drawing sessions to disk

## Testing the Implementation

### Single User

1. Open application
2. Draw on canvas
3. Observe smooth rendering
4. Use undo/redo
5. Try different tools and colors

### Two Users

1. Open an application in two browser windows
2. In window 1: Enter the name "Alice," draw something
3. In window 2: Enter the name "Bob," draw something
4. Verify:
    - Alice sees Bob's drawing in real-time as Bob draws
    - Bob sees Alice's drawing in real-time as Alice draws
    - Both see cursor positions with names
    - Undo in one window removes drawing for both

### Edge Cases

- Draw while another user is drawing
- Undo/redo while drawing is in progress
- Rapid clicks on undo/redo
- Drawing in the same pixel area as another user

## Limitations and Future Improvements

**Current Limitations:**

- No user authentication
- Disk-based persistence (fine for demo)
- Global undo/redo only (not per-user)
- Text and image tools are structure-only

**Could be improved with:**

- Database persistence (MongoDB, PostgreSQL)
- User authentication (OAuth)
- Per-user undo/redo history
- Full text/image tool implementation
- Canvas export (PNG, SVG)
- Fill tool, gradient support
- Collaborative cursors following each other
