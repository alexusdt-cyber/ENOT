import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { GripVertical, Settings, X, Maximize2, Minimize2 } from "lucide-react";

export interface Widget {
  id: string;
  type: "stats" | "games" | "teams" | "balance" | "achievements" | "custom";
  title: string;
  size: "small" | "medium" | "large";
  order: number;
  config?: Record<string, any>;
}

interface WidgetTileProps {
  widget: Widget;
  index: number;
  moveWidget: (dragIndex: number, hoverIndex: number) => void;
  onRemove?: (id: string) => void;
  onResize?: (id: string, size: "small" | "medium" | "large") => void;
  onSettings?: (id: string) => void;
  isDark?: boolean;
  isEditing?: boolean;
  children?: React.ReactNode;
}

const ItemTypes = {
  WIDGET: "widget",
};

function WidgetTile({
  widget,
  index,
  moveWidget,
  onRemove,
  onResize,
  onSettings,
  isDark = true,
  isEditing = false,
  children,
}: WidgetTileProps) {
  const [{ isDragging }, drag, preview] = useDrag({
    type: ItemTypes.WIDGET,
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    canDrag: isEditing,
  });

  const [, drop] = useDrop({
    accept: ItemTypes.WIDGET,
    hover(item: { index: number }) {
      if (!isEditing) return;
      if (item.index === index) return;
      moveWidget(item.index, index);
      item.index = index;
    },
  });

  const sizeClasses = {
    small: "col-span-1",
    medium: "col-span-1 md:col-span-2",
    large: "col-span-1 md:col-span-2 lg:col-span-3",
  };

  const nextSize = {
    small: "medium" as const,
    medium: "large" as const,
    large: "small" as const,
  };

  return (
    <motion.div
      ref={(node) => {
        drag(drop(node));
      }}
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ 
        opacity: isDragging ? 0.5 : 1, 
        scale: isDragging ? 1.02 : 1,
      }}
      className={`
        ${sizeClasses[widget.size]}
        relative group
      `}
      data-testid={`widget-${widget.id}`}
    >
      <div
        className={`
          h-full min-h-[200px] rounded-2xl overflow-hidden
          ${isDark 
            ? 'bg-slate-800/80 border border-white/10' 
            : 'bg-white/90 border border-gray-200'
          }
          backdrop-blur-xl shadow-xl
          ${isEditing ? 'ring-2 ring-purple-500/50 ring-dashed' : ''}
          transition-all duration-300
        `}
      >
        <div className={`
          flex items-center justify-between px-4 py-3 border-b
          ${isDark ? 'border-white/10' : 'border-gray-200'}
        `}>
          <div className="flex items-center gap-2">
            {isEditing && (
              <div className="cursor-grab active:cursor-grabbing">
                <GripVertical className={`w-4 h-4 ${isDark ? 'text-white/50' : 'text-gray-400'}`} />
              </div>
            )}
            <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {widget.title}
            </h3>
          </div>
          
          {isEditing && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onResize?.(widget.id, nextSize[widget.size])}
                className={`p-1.5 rounded-lg transition-colors ${
                  isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'
                }`}
                title="Resize"
                data-testid={`button-resize-widget-${widget.id}`}
              >
                {widget.size === "large" ? (
                  <Minimize2 className={`w-4 h-4 ${isDark ? 'text-white/70' : 'text-gray-600'}`} />
                ) : (
                  <Maximize2 className={`w-4 h-4 ${isDark ? 'text-white/70' : 'text-gray-600'}`} />
                )}
              </button>
              <button
                onClick={() => onSettings?.(widget.id)}
                className={`p-1.5 rounded-lg transition-colors ${
                  isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'
                }`}
                title="Settings"
                data-testid={`button-settings-widget-${widget.id}`}
              >
                <Settings className={`w-4 h-4 ${isDark ? 'text-white/70' : 'text-gray-600'}`} />
              </button>
              <button
                onClick={() => onRemove?.(widget.id)}
                className={`p-1.5 rounded-lg transition-colors ${
                  isDark ? 'hover:bg-red-500/20' : 'hover:bg-red-50'
                }`}
                title="Remove"
                data-testid={`button-remove-widget-${widget.id}`}
              >
                <X className={`w-4 h-4 ${isDark ? 'text-red-400' : 'text-red-500'}`} />
              </button>
            </div>
          )}
        </div>
        
        <div className="p-4">
          {children || (
            <div className={`
              h-32 rounded-xl flex items-center justify-center
              ${isDark ? 'bg-white/5' : 'bg-gray-50'}
            `}>
              <span className={`text-sm ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                {widget.type} widget content
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

interface WidgetGridProps {
  widgets: Widget[];
  onWidgetsChange?: (widgets: Widget[]) => void;
  isEditing?: boolean;
  isDark?: boolean;
  renderWidget?: (widget: Widget) => React.ReactNode;
}

export function WidgetGrid({
  widgets,
  onWidgetsChange,
  isEditing = false,
  isDark = true,
  renderWidget,
}: WidgetGridProps) {
  const moveWidget = useCallback(
    (dragIndex: number, hoverIndex: number) => {
      const newWidgets = [...widgets];
      const [draggedWidget] = newWidgets.splice(dragIndex, 1);
      newWidgets.splice(hoverIndex, 0, draggedWidget);
      
      const reorderedWidgets = newWidgets.map((w, i) => ({
        ...w,
        order: i,
      }));
      
      onWidgetsChange?.(reorderedWidgets);
    },
    [widgets, onWidgetsChange]
  );

  const handleRemove = (id: string) => {
    const newWidgets = widgets.filter((w) => w.id !== id);
    onWidgetsChange?.(newWidgets);
  };

  const handleResize = (id: string, size: "small" | "medium" | "large") => {
    const newWidgets = widgets.map((w) =>
      w.id === id ? { ...w, size } : w
    );
    onWidgetsChange?.(newWidgets);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {widgets
          .sort((a, b) => a.order - b.order)
          .map((widget, index) => (
            <WidgetTile
              key={widget.id}
              widget={widget}
              index={index}
              moveWidget={moveWidget}
              onRemove={handleRemove}
              onResize={handleResize}
              isDark={isDark}
              isEditing={isEditing}
            >
              {renderWidget?.(widget)}
            </WidgetTile>
          ))}
      </div>
    </DndProvider>
  );
}
