import { BalanceWidget } from "./BalanceWidget";
import { StatsWidget } from "./StatsWidget";
import { QuickActionsWidget } from "./QuickActionsWidget";
import { NotesWidget } from "./NotesWidget";
import { TasksWidget } from "./TasksWidget";
import { AchievementsWidget } from "./AchievementsWidget";
import { ReferralsWidget } from "./ReferralsWidget";
import { TransactionsWidget } from "./TransactionsWidget";
import { NewsWidget } from "./NewsWidget";
import { CalendarWidget } from "./CalendarWidget";

export const widgetComponents: Record<string, React.ComponentType<any>> = {
  BalanceWidget,
  StatsWidget,
  QuickActionsWidget,
  NotesWidget,
  TasksWidget,
  AchievementsWidget,
  ReferralsWidget,
  TransactionsWidget,
  NewsWidget,
  CalendarWidget,
};

export {
  BalanceWidget,
  StatsWidget,
  QuickActionsWidget,
  NotesWidget,
  TasksWidget,
  AchievementsWidget,
  ReferralsWidget,
  TransactionsWidget,
  NewsWidget,
  CalendarWidget,
};

export { WidgetWrapper } from "./WidgetWrapper";
