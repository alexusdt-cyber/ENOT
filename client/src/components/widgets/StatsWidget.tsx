import { useQuery } from "@tanstack/react-query";
import { WidgetWrapper } from "./WidgetWrapper";
import { FileText, CheckSquare, Target, Trophy } from "lucide-react";

interface StatsWidgetProps {
  isDark?: boolean;
  isEditing?: boolean;
  onRemove?: () => void;
  slotSize?: { w: number; h: number };
}

export function StatsWidget({ isDark = true, isEditing, onRemove, slotSize }: StatsWidgetProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/widgets/stats"],
    retry: false,
  });

  const stats = [
    { label: "Заметки", value: data?.notes || 0, icon: FileText, color: "text-blue-400" },
    { label: "Задачи", value: data?.tasks || 0, icon: CheckSquare, color: "text-green-400" },
    { label: "Цели", value: data?.goals || 0, icon: Target, color: "text-orange-400" },
    { label: "Достижения", value: data?.achievements || 0, icon: Trophy, color: "text-yellow-400" },
  ];

  return (
    <WidgetWrapper
      title="Статистика"
      icon="BarChart3"
      isLoading={isLoading}
      error={error ? "Ошибка загрузки" : null}
      isDark={isDark}
      isEditing={isEditing}
      onRemove={onRemove}
      slotSize={slotSize}
    >
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat) => (
          <div 
            key={stat.label}
            className={`
              flex items-center gap-2 p-2 rounded-xl
              ${isDark ? "bg-white/5" : "bg-gray-50"}
            `}
          >
            <stat.icon className={`w-5 h-5 ${stat.color}`} />
            <div>
              <div className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                {stat.value}
              </div>
              <div className={`text-xs ${isDark ? "text-white/50" : "text-gray-500"}`}>
                {stat.label}
              </div>
            </div>
          </div>
        ))}
      </div>
    </WidgetWrapper>
  );
}
