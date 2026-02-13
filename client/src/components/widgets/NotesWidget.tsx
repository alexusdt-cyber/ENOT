import { useQuery } from "@tanstack/react-query";
import { WidgetWrapper } from "./WidgetWrapper";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

interface NotesWidgetProps {
  isDark?: boolean;
  isEditing?: boolean;
  onRemove?: () => void;
  slotSize?: { w: number; h: number };
}

export function NotesWidget({ isDark = true, isEditing, onRemove, slotSize }: NotesWidgetProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/widgets/notes"],
    retry: false,
  });

  const notes = data?.notes || [];

  return (
    <WidgetWrapper
      title="Заметки"
      icon="StickyNote"
      isLoading={isLoading}
      error={error ? "Ошибка загрузки" : null}
      isEmpty={notes.length === 0}
      emptyMessage="Нет заметок"
      isDark={isDark}
      isEditing={isEditing}
      onRemove={onRemove}
      slotSize={slotSize}
    >
      <div className="space-y-2">
        {notes.slice(0, 4).map((note: any) => (
          <div
            key={note.id}
            className={`
              p-2 rounded-lg cursor-pointer transition-colors
              ${isDark ? "bg-white/5 hover:bg-white/10" : "bg-gray-50 hover:bg-gray-100"}
            `}
          >
            <div className={`text-sm font-medium truncate ${isDark ? "text-white" : "text-gray-900"}`}>
              {note.title || "Без названия"}
            </div>
            <div className={`text-xs ${isDark ? "text-white/40" : "text-gray-400"}`}>
              {note.updatedAt ? formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true, locale: ru }) : ""}
            </div>
          </div>
        ))}
      </div>
    </WidgetWrapper>
  );
}
