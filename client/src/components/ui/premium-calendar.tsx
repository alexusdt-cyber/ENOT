"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "./utils";

interface PremiumCalendarProps {
  selected?: Date;
  onSelect?: (date: Date) => void;
  isDark?: boolean;
  className?: string;
}

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

export function PremiumCalendar({
  selected,
  onSelect,
  isDark = false,
  className,
}: PremiumCalendarProps) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(() => selected || today);
  const [direction, setDirection] = useState(0);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const daysInPrevMonth = getDaysInMonth(year, month - 1);
    
    const days: Array<{ day: number; isCurrentMonth: boolean; date: Date }> = [];
    
    for (let i = firstDay - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      days.push({
        day,
        isCurrentMonth: false,
        date: new Date(year, month - 1, day),
      });
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        day,
        isCurrentMonth: true,
        date: new Date(year, month, day),
      });
    }
    
    const remaining = 42 - days.length;
    for (let day = 1; day <= remaining; day++) {
      days.push({
        day,
        isCurrentMonth: false,
        date: new Date(year, month + 1, day),
      });
    }
    
    return days;
  }, [year, month]);

  const goToPrevMonth = () => {
    setDirection(-1);
    setViewDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setDirection(1);
    setViewDate(new Date(year, month + 1, 1));
  };

  const isSelected = (date: Date) => {
    if (!selected) return false;
    return (
      date.getDate() === selected.getDate() &&
      date.getMonth() === selected.getMonth() &&
      date.getFullYear() === selected.getFullYear()
    );
  };

  const isToday = (date: Date) => {
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 50 : -50,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -50 : 50,
      opacity: 0,
    }),
  };

  return (
    <div
      className={cn(
        "p-5 rounded-2xl w-[320px]",
        isDark
          ? "bg-slate-800 border border-slate-700 shadow-2xl shadow-slate-900/50"
          : "bg-white border border-gray-200 shadow-2xl shadow-gray-300/50",
        className
      )}
    >
      <div className="flex items-center justify-between mb-5">
        <motion.button
          whileHover={{ scale: 1.1, x: -2 }}
          whileTap={{ scale: 0.9 }}
          onClick={goToPrevMonth}
          className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center transition-colors",
            isDark
              ? "bg-slate-700/60 text-slate-300 hover:bg-slate-700"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          )}
        >
          <ChevronLeft className="w-5 h-5" />
        </motion.button>

        <AnimatePresence mode="wait" custom={direction}>
          <motion.h2
            key={`${year}-${month}`}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={cn(
              "text-lg font-bold",
              isDark ? "text-white" : "text-gray-900"
            )}
          >
            {MONTHS[month]} {year}
          </motion.h2>
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.1, x: 2 }}
          whileTap={{ scale: 0.9 }}
          onClick={goToNextMonth}
          className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center transition-colors",
            isDark
              ? "bg-slate-700/60 text-slate-300 hover:bg-slate-700"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          )}
        >
          <ChevronRight className="w-5 h-5" />
        </motion.button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-3">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className={cn(
              "text-center text-xs font-semibold py-2",
              isDark ? "text-slate-500" : "text-gray-400"
            )}
          >
            {day}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={`${year}-${month}`}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="grid grid-cols-7 gap-1"
        >
          {calendarDays.map((item, index) => {
            const selected = isSelected(item.date);
            const todayDate = isToday(item.date);
            
            return (
              <motion.button
                key={index}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => onSelect?.(item.date)}
                className={cn(
                  "relative w-10 h-10 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center",
                  !item.isCurrentMonth && (isDark ? "text-slate-600" : "text-gray-300"),
                  item.isCurrentMonth && !selected && (isDark ? "text-slate-200 hover:bg-slate-700/60" : "text-gray-700 hover:bg-gray-100"),
                  todayDate && !selected && (isDark ? "ring-2 ring-purple-500/50 text-purple-400" : "ring-2 ring-purple-400/50 text-purple-600"),
                  selected && "bg-gradient-to-br from-purple-500 via-indigo-500 to-purple-600 text-white shadow-lg shadow-purple-500/30"
                )}
              >
                {selected && (
                  <motion.div
                    layoutId="selected-day"
                    className="absolute inset-0 rounded-xl bg-gradient-to-br from-purple-500 via-indigo-500 to-purple-600"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{item.day}</span>
              </motion.button>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
