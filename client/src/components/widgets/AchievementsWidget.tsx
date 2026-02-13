import { useQuery } from "@tanstack/react-query";
import { WidgetWrapper } from "./WidgetWrapper";
import { Trophy, Lock } from "lucide-react";

interface AchievementsWidgetProps {
  isDark?: boolean;
  isEditing?: boolean;
  onRemove?: () => void;
  slotSize?: { w: number; h: number };
}

const placeholderAchievements = [
  { id: "1", title: "Первая заметка", unlocked: true, icon: "📝" },
  { id: "2", title: "10 задач", unlocked: true, icon: "✅" },
  { id: "3", title: "Первая цель", unlocked: false, icon: "🎯" },
  { id: "4", title: "Мастер заметок", unlocked: false, icon: "📚" },
];

export function AchievementsWidget({ isDark = true, isEditing, onRemove, slotSize }: AchievementsWidgetProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/widgets/achievements"],
    retry: false,
  });

  const achievements = data?.achievements?.length > 0 ? data.achievements : placeholderAchievements;

  return (
    <WidgetWrapper
      title="Достижения"
      icon="Trophy"
      isLoading={isLoading}
      error={error ? "Ошибка загрузки" : null}
      isDark={isDark}
      isEditing={isEditing}
      onRemove={onRemove}
      slotSize={slotSize}
    >
      <div className="grid grid-cols-2 gap-2">
        {achievements.slice(0, 4).map((achievement: any) => (
          <div
            key={achievement.id}
            className={`
              flex flex-col items-center gap-1 p-3 rounded-xl text-center
              ${achievement.unlocked 
                ? (isDark ? "bg-yellow-500/20" : "bg-yellow-50") 
                : (isDark ? "bg-white/5" : "bg-gray-50")
              }
            `}
          >
            <span className="text-2xl">{achievement.icon}</span>
            <span className={`
              text-xs font-medium
              ${achievement.unlocked 
                ? (isDark ? "text-yellow-400" : "text-yellow-700") 
                : (isDark ? "text-white/40" : "text-gray-400")
              }
            `}>
              {achievement.title}
            </span>
            {!achievement.unlocked && (
              <Lock className={`w-3 h-3 ${isDark ? "text-white/20" : "text-gray-300"}`} />
            )}
          </div>
        ))}
      </div>
    </WidgetWrapper>
  );
}
