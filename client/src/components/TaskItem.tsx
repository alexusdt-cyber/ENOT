import { useState, useRef, useEffect } from "react";
import { Checkbox } from "./ui/checkbox";
import { Trash2, Calendar, Bell, BellOff, X, Clock } from "lucide-react";

interface Task {
  id: string;
  text: string;
  completed: boolean;
  dueDate?: Date;
  reminder?: boolean;
}

interface TaskItemProps {
  task: Task;
  onToggle: (taskId: string) => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => void;
  onDelete: (taskId: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, taskId: string, text: string) => void;
  inputRef: (el: HTMLInputElement | null) => void;
}

export function TaskItem({
  task,
  onToggle,
  onUpdate,
  onDelete,
  onKeyDown,
  inputRef,
}: TaskItemProps) {
  const [showDateModal, setShowDateModal] = useState(false);
  const [dateValue, setDateValue] = useState("");
  const [timeValue, setTimeValue] = useState("");

  // Initialize date and time from task.dueDate
  useEffect(() => {
    console.log("TaskItem - task.dueDate:", task.dueDate, "reminder:", task.reminder);
    
    if (task.dueDate) {
      const date = new Date(task.dueDate);
      setDateValue(date.toISOString().split("T")[0]);
      setTimeValue(
        `${String(date.getHours()).padStart(2, "0")}:${String(
          date.getMinutes()
        ).padStart(2, "0")}`
      );
    } else {
      // Initialize with current date/time when no date is set
      const now = new Date();
      setDateValue(now.toISOString().split("T")[0]);
      setTimeValue(
        `${String(now.getHours()).padStart(2, "0")}:${String(
          now.getMinutes()
        ).padStart(2, "0")}`
      );
    }
  }, [task.dueDate, task.id, task.reminder]);

  const handleOpenDateModal = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("Opening date modal");
    setShowDateModal(true);
  };

  const handleCloseDateModal = () => {
    console.log("Closing date modal");
    setShowDateModal(false);
  };

  const handleSetToday = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const today = new Date();
    today.setHours(23, 59, 0, 0);
    console.log("Setting today:", today);
    onUpdate(task.id, { dueDate: today });
    setShowDateModal(false);
  };

  const handleSetTomorrow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 0, 0);
    console.log("Setting tomorrow:", tomorrow);
    onUpdate(task.id, { dueDate: tomorrow });
    setShowDateModal(false);
  };

  const handleSetCustomDate = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dateValue) {
      const [hours, minutes] = timeValue
        ? timeValue.split(":")
        : ["23", "59"];
      const date = new Date(dateValue);
      date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      console.log("Setting custom date:", date);
      onUpdate(task.id, { dueDate: date });
      setShowDateModal(false);
    }
  };

  const handleClearDate = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("Clearing date");
    onUpdate(task.id, { dueDate: undefined, reminder: false });
    setShowDateModal(false);
  };

  const handleToggleReminder = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log("Toggle reminder clicked - current reminder:", task.reminder);
    console.log("Has due date:", !!task.dueDate);
    
    if (!task.dueDate) {
      // If no date set, open date modal
      console.log("No date set, opening modal");
      setShowDateModal(true);
    } else {
      // Toggle reminder
      const newReminderState = !task.reminder;
      console.log("Toggling reminder to:", newReminderState);
      onUpdate(task.id, { reminder: newReminderState });
      
      // Request notification permission if enabling
      if (newReminderState) {
        requestNotificationPermission();
        
        // Schedule notification
        const timeUntilDue = new Date(task.dueDate).getTime() - Date.now();
        if (timeUntilDue > 0) {
          setTimeout(() => {
            if ("Notification" in window && Notification.permission === "granted") {
              new Notification("Task Reminder", {
                body: task.text || "You have a task due soon!",
                icon: "/favicon.ico",
              });
            }
          }, timeUntilDue);
        }
      }
    }
  };

  // Request notification permission on first use
  const requestNotificationPermission = () => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  };

  const formatDueDate = (date: Date) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dueDate = new Date(date);
    const dueDateOnly = new Date(
      dueDate.getFullYear(),
      dueDate.getMonth(),
      dueDate.getDate()
    );

    if (dueDateOnly.getTime() === today.getTime()) {
      return "Today";
    } else if (dueDateOnly.getTime() === tomorrow.getTime()) {
      return "Tomorrow";
    } else {
      return dueDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
  };

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();

  return (
    <>
      <div className="flex items-center gap-2 group/task relative">
        <Checkbox
          checked={task.completed}
          onCheckedChange={() => onToggle(task.id)}
        />
        <input
          type="text"
          value={task.text}
          onChange={(e) => onUpdate(task.id, { text: e.target.value })}
          onBlur={(e) => {
            onUpdate(task.id, { text: e.target.value });
          }}
          placeholder="Task description..."
          className={`flex-1 bg-transparent border-none outline-none text-sm ${
            task.completed ? "line-through text-gray-500" : "text-gray-800"
          }`}
          ref={inputRef}
          onKeyDown={(e) => onKeyDown(e, task.id, task.text)}
        />

        {/* Quick action buttons - Always visible for calendar and bell */}
        <div className="flex items-center gap-0.5">
          {/* Date display or button */}
          {task.dueDate ? (
            <button
              onClick={handleOpenDateModal}
              className={`px-2 py-1 text-xs rounded transition-colors ${ 
                isOverdue && !task.completed
                  ? "bg-red-100 text-red-700 hover:bg-red-200"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              title={new Date(task.dueDate).toLocaleString()}
            >
              {formatDueDate(new Date(task.dueDate))}
            </button>
          ) : (
            <button
              onClick={handleOpenDateModal}
              className="p-1.5 hover:bg-gray-100 rounded transition-colors"
              title="Set due date"
            >
              <Calendar className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
            </button>
          )}

          {/* Reminder bell - always visible */}
          <button
            onClick={handleToggleReminder}
            className={`p-1.5 hover:bg-gray-100 rounded transition-colors ${ 
              task.reminder ? "text-green-600" : "text-gray-400 hover:text-gray-600"
            }`}
            title={task.reminder ? "Reminder enabled" : "Enable reminder"}
          >
            <Bell className="w-3.5 h-3.5" />
          </button>

          {/* Delete button - only on hover */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete(task.id);
            }}
            className="p-1.5 hover:bg-red-100 rounded transition-all opacity-0 group-hover/task:opacity-100"
            title="Delete task"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-500" />
          </button>
        </div>
      </div>

      {/* Date Modal - Right side overlay */}
      {showDateModal && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 z-[9999]"
            onClick={handleCloseDateModal}
          />
          
          {/* Modal */}
          <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-[10000] flex flex-col animate-slide-in-right">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-gray-900">Set Due Date</h3>
                <button
                  onClick={handleCloseDateModal}
                  className="p-1.5 hover:bg-white/60 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <p className="text-sm text-gray-600">Choose when this task is due</p>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Quick options */}
              <div className="mb-6">
                <label className="block text-sm text-gray-700 mb-3">Quick Select</label>
                <div className="space-y-2">
                  <button
                    onClick={handleSetToday}
                    className="w-full px-4 py-3 text-left bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 rounded-lg transition-all border border-indigo-200 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-gray-900">Today</div>
                      <div className="text-xs text-gray-500">
                        {new Date().toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                    </div>
                    <Calendar className="w-4 h-4 text-indigo-600" />
                  </button>
                  <button
                    onClick={handleSetTomorrow}
                    className="w-full px-4 py-3 text-left bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 rounded-lg transition-all border border-indigo-200 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-gray-900">Tomorrow</div>
                      <div className="text-xs text-gray-500">
                        {new Date(Date.now() + 86400000).toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                    </div>
                    <Calendar className="w-4 h-4 text-indigo-600" />
                  </button>
                </div>
              </div>

              {/* Custom date picker */}
              <div className="mb-6">
                <label className="block text-sm text-gray-700 mb-3">Custom Date & Time</label>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1.5">
                      <Calendar className="w-3 h-3 inline mr-1" />
                      Date
                    </label>
                    <input
                      type="date"
                      value={dateValue}
                      onChange={(e) => setDateValue(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1.5">
                      <Clock className="w-3 h-3 inline mr-1" />
                      Time
                    </label>
                    <input
                      type="time"
                      value={timeValue}
                      onChange={(e) => setTimeValue(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Current date info */}
              {task.dueDate && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                  <div className="text-xs text-blue-600 mb-1">Current due date:</div>
                  <div className="text-sm text-blue-900">
                    {new Date(task.dueDate).toLocaleString("en-US", {
                      weekday: "long",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex gap-3">
                {task.dueDate && (
                  <button
                    onClick={handleClearDate}
                    className="flex-1 px-4 py-2.5 text-sm text-gray-700 bg-white hover:bg-gray-100 rounded-lg transition-colors border border-gray-300"
                  >
                    Clear Date
                  </button>
                )}
                <button
                  onClick={handleSetCustomDate}
                  disabled={!dateValue}
                  className="flex-1 px-4 py-2.5 text-sm bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 rounded-lg transition-colors disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed shadow-lg"
                >
                  Set Date
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}