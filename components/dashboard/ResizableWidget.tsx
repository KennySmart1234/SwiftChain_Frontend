'use client';

import { useState, useRef, useCallback, useEffect, type ReactNode } from 'react';
import { GripVertical, Maximize2, Minimize2, X } from 'lucide-react';
import { clsx } from 'clsx';

export interface WidgetSize {
  width: number;
  height: number;
}

export interface WidgetPosition {
  x: number;
  y: number;
}

export interface ResizableWidgetProps {
  id: string;
  title: string;
  children: ReactNode;
  defaultSize?: WidgetSize;
  minSize?: WidgetSize;
  maxSize?: WidgetSize;
  defaultPosition?: WidgetPosition;
  isResizable?: boolean;
  isDraggable?: boolean;
  isClosable?: boolean;
  isMaximizable?: boolean;
  className?: string;
  onClose?: (id: string) => void;
  onResize?: (id: string, size: WidgetSize) => void;
  onMove?: (id: string, position: WidgetPosition) => void;
  onMaximize?: (id: string, isMaximized: boolean) => void;
}

/**
 * ResizableWidget — Dashboard widget with resize, drag, maximize, and close capabilities.
 */
export function ResizableWidget({
  id,
  title,
  children,
  defaultSize = { width: 400, height: 300 },
  minSize = { width: 200, height: 150 },
  maxSize = { width: 1200, height: 800 },
  defaultPosition = { x: 0, y: 0 },
  isResizable = true,
  isDraggable = true,
  isClosable = true,
  isMaximizable = true,
  className,
  onClose,
  onResize,
  onMove,
  onMaximize,
}: ResizableWidgetProps) {
  const [size, setSize] = useState<WidgetSize>(defaultSize);
  const [position, setPosition] = useState<WidgetPosition>(defaultPosition);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  const widgetRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const resizeStartRef = useRef<{
    x: number;
    y: number;
    width: number;
    height: number;
    direction: string;
  } | null>(null);
  const savedStateRef = useRef<{ size: WidgetSize; position: WidgetPosition } | null>(null);

  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      if (!isDraggable || isMaximized) return;
      e.preventDefault();
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    },
    [isDraggable, isMaximized, position]
  );

  const handleDragMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !dragStartRef.current) return;
      const newPosition = {
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      };
      setPosition(newPosition);
      onMove?.(id, newPosition);
    },
    [isDragging, id, onMove]
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    dragStartRef.current = null;
  }, []);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent, direction: string) => {
      if (!isResizable || isMaximized) return;
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);
      resizeStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        width: size.width,
        height: size.height,
        direction,
      };
    },
    [isResizable, isMaximized, size]
  );

  const handleResizeMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing || !resizeStartRef.current) return;
      const { x, y, width, height, direction } = resizeStartRef.current;
      const deltaX = e.clientX - x;
      const deltaY = e.clientY - y;

      let newWidth = width;
      let newHeight = height;

      if (direction.includes('e')) {
        newWidth = Math.max(minSize.width, Math.min(maxSize.width, width + deltaX));
      }
      if (direction.includes('s')) {
        newHeight = Math.max(minSize.height, Math.min(maxSize.height, height + deltaY));
      }

      const newSize = { width: newWidth, height: newHeight };
      setSize(newSize);
      onResize?.(id, newSize);
    },
    [isResizing, id, minSize, maxSize, onResize]
  );

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
    resizeStartRef.current = null;
  }, []);

  const handleMaximize = useCallback(() => {
    if (!isMaximizable) return;
    if (isMaximized) {
      if (savedStateRef.current) {
        setSize(savedStateRef.current.size);
        setPosition(savedStateRef.current.position);
        savedStateRef.current = null;
      }
      setIsMaximized(false);
      onMaximize?.(id, false);
    } else {
      savedStateRef.current = { size, position };
      setSize({ width: window.innerWidth - 40, height: window.innerHeight - 40 });
      setPosition({ x: 20, y: 20 });
      setIsMaximized(true);
      onMaximize?.(id, true);
    }
  }, [id, isMaximizable, isMaximized, size, position, onMaximize]);

  const handleClose = useCallback(() => {
    if (!isClosable) return;
    onClose?.(id);
  }, [id, isClosable, onClose]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      handleDragMove(e);
      handleResizeMove(e);
    };

    const handleMouseUp = () => {
      handleDragEnd();
      handleResizeEnd();
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleDragMove, handleResizeMove, handleDragEnd, handleResizeEnd]);

  return (
    <div
      ref={widgetRef}
      className={clsx(
        'absolute rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900',
        'transition-shadow hover:shadow-xl',
        isDragging && 'cursor-move shadow-2xl',
        isResizing && 'select-none',
        className
      )}
      style={{
        width: size.width,
        height: size.height,
        left: position.x,
        top: position.y,
        zIndex: isDragging || isResizing ? 1000 : 1,
      }}
    >
      <div
        className={clsx(
          'flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3',
          'dark:border-slate-700 dark:bg-slate-800',
          isDraggable && !isMaximized && 'cursor-move'
        )}
        onMouseDown={handleDragStart}
      >
        <div className="flex items-center gap-2">
          {isDraggable && !isMaximized && <GripVertical className="h-4 w-4 text-slate-400" />}
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
        </div>
        <div className="flex items-center gap-1">
          {isMaximizable && (
            <button
              onClick={handleMaximize}
              className="rounded p-1 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-300"
              aria-label={isMaximized ? 'Restore' : 'Maximize'}
            >
              {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          )}
          {isClosable && (
            <button
              onClick={handleClose}
              className="rounded p-1 text-slate-500 transition hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      <div className="overflow-auto p-4" style={{ height: size.height - 56 }}>
        {children}
      </div>
      {isResizable && !isMaximized && (
        <div
          className="absolute bottom-0 right-0 h-4 w-4 cursor-se-resize"
          onMouseDown={(e) => handleResizeStart(e, 'se')}
        />
      )}
    </div>
  );
}
