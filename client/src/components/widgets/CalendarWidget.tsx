import { useQuery } from "@tanstack/react-query";
import { WidgetWrapper } from "./WidgetWrapper";
import { Calendar as CalendarIcon } from "lucide-react";

interface CalendarWidgetProps {
  isDark?: boolean;
  isEditing?: boolean;
  onRemove?: () => void;
  slotSize?: { w: number; h: number };
}

export function CalendarWidget({ isDark = true, isEditing, onRemove, slotSize }: CalendarWidgetProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/widgets/calendar"],
    retry: false,
  });

  const today = new Date();
  const dayNames = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
  const monthNames = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];

  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
  
  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  return (
    <WidgetWrapper
      title="Календарь"
      icon="Calendar"
      isLoading={isLoading}
      error={error ? "Ошибка загрузки" : null}
      isDark={isDark}
      isEditing={isEditing}
      onRemove={onRemove}
      slotSize={slotSize}
    >
      <div>
        <div className={`text-center mb-3 font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
          {monthNames[today.getMonth()]} {today.getFullYear()}
        </div>
        
        <div className="grid grid-cols-7 gap-1 text-center">
          {dayNames.map((day) => (
            <div 
              key={day} 
              className={`text-xs py-1 ${isDark ? "text-white/40" : "text-gray-400"}`}
            >
              {day}
            </div>
          ))}
          
          {days.slice(0, 35).map((day, index) => (
            <div
              key={index}
              className={`
                text-xs py-1 rounded
                ${day === today.getDate() 
                  ? "bg-purple-500 text-white font-bold" 
                  : day 
                    ? (isDark ? "text-white/70 hover:bg-white/10" : "text-gray-700 hover:bg-gray-100") 
                    : ""
                }
              `}
            >
              {day}
            </div>
          ))}
        </div>
      </div>
    </WidgetWrapper>
  );
}
