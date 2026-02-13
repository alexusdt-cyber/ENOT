import { useState, useMemo, useEffect } from "react";
import { 
  Wallet,
  Plus, 
  ChevronDown,
  ChevronUp,
  Send,
  Download,
  ArrowLeftRight,
  Copy,
  Key,
  Sparkles,
  Shield,
  X,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Trash2,
  ArrowLeft
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useIsMobile } from "@/components/ui/use-mobile";
import { Skeleton } from "./ui/skeleton";
import { useCryptoWallets } from "../hooks/useCryptoWallets";
import { QRCodeModal } from "./qr/QRCodeModal";
import { SendModal } from "./crypto/SendModal";
import { BalanceWheelPicker } from "./crypto/BalanceWheelPicker";

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

import TronIcon from "../assets/network/tron.svg";
import BscIcon from "../assets/network/binance.svg";
import TonIcon from "../assets/network/ton.svg";
import EthereumIcon from "../assets/network/ethereum.svg";
import PolygonIcon from "../assets/network/polygon.svg";
import ArbitrumIcon from "../assets/network/arbitrum.svg";
import SolanaIcon from "../assets/network/solana.svg";
import AvalancheIcon from "../assets/network/avalanche.svg";
import PolkadotIcon from "../assets/network/polkadot.svg";
import TezosIcon from "../assets/network/tezos.svg";
import XrpIcon from "../assets/network/ripple.svg";
import DogeIcon from "../assets/network/dogecoin.svg";
import CardanoIcon from "../assets/network/cardano.svg";
import MoneroIcon from "../assets/network/monero.svg";


interface CryptoWalletsProps {
  isDark?: boolean;
}

const NETWORK_ICONS: Record<string, string> = {
  TRON: TronIcon, BSC: BscIcon, TON: TonIcon, ETH: EthereumIcon, 
  POLYGON: PolygonIcon, ARBITRUM: ArbitrumIcon, SOLANA: SolanaIcon,
  AVALANCHE: AvalancheIcon, POLKADOT: PolkadotIcon, TEZOS: TezosIcon,
  XRP: XrpIcon, DOGECOIN: DogeIcon, CARDANO: CardanoIcon, MONERO: MoneroIcon
};

const NETWORK_GRADIENTS: Record<string, string> = {
  TRON: "from-red-500 to-red-600", BSC: "from-yellow-400 to-yellow-500",
  TON: "from-blue-400 to-blue-500", ETH: "from-indigo-400 to-purple-500",
  POLYGON: "from-purple-500 to-purple-600", ARBITRUM: "from-blue-400 to-cyan-500",
  SOLANA: "from-purple-500 to-cyan-400", AVALANCHE: "from-red-500 to-red-600",
  POLKADOT: "from-pink-500 to-pink-600", TEZOS: "from-blue-500 to-blue-600",
  XRP: "from-slate-600 to-slate-700", DOGECOIN: "from-yellow-500 to-amber-500",
  CARDANO: "from-blue-600 to-blue-700", MONERO: "from-orange-500 to-orange-600"
};

const getNetworkIcon = (code: string): string => NETWORK_ICONS[code] || EthereumIcon;
const getNetworkGradient = (code: string): string => NETWORK_GRADIENTS[code] || "from-gray-500 to-gray-600";

export function CryptoWallets({ isDark = false }: CryptoWalletsProps) {
  const {
    isLoading: apiLoading,
    networks: apiNetworks,
    wallets: apiWallets,
    userNetworks: apiUserNetworks,
    checkFeature,
    fetchNetworks,
    fetchWallets,
    fetchUserNetworks,
    addUserNetwork,
    removeUserNetwork,
    createWallet,
    importWallet,
    getBalance,
    deleteWallet,
    transfer,
    fetchCoins,
    getTokenBalance
  } = useCryptoWallets();

  const isMobile = useIsMobile();
  const [isInitializing, setIsInitializing] = useState(true);
  const [selectedNetworkId, setSelectedNetworkId] = useState<string | null>(null);
  const [walletBalances, setWalletBalances] = useState<Record<string, { balance: string; balanceUsd: string }>>({});
  const [walletCoinBalances, setWalletCoinBalances] = useState<Record<string, CoinBalance[]>>({});
  const [selectedCoinIndex, setSelectedCoinIndex] = useState<Record<string, number>>({});
  const [showNetworkPicker, setShowNetworkPicker] = useState(false);
  const [showAddWallet, setShowAddWallet] = useState(false);
  const [walletCreationMode, setWalletCreationMode] = useState<"generate" | "import" | null>(null);
  const [importPrivateKey, setImportPrivateKey] = useState("");
  const [importAddress, setImportAddress] = useState("");
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [newWalletName, setNewWalletName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [receiveWallet, setReceiveWallet] = useState<{
    id: string;
    address: string;
    name: string;
    networkCode: string;
    logoUrl: string;
  } | null>(null);
  const [sendWallet, setSendWallet] = useState<{
    id: string;
    address: string;
    name: string;
    balance: string;
    balanceUsd: string;
    networkCode: string;
    networkName: string;
    symbol: string;
    logoUrl: string;
  } | null>(null);

  const userNetworkIds = useMemo(() => 
    apiUserNetworks.map(un => un.networkId),
    [apiUserNetworks]
  );

  useEffect(() => {
    const init = async () => {
      await checkFeature();
      await fetchNetworks();
      await fetchWallets();
      await fetchUserNetworks();
      setIsInitializing(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (userNetworkIds.length > 0 && !selectedNetworkId && !isMobile) {
      setSelectedNetworkId(userNetworkIds[0]);
    }
  }, [userNetworkIds, selectedNetworkId, isMobile]);

  useEffect(() => {
    let cancelled = false;
    const walletIds = apiWallets.map(w => w.id);
    
    setWalletBalances(prev => {
      const updated: Record<string, { balance: string; balanceUsd: string }> = {};
      for (const id of walletIds) {
        if (prev[id]) updated[id] = prev[id];
      }
      return updated;
    });
    
    const fetchBalances = async () => {
      for (const wallet of apiWallets) {
        if (cancelled) break;
        const balance = await getBalance(wallet.id);
        if (balance && !cancelled) {
          setWalletBalances(prev => ({
            ...prev,
            [wallet.id]: { balance: balance.balance, balanceUsd: `$${balance.balance_usdt}` }
          }));
        }
      }
    };
    
    if (apiWallets.length > 0) {
      fetchBalances();
    }
    
    return () => { cancelled = true; };
  }, [apiWallets]);

  useEffect(() => {
    if (!selectedNetworkId) return;
    let cancelled = false;
    
    setWalletCoinBalances({});
    setSelectedCoinIndex({});
    
    const loadCoinBalances = async () => {
      const coins = await fetchCoins(selectedNetworkId);
      if (cancelled || coins.length === 0) return;
      
      const networkWallets = apiWallets.filter(w => w.networkId === selectedNetworkId);
      
      for (const wallet of networkWallets) {
        if (cancelled) break;
        
        const coinBalances: CoinBalance[] = [];
        
        for (const coin of coins) {
          if (cancelled) break;
          
          let balance = "0.00";
          let balanceUsd = "$0.00";
          
          if (coin.isNative) {
            const nativeBalance = await getBalance(wallet.id);
            if (nativeBalance) {
              balance = nativeBalance.balance;
              balanceUsd = `$${nativeBalance.balance_usdt || "0.00"}`;
            }
          } else if (coin.contractAddress) {
            const tokenBalance = await getTokenBalance(wallet.id, coin.contractAddress);
            if (tokenBalance) {
              balance = tokenBalance.balance;
              balanceUsd = `$${tokenBalance.balance_usdt || "0.00"}`;
            }
          }
          
          coinBalances.push({
            id: coin.id,
            symbol: coin.symbol,
            name: coin.name,
            balance,
            balanceUsd,
            iconUrl: coin.iconUrl,
            contractAddress: coin.contractAddress,
            isNative: coin.isNative
          });
        }
        
        if (!cancelled) {
          setWalletCoinBalances(prev => ({
            ...prev,
            [wallet.id]: coinBalances
          }));
        }
      }
    };
    
    loadCoinBalances();
    
    return () => { cancelled = true; };
  }, [selectedNetworkId, apiWallets, fetchCoins, getBalance, getTokenBalance]);

  const isLoading = isInitializing || apiLoading;

  const availableToAdd = useMemo(() => 
    apiNetworks.filter(n => !userNetworkIds.includes(n.id)),
    [apiNetworks, userNetworkIds]
  );

  const userNetworksList = useMemo(() => 
    apiNetworks.filter(n => userNetworkIds.includes(n.id)),
    [apiNetworks, userNetworkIds]
  );

  const selectedNetwork = useMemo(() => 
    apiNetworks.find(n => n.id === selectedNetworkId),
    [apiNetworks, selectedNetworkId]
  );

  const filteredWallets = useMemo(() => 
    apiWallets.filter(w => w.networkId === selectedNetworkId).map(w => {
      const balanceData = walletBalances[w.id];
      return {
        id: w.id,
        networkId: w.networkId,
        name: w.label,
        address: w.address.slice(0, 8) + "..." + w.address.slice(-6),
        fullAddress: w.address,
        balance: balanceData?.balance || "0.00",
        balanceUsd: balanceData?.balanceUsd || "$0.00",
        createdAt: w.createdAt
      };
    }),
    [apiWallets, selectedNetworkId, walletBalances]
  );

  const [isMutating, setIsMutating] = useState(false);

  const handleAddNetwork = async (networkId: string) => {
    setIsMutating(true);
    const result = await addUserNetwork(networkId);
    if (result) {
      setSelectedNetworkId(networkId);
    }
    setShowNetworkPicker(false);
    setIsMutating(false);
  };

  const handleRemoveNetwork = async (networkId: string) => {
    setIsMutating(true);
    const success = await removeUserNetwork(networkId);
    if (success && selectedNetworkId === networkId) {
      const remaining = userNetworkIds.filter(id => id !== networkId);
      setSelectedNetworkId(remaining.length > 0 ? remaining[0] : null);
    }
    setIsMutating(false);
  };

  const handleGenerateWallet = async () => {
    if (!selectedNetworkId || !newWalletName.trim()) return;
    setIsGenerating(true);
    
    const result = await createWallet(selectedNetworkId, newWalletName.trim());
    
    if (result && !userNetworkIds.includes(selectedNetworkId)) {
      await addUserNetwork(selectedNetworkId);
    }
    
    setNewWalletName("");
    setWalletCreationMode(null);
    setShowAddWallet(false);
    setIsGenerating(false);
  };

  const handleImportWallet = async () => {
    if (!selectedNetworkId || !importAddress.trim() || !newWalletName.trim()) return;
    setIsGenerating(true);
    
    const result = await importWallet(
      selectedNetworkId, 
      importAddress.trim(),
      importPrivateKey.trim() || undefined,
      newWalletName.trim()
    );
    
    if (result && !userNetworkIds.includes(selectedNetworkId)) {
      await addUserNetwork(selectedNetworkId);
    }
    
    setNewWalletName("");
    setImportPrivateKey("");
    setImportAddress("");
    setWalletCreationMode(null);
    setShowAddWallet(false);
    setIsGenerating(false);
  };

  const handleDeleteWallet = async (walletId: string) => {
    setWalletBalances(prev => {
      const updated = { ...prev };
      delete updated[walletId];
      return updated;
    });
    await deleteWallet(walletId);
  };

  const copyToClipboard = async (address: string) => {
    await navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  if (isLoading) {
    return (
      <div className={`flex w-full h-full border-l border-t ${isDark ? 'bg-slate-900 border-slate-700/50' : 'bg-white border-gray-200'}`} data-testid="crypto-wallets-loading">
        {/* Networks Sidebar Skeleton */}
        <div className={`w-full md:w-80 flex-shrink-0 flex flex-col overflow-hidden ${isDark ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white/20 backdrop-blur-xl border-gray-300'} border-r`}>
          <div className={`p-4 border-b ${isDark ? 'border-slate-700/50' : 'border-gray-200'}`}>
            <div className="flex items-center gap-2 mb-4">
              <Skeleton className={`w-5 h-5 rounded ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
              <Skeleton className={`h-6 w-32 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
            </div>
            <Skeleton className={`h-12 w-full rounded-xl ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
          </div>
          <div className="flex-1 p-4 space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <Skeleton className={`w-10 h-10 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                <div className="flex-1 space-y-2">
                  <Skeleton className={`h-4 w-24 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                  <Skeleton className={`h-3 w-16 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Wallets Content Skeleton */}
        <div className={`flex-1 flex flex-col overflow-hidden hidden md:flex ${isDark ? 'bg-slate-900' : 'bg-gradient-to-br from-gray-50 to-white'}`}>
          <div className={`p-6 border-b ${isDark ? 'border-slate-700/50' : 'border-gray-200'}`}>
            <div className="flex items-center gap-4">
              <Skeleton className={`w-14 h-14 rounded-2xl ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
              <div className="space-y-2">
                <Skeleton className={`h-6 w-32 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                <Skeleton className={`h-4 w-20 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
              </div>
            </div>
          </div>
          <div className="flex-1 p-6 space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className={`p-4 rounded-2xl ${isDark ? 'bg-slate-800/50' : 'bg-white'}`}>
                <div className="flex items-center gap-4">
                  <Skeleton className={`w-12 h-12 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                  <div className="flex-1 space-y-2">
                    <Skeleton className={`h-5 w-28 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                    <Skeleton className={`h-4 w-40 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                  </div>
                  <div className="space-y-2 text-right">
                    <Skeleton className={`h-5 w-20 ml-auto ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                    <Skeleton className={`h-4 w-16 ml-auto ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex w-full h-full border-l border-t ${isDark ? 'bg-slate-900 border-slate-700/50' : 'bg-white border-gray-200'}`} data-testid="crypto-wallets">
      {isMobile ? (
        <AnimatePresence mode="wait">
          {selectedNetworkId ? (
            <motion.div key="wallets-mobile" initial={{x:"100%"}} animate={{x:0}} exit={{x:"100%"}} transition={{type:"tween",duration:0.25}} className="flex-1 flex flex-col overflow-hidden">
              <div className={`flex items-center gap-2 px-3 py-2 border-b ${isDark ? 'border-slate-700 bg-slate-900' : 'border-gray-200 bg-white'}`}>
                <button onClick={() => setSelectedNetworkId(null)} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors ${isDark ? 'text-slate-300 hover:bg-slate-700/60' : 'text-gray-600 hover:bg-gray-100'}`} data-testid="button-mobile-back-to-networks">
                  <ArrowLeft className="w-4 h-4" />
                  <span className="text-sm font-medium">Назад</span>
                </button>
              </div>
              <div className={`flex-1 flex flex-col overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-gradient-to-br from-gray-50 to-white'}`}>
                {selectedNetwork ? (
                  <>
                    <div className={`p-6 border-b ${isDark ? 'border-slate-700/50' : 'border-gray-200'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <motion.div 
                            className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg`}
                            style={{ 
                              backgroundColor: `${selectedNetwork.color}20`,
                              boxShadow: `0 8px 24px ${selectedNetwork.color}25`
                            }}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 200 }}
                          >
                            <img src={getNetworkIcon(selectedNetwork.code)} alt={selectedNetwork.name} className="w-8 h-8" />
                          </motion.div>
                          <div>
                            <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {selectedNetwork.name}
                            </h2>
                            <div className="flex items-center gap-2">
                              <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                                {selectedNetwork.symbol}
                              </span>
                              <motion.div
                                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10"
                                animate={{ opacity: [0.5, 1, 0.5] }}
                                transition={{ duration: 2, repeat: Infinity }}
                              >
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span className="text-xs text-emerald-500 font-medium">Active</span>
                              </motion.div>
                            </div>
                          </div>
                        </div>

                        <motion.button
                          onClick={() => setShowAddWallet(true)}
                          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium bg-gradient-to-r ${getNetworkGradient(selectedNetwork.code)} text-white shadow-lg transition-all`}
                          style={{ boxShadow: `0 4px 14px ${selectedNetwork.color}40` }}
                          whileHover={{ scale: 1.05, y: -2 }}
                          whileTap={{ scale: 0.95 }}
                          data-testid="button-add-wallet"
                        >
                          <Plus className="w-5 h-5" />
                          Добавить
                        </motion.button>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                      {filteredWallets.length === 0 ? (
                        <motion.div 
                          className={`flex flex-col items-center justify-center h-full ${isDark ? 'text-slate-400' : 'text-gray-400'}`}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          <div className={`w-24 h-24 rounded-3xl flex items-center justify-center mb-4 ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
                            <Wallet className="w-12 h-12 opacity-50" />
                          </div>
                          <p className="text-lg font-medium mb-2">Нет кошельков</p>
                          <p className="text-sm opacity-75">Создайте первый кошелек для сети {selectedNetwork.name}</p>
                        </motion.div>
                      ) : (
                        <div className="grid grid-cols-1 gap-4">
                          <AnimatePresence mode="popLayout">
                            {filteredWallets.map((wallet, index) => (
                              <motion.div
                                key={wallet.id}
                                layout
                                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.8, y: -20 }}
                                transition={{ delay: index * 0.05, type: "spring", stiffness: 200 }}
                                className={`group relative overflow-hidden rounded-2xl ${
                                  isDark 
                                    ? 'bg-gradient-to-br from-slate-800 to-slate-800/50 border border-slate-700/50' 
                                    : 'bg-white border border-gray-200 shadow-lg shadow-gray-100'
                                }`}
                                data-testid={`wallet-${wallet.id}`}
                              >
                                <motion.div
                                  className={`absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000`}
                                />
                                <div 
                                  className={`h-1 bg-gradient-to-r ${getNetworkGradient(selectedNetwork.code)}`}
                                />
                                <div className="p-4">
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <h3 className={`font-semibold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                          {wallet.name}
                                        </h3>
                                        <motion.button
                                          initial={{ opacity: 0 }}
                                          whileHover={{ scale: 1.1 }}
                                          className={`opacity-0 group-hover:opacity-100 p-1 rounded transition-all ${
                                            isDark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-100 text-red-500'
                                          }`}
                                          onClick={() => handleDeleteWallet(wallet.id)}
                                          data-testid={`delete-wallet-${wallet.id}`}
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </motion.button>
                                      </div>
                                      <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className={`text-xs font-mono ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                                          {wallet.address}
                                        </span>
                                        <motion.button
                                          whileHover={{ scale: 1.1 }}
                                          whileTap={{ scale: 0.9 }}
                                          onClick={() => copyToClipboard(wallet.fullAddress)}
                                          className={`p-0.5 rounded transition-colors ${
                                            copiedAddress === wallet.fullAddress
                                              ? 'text-emerald-500'
                                              : isDark ? 'text-slate-400 hover:text-white' : 'text-gray-400 hover:text-gray-600'
                                          }`}
                                          data-testid={`copy-address-${wallet.id}`}
                                        >
                                          {copiedAddress === wallet.fullAddress ? (
                                            <Check className="w-3 h-3" />
                                          ) : (
                                            <Copy className="w-3 h-3" />
                                          )}
                                        </motion.button>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="mb-3">
                                    <BalanceWheelPicker
                                      balances={walletCoinBalances[wallet.id] || []}
                                      selectedIndex={selectedCoinIndex[wallet.id] || 0}
                                      onSelect={(index) => {
                                        setSelectedCoinIndex(prev => ({
                                          ...prev,
                                          [wallet.id]: index
                                        }));
                                      }}
                                      isDark={isDark}
                                      isLoading={!walletCoinBalances[wallet.id]}
                                    />
                                  </div>
                                  <div className="grid grid-cols-3 gap-1.5">
                                    <motion.button
                                      whileHover={{ scale: 1.03, y: -1 }}
                                      whileTap={{ scale: 0.97 }}
                                      className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-md shadow-rose-500/20"
                                      data-testid={`send-${wallet.id}`}
                                      onClick={() => {
                                        if (selectedNetwork) {
                                          setSendWallet({
                                            id: wallet.id,
                                            address: wallet.fullAddress,
                                            name: wallet.name,
                                            balance: wallet.balance,
                                            balanceUsd: wallet.balanceUsd,
                                            networkCode: selectedNetwork.code,
                                            networkName: selectedNetwork.name,
                                            symbol: selectedNetwork.symbol,
                                            logoUrl: getNetworkIcon(selectedNetwork.code)
                                          });
                                        }
                                      }}
                                    >
                                      <Send className="w-4 h-4" />
                                      <span className="text-[11px] font-medium">Отправить</span>
                                    </motion.button>
                                    <motion.button
                                      whileHover={{ scale: 1.03, y: -1 }}
                                      whileTap={{ scale: 0.97 }}
                                      className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20"
                                      data-testid={`receive-${wallet.id}`}
                                      onClick={() => {
                                        if (selectedNetwork) {
                                          setReceiveWallet({
                                            id: wallet.id,
                                            address: wallet.fullAddress,
                                            name: wallet.name,
                                            networkCode: selectedNetwork.code,
                                            logoUrl: getNetworkIcon(selectedNetwork.code)
                                          });
                                        }
                                      }}
                                    >
                                      <Download className="w-4 h-4" />
                                      <span className="text-[11px] font-medium">Получить</span>
                                    </motion.button>
                                    <motion.button
                                      whileHover={{ scale: 1.03, y: -1 }}
                                      whileTap={{ scale: 0.97 }}
                                      className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20"
                                      data-testid={`exchange-${wallet.id}`}
                                    >
                                      <ArrowLeftRight className="w-4 h-4" />
                                      <span className="text-[11px] font-medium">Обменять</span>
                                    </motion.button>
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className={`flex-1 flex flex-col items-center justify-center ${isDark ? 'text-slate-400' : 'text-gray-400'}`}>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200 }}
                      className={`w-32 h-32 rounded-3xl flex items-center justify-center mb-6 ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}
                    >
                      <Wallet className="w-16 h-16 opacity-50" />
                    </motion.div>
                    <h3 className={`text-xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Добавьте криптосеть
                    </h3>
                    <p className="text-center max-w-sm">
                      Выберите сеть из списка слева, чтобы начать создавать и управлять кошельками
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div key="networks-mobile" initial={{opacity:0}} animate={{opacity:1}} exit={{x:"-30%",opacity:0}} transition={{type:"tween",duration:0.2}} className="flex-1 flex flex-col overflow-hidden">
              <div className={`w-full flex-shrink-0 flex flex-col overflow-hidden ${isDark ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white/20 backdrop-blur-xl border-gray-300'}`}>
                <div className={`p-4 border-b ${isDark ? 'border-slate-700/50' : 'border-gray-200'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className={`text-lg font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      <div className="relative">
                        <Wallet className="w-5 h-5 text-emerald-400" />
                        <motion.div
                          className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full"
                          animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                      </div>
                      Crypto Wallets
                    </h2>
                  </div>
                  
                  <div className="relative">
                    <motion.button
                      onClick={() => setShowNetworkPicker(!showNetworkPicker)}
                      className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
                        showNetworkPicker
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25'
                          : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-600/20'
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      data-testid="button-add-network"
                    >
                      <Plus className="w-5 h-5" />
                      Добавить сеть
                      <motion.div
                        animate={{ rotate: showNetworkPicker ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </motion.div>
                    </motion.button>

                    <AnimatePresence>
                      {showNetworkPicker && (
                        <motion.div
                          initial={{ opacity: 0, y: -10, height: 0 }}
                          animate={{ opacity: 1, y: 0, height: "auto" }}
                          exit={{ opacity: 0, y: -10, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className={`absolute left-0 right-0 mt-2 z-50 rounded-xl overflow-hidden shadow-2xl ${
                            isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-200'
                          }`}
                        >
                          <div className="max-h-64 overflow-y-auto p-2">
                            {availableToAdd.length === 0 ? (
                              <div className={`text-center py-4 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                                Все сети добавлены
                              </div>
                            ) : (
                              availableToAdd.map((network, index) => (
                                <motion.button
                                  key={network.id}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: index * 0.03 }}
                                  onClick={() => handleAddNetwork(network.id)}
                                  disabled={isMutating}
                                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                                    isDark ? 'hover:bg-slate-700/50' : 'hover:bg-gray-100'
                                  } ${isMutating ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  whileHover={{ x: 4 }}
                                  data-testid={`network-option-${network.id}`}
                                >
                                  <div 
                                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                                    style={{ backgroundColor: `${network.color}15` }}
                                  >
                                    <img src={getNetworkIcon(network.code)} alt={network.name} className="w-5 h-5" />
                                  </div>
                                  <div className="flex-1 text-left">
                                    <div className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                      {network.name}
                                    </div>
                                    <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                                      {network.symbol}
                                    </div>
                                  </div>
                                  <Plus className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-gray-400'}`} />
                                </motion.button>
                              ))
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
                  {userNetworksList.length === 0 ? (
                    <div className={`text-center py-8 px-4 ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                      <Wallet className={`w-12 h-12 mx-auto mb-2 opacity-50 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
                      <p className="text-sm">Добавьте первую сеть для начала работы</p>
                    </div>
                  ) : (
                    userNetworksList.map((network) => (
                      <motion.div
                        key={network.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className={`group relative flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all ${
                          selectedNetworkId === network.id
                            ? isDark 
                              ? "bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border border-emerald-500/30" 
                              : "bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200"
                            : isDark 
                              ? "hover:bg-slate-700/50 border border-transparent" 
                              : "hover:bg-gray-100 border border-transparent"
                        }`}
                        onClick={() => setSelectedNetworkId(network.id)}
                        data-testid={`network-${network.id}`}
                      >
                        <div 
                          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                            selectedNetworkId === network.id ? 'shadow-lg' : ''
                          }`}
                          style={{ 
                            backgroundColor: `${network.color}${selectedNetworkId === network.id ? '25' : '15'}`,
                            boxShadow: selectedNetworkId === network.id ? `0 4px 14px ${network.color}30` : 'none'
                          }}
                        >
                          <img src={getNetworkIcon(network.code)} alt={network.name} className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <div className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {network.name}
                          </div>
                          <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                            {apiWallets.filter(w => w.networkId === network.id).length} кошельков
                          </div>
                        </div>
                        
                        <motion.button
                          initial={{ opacity: 0 }}
                          whileHover={{ scale: 1.1 }}
                          disabled={isMutating}
                          className={`opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all ${
                            isDark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-100 text-red-500'
                          } ${isMutating ? 'cursor-not-allowed' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveNetwork(network.id);
                          }}
                          data-testid={`remove-network-${network.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </motion.button>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      ) : (
        <>
          {/* Networks Sidebar */}
          <div className={`w-full md:w-80 flex-shrink-0 flex flex-col overflow-hidden ${isDark ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white/20 backdrop-blur-xl border-gray-300'} border-r`}>
            <div className={`p-4 border-b ${isDark ? 'border-slate-700/50' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-lg font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  <div className="relative">
                    <Wallet className="w-5 h-5 text-emerald-400" />
                    <motion.div
                      className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full"
                      animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  </div>
                  Crypto Wallets
                </h2>
              </div>
              
              <div className="relative">
                <motion.button
                  onClick={() => setShowNetworkPicker(!showNetworkPicker)}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
                    showNetworkPicker
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25'
                      : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-600/20'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  data-testid="button-add-network"
                >
                  <Plus className="w-5 h-5" />
                  Добавить сеть
                  <motion.div
                    animate={{ rotate: showNetworkPicker ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </motion.div>
                </motion.button>

                <AnimatePresence>
                  {showNetworkPicker && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{ opacity: 0, y: -10, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className={`absolute left-0 right-0 mt-2 z-50 rounded-xl overflow-hidden shadow-2xl ${
                        isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-200'
                      }`}
                    >
                      <div className="max-h-64 overflow-y-auto p-2">
                        {availableToAdd.length === 0 ? (
                          <div className={`text-center py-4 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                            Все сети добавлены
                          </div>
                        ) : (
                          availableToAdd.map((network, index) => (
                            <motion.button
                              key={network.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.03 }}
                              onClick={() => handleAddNetwork(network.id)}
                              disabled={isMutating}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                                isDark ? 'hover:bg-slate-700/50' : 'hover:bg-gray-100'
                              } ${isMutating ? 'opacity-50 cursor-not-allowed' : ''}`}
                              whileHover={{ x: 4 }}
                              data-testid={`network-option-${network.id}`}
                            >
                              <div 
                                className="w-8 h-8 rounded-lg flex items-center justify-center"
                                style={{ backgroundColor: `${network.color}15` }}
                              >
                                <img src={getNetworkIcon(network.code)} alt={network.name} className="w-5 h-5" />
                              </div>
                              <div className="flex-1 text-left">
                                <div className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                  {network.name}
                                </div>
                                <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                                  {network.symbol}
                                </div>
                              </div>
                              <Plus className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-gray-400'}`} />
                            </motion.button>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
              {userNetworksList.length === 0 ? (
                <div className={`text-center py-8 px-4 ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                  <Wallet className={`w-12 h-12 mx-auto mb-2 opacity-50 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
                  <p className="text-sm">Добавьте первую сеть для начала работы</p>
                </div>
              ) : (
                userNetworksList.map((network) => (
                  <motion.div
                    key={network.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className={`group relative flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all ${
                      selectedNetworkId === network.id
                        ? isDark 
                          ? "bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border border-emerald-500/30" 
                          : "bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200"
                        : isDark 
                          ? "hover:bg-slate-700/50 border border-transparent" 
                          : "hover:bg-gray-100 border border-transparent"
                    }`}
                    onClick={() => setSelectedNetworkId(network.id)}
                    data-testid={`network-${network.id}`}
                  >
                    <div 
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                        selectedNetworkId === network.id ? 'shadow-lg' : ''
                      }`}
                      style={{ 
                        backgroundColor: `${network.color}${selectedNetworkId === network.id ? '25' : '15'}`,
                        boxShadow: selectedNetworkId === network.id ? `0 4px 14px ${network.color}30` : 'none'
                      }}
                    >
                      <img src={getNetworkIcon(network.code)} alt={network.name} className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {network.name}
                      </div>
                      <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        {apiWallets.filter(w => w.networkId === network.id).length} кошельков
                      </div>
                    </div>
                    
                    <motion.button
                      initial={{ opacity: 0 }}
                      whileHover={{ scale: 1.1 }}
                      disabled={isMutating}
                      className={`opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all ${
                        isDark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-100 text-red-500'
                      } ${isMutating ? 'cursor-not-allowed' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveNetwork(network.id);
                      }}
                      data-testid={`remove-network-${network.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </motion.button>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          {/* Wallets Content Area */}
          <div className={`flex-1 flex flex-col overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-gradient-to-br from-gray-50 to-white'}`}>
            {selectedNetwork ? (
              <>
                <div className={`p-6 border-b ${isDark ? 'border-slate-700/50' : 'border-gray-200'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <motion.div 
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg`}
                        style={{ 
                          backgroundColor: `${selectedNetwork.color}20`,
                          boxShadow: `0 8px 24px ${selectedNetwork.color}25`
                        }}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200 }}
                      >
                        <img src={getNetworkIcon(selectedNetwork.code)} alt={selectedNetwork.name} className="w-8 h-8" />
                      </motion.div>
                      <div>
                        <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {selectedNetwork.name}
                        </h2>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                            {selectedNetwork.symbol}
                          </span>
                          <motion.div
                            className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10"
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span className="text-xs text-emerald-500 font-medium">Active</span>
                          </motion.div>
                        </div>
                      </div>
                    </div>

                    <motion.button
                      onClick={() => setShowAddWallet(true)}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium bg-gradient-to-r ${getNetworkGradient(selectedNetwork.code)} text-white shadow-lg transition-all`}
                      style={{ boxShadow: `0 4px 14px ${selectedNetwork.color}40` }}
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      data-testid="button-add-wallet"
                    >
                      <Plus className="w-5 h-5" />
                      Добавить
                    </motion.button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                  {filteredWallets.length === 0 ? (
                    <motion.div 
                      className={`flex flex-col items-center justify-center h-full ${isDark ? 'text-slate-400' : 'text-gray-400'}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className={`w-24 h-24 rounded-3xl flex items-center justify-center mb-4 ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
                        <Wallet className="w-12 h-12 opacity-50" />
                      </div>
                      <p className="text-lg font-medium mb-2">Нет кошельков</p>
                      <p className="text-sm opacity-75">Создайте первый кошелек для сети {selectedNetwork.name}</p>
                    </motion.div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      <AnimatePresence mode="popLayout">
                        {filteredWallets.map((wallet, index) => (
                          <motion.div
                            key={wallet.id}
                            layout
                            initial={{ opacity: 0, scale: 0.8, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8, y: -20 }}
                            transition={{ delay: index * 0.05, type: "spring", stiffness: 200 }}
                            className={`group relative overflow-hidden rounded-2xl ${
                              isDark 
                                ? 'bg-gradient-to-br from-slate-800 to-slate-800/50 border border-slate-700/50' 
                                : 'bg-white border border-gray-200 shadow-lg shadow-gray-100'
                            }`}
                            data-testid={`wallet-${wallet.id}`}
                          >
                            <motion.div
                              className={`absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000`}
                            />
                            <div 
                              className={`h-1 bg-gradient-to-r ${getNetworkGradient(selectedNetwork.code)}`}
                            />
                            <div className="p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h3 className={`font-semibold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                      {wallet.name}
                                    </h3>
                                    <motion.button
                                      initial={{ opacity: 0 }}
                                      whileHover={{ scale: 1.1 }}
                                      className={`opacity-0 group-hover:opacity-100 p-1 rounded transition-all ${
                                        isDark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-100 text-red-500'
                                      }`}
                                      onClick={() => handleDeleteWallet(wallet.id)}
                                      data-testid={`delete-wallet-${wallet.id}`}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </motion.button>
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className={`text-xs font-mono ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                                      {wallet.address}
                                    </span>
                                    <motion.button
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.9 }}
                                      onClick={() => copyToClipboard(wallet.fullAddress)}
                                      className={`p-0.5 rounded transition-colors ${
                                        copiedAddress === wallet.fullAddress
                                          ? 'text-emerald-500'
                                          : isDark ? 'text-slate-400 hover:text-white' : 'text-gray-400 hover:text-gray-600'
                                      }`}
                                      data-testid={`copy-address-${wallet.id}`}
                                    >
                                      {copiedAddress === wallet.fullAddress ? (
                                        <Check className="w-3 h-3" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                    </motion.button>
                                  </div>
                                </div>
                              </div>

                              <div className="mb-3">
                                <BalanceWheelPicker
                                  balances={walletCoinBalances[wallet.id] || []}
                                  selectedIndex={selectedCoinIndex[wallet.id] || 0}
                                  onSelect={(index) => {
                                    setSelectedCoinIndex(prev => ({
                                      ...prev,
                                      [wallet.id]: index
                                    }));
                                  }}
                                  isDark={isDark}
                                  isLoading={!walletCoinBalances[wallet.id]}
                                />
                              </div>

                              <div className="grid grid-cols-3 gap-1.5">
                                <motion.button
                                  whileHover={{ scale: 1.03, y: -1 }}
                                  whileTap={{ scale: 0.97 }}
                                  className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-md shadow-rose-500/20"
                                  data-testid={`send-${wallet.id}`}
                                  onClick={() => {
                                    if (selectedNetwork) {
                                      setSendWallet({
                                        id: wallet.id,
                                        address: wallet.fullAddress,
                                        name: wallet.name,
                                        balance: wallet.balance,
                                        balanceUsd: wallet.balanceUsd,
                                        networkCode: selectedNetwork.code,
                                        networkName: selectedNetwork.name,
                                        symbol: selectedNetwork.symbol,
                                        logoUrl: getNetworkIcon(selectedNetwork.code)
                                      });
                                    }
                                  }}
                                >
                                  <Send className="w-4 h-4" />
                                  <span className="text-[11px] font-medium">Отправить</span>
                                </motion.button>
                                <motion.button
                                  whileHover={{ scale: 1.03, y: -1 }}
                                  whileTap={{ scale: 0.97 }}
                                  className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20"
                                  data-testid={`receive-${wallet.id}`}
                                  onClick={() => {
                                    if (selectedNetwork) {
                                      setReceiveWallet({
                                        id: wallet.id,
                                        address: wallet.fullAddress,
                                        name: wallet.name,
                                        networkCode: selectedNetwork.code,
                                        logoUrl: getNetworkIcon(selectedNetwork.code)
                                      });
                                    }
                                  }}
                                >
                                  <Download className="w-4 h-4" />
                                  <span className="text-[11px] font-medium">Получить</span>
                                </motion.button>
                                <motion.button
                                  whileHover={{ scale: 1.03, y: -1 }}
                                  whileTap={{ scale: 0.97 }}
                                  className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20"
                                  data-testid={`exchange-${wallet.id}`}
                                >
                                  <ArrowLeftRight className="w-4 h-4" />
                                  <span className="text-[11px] font-medium">Обменять</span>
                                </motion.button>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className={`flex-1 flex flex-col items-center justify-center ${isDark ? 'text-slate-400' : 'text-gray-400'}`}>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200 }}
                  className={`w-32 h-32 rounded-3xl flex items-center justify-center mb-6 ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}
                >
                  <Wallet className="w-16 h-16 opacity-50" />
                </motion.div>
                <h3 className={`text-xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Добавьте криптосеть
                </h3>
                <p className="text-center max-w-sm">
                  Выберите сеть из списка слева, чтобы начать создавать и управлять кошельками
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Add Wallet Modal */}
      <AnimatePresence>
        {showAddWallet && selectedNetwork && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setShowAddWallet(false);
              setWalletCreationMode(null);
              setNewWalletName("");
              setImportPrivateKey("");
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className={`w-full max-w-md mx-4 rounded-2xl overflow-hidden ${
                isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white shadow-2xl'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className={`relative h-2 bg-gradient-to-r ${getNetworkGradient(selectedNetwork.code)}`} />
              <div className={`p-6 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${selectedNetwork.color}20` }}
                    >
                      <img src={getNetworkIcon(selectedNetwork.code)} alt={selectedNetwork.name} className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Новый кошелек
                      </h3>
                      <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        {selectedNetwork.name} • {selectedNetwork.symbol}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowAddWallet(false);
                      setWalletCreationMode(null);
                    }}
                    className={`p-2 rounded-lg transition-colors ${
                      isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-100 text-gray-500'
                    }`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                {!walletCreationMode ? (
                  <div className="space-y-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setWalletCreationMode("generate")}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                        isDark 
                          ? 'border-slate-600 hover:border-emerald-500 hover:bg-emerald-500/10' 
                          : 'border-gray-200 hover:border-emerald-500 hover:bg-emerald-50'
                      }`}
                      data-testid="button-generate-wallet"
                    >
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                        <Sparkles className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          Создать новый
                        </div>
                        <div className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                          Сгенерировать новый кошелек
                        </div>
                      </div>
                      <ChevronUp className={`w-5 h-5 rotate-90 ${isDark ? 'text-slate-400' : 'text-gray-400'}`} />
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setWalletCreationMode("import")}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                        isDark 
                          ? 'border-slate-600 hover:border-purple-500 hover:bg-purple-500/10' 
                          : 'border-gray-200 hover:border-purple-500 hover:bg-purple-50'
                      }`}
                      data-testid="button-import-wallet"
                    >
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
                        <Key className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          Импортировать
                        </div>
                        <div className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                          Ввести приватный ключ
                        </div>
                      </div>
                      <ChevronUp className={`w-5 h-5 rotate-90 ${isDark ? 'text-slate-400' : 'text-gray-400'}`} />
                    </motion.button>
                  </div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-4"
                  >
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                        Название кошелька
                      </label>
                      <input
                        type="text"
                        value={newWalletName}
                        onChange={(e) => setNewWalletName(e.target.value)}
                        placeholder="Например: Main Wallet"
                        className={`w-full px-4 py-3 rounded-xl border-2 transition-all focus:outline-none ${
                          isDark 
                            ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 focus:border-emerald-500' 
                            : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-emerald-500'
                        }`}
                        data-testid="input-wallet-name"
                      />
                    </div>

                    {walletCreationMode === "import" && (
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                          Приватный ключ
                        </label>
                        <div className="relative">
                          <input
                            type={showPrivateKey ? "text" : "password"}
                            value={importPrivateKey}
                            onChange={(e) => setImportPrivateKey(e.target.value)}
                            placeholder="Введите приватный ключ"
                            className={`w-full px-4 py-3 pr-12 rounded-xl border-2 transition-all focus:outline-none font-mono text-sm ${
                              isDark 
                                ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 focus:border-purple-500' 
                                : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-purple-500'
                            }`}
                            data-testid="input-private-key"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPrivateKey(!showPrivateKey)}
                            className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 ${
                              isDark ? 'text-slate-400 hover:text-white' : 'text-gray-400 hover:text-gray-600'
                            }`}
                          >
                            {showPrivateKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                        <div className={`flex items-center gap-2 mt-2 text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                          <Shield className="w-3.5 h-3.5" />
                          Ваш ключ хранится локально и зашифрован
                        </div>
                      </div>
                    )}

                    {walletCreationMode === "generate" && (
                      <div className={`p-4 rounded-xl ${isDark ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-emerald-50 border border-emerald-100'}`}>
                        <div className="flex items-center gap-2 text-emerald-500 mb-2">
                          <Shield className="w-4 h-4" />
                          <span className="text-sm font-medium">Безопасная генерация</span>
                        </div>
                        <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                          Будет создан новый кошелек с уникальным приватным ключом. Сохраните его в безопасном месте.
                        </p>
                      </div>
                    )}

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => {
                          setWalletCreationMode(null);
                          setNewWalletName("");
                          setImportPrivateKey("");
                        }}
                        className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
                          isDark 
                            ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Назад
                      </button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={walletCreationMode === "generate" ? handleGenerateWallet : handleImportWallet}
                        disabled={isGenerating || !newWalletName.trim() || (walletCreationMode === "import" && !importPrivateKey.trim())}
                        className={`flex-1 py-3 rounded-xl font-medium text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                          walletCreationMode === "generate"
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25'
                            : 'bg-gradient-to-r from-purple-500 to-indigo-600 shadow-lg shadow-purple-500/25'
                        }`}
                        data-testid="button-confirm-wallet"
                      >
                        {isGenerating ? (
                          <span className="flex items-center justify-center gap-2">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            {walletCreationMode === "generate" ? "Создание..." : "Импорт..."}
                          </span>
                        ) : (
                          walletCreationMode === "generate" ? "Создать" : "Импортировать"
                        )}
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Receive QR Code Modal */}
      <QRCodeModal
        isOpen={!!receiveWallet}
        onClose={() => setReceiveWallet(null)}
        data={receiveWallet?.address || ''}
        type="CryptoWallet"
        title={receiveWallet?.name || 'Кошелек'}
        subtitle={selectedNetwork?.name || 'Получение средств'}
        networkCode={receiveWallet?.networkCode}
        logoUrl={receiveWallet?.logoUrl}
        copyText={receiveWallet?.address}
        isDark={isDark}
      />

      {/* Send Modal */}
      {sendWallet && (
        <SendModal
          isOpen={!!sendWallet}
          onClose={() => setSendWallet(null)}
          wallet={sendWallet}
          coins={walletCoinBalances[sendWallet.id]}
          selectedCoinIndex={selectedCoinIndex[sendWallet.id] || 0}
          onTransfer={transfer}
          onSelectCoin={(index) => {
            setSelectedCoinIndex(prev => ({
              ...prev,
              [sendWallet.id]: index
            }));
          }}
          onSuccess={async () => {
            if (sendWallet) {
              const balance = await getBalance(sendWallet.id);
              if (balance) {
                setWalletBalances(prev => ({
                  ...prev,
                  [sendWallet.id]: { balance: balance.balance, balanceUsd: `$${balance.balance_usdt}` }
                }));
              }
            }
          }}
          isDark={isDark}
        />
      )}
    </div>
  );
}
