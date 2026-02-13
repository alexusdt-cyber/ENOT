import { motion } from "framer-motion";
import { WidgetWrapper } from "./WidgetWrapper";
import { Plus, FileText, CheckSquare, Target, FolderOpen } from "lucide-react";

interface QuickActionsWidgetProps {
  isDark?: boolean;
  isEditing?: boolean;
  onRemove?: () => void;
  slotSize?: { w: number; h: number };
  onNavigate?: (path: string) => void;
}

export function QuickActionsWidget({ 
  isDark = true, 
  isEditing, 
  onRemove, 
  slotSize,
  onNavigate 
}: QuickActionsWidgetProps) {
  const actions = [
    { label: "Заметка", icon: FileText, path: "/notes", color: "bg-blue-500" },
    { label: "Задача", icon: CheckSquare, path: "/tasks", color: "bg-green-500" },
    { label: "Цель", icon: Target, path: "/goals", color: "bg-orange-500" },
    { label: "Файлы", icon: FolderOpen, path: "/files", color: "bg-purple-500" },
  ];

  return (
    <WidgetWrapper
      title="Быстрые действия"
      icon="Zap"
      isDark={isDark}
      isEditing={isEditing}
      onRemove={onRemove}
      slotSize={slotSize}
    >
      <div className="flex gap-2 flex-wrap">
        {actions.map((action) => (
          <motion.button
            key={action.label}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onNavigate?.(action.path)}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-xl text-white text-sm font-medium
              ${action.color} hover:opacity-90 transition-opacity
            `}
            data-testid={`quick-action-${action.label.toLowerCase()}`}
          >
            <action.icon className="w-4 h-4" />
            {action.label}
          </motion.button>
        ))}
      </div>
    </WidgetWrapper>
  );
}
