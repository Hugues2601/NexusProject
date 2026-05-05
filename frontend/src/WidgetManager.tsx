import React, { useState, useRef } from 'react';
import Draggable from 'react-draggable';

interface Widget {
  id: string;
  title: string;
  component: React.ReactNode;
  width: number;
  height: number;
  x: number;
  y: number;
}

interface WidgetManagerProps {
  widgets: Widget[];
  onClose: (id: string) => void;
}

export function WidgetWindow({ widget, onClose }: { widget: Widget; onClose: () => void }) {
  const nodeRef = useRef(null);
  const [minimized, setMinimized] = useState(false);

  return (
    <Draggable nodeRef={nodeRef} defaultPosition={{ x: widget.x, y: widget.y }} handle=".widget-handle">
      <div
        ref={nodeRef}
        style={{
          position: 'fixed',
          width: widget.width,
          background: '#0d0d14',
          border: '1px solid #2a2a38',
          borderRadius: '6px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          zIndex: 1000,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          className="widget-handle"
          style={{
            padding: '8px 12px',
            background: '#13131a',
            borderBottom: '1px solid #1e2028',
            display: 'flex',
            alignItems: 'center',
            cursor: 'move',
            userSelect: 'none',
          }}
        >
          <span style={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: '#f0c040', fontWeight: 600, flex: 1 }}>
            {widget.title}
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => setMinimized(!minimized)}
              style={{ background: '#2a2a38', border: 'none', borderRadius: '3px', width: '16px', height: '16px', cursor: 'pointer', color: '#6b7280', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >—</button>
            <button
              onClick={onClose}
              style={{ background: '#3a1010', border: 'none', borderRadius: '3px', width: '16px', height: '16px', cursor: 'pointer', color: '#ef4444', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >✕</button>
          </div>
        </div>

        {/* Content */}
        {!minimized && (
          <div style={{ height: widget.height, overflow: 'auto' }}>
            {widget.component}
          </div>
        )}
      </div>
    </Draggable>
  );
}

export function WidgetManager({ widgets, onClose }: WidgetManagerProps) {
  return (
    <>
      {widgets.map(w => (
        <WidgetWindow key={w.id} widget={w} onClose={() => onClose(w.id)} />
      ))}
    </>
  );
}