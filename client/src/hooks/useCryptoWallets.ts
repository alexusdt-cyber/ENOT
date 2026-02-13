import { useState, useCallback } from 'react';

interface CryptoNetwork {
  id: string;
  name: string;
  code: string;
  symbol: string;
  nodeId: number;
  iconUrl: string | null;
  color: string;
  isActive: boolean;
}

interface CryptoWallet {
  id: string;
  userId: string;
  networkId: string;
  address: string;
  label: string;
  managedByApi: boolean;
  externalWalletId: number | null;
  hasPrivateKey: boolean;
  createdAt: string;
  network: CryptoNetwork;
}

interface WalletBalance {
  balance: string;
  balance_usdt?: string;
}

interface UserFeature {
  id: string;
  userId: string;
  featureKey: string;
  enabled: boolean;
  expiresAt: string | null;
}

interface UserNetwork {
  id: string;
  userId: string;
  networkId: string;
  sortOrder: number;
  createdAt: string;
}

interface CryptoCoin {
  id: string;
  networkId: string;
  symbol: string;
  name: string;
  decimals: number;
  contractAddress: string | null;
  isNative: boolean;
  iconUrl: string | null;
}

export function useCryptoWallets() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [networks, setNetworks] = useState<CryptoNetwork[]>([]);
  const [wallets, setWallets] = useState<CryptoWallet[]>([]);
  const [userNetworks, setUserNetworks] = useState<UserNetwork[]>([]);
  const [featureEnabled, setFeatureEnabled] = useState<boolean | null>(null);

  const checkFeature = useCallback(async () => {
    try {
      const response = await fetch('/api/user/features/crypto_wallets', { credentials: 'include' });
      if (!response.ok) {
        if (response.status === 401) {
          setFeatureEnabled(false);
          return false;
        }
        throw new Error('Failed to check feature');
      }
      const data: UserFeature = await response.json();
      setFeatureEnabled(data.enabled ?? false);
      return data.enabled ?? false;
    } catch (err) {
      setFeatureEnabled(false);
      return false;
    }
  }, []);

  const enableFeature = useCallback(async () => {
    try {
      const response = await fetch('/api/user/features/crypto_wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ enabled: true })
      });
      if (!response.ok) throw new Error('Failed to enable feature');
      setFeatureEnabled(true);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  }, []);

  const fetchNetworks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/crypto/networks', { credentials: 'include' });
      if (!response.ok) {
        if (response.status === 403) {
          setFeatureEnabled(false);
          return [];
        }
        throw new Error('Failed to fetch networks');
      }
      const data: CryptoNetwork[] = await response.json();
      setNetworks(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchWallets = useCallback(async (networkId?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const url = networkId 
        ? `/api/crypto/wallets?networkId=${networkId}` 
        : '/api/crypto/wallets';
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) {
        if (response.status === 403) {
          setFeatureEnabled(false);
          return [];
        }
        throw new Error('Failed to fetch wallets');
      }
      const data: CryptoWallet[] = await response.json();
      setWallets(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createWallet = useCallback(async (networkId: string, label?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/crypto/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ networkId, label })
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create wallet');
      }
      const wallet: CryptoWallet = await response.json();
      setWallets(prev => [wallet, ...prev]);
      return wallet;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const importWallet = useCallback(async (
    networkId: string, 
    address: string, 
    privateKey?: string, 
    label?: string
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/crypto/wallets/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ networkId, address, privateKey, label })
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to import wallet');
      }
      const wallet: CryptoWallet = await response.json();
      setWallets(prev => [wallet, ...prev]);
      return wallet;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getBalance = useCallback(async (walletId: string): Promise<WalletBalance | null> => {
    try {
      const response = await fetch(`/api/crypto/wallets/${walletId}/balance`, { 
        credentials: 'include' 
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to get balance');
      }
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  }, []);

  const deleteWallet = useCallback(async (walletId: string) => {
    try {
      const response = await fetch(`/api/crypto/wallets/${walletId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete wallet');
      }
      setWallets(prev => prev.filter(w => w.id !== walletId));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  }, []);

  const updateWallet = useCallback(async (walletId: string, label: string) => {
    try {
      const response = await fetch(`/api/crypto/wallets/${walletId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ label })
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update wallet');
      }
      const updated: CryptoWallet = await response.json();
      setWallets(prev => prev.map(w => w.id === walletId ? updated : w));
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  }, []);

  const transfer = useCallback(async (
    walletId: string,
    toAddress: string,
    amount: string,
    tokenContract?: string
  ): Promise<{ tx_hash: string; status: string } | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/crypto/wallets/${walletId}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ toAddress, amount, tokenContract })
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to transfer');
      }
      return await response.json();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchUserNetworks = useCallback(async () => {
    try {
      const response = await fetch('/api/crypto/user-networks', { credentials: 'include' });
      if (!response.ok) {
        if (response.status === 403) {
          setFeatureEnabled(false);
          return [];
        }
        throw new Error('Failed to fetch user networks');
      }
      const data: UserNetwork[] = await response.json();
      setUserNetworks(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return [];
    }
  }, []);

  const addUserNetwork = useCallback(async (networkId: string) => {
    try {
      const response = await fetch('/api/crypto/user-networks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ networkId })
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add network');
      }
      const userNetwork: UserNetwork = await response.json();
      setUserNetworks(prev => [...prev, userNetwork]);
      return userNetwork;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  }, []);

  const removeUserNetwork = useCallback(async (networkId: string) => {
    try {
      const response = await fetch(`/api/crypto/user-networks/${networkId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove network');
      }
      setUserNetworks(prev => prev.filter(un => un.networkId !== networkId));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  }, []);

  const fetchCoins = useCallback(async (networkId: string): Promise<CryptoCoin[]> => {
    try {
      const response = await fetch(`/api/crypto/networks/${networkId}/coins`, { credentials: 'include' });
      if (!response.ok) {
        throw new Error('Failed to fetch coins');
      }
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return [];
    }
  }, []);

  const getTokenBalance = useCallback(async (walletId: string, tokenContract: string): Promise<WalletBalance | null> => {
    try {
      const response = await fetch(`/api/crypto/wallets/${walletId}/balance?token=${encodeURIComponent(tokenContract)}`, { 
        credentials: 'include' 
      });
      if (!response.ok) {
        throw new Error('Failed to fetch token balance');
      }
      return await response.json();
    } catch (err) {
      return null;
    }
  }, []);

  return {
    isLoading,
    error,
    networks,
    wallets,
    userNetworks,
    featureEnabled,
    checkFeature,
    enableFeature,
    fetchNetworks,
    fetchWallets,
    fetchUserNetworks,
    addUserNetwork,
    removeUserNetwork,
    createWallet,
    importWallet,
    getBalance,
    deleteWallet,
    updateWallet,
    transfer,
    fetchCoins,
    getTokenBalance,
    clearError: () => setError(null)
  };
}
