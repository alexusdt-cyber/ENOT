interface WalletApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface ExternalWallet {
  id: number;
  address: string;
  private_key: string;
  node: string;
}

interface WalletBalance {
  balance: string;
  balance_usdt?: string;
}

interface TransferResult {
  tx_hash: string;
  status: string;
}

const NODE_NAMES: Record<number, string> = {
  1: 'TRON', 2: 'BSC', 3: 'TON', 4: 'ETH', 5: 'POLYGON',
  6: 'ARBITRUM', 7: 'SOLANA', 8: 'AVALANCHE', 9: 'POLKADOT',
  10: 'TEZOS', 11: 'XRP', 12: 'DOGECOIN', 13: 'CARDANO', 14: 'MONERO'
};

class WalletApiService {
  private getBaseUrl(): string {
    const url = process.env.WALLET_API_URL;
    if (!url) {
      throw new Error('WALLET_API_URL environment variable is not set');
    }
    return url.replace(/\/$/, '');
  }
  
  private getApiKey(): string {
    const key = process.env.WALLET_API_KEY;
    if (!key) {
      throw new Error('WALLET_API_KEY environment variable is not set');
    }
    return key;
  }
  
  private async request<T>(
    endpoint: string,
    body: Record<string, unknown> = {}
  ): Promise<WalletApiResponse<T>> {
    try {
      const baseUrl = this.getBaseUrl();
      const apiKey = this.getApiKey();
      
      console.log(`[WalletAPI] Request to ${baseUrl}${endpoint}`, JSON.stringify(body));
      
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(body)
      });
      
      const data = await response.json();
      console.log(`[WalletAPI] Response:`, JSON.stringify(data));
      
      if (!response.ok) {
        return { success: false, error: data.message || data.error || response.statusText };
      }
      
      return { success: true, data };
    } catch (error) {
      console.error('[WalletAPI] Error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
  
  async createWallet(userId: string, nodeId: number): Promise<WalletApiResponse<ExternalWallet>> {
    const nodeName = NODE_NAMES[nodeId];
    if (!nodeName) {
      return { success: false, error: `Invalid node ID: ${nodeId}` };
    }
    
    return this.request<ExternalWallet>('/api/wallet/create', { node: nodeName });
  }
  
  async getBalance(userId: string, address: string, nodeId: number): Promise<WalletApiResponse<WalletBalance>> {
    const nodeName = NODE_NAMES[nodeId];
    if (!nodeName) {
      return { success: false, error: `Invalid node ID: ${nodeId}` };
    }
    
    return this.request<WalletBalance>('/api/wallet/balance', { 
      address, 
      node: nodeName 
    });
  }
  
  async transfer(
    userId: string,
    fromAddress: string,
    toAddress: string,
    amount: string,
    nodeId: number,
    tokenContract?: string
  ): Promise<WalletApiResponse<TransferResult>> {
    const nodeName = NODE_NAMES[nodeId];
    if (!nodeName) {
      return { success: false, error: `Invalid node ID: ${nodeId}` };
    }
    
    const body: Record<string, unknown> = {
      from_address: fromAddress,
      to_address: toAddress,
      amount,
      node: nodeName
    };
    
    if (tokenContract) {
      body.token_contract = tokenContract;
    }
    
    return this.request<TransferResult>('/api/wallet/transfer', body);
  }
}

export const walletApiService = new WalletApiService();
