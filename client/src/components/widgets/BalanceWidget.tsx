import { useQuery } from "@tanstack/react-query";
import { WidgetWrapper } from "./WidgetWrapper";
import { TrendingUp, TrendingDown } from "lucide-react";

interface BalanceWidgetProps {
  isDark?: boolean;
  isEditing?: boolean;
  onRemove?: () => void;
  slotSize?: { w: number; h: number };
}

export function BalanceWidget({ isDark = true, isEditing, onRemove, slotSize }: BalanceWidgetProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/widgets/balance"],
    retry: false,
  });

  const balance = data?.balance || 0;
  const change = data?.change24h || 0;
  const isPositive = change >= 0;

  return (
    <WidgetWrapper
      title="Баланс"
      icon="Wallet"
      isLoading={isLoading}
      error={error ? "Ошибка загрузки" : null}
      isDark={isDark}
      isEditing={isEditing}
      onRemove={onRemove}
      slotSize={slotSize}
    >
      <div className="flex flex-col gap-2">
        <div className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
          {balance.toLocaleString()} <span className="text-sm font-normal opacity-60">USDT</span>
        </div>
        <div className={`flex items-center gap-1 text-sm ${isPositive ? "text-green-400" : "text-red-400"}`}>
          {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          <span>{isPositive ? "+" : ""}{change}%</span>
          <span className={isDark ? "text-white/40" : "text-gray-400"}>за 24ч</span>
        </div>
      </div>
    </WidgetWrapper>
  );
}
