import { useQuery } from "@tanstack/react-query";
import { WidgetWrapper } from "./WidgetWrapper";
import { CheckCircle2, Circle } from "lucide-react";

interface TasksWidgetProps {
  isDark?: boolean;
  isEditing?: boolean;
  onRemove?: () => void;
  slotSize?: { w: number; h: number };
}

export function TasksWidget({ isDark = true, isEditing, onRemove, slotSize }: TasksWidgetProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/widgets/tasks"],
    retry: false,
  });

  const tasks = data?.tasks || [];

  return (
    <WidgetWrapper
      title="Задачи"
      icon="CheckSquare"
      isLoading={isLoading}
      error={error ? "Ошибка загрузки" : null}
      isEmpty={tasks.length === 0}
      emptyMessage="Нет задач"
      isDark={isDark}
      isEditing={isEditing}
      onRemove={onRemove}
      slotSize={slotSize}
    >
      <div className="space-y-2">
        {tasks.slice(0, 5).map((task: any) => (
          <div
            key={task.id}
            className={`
              flex items-center gap-2 p-2 rounded-lg
              ${isDark ? "bg-white/5" : "bg-gray-50"}
            `}
          >
            {task.completed ? (
              <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
            ) : (
              <Circle className={`w-4 h-4 flex-shrink-0 ${isDark ? "text-white/30" : "text-gray-300"}`} />
            )}
            <span className={`
              text-sm truncate
              ${task.completed 
                ? (isDark ? "text-white/40 line-through" : "text-gray-400 line-through") 
                : (isDark ? "text-white" : "text-gray-900")
              }
            `}>
              {task.title}
            </span>
          </div>
        ))}
      </div>
    </WidgetWrapper>
  );
}
