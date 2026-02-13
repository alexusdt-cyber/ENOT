import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { PremiumCalendar } from "./premium-calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { cn } from "./utils";
import { motion, AnimatePresence } from "framer-motion";

interface DatePickerInputProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  isDark?: boolean;
}

export function DatePickerInput({
  value,
  onChange,
  placeholder = "MM/DD/YYYY",
  className,
  isDark = false,
}: DatePickerInputProps) {
  const [open, setOpen] = React.useState(false);
  
  const date = value ? new Date(value) : undefined;
  
  const handleSelect = (selectedDate: Date) => {
    onChange(format(selectedDate, "yyyy-MM-dd"));
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            "flex items-center gap-2 text-sm font-medium cursor-pointer bg-transparent border-none outline-none transition-colors",
            isDark ? "text-slate-200 hover:text-white" : "text-gray-700 hover:text-gray-900",
            className
          )}
        >
          <CalendarIcon className={cn("w-4 h-4", isDark ? "text-purple-400" : "text-purple-500")} />
          <span className={!date ? (isDark ? "text-slate-500" : "text-gray-400") : ""}>
            {date ? format(date, "MM/dd/yyyy") : placeholder}
          </span>
        </motion.button>
      </PopoverTrigger>
      <AnimatePresence>
        {open && (
          <PopoverContent 
            className={cn("w-auto p-0 border-0 bg-transparent shadow-none")} 
            align="start"
            asChild
          >
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <PremiumCalendar
                selected={date}
                onSelect={handleSelect}
                isDark={isDark}
              />
            </motion.div>
          </PopoverContent>
        )}
      </AnimatePresence>
    </Popover>
  );
}
