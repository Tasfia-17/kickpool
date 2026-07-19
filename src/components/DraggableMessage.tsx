import React, { useState, useRef, useCallback, useEffect } from 'react';

interface DraggableMessageProps {
  friend: { id: string; username: string; image?: string };
  onClose: () => void;
}

const DraggableMessage: React.FC<DraggableMessageProps> = ({ friend, onClose }) => {
  const [message, setMessage] = useState('');
  const [pos, setPos] = useState({ x: 100, y: 100 });
  const dragRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    offset.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    };
  }, [pos]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging.current) {
        const newX = Math.max(0, Math.min(window.innerWidth - 320, e.clientX - offset.current.x));
        const newY = Math.max(0, Math.min(window.innerHeight - 200, e.clientY - offset.current.y));
        setPos({ x: newX, y: newY });
      }
    };

    const handleMouseUp = () => {
      isDragging.current = false;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleSend = () => {
    // Mesaj gönderme API'si buraya eklenebilir
    setMessage('');
  };

  return (
    <div
      ref={dragRef}
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        zIndex: 9999,
        width: 320,
        background: '#fff',
        border: '2px solid #222',
        borderRadius: 8,
        boxShadow: '8px 8px 0px 0px #222',
        fontFamily: 'monospace',
      }}
    >
      <div
        style={{
          cursor: 'move',
          background: '#222',
          color: '#fff',
          padding: '8px',
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
        onMouseDown={handleMouseDown}
      >
        <span>💬 Message: {friend.username}</span>
        <button 
          type="button" 
          onClick={onClose} 
          aria-label="Close message window"
          style={{ background: 'none', color: '#fff', border: 'none', fontSize: 18, cursor: 'pointer', padding: '4px', borderRadius: '4px' }}
        >
          ✖
        </button>
      </div>
      <div style={{ padding: 16 }}>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={4}
          style={{ width: '100%', fontFamily: 'monospace', border: '1px solid #ccc', borderRadius: 4, resize: 'none', marginBottom: 8 }}
          placeholder={`Type a message to ${friend.username}...`}
        />
        <button
          onClick={handleSend}
          style={{
            background: '#00c2b2',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            padding: '8px 16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '2px 2px 0px 0px #222',
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default DraggableMessage;
