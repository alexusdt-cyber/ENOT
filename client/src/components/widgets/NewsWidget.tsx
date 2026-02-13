import { useQuery } from "@tanstack/react-query";
import { WidgetWrapper } from "./WidgetWrapper";

interface NewsWidgetProps {
  isDark?: boolean;
  isEditing?: boolean;
  onRemove?: () => void;
  slotSize?: { w: number; h: number };
}

const placeholderNews = [
  { id: "1", title: "Обновление системы виджетов", date: "Сегодня" },
  { id: "2", title: "Новые возможности заметок", date: "Вчера" },
  { id: "3", title: "Улучшения производительности", date: "2 дня назад" },
];

export function NewsWidget({ isDark = true, isEditing, onRemove, slotSize }: NewsWidgetProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/widgets/news"],
    retry: false,
  });

  const news = data?.news?.length > 0 ? data.news : placeholderNews;

  return (
    <WidgetWrapper
      title="Новости"
      icon="Newspaper"
      isLoading={isLoading}
      error={error ? "Ошибка загрузки" : null}
      isDark={isDark}
      isEditing={isEditing}
      onRemove={onRemove}
      slotSize={slotSize}
    >
      <div className="space-y-2">
        {news.slice(0, 4).map((item: any) => (
          <div
            key={item.id}
            className={`
              p-2 rounded-lg cursor-pointer transition-colors
              ${isDark ? "bg-white/5 hover:bg-white/10" : "bg-gray-50 hover:bg-gray-100"}
            `}
          >
            <div className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
              {item.title}
            </div>
            <div className={`text-xs ${isDark ? "text-white/40" : "text-gray-400"}`}>
              {item.date}
            </div>
          </div>
        ))}
      </div>
    </WidgetWrapper>
  );
}
