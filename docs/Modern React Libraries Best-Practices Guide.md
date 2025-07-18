# Modern React Libraries Best-Practices Guide 2024

## Executive Summary

This guide examines eight specialized React libraries essential for modern Single Page Applications (SPAs) built with React ≥18. Based on analysis of official documentation, GitHub releases, and community insights from January 2024 onward, key findings include: Monaco Editor's v4 TypeScript rewrite significantly improves developer experience; dnd-kit has emerged as the preferred drag-and-drop solution over React DnD; Recharts remains the most popular charting library despite React 18 compatibility challenges; Socket.IO client requires careful React 18 Strict Mode handling; React Router v7 introduces non-breaking data-driven patterns; and Papa Parse continues to excel for high-performance CSV processing. Performance optimizations focus on bundle size reduction, web worker utilization, and proper cleanup patterns. Security considerations emphasize proper CORS configuration, authentication token management, and input validation. TypeScript integration has improved across all libraries, with stronger type inference and better development workflows. Migration paths exist for all major version upgrades, though React DnD users should consider migrating to dnd-kit for better performance and maintenance.

## 1. Monaco Editor

### When & Why to Use

Monaco Editor is the code editor that powers Visual Studio Code, making it the ideal choice for applications requiring rich text editing capabilities with syntax highlighting, IntelliSense, and debugging features. Use Monaco Editor when building code playgrounds, online IDEs, configuration editors, or any application requiring sophisticated text editing with language support [Microsoft/monaco-editor](https://microsoft.github.io/monaco-editor/).

The library excels in scenarios requiring multi-language support, real-time collaborative editing, and integration with existing development workflows. Its extensive language server protocol support makes it particularly valuable for developer tools and educational platforms.

### Core API Tips (incl. version notes)

**Version 4.x Breaking Changes**: The `@monaco-editor/react` package was completely rewritten in TypeScript, introducing significant API improvements. Current stable version is 4.x, with React v19 support available in v4.7.0-rc.0 [npmjs.com](https://www.npmjs.com/package/@monaco-editor/react).

```typescript
import Editor from '@monaco-editor/react';
import { loader } from '@monaco-editor/react';

// Configure loader for better performance
loader.config({
  paths: {
    vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@latest/min/vs'
  }
});

function CodeEditor() {
  const handleEditorWillMount = (monaco) => {
    // Configure before mount
    monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true);
  };

  return (
    <Editor
      height="90vh"
      defaultLanguage="typescript"
      defaultValue="// Welcome to Monaco"
      beforeMount={handleEditorWillMount}
      options={{
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        fontSize: 14,
        fontFamily: 'Fira Code, Consolas, monospace',
        automaticLayout: true
      }}
    />
  );
}
```

**Multi-model Support**: Version 4 introduces native multi-model editing with the `path` prop, preserving view state and undo history across file switches:

```typescript
<Editor
  path="src/main.ts"
  defaultLanguage="typescript"
  value={fileContent}
  saveViewState={true}
  keepCurrentModel={false}
/>
```

### Performance & Bundle-Size Advice

**CDN Configuration**: Serve Monaco assets from a nearby CDN or local server to reduce initial load times. The default CDN configuration may cause delays in production environments [npmjs.com](https://www.npmjs.com/package/@monaco-editor/react).

```typescript
loader.config({
  paths: { vs: '/public/monaco-editor/min/vs' }
});
```

**Web Worker Integration**: Enable web workers for language processing to prevent UI blocking during syntax analysis and validation [GitHub](https://github.com/suren-atoyan/monaco-react/issues/68):

```typescript
// Configure MonacoEnvironment
window.MonacoEnvironment = {
  getWorkerUrl: function (moduleId, label) {
    if (label === 'json') {
      return './json.worker.js';
    }
    if (label === 'css' || label === 'scss' || label === 'less') {
      return './css.worker.js';
    }
    if (label === 'html' || label === 'handlebars' || label === 'razor') {
      return './html.worker.js';
    }
    if (label === 'typescript' || label === 'javascript') {
      return './ts.worker.js';
    }
    return './editor.worker.js';
  }
};
```

**Lazy Loading**: Implement dynamic imports for server-side rendering frameworks to prevent hydration mismatches:

```typescript
const MonacoEditor = dynamic(
  () => import('@monaco-editor/react'),
  { ssr: false }
);
```

### Security / DX Pitfalls & Mitigations

**Content Security Policy**: Monaco Editor requires `unsafe-eval` for language services. Configure CSP appropriately:

```
script-src 'self' 'unsafe-eval' https://cdn.jsdelivr.net;
worker-src 'self' blob:;
```

**Model Disposal**: Explicitly dispose of unused models to prevent memory leaks:

```typescript
useEffect(() => {
  return () => {
    // Cleanup when component unmounts
    const models = monaco.editor.getModels();
    models.forEach(model => {
      if (model.uri.path === '/my-file.ts') {
        model.dispose();
      }
    });
  };
}, []);
```

**TypeScript Configuration**: Ensure `monaco-editor` is installed as a peer dependency for proper TypeScript definitions:

```bash
npm install monaco-editor @monaco-editor/react
```

### Code Snippet Examples

**Advanced Configuration with Custom Theme**:

```typescript
import Editor from '@monaco-editor/react';

const customTheme = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '6A9955' },
    { token: 'keyword', foreground: '569CD6' },
    { token: 'string', foreground: 'CE9178' }
  ],
  colors: {
    'editor.background': '#1E1E1E',
    'editor.foreground': '#D4D4D4'
  }
};

function ThemedEditor() {
  const handleEditorDidMount = (editor, monaco) => {
    monaco.editor.defineTheme('custom-dark', customTheme);
    monaco.editor.setTheme('custom-dark');
  };

  return (
    <Editor
      height="400px"
      defaultLanguage="typescript"
      onMount={handleEditorDidMount}
      options={{
        theme: 'custom-dark',
        automaticLayout: true,
        minimap: { enabled: false }
      }}
    />
  );
}
```

### Upgrade & Migration Pointers

**Migration from v3 to v4**: Follow the official migration guide [GitHub](https://github.com/suren-atoyan/monaco-react/blob/HEAD/v4.changes.md). Key changes include:

- Complete TypeScript rewrite with improved type definitions
- New multi-model API with `path` prop
- Updated loader configuration methods
- React v19 compatibility improvements

**Breaking Changes**: Remove deprecated `editorDidMount` prop in favor of `onMount`, and update loader configuration syntax.

### Further-Reading Links

- [Monaco Editor Official Documentation](https://microsoft.github.io/monaco-editor/)
- [React Monaco Editor v4 Changes](https://github.com/suren-atoyan/monaco-react/blob/HEAD/v4.changes.md)
- [Monaco Language Client Integration](https://github.com/TypeFox/monaco-languageclient)

## 2. React DnD vs dnd-kit

### When & Why to Use

**Current Recommendation (2024)**: Use **dnd-kit** instead of React DnD for new projects. The community has largely migrated to dnd-kit due to better performance, smaller bundle size, and active maintenance [DEV Community](https://dev.to/puckeditor/top-5-drag-and-drop-libraries-for-react-24lb).

React DnD is no longer actively maintained and lacks modern React features. dnd-kit offers superior performance, accessibility, and TypeScript support while maintaining a similar API surface.

**Use dnd-kit when**:
- Building sortable lists, grids, or trees
- Requiring touch/mobile support
- Needing accessibility compliance
- Performance is critical
- Building games or 2D interfaces

### Core API Tips (incl. version notes)

**dnd-kit Basic Setup**:

```typescript
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableItem({ id, children }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}

function SortableList({ items, onItemsChange }) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = items.indexOf(active.id);
      const newIndex = items.indexOf(over.id);
      onItemsChange(arrayMove(items, oldIndex, newIndex));
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        {items.map(id => (
          <SortableItem key={id} id={id}>
            Item {id}
          </SortableItem>
        ))}
      </SortableContext>
    </DndContext>
  );
}
```

### Performance & Bundle-Size Advice

**Bundle Size Comparison** [DEV Community](https://dev.to/puckeditor/top-5-drag-and-drop-libraries-for-react-24lb):
- dnd-kit: ~15KB gzipped
- React DnD: ~25KB gzipped
- hello-pangea/dnd: ~30KB gzipped

**Performance Optimizations**:

```typescript
// Use collision detection algorithms appropriately
import { 
  closestCenter,    // General purpose
  closestCorners,   // For grid layouts
  pointerWithin,    // For nested containers
  rectIntersection  // For overlapping areas
} from '@dnd-kit/core';

// Optimize with useMemo for large lists
const items = useMemo(() => 
  data.map(item => ({ id: item.id, ...item })), 
  [data]
);

// Use appropriate sensors
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8, // Prevent accidental drags
    },
  })
);
```

### Security / DX Pitfalls & Mitigations

**Accessibility Requirements**:

```typescript
// Always include keyboard support
const sensors = useSensors(
  useSensor(PointerSensor),
  useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  })
);

// Provide proper announcements
const announcements = {
  onDragStart({ active }) {
    return `Picked up sortable item ${active.id}`;
  },
  onDragOver({ active, over }) {
    return `Sortable item ${active.id} was moved over ${over.id}`;
  },
  onDragEnd({ active, over }) {
    return `Sortable item ${active.id} was dropped over ${over.id}`;
  },
};
```

**Common Pitfalls**:
- Not providing stable IDs for items
- Mutating state directly instead of using immutable updates
- Forgetting to handle drag cancellation
- Not implementing proper cleanup in useEffect

### Code Snippet Examples

**Multi-Container Drag & Drop**:

```typescript
function MultiContainerExample() {
  const [containers, setContainers] = useState({
    todo: ['1', '2', '3'],
    doing: ['4', '5'],
    done: ['6']
  });

  const handleDragEnd = (event) => {
    const { active, over } = event;
    
    if (!over) return;

    const activeContainer = findContainer(active.id);
    const overContainer = findContainer(over.id);

    if (activeContainer !== overContainer) {
      setContainers((prev) => {
        const activeItems = prev[activeContainer];
        const overItems = prev[overContainer];
        const activeIndex = activeItems.indexOf(active.id);
        const overIndex = overItems.indexOf(over.id);

        return {
          ...prev,
          [activeContainer]: activeItems.filter(id => id !== active.id),
          [overContainer]: [
            ...overItems.slice(0, overIndex),
            active.id,
            ...overItems.slice(overIndex)
          ]
        };
      });
    }
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      {Object.entries(containers).map(([id, items]) => (
        <Droppable key={id} id={id}>
          <SortableContext items={items}>
            {items.map(item => (
              <SortableItem key={item} id={item} />
            ))}
          </SortableContext>
        </Droppable>
      ))}
    </DndContext>
  );
}
```

### Upgrade & Migration Pointers

**Migration from React DnD to dnd-kit**:

1. **Replace providers**: Remove `DndProvider` with `DndContext`
2. **Update drag sources**: Replace `useDrag` with `useDraggable`
3. **Update drop targets**: Replace `useDrop` with `useDroppable`
4. **Handle events**: Replace monitor-based event handling with event objects
5. **Update styling**: Use CSS transforms instead of drag preview positioning

**Migration from react-beautiful-dnd**:

```typescript
// Before (react-beautiful-dnd)
<DragDropContext onDragEnd={handleDragEnd}>
  <Droppable droppableId="items">
    {(provided) => (
      <div {...provided.droppableProps} ref={provided.innerRef}>
        {items.map((item, index) => (
          <Draggable key={item.id} draggableId={item.id} index={index}>
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.draggableProps}
                {...provided.dragHandleProps}
              >
                {item.content}
              </div>
            )}
          </Draggable>
        ))}
        {provided.placeholder}
      </div>
    )}
  </Droppable>
</DragDropContext>

// After (dnd-kit)
<DndContext onDragEnd={handleDragEnd}>
  <SortableContext items={items} strategy={verticalListSortingStrategy}>
    {items.map(item => (
      <SortableItem key={item.id} id={item.id}>
        {item.content}
      </SortableItem>
    ))}
  </SortableContext>
</DndContext>
```

### Further-Reading Links

- [dnd-kit Official Documentation](https://dndkit.com/)
- [Migration Guide from react-beautiful-dnd](https://github.com/clauderic/dnd-kit/discussions/481)
- [Performance Comparison Study](https://dev.to/puckeditor/top-5-drag-and-drop-libraries-for-react-24lb)

## 3. Recharts

### When & Why to Use

Recharts remains the most popular React charting library in 2024, with 24.8K+ GitHub stars and 3.6M+ weekly npm downloads [LogRocket Blog](https://blog.logrocket.com/best-react-chart-libraries-2025/). Use Recharts when you need:

- Simple, declarative chart components
- SVG-based rendering for crisp graphics
- Integration with React component lifecycle
- Strong community support and extensive documentation
- UI library compatibility (works well with Material-UI, Ant Design, etc.)

**Avoid Recharts when**:
- Handling very large datasets (>10,000 points)
- Requiring Canvas rendering for performance
- Needing built-in mobile touch interactions
- Working with real-time streaming data

### Core API Tips (incl. version notes)

**Current Version**: 2.12.3 with ongoing React 18 compatibility improvements [GitHub](https://github.com/recharts/recharts/issues/4382).

```typescript
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const data = [
  { name: 'Jan', value: 400, growth: 240 },
  { name: 'Feb', value: 300, growth: 139 },
  { name: 'Mar', value: 200, growth: 980 },
  { name: 'Apr', value: 278, growth: 390 },
];

function CustomChart() {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line
          type="monotone"
          dataKey="value"
          stroke="#8884d8"
          strokeWidth={2}
          dot={{ fill: '#8884d8', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6 }}
        />
        <Line
          type="monotone"
          dataKey="growth"
          stroke="#82ca9d"
          strokeWidth={2}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

**TypeScript Integration**:

```typescript
interface ChartData {
  name: string;
  value: number;
  growth: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    dataKey: string;
    value: number;
    payload: ChartData;
  }>;
  label?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p className="label">{`${label} : ${payload[0].value}`}</p>
        <p className="intro">{`Growth: ${payload[0].payload.growth}%`}</p>
      </div>
    );
  }
  return null;
};
```

### Performance & Bundle-Size Advice

**Bundle Size Optimization**:

```typescript
// Import only necessary components
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';

// Avoid importing the entire library
// import * from 'recharts'; // ❌ Don't do this
```

**Performance for Large Datasets**:

```typescript
// Use data sampling for large datasets
const sampleData = (data: any[], maxPoints: number = 1000) => {
  if (data.length <= maxPoints) return data;
  
  const step = Math.ceil(data.length / maxPoints);
  return data.filter((_, index) => index % step === 0);
};

// Implement virtualization for real-time data
const useStreamingData = (maxPoints: number = 100) => {
  const [data, setData] = useState([]);
  
  const addDataPoint = useCallback((newPoint) => {
    setData(prev => {
      const updated = [...prev, newPoint];
      return updated.length > maxPoints 
        ? updated.slice(-maxPoints)
        : updated;
    });
  }, [maxPoints]);
  
  return { data, addDataPoint };
};
```

**Responsive Design**:

```typescript
// Always wrap charts in ResponsiveContainer
<ResponsiveContainer width="100%" height={400}>
  <LineChart data={data}>
    {/* Chart components */}
  </LineChart>
</ResponsiveContainer>

// Custom responsive behavior
const useResponsiveChart = () => {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  
  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };
    
    window.addEventListener('resize', updateDimensions);
    updateDimensions();
    
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);
  
  return {
    height: dimensions.width < 768 ? 200 : 400,
    fontSize: dimensions.width < 768 ? 10 : 12
  };
};
```

### Security / DX Pitfalls & Mitigations

**React 18 TypeScript Compatibility Issues**: The current version has known TypeScript issues with React 18 types. Workarounds include [GitHub](https://github.com/recharts/recharts/issues/4382):

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "skipLibCheck": true // Temporary workaround
  }
}

// Or use type assertion
const ChartComponent = LineChart as any;
```

**Memory Leaks Prevention**:

```typescript
// Properly cleanup event listeners
useEffect(() => {
  const handleResize = () => {
    // Handle resize
  };
  
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);

// Avoid creating new objects in render
const chartColors = useMemo(() => ({
  primary: '#8884d8',
  secondary: '#82ca9d'
}), []);
```

**Data Validation**:

```typescript
// Validate data before rendering
const validateChartData = (data: any[]) => {
  return data.filter(item => 
    item && 
    typeof item === 'object' && 
    !isNaN(Number(item.value))
  );
};

// Handle missing data gracefully
const SafeChart = ({ data }) => {
  const validData = useMemo(() => validateChartData(data), [data]);
  
  if (!validData.length) {
    return <div>No data available</div>;
  }
  
  return <LineChart data={validData}>{/* ... */}</LineChart>;
};
```

### Code Snippet Examples

**Custom Legend and Tooltip**:

```typescript
const CustomLegend = ({ payload }) => {
  return (
    <ul className="recharts-legend">
      {payload.map((entry, index) => (
        <li key={index} style={{ color: entry.color }}>
          <span className="legend-icon" style={{ backgroundColor: entry.color }} />
          {entry.value}
        </li>
      ))}
    </ul>
  );
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p className="label">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }}>
            {`${entry.name}: ${entry.value}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};
```

**Animated Chart with Custom Shapes**:

```typescript
const AnimatedChart = () => {
  const [animationId, setAnimationId] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationId(prev => prev + 1);
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <LineChart data={data}>
      <Line
        type="monotone"
        dataKey="value"
        stroke="#8884d8"
        strokeWidth={2}
        animationDuration={1000}
        animationId={animationId}
        dot={<CustomDot />}
      />
    </LineChart>
  );
};

const CustomDot = ({ cx, cy, payload }) => {
  return (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      fill={payload.value > 300 ? '#ff7c7c' : '#8884d8'}
      stroke="#fff"
      strokeWidth={2}
    />
  );
};
```

### Upgrade & Migration Pointers

**Migration from v1 to v2**:
- Update import statements for tree-shaking support
- Replace deprecated props with new equivalents
- Update TypeScript types if using custom components

**Alternative Libraries for Performance**:
- Consider Apache ECharts for large datasets (>10K points)
- Use Nivo for advanced customization needs
- Evaluate Chart.js with react-chartjs-2 for Canvas performance

### Further-Reading Links

- [Recharts Official Documentation](https://recharts.org/)
- [React 18 Compatibility Issue](https://github.com/recharts/recharts/issues/4382)
- [Performance Comparison Study](https://blog.logrocket.com/best-react-chart-libraries-2025/)

## 4. Socket.IO Client

### When & Why to Use

Socket.IO client is the standard choice for real-time bidirectional communication in React applications. Use it when you need:

- Real-time messaging and notifications
- Live collaborative features
- Real-time data synchronization
- Gaming or interactive applications
- Live dashboards and monitoring

Socket.IO provides automatic reconnection, room management, and fallback to polling when WebSockets are unavailable, making it more robust than native WebSockets for production applications.

### Core API Tips (incl. version notes)

**Current Version**: 4.x with React 18 compatibility considerations [Socket.IO](https://socket.io/how-to/use-with-react).

**Basic Setup**:

```typescript
// socket.js
import { io } from 'socket.io-client';

const URL = process.env.NODE_ENV === 'production' 
  ? 'https://api.example.com' 
  : 'http://localhost:4000';

export const socket = io(URL, {
  autoConnect: false // Prevent automatic connection
});
```

**React Integration with Hooks**:

```typescript
import { useEffect, useState } from 'react';
import { socket } from './socket';

function ChatComponent() {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);
    const onMessage = (message) => {
      setMessages(prev => [...prev, message]);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('message', onMessage);

    // Connect manually
    socket.connect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('message', onMessage);
      socket.disconnect();
    };
  }, []);

  const sendMessage = (text) => {
    socket.emit('message', { text, timestamp: Date.now() });
  };

  return (
    <div>
      <p>Status: {isConnected ? 'Connected' : 'Disconnected'}</p>
      <MessageList messages={messages} />
      <MessageInput onSend={sendMessage} />
    </div>
  );
}
```

### Performance & Bundle-Size Advice

**Connection Management**:

```typescript
// Use context for global socket management
const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const newSocket = io(URL, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    });

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    newSocket.on('connect', onConnect);
    newSocket.on('disconnect', onDisconnect);

    setSocket(newSocket);

    return () => {
      newSocket.off('connect', onConnect);
      newSocket.off('disconnect', onDisconnect);
      newSocket.close();
    };
  }, []);

  const value = {
    socket,
    isConnected,
    connect: () => socket?.connect(),
    disconnect: () => socket?.disconnect()
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
```

**Throttling and Debouncing**:

```typescript
// Throttle frequent emissions
const useThrottledEmit = (socket, event, delay = 100) => {
  const throttledEmit = useCallback(
    throttle((data) => {
      socket.emit(event, data);
    }, delay),
    [socket, event, delay]
  );

  return throttledEmit;
};

// Debounce user input
const useDebounceTyping = (socket, delay = 300) => {
  const debouncedTyping = useCallback(
    debounce((isTyping) => {
      socket.emit('typing', isTyping);
    }, delay),
    [socket, delay]
  );

  return debouncedTyping;
};
```

### Security / DX Pitfalls & Mitigations

**CORS Configuration** [Socket.IO](https://socket.io/how-to/use-with-react):

```typescript
// Server-side CORS setup
const io = new Server({
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://yourdomain.com'] 
      : ['http://localhost:3000'],
    credentials: true
  }
});
```

**Authentication Integration**:

```typescript
// Client-side authentication
const authenticatedSocket = io(URL, {
  auth: {
    token: localStorage.getItem('authToken')
  },
  autoConnect: false
});

// Handle authentication errors
useEffect(() => {
  const onAuthError = (error) => {
    console.error('Authentication failed:', error);
    // Redirect to login or refresh token
  };

  socket.on('connect_error', onAuthError);

  return () => socket.off('connect_error', onAuthError);
}, []);
```

**React 18 Strict Mode Issues** [GitHub](https://github.com/socketio/socket.io-client/issues/1575):

```typescript
// Handle double useEffect execution in development
useEffect(() => {
  let mounted = true;

  const initializeSocket = () => {
    if (mounted && !socket.connected) {
      socket.connect();
    }
  };

  initializeSocket();

  return () => {
    mounted = false;
    if (socket.connected) {
      socket.disconnect();
    }
  };
}, []);
```

### Code