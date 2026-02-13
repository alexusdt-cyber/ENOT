import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  Send, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  ArrowRight,
  Wallet,
  Copy,
  Check,
  ChevronDown
} from "lucide-react";

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

interface SendModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallet: {
    id: string;
    address: string;
    name: string;
    balance: string;
    balanceUsd: string;
    networkCode: string;
    networkName: string;
    symbol: string;
    logoUrl: string;
  };
  coins?: CoinBalance[];
  selectedCoinIndex?: number;
  onTransfer: (walletId: string, toAddress: string, amount: string, tokenContract?: string) => Promise<{ tx_hash: string; status: string } | null>;
  onSelectCoin?: (index: number) => void;
  onSuccess?: () => void;
  isDark?: boolean;
}

type ModalStep = "form" | "confirm" | "loading" | "success" | "error";

export function SendModal({ isOpen, onClose, wallet, coins, selectedCoinIndex = 0, onTransfer, onSelectCoin, onSuccess, isDark = false }: SendModalProps) {
  const [step, setStep] = useState<ModalStep>("form");
  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedTokenIndex, setSelectedTokenIndex] = useState(selectedCoinIndex);
  const [showTokenSelector, setShowTokenSelector] = useState(false);

  const selectedCoin = coins?.[selectedTokenIndex];
  const currentBalance = selectedCoin?.balance || wallet.balance;
  const currentSymbol = selectedCoin?.symbol || wallet.symbol;

  useEffect(() => {
    if (isOpen) {
      setStep("form");
      setToAddress("");
      setAmount("");
      setError(null);
      setTxHash(null);
      setSelectedTokenIndex(selectedCoinIndex);
      setShowTokenSelector(false);
    }
  }, [isOpen, selectedCoinIndex]);

  const validateAddress = useCallback((address: string): boolean => {
    if (!address.trim()) return false;
    if (address.length < 20) return false;
    return true;
  }, []);

  const validateAmount = useCallback((amt: string, balance: string): boolean => {
    const numAmount = parseFloat(amt);
    if (isNaN(numAmount) || numAmount <= 0) return false;
    const balanceNum = parseFloat(balance.replace(/[^\d.]/g, ''));
    if (numAmount > balanceNum) return false;
    return true;
  }, []);

  const handleSubmit = () => {
    if (!validateAddress(toAddress)) {
      setError("Введите корректный адрес получателя");
      return;
    }
    if (!validateAmount(amount, currentBalance)) {
      setError("Введите корректную сумму (не более баланса)");
      return;
    }
    setError(null);
    setStep("confirm");
  };

  const handleConfirm = async () => {
    setStep("loading");
    try {
      const tokenContract = selectedCoin?.isNative ? undefined : selectedCoin?.contractAddress || undefined;
      const result = await onTransfer(wallet.id, toAddress.trim(), amount, tokenContract);
      if (result) {
        setTxHash(result.tx_hash);
        setStep("success");
        onSuccess?.();
      } else {
        setError("Ошибка перевода: пустой ответ");
        setStep("error");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка перевода");
      setStep("error");
    }
  };

  const handleCopyTxHash = () => {
    if (txHash) {
      navigator.clipboard.writeText(txHash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSetMaxAmount = () => {
    const balanceNum = currentBalance.replace(/[^\d.]/g, '');
    setAmount(balanceNum);
  };

  const shortenAddress = (addr: string) => {
    if (addr.length <= 16) return addr;
    return `${addr.slice(0, 8)}...${addr.slice(-8)}`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className={`relative w-full max-w-md rounded-2xl overflow-hidden ${
            isDark 
              ? "bg-slate-900/95 border border-slate-700/50" 
              : "bg-white/95 border border-gray-200"
          } shadow-2xl backdrop-blur-xl`}
          data-testid="send-modal"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 via-transparent to-pink-500/5 pointer-events-none" />
          
          <div className={`relative p-6 border-b ${isDark ? "border-slate-700/50" : "border-gray-100"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg shadow-rose-500/25">
                  <Send className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                    Отправить
                  </h3>
                  <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                    {wallet.networkName}
                  </p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className={`p-2 rounded-xl transition-colors ${
                  isDark ? "hover:bg-slate-800 text-slate-400" : "hover:bg-gray-100 text-gray-500"
                }`}
                data-testid="close-send-modal"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>
          </div>

          <div className="relative p-6">
            <AnimatePresence mode="wait">
              {step === "form" && (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-5"
                >
                  <div className={`p-4 rounded-xl ${isDark ? "bg-slate-800/50" : "bg-gray-50"}`}>
                    <div className="flex items-center gap-3">
                      <img src={wallet.logoUrl} alt={wallet.networkCode} className="w-10 h-10 rounded-full" />
                      <div className="flex-1">
                        <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                          Отправить с
                        </p>
                        <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                          {wallet.name}
                        </p>
                        <p className={`text-xs font-mono ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                          {shortenAddress(wallet.address)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                          {currentBalance} {currentSymbol}
                        </p>
                        <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                          {selectedCoin?.balanceUsd || wallet.balanceUsd}
                        </p>
                      </div>
                    </div>
                  </div>

                  {coins && coins.length > 1 && (
                    <div className="relative">
                      <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                        Токен
                      </label>
                      <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => setShowTokenSelector(!showTokenSelector)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                          isDark 
                            ? "bg-slate-800 border-slate-700 text-white hover:border-slate-600" 
                            : "bg-white border-gray-200 text-gray-900 hover:border-gray-300"
                        }`}
                        data-testid="button-select-token"
                      >
                        <div className="flex items-center gap-3">
                          {selectedCoin?.iconUrl ? (
                            <img src={selectedCoin.iconUrl} alt={selectedCoin.symbol} className="w-8 h-8 rounded-full" />
                          ) : (
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                              isDark ? "bg-slate-700 text-white" : "bg-gray-200 text-gray-700"
                            }`}>
                              {selectedCoin?.symbol.slice(0, 2) || wallet.symbol.slice(0, 2)}
                            </div>
                          )}
                          <div className="text-left">
                            <p className="font-semibold">{selectedCoin?.symbol || wallet.symbol}</p>
                            <p className={`text-xs ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                              {selectedCoin?.name || wallet.networkName}
                            </p>
                          </div>
                        </div>
                        <ChevronDown className={`w-5 h-5 transition-transform ${showTokenSelector ? "rotate-180" : ""} ${
                          isDark ? "text-slate-400" : "text-gray-400"
                        }`} />
                      </motion.button>
                      
                      <AnimatePresence>
                        {showTokenSelector && (
                          <motion.div
                            initial={{ opacity: 0, y: -10, height: 0 }}
                            animate={{ opacity: 1, y: 0, height: "auto" }}
                            exit={{ opacity: 0, y: -10, height: 0 }}
                            className={`absolute z-10 left-0 right-0 mt-2 rounded-xl border overflow-hidden ${
                              isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200 shadow-lg"
                            }`}
                          >
                            <div className="max-h-48 overflow-y-auto">
                              {coins.map((coin, index) => (
                                <motion.button
                                  key={coin.id}
                                  whileHover={{ backgroundColor: isDark ? "rgba(71, 85, 105, 0.5)" : "rgba(243, 244, 246, 1)" }}
                                  onClick={() => {
                                    setSelectedTokenIndex(index);
                                    setShowTokenSelector(false);
                                    setAmount("");
                                    onSelectCoin?.(index);
                                  }}
                                  className={`w-full flex items-center justify-between px-4 py-3 transition-all ${
                                    index === selectedTokenIndex 
                                      ? isDark ? "bg-slate-700/50" : "bg-gray-100" 
                                      : ""
                                  }`}
                                  data-testid={`select-token-${coin.symbol}`}
                                >
                                  <div className="flex items-center gap-3">
                                    {coin.iconUrl ? (
                                      <img src={coin.iconUrl} alt={coin.symbol} className="w-7 h-7 rounded-full" />
                                    ) : (
                                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                                        isDark ? "bg-slate-600 text-white" : "bg-gray-200 text-gray-700"
                                      }`}>
                                        {coin.symbol.slice(0, 2)}
                                      </div>
                                    )}
                                    <div className="text-left">
                                      <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>{coin.symbol}</p>
                                      <p className={`text-xs ${isDark ? "text-slate-400" : "text-gray-500"}`}>{coin.name}</p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>{coin.balance}</p>
                                    <p className={`text-xs ${isDark ? "text-slate-400" : "text-gray-500"}`}>{coin.balanceUsd}</p>
                                  </div>
                                </motion.button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                      Адрес получателя
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={toAddress}
                        onChange={(e) => setToAddress(e.target.value)}
                        placeholder="Введите адрес кошелька"
                        className={`w-full px-4 py-3 rounded-xl text-sm font-mono transition-all ${
                          isDark 
                            ? "bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-rose-500 focus:ring-rose-500/20" 
                            : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-rose-500 focus:ring-rose-500/20"
                        } border focus:outline-none focus:ring-2`}
                        data-testid="input-to-address"
                      />
                      <Wallet className={`absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 ${
                        isDark ? "text-slate-500" : "text-gray-400"
                      }`} />
                    </div>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                      Сумма
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                        placeholder="0.00"
                        className={`w-full px-4 py-3 pr-24 rounded-xl text-sm transition-all ${
                          isDark 
                            ? "bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-rose-500 focus:ring-rose-500/20" 
                            : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-rose-500 focus:ring-rose-500/20"
                        } border focus:outline-none focus:ring-2`}
                        data-testid="input-amount"
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleSetMaxAmount}
                          className="px-2 py-1 text-xs font-medium bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-lg"
                          data-testid="button-max-amount"
                        >
                          MAX
                        </motion.button>
                        <span className={`text-sm font-medium ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                          {currentSymbol}
                        </span>
                      </div>
                    </div>
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20"
                    >
                      <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                      <p className="text-sm text-red-500">{error}</p>
                    </motion.div>
                  )}

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSubmit}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white font-semibold shadow-lg shadow-rose-500/25 flex items-center justify-center gap-2"
                    data-testid="button-continue"
                  >
                    <span>Продолжить</span>
                    <ArrowRight className="w-5 h-5" />
                  </motion.button>
                </motion.div>
              )}

              {step === "confirm" && (
                <motion.div
                  key="confirm"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-5"
                >
                  <div className={`p-5 rounded-xl ${isDark ? "bg-slate-800/50" : "bg-gray-50"} space-y-4`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>Сумма</span>
                      <span className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                        {amount} {currentSymbol}
                      </span>
                    </div>
                    <div className={`h-px ${isDark ? "bg-slate-700" : "bg-gray-200"}`} />
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <span className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>От</span>
                        <span className={`text-sm font-mono text-right ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                          {shortenAddress(wallet.address)}
                        </span>
                      </div>
                      <div className="flex items-start justify-between">
                        <span className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>Кому</span>
                        <span className={`text-sm font-mono text-right ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                          {shortenAddress(toAddress)}
                        </span>
                      </div>
                    </div>
                    <div className={`h-px ${isDark ? "bg-slate-700" : "bg-gray-200"}`} />
                    <div className="flex items-center justify-between">
                      <span className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>Сеть</span>
                      <div className="flex items-center gap-2">
                        <img src={wallet.logoUrl} alt={wallet.networkCode} className="w-5 h-5 rounded-full" />
                        <span className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                          {wallet.networkName}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className={`p-4 rounded-xl ${isDark ? "bg-amber-500/10 border-amber-500/20" : "bg-amber-50 border-amber-200"} border`}>
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <p className={`text-sm ${isDark ? "text-amber-200" : "text-amber-800"}`}>
                        Транзакции в блокчейне необратимы. Пожалуйста, убедитесь, что адрес получателя верен.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setStep("form")}
                      className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
                        isDark 
                          ? "bg-slate-800 text-white hover:bg-slate-700" 
                          : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                      }`}
                      data-testid="button-back"
                    >
                      Назад
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleConfirm}
                      className="flex-1 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white font-semibold shadow-lg shadow-rose-500/25"
                      data-testid="button-confirm"
                    >
                      Подтвердить
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {step === "loading" && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="py-12 flex flex-col items-center justify-center"
                >
                  <div className="relative">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="w-20 h-20 rounded-full border-4 border-rose-500/20"
                    />
                    <motion.div
                      animate={{ rotate: -360 }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 w-20 h-20 rounded-full border-4 border-transparent border-t-rose-500"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Send className="w-8 h-8 text-rose-500" />
                    </div>
                  </div>
                  <motion.p 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className={`mt-6 text-lg font-medium ${isDark ? "text-white" : "text-gray-900"}`}
                  >
                    Отправка транзакции...
                  </motion.p>
                  <p className={`mt-2 text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                    Пожалуйста, подождите
                  </p>
                </motion.div>
              )}

              {step === "success" && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="py-8 flex flex-col items-center justify-center"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", damping: 15, stiffness: 300, delay: 0.1 }}
                    className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center shadow-lg shadow-emerald-500/30"
                  >
                    <CheckCircle2 className="w-10 h-10 text-white" />
                  </motion.div>
                  <motion.p 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className={`mt-6 text-xl font-semibold ${isDark ? "text-white" : "text-gray-900"}`}
                  >
                    Транзакция отправлена!
                  </motion.p>
                  <p className={`mt-2 text-sm text-center ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                    {amount} {currentSymbol} успешно отправлено
                  </p>

                  {txHash && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className={`mt-6 w-full p-4 rounded-xl ${isDark ? "bg-slate-800/50" : "bg-gray-50"}`}
                    >
                      <p className={`text-xs mb-2 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                        Hash транзакции
                      </p>
                      <div className="flex items-center gap-2">
                        <code className={`flex-1 text-xs font-mono truncate ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                          {txHash}
                        </code>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={handleCopyTxHash}
                          className={`p-2 rounded-lg transition-colors ${
                            isDark ? "hover:bg-slate-700" : "hover:bg-gray-200"
                          }`}
                        >
                          {copied ? (
                            <Check className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Copy className={`w-4 h-4 ${isDark ? "text-slate-400" : "text-gray-500"}`} />
                          )}
                        </motion.button>
                      </div>
                    </motion.div>
                  )}

                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onClose}
                    className="mt-6 w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold shadow-lg shadow-emerald-500/25"
                    data-testid="button-done"
                  >
                    Готово
                  </motion.button>
                </motion.div>
              )}

              {step === "error" && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="py-8 flex flex-col items-center justify-center"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", damping: 15, stiffness: 300, delay: 0.1 }}
                    className="w-20 h-20 rounded-full bg-gradient-to-br from-red-400 to-rose-500 flex items-center justify-center shadow-lg shadow-red-500/30"
                  >
                    <XCircle className="w-10 h-10 text-white" />
                  </motion.div>
                  <motion.p 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className={`mt-6 text-xl font-semibold ${isDark ? "text-white" : "text-gray-900"}`}
                  >
                    Ошибка
                  </motion.p>
                  <p className={`mt-2 text-sm text-center max-w-xs ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                    {error || "Не удалось выполнить транзакцию"}
                  </p>

                  <div className="mt-6 flex gap-3 w-full">
                    <motion.button
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={onClose}
                      className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
                        isDark 
                          ? "bg-slate-800 text-white hover:bg-slate-700" 
                          : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                      }`}
                      data-testid="button-close-error"
                    >
                      Закрыть
                    </motion.button>
                    <motion.button
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setError(null);
                        setStep("form");
                      }}
                      className="flex-1 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white font-semibold shadow-lg shadow-rose-500/25"
                      data-testid="button-retry"
                    >
                      Попробовать снова
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
