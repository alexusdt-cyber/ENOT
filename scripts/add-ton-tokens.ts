import mysql from "mysql2/promise";
import crypto from "crypto";

async function addTonTokens() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);
  
  try {
    // Get TON network
    const [networks]: any = await connection.query(
      `SELECT id FROM crypto_networks WHERE code = 'TON'`
    );
    
    if (!networks || networks.length === 0) {
      console.log("TON network not found");
      return;
    }
    
    const tonNetworkId = networks[0].id;
    console.log("Found TON network:", tonNetworkId);
    
    // Check existing coins
    const [existingCoins]: any = await connection.query(
      `SELECT symbol FROM crypto_coins WHERE network_id = ?`,
      [tonNetworkId]
    );
    
    const existingSymbols = existingCoins.map((c: any) => c.symbol);
    console.log("Existing TON coins:", existingSymbols);
    
    // Tokens to add
    const tokensToAdd = [
      { symbol: 'USDT', name: 'Tether USD', decimals: 6, contract: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs' },
      { symbol: 'NOT', name: 'Notcoin', decimals: 9, contract: 'EQAvlWFDxGF2lXm67y4yzC17wYKD9A0guwPkMs1gOsM__NOT' },
      { symbol: 'DOGS', name: 'Dogs', decimals: 9, contract: 'EQCvxJy4eG8hyHBFsZ7eePxrRsUQSFE_jpptRAYBmcG_DOGS' },
    ];
    
    for (const token of tokensToAdd) {
      if (existingSymbols.includes(token.symbol)) {
        console.log(`${token.symbol} already exists, skipping`);
        continue;
      }
      
      const coinId = crypto.randomUUID();
      await connection.query(`
        INSERT INTO crypto_coins (id, network_id, symbol, name, decimals, contract_address, is_native)
        VALUES (?, ?, ?, ?, ?, ?, FALSE)
      `, [coinId, tonNetworkId, token.symbol, token.name, token.decimals, token.contract]);
      
      console.log(`Added ${token.symbol} (${token.name})`);
    }
    
    console.log("Done!");
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await connection.end();
  }
}

addTonTokens();
