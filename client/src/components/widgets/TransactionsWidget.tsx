import { useQuery } from "@tanstack/react-query";
import { WidgetWrapper } from "./WidgetWrapper";
import { ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

interface TransactionsWidgetProps {
  isDark?: boolean;
  isEditing?: boolean;
  onRemove?: () => void;
  slotSize?: { w: number; h: number };
}

const placeholderTransactions = [
  { id: "1", type: "income", amount: 100, description: "Пополнение", date: new Date() },
  { id: "2", type: "expense", amount: 25, description: "Покупка", date: new Date(Date.now() - 86400000) },
];

export function TransactionsWidget({ isDark = true, isEditing, onRemove, slotSize }: TransactionsWidgetProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/widgets/transactions"],
    retry: false,
  });

  const transactions = data?.transactions?.length > 0 ? data.transactions : placeholderTransactions;

  return (
    <WidgetWrapper
      title="История операций"
      icon="History"
      isLoading={isLoading}
      error={error ? "Ошибка загрузки" : null}
      isEmpty={transactions.length === 0}
      emptyMessage="Нет операций"
      isDark={isDark}
      isEditing={isEditing}
      onRemove={onRemove}
      slotSize={slotSize}
    >
      <div className="space-y-2">
        {transactions.slice(0, 5).map((tx: any) => (
          <div
            key={tx.id}
            className={`
              flex items-center justify-between p-2 rounded-lg
              ${isDark ? "bg-white/5" : "bg-gray-50"}
            `}
          >
            <div className="flex items-center gap-2">
              <div className={`
                p-1.5 rounded-full
                ${tx.type === "income" 
                  ? (isDark ? "bg-green-500/20" : "bg-green-100") 
                  : (isDark ? "bg-red-500/20" : "bg-red-100")
                }
              `}>
                {tx.type === "income" 
                  ? <ArrowDownLeft className="w-3 h-3 text-green-400" />
                  : <ArrowUpRight className="w-3 h-3 text-red-400" />
                }
              </div>
              <div>
                <div className={`text-sm ${isDark ? "text-white" : "text-gray-900"}`}>
                  {tx.description}
                </div>
                <div className={`text-xs ${isDark ? "text-white/40" : "text-gray-400"}`}>
                  {formatDistanceToNow(new Date(tx.date), { addSuffix: true, locale: ru })}
                </div>
              </div>
            </div>
            <span className={`
              text-sm font-bold
              ${tx.type === "income" ? "text-green-400" : "text-red-400"}
            `}>
              {tx.type === "income" ? "+" : "-"}{tx.amount} USDT
            </span>
          </div>
        ))}
      </div>
    </WidgetWrapper>
  );
}
