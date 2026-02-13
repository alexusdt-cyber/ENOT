import { useQuery } from "@tanstack/react-query";
import { WidgetWrapper } from "./WidgetWrapper";
import { Users, UserPlus, Coins } from "lucide-react";

interface ReferralsWidgetProps {
  isDark?: boolean;
  isEditing?: boolean;
  onRemove?: () => void;
  slotSize?: { w: number; h: number };
}

export function ReferralsWidget({ isDark = true, isEditing, onRemove, slotSize }: ReferralsWidgetProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/widgets/referrals"],
    retry: false,
  });

  const stats = [
    { label: "Всего рефералов", value: data?.totalReferrals || 0, icon: Users },
    { label: "Активных", value: data?.activeReferrals || 0, icon: UserPlus },
    { label: "Заработано", value: `${data?.earnings || 0} USDT`, icon: Coins },
  ];

  return (
    <WidgetWrapper
      title="Рефералы"
      icon="Users"
      isLoading={isLoading}
      error={error ? "Ошибка загрузки" : null}
      isDark={isDark}
      isEditing={isEditing}
      onRemove={onRemove}
      slotSize={slotSize}
    >
      <div className="space-y-3">
        {stats.map((stat) => (
          <div 
            key={stat.label}
            className={`
              flex items-center justify-between p-2 rounded-lg
              ${isDark ? "bg-white/5" : "bg-gray-50"}
            `}
          >
            <div className="flex items-center gap-2">
              <stat.icon className={`w-4 h-4 ${isDark ? "text-purple-400" : "text-purple-600"}`} />
              <span className={`text-sm ${isDark ? "text-white/70" : "text-gray-600"}`}>
                {stat.label}
              </span>
            </div>
            <span className={`text-sm font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
              {stat.value}
            </span>
          </div>
        ))}
      </div>
    </WidgetWrapper>
  );
}
