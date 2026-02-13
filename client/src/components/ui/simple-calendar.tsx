import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "./utils";

interface SimpleCalendarProps {
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  className?: string;
}

const MONTHS_RU = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
];

const DAYS_RU = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export function SimpleCalendar({ selected, onSelect, className }: SimpleCalendarProps) {
  const [currentDate, setCurrentDate] = useState(selected || new Date());
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  
  let startDay = firstDayOfMonth.getDay() - 1;
  if (startDay < 0) startDay = 6;
  
  const daysInMonth = lastDayOfMonth.getDate();
  
  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };
  
  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };
  
  const handleDayClick = (day: number) => {
    const newDate = new Date(year, month, day);
    onSelect?.(newDate);
  };
  
  const isSelected = (day: number) => {
    if (!selected) return false;
    return (
      selected.getDate() === day &&
      selected.getMonth() === month &&
      selected.getFullYear() === year
    );
  };
  
  const isToday = (day: number) => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === month &&
      today.getFullYear() === year
    );
  };
  
  const days: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }
  
  return (
    <div className={cn("p-3 bg-white rounded-lg", className)}>
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={prevMonth}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <span className="text-sm font-medium text-gray-900">
          {MONTHS_RU[month]} {year}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>
      
      <div className="grid grid-cols-7 gap-1 mb-2">
        {DAYS_RU.map((day) => (
          <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
            {day}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => (
          <div key={index} className="aspect-square">
            {day !== null && (
              <button
                type="button"
                onClick={() => handleDayClick(day)}
                className={cn(
                  "w-full h-full flex items-center justify-center text-sm rounded-lg transition-all",
                  isSelected(day)
                    ? "bg-indigo-600 text-white font-medium"
                    : isToday(day)
                    ? "bg-indigo-100 text-indigo-700 font-medium"
                    : "hover:bg-gray-100 text-gray-700"
                )}
              >
                {day}
              </button>
            )}
          </div>
        ))}
      </div>
      
      {selected && (
        <button
          type="button"
          onClick={() => onSelect?.(undefined)}
          className="w-full mt-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
        >
          Очистить
        </button>
      )}
    </div>
  );
}
