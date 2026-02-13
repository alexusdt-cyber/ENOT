import { motion } from "framer-motion";
import { Loader2, AlertCircle, GripVertical, X, Settings } from "lucide-react";
import * as LucideIcons from "lucide-react";

interface WidgetWrapperProps {
  title: string;
  icon?: string;
  children: React.ReactNode;
  isLoading?: boolean;
  error?: string | null;
  isEmpty?: boolean;
  emptyMessage?: string;
  isDark?: boolean;
  isEditing?: boolean;
  onRemove?: () => void;
  className?: string;
  slotSize?: { w: number; h: number };
}

export function WidgetWrapper({
  title,
  icon,
  children,
  isLoading = false,
  error = null,
  isEmpty = false,
  emptyMessage = "Нет данных",
  isDark = true,
  isEditing = false,
  onRemove,
  className = "",
  slotSize = { w: 4, h: 2 },
}: WidgetWrapperProps) {
  const IconComponent = icon ? (LucideIcons as any)[icon] : null;

  const getMinHeight = () => {
    if (slotSize.h <= 1) return "min-h-[100px]";
    if (slotSize.h <= 2) return "min-h-[180px]";
    return "min-h-[280px]";
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`
        relative h-full rounded-2xl overflow-hidden
        ${isDark 
          ? "bg-white/5 border border-white/10 backdrop-blur-xl" 
          : "bg-white border border-gray-200 shadow-sm"
        }
        ${isEditing ? "ring-2 ring-purple-500/50" : ""}
        ${className}
      `}
      data-testid={`widget-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      {isEditing && (
        <div className="absolute top-2 right-2 z-10 flex gap-1">
          <button
            onClick={onRemove}
            className={`
              p-1.5 rounded-lg transition-colors
              ${isDark 
                ? "bg-red-500/20 hover:bg-red-500/40 text-red-400" 
                : "bg-red-100 hover:bg-red-200 text-red-600"
              }
            `}
            data-testid="button-remove-widget"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className={`
        flex items-center gap-2 px-4 py-3 border-b
        ${isDark ? "border-white/10" : "border-gray-100"}
      `}>
        {isEditing && (
          <GripVertical className={`w-4 h-4 cursor-grab ${isDark ? "text-white/30" : "text-gray-400"}`} />
        )}
        {IconComponent && (
          <IconComponent className={`w-4 h-4 ${isDark ? "text-purple-400" : "text-purple-600"}`} />
        )}
        <h3 className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
          {title}
        </h3>
      </div>

      <div className={`p-4 ${getMinHeight()}`}>
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className={`w-6 h-6 animate-spin ${isDark ? "text-purple-400" : "text-purple-600"}`} />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <AlertCircle className={`w-6 h-6 ${isDark ? "text-red-400" : "text-red-500"}`} />
            <p className={`text-xs text-center ${isDark ? "text-white/50" : "text-gray-500"}`}>
              {error}
            </p>
          </div>
        ) : isEmpty ? (
          <div className="flex items-center justify-center h-full">
            <p className={`text-sm ${isDark ? "text-white/40" : "text-gray-400"}`}>
              {emptyMessage}
            </p>
          </div>
        ) : (
          children
        )}
      </div>
    </motion.div>
  );
}
