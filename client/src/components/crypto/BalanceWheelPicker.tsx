import { useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CoinBalance {
  id: string;
  symbol: string;
  name: string;
  balance: string;
  balanceUsd: string;
  iconUrl: string | null;
  contractAddress: string | null;
  isNative: boolean;
}

interface BalanceWheelPickerProps {
  balances: CoinBalance[];
  selectedIndex: number;
  onSelect: (index: number, coin: CoinBalance) => void;
  isDark?: boolean;
  isLoading?: boolean;
}

function BalanceSkeleton({ isDark }: { isDark: boolean }) {
  return (
    <div className={`relative rounded-2xl p-4 ${
      isDark 
        ? 'bg-gradient-to-r from-slate-800/60 via-slate-700/40 to-slate-800/60' 
        : 'bg-gradient-to-r from-rose-50/60 via-white to-blue-50/60'
    }`}>
      <div className="flex items-center justify-center gap-4">
        <div className={`w-10 h-10 rounded-xl animate-pulse ${isDark ? 'bg-slate-600' : 'bg-gray-200'}`} />
        <div className="space-y-2">
          <div className={`h-5 w-20 rounded animate-pulse ${isDark ? 'bg-slate-600' : 'bg-gray-200'}`} />
          <div className={`h-3 w-14 rounded animate-pulse ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`} />
        </div>
      </div>
    </div>
  );
}

function CoinIcon({ coin, isActive, isDark }: { coin: CoinBalance; isActive: boolean; isDark: boolean }) {
  return (
    <div className="relative w-10 h-10 flex-shrink-0">
      {coin.iconUrl ? (
        <img 
          src={coin.iconUrl} 
          alt={coin.symbol} 
          className={`w-10 h-10 rounded-xl object-cover transition-all duration-200 ${
            isActive 
              ? 'ring-2 ring-offset-1 ring-offset-white ring-gray-200' 
              : ''
          }`}
        />
      ) : (
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold transition-all duration-200 ${
          coin.isNative 
            ? 'bg-gradient-to-br from-orange-400 to-red-500 text-white' 
            : isActive
              ? isDark 
                ? 'bg-slate-600 text-white' 
                : 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white'
              : isDark 
                ? 'bg-slate-700/60 text-slate-400' 
                : 'bg-gray-200/80 text-gray-500'
        }`}>
          {coin.symbol.slice(0, 2)}
        </div>
      )}
      {coin.isNative && (
        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-md bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center ring-1 ring-white text-[8px] font-bold text-white">
          N
        </div>
      )}
    </div>
  );
}

function BalanceCard({ 
  coin, 
  position, 
  isDark, 
  onClick 
}: { 
  coin: CoinBalance; 
  position: 'left' | 'center' | 'right';
  isDark: boolean;
  onClick?: () => void;
}) {
  const isCenter = position === 'center';
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ 
        opacity: isCenter ? 1 : 0.7,
        scale: isCenter ? 1 : 0.92,
        x: position === 'left' ? -85 : position === 'right' ? 85 : 0,
        zIndex: isCenter ? 30 : position === 'left' ? 20 : 10
      }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: "spring", stiffness: 350, damping: 30 }}
      onClick={onClick}
      className={`absolute left-1/2 -translate-x-1/2 cursor-pointer ${
        isCenter ? 'z-30' : position === 'left' ? 'z-20' : 'z-10'
      }`}
      data-testid={`balance-card-${position}`}
    >
      <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 ${
        isCenter
          ? isDark 
            ? 'bg-slate-800/95 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5)] border border-slate-600/50' 
            : 'bg-white shadow-[0_8px_32px_-8px_rgba(0,0,0,0.15)] border border-gray-100'
          : isDark
            ? 'bg-slate-800/40 backdrop-blur-sm'
            : 'bg-white/50 backdrop-blur-sm'
      }`} style={{ minWidth: isCenter ? '150px' : '120px' }}>
        <CoinIcon coin={coin} isActive={isCenter} isDark={isDark} />
        
        <div className="flex flex-col min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className={`text-base font-bold tabular-nums ${
              isCenter
                ? isDark ? 'text-white' : 'text-gray-900'
                : isDark ? 'text-slate-400' : 'text-gray-500'
            }`}>
              {coin.balance}
            </span>
            <span className={`text-xs font-semibold uppercase ${
              isCenter
                ? isDark ? 'text-slate-300' : 'text-gray-600'
                : isDark ? 'text-slate-500' : 'text-gray-400'
            }`}>
              {coin.symbol}
            </span>
          </div>
          
          <div className={`text-[11px] ${
            isCenter
              ? isDark ? 'text-slate-400' : 'text-gray-500'
              : isDark ? 'text-slate-600' : 'text-gray-400'
          }`}>
            ≈ {coin.balanceUsd}
          </div>
          
          {isCenter && (
            <div className={`text-[10px] mt-0.5 ${
              isDark ? 'text-slate-500' : 'text-gray-400'
            }`}>
              {coin.name}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function BalanceWheelPicker({ 
  balances, 
  selectedIndex, 
  onSelect, 
  isDark = false,
  isLoading = false,
}: BalanceWheelPickerProps) {
  const handleArrowClick = useCallback((direction: 'left' | 'right') => {
    const newIndex = direction === 'left' 
      ? Math.max(0, selectedIndex - 1)
      : Math.min(balances.length - 1, selectedIndex + 1);
    if (newIndex !== selectedIndex) {
      onSelect(newIndex, balances[newIndex]);
    }
  }, [selectedIndex, balances, onSelect]);

  if (isLoading) {
    return <BalanceSkeleton isDark={isDark} />;
  }

  if (balances.length === 0) {
    return (
      <div className={`flex items-center justify-center p-4 rounded-2xl ${
        isDark 
          ? 'bg-slate-800/40 text-slate-500' 
          : 'bg-gray-50 text-gray-400'
      }`}>
        <span className="text-sm">Нет токенов</span>
      </div>
    );
  }

  const leftCoin = selectedIndex > 0 ? balances[selectedIndex - 1] : null;
  const centerCoin = balances[selectedIndex];
  const rightCoin = selectedIndex < balances.length - 1 ? balances[selectedIndex + 1] : null;

  const canGoLeft = selectedIndex > 0;
  const canGoRight = selectedIndex < balances.length - 1;

  return (
    <div 
      className={`relative rounded-2xl overflow-hidden ${
        isDark 
          ? 'bg-gradient-to-r from-slate-800/80 via-slate-700/50 to-slate-800/80' 
          : 'bg-gradient-to-r from-rose-100/50 via-white to-blue-100/50'
      }`}
      data-testid="balance-wheel-picker"
    >
      <div 
        className={`absolute inset-0 pointer-events-none ${
          isDark 
            ? 'bg-gradient-to-r from-slate-900/90 via-transparent to-slate-900/90' 
            : 'bg-gradient-to-r from-white/80 via-transparent to-white/80'
        }`}
      />

      {canGoLeft && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          whileHover={{ scale: 1.1, x: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handleArrowClick('left')}
          className={`absolute left-2 top-1/2 -translate-y-1/2 z-40 w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
            isDark 
              ? 'bg-slate-700/80 text-slate-300 hover:bg-slate-600/80' 
              : 'bg-white/90 text-gray-500 hover:text-gray-700 shadow-sm border border-gray-100'
          }`}
          data-testid="wheel-arrow-left"
        >
          <ChevronLeft className="w-4 h-4" />
        </motion.button>
      )}

      {canGoRight && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          whileHover={{ scale: 1.1, x: 2 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handleArrowClick('right')}
          className={`absolute right-2 top-1/2 -translate-y-1/2 z-40 w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
            isDark 
              ? 'bg-slate-700/80 text-slate-300 hover:bg-slate-600/80' 
              : 'bg-white/90 text-gray-500 hover:text-gray-700 shadow-sm border border-gray-100'
          }`}
          data-testid="wheel-arrow-right"
        >
          <ChevronRight className="w-4 h-4" />
        </motion.button>
      )}

      <div className="relative h-24 flex items-center justify-center">
        <AnimatePresence mode="popLayout">
          {leftCoin && (
            <BalanceCard
              key={`left-${leftCoin.id}`}
              coin={leftCoin}
              position="left"
              isDark={isDark}
              onClick={() => handleArrowClick('left')}
            />
          )}
          
          <BalanceCard
            key={`center-${centerCoin.id}`}
            coin={centerCoin}
            position="center"
            isDark={isDark}
          />
          
          {rightCoin && (
            <BalanceCard
              key={`right-${rightCoin.id}`}
              coin={rightCoin}
              position="right"
              isDark={isDark}
              onClick={() => handleArrowClick('right')}
            />
          )}
        </AnimatePresence>
      </div>

      {balances.length > 1 && (
        <div className="flex justify-center gap-1.5 pb-2.5 pt-1">
          {balances.map((_, index) => (
            <motion.button
              key={index}
              onClick={() => onSelect(index, balances[index])}
              className={`rounded-full transition-all duration-200 ${
                index === selectedIndex
                  ? isDark 
                    ? 'bg-gradient-to-r from-cyan-400 to-blue-500 w-5 h-1.5' 
                    : 'bg-gradient-to-r from-rose-400 to-pink-500 w-5 h-1.5'
                  : isDark 
                    ? 'bg-slate-600 w-1.5 h-1.5 hover:bg-slate-500' 
                    : 'bg-gray-300 w-1.5 h-1.5 hover:bg-gray-400'
              }`}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              data-testid={`wheel-dot-${index}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
