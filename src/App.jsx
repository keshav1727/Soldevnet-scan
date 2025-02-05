import React, { useState, useEffect } from "react";

import { Connection, PublicKey } from "@solana/web3.js";
import { createJupiterApiClient } from "@jup-ag/api";
import './App.css'; 

const SOLANA_MAINNET = "https://api.mainnet-beta.solana.com";


const App = () => {
  const [walletAddress, setWalletAddress] = useState(null);
  const [searchedAddress, setSearchedAddress] = useState("");
  const [tokens, setTokens] = useState([]);
  const [error, setError] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [searchedTransactions, setSearchedTransactions] = useState([]);
  const [jupiterApiClient, setJupiterApiClient] = useState(null);

  const validMintAddresses = {
    "SOL": "So11111111111111111111111111111111111111112",
    "USDC": "BXXkv6z44iWh4ujtbHn34DtakGDvLodPU7PfuJb9k59A",
    "wETH": "7vfCXTdGp2sZ8eMrhXzLxLDxF6tfAsaTepT76uXoeNsp"
};


  // Swap States
  const [inputMint, setInputMint] = useState("So11111111111111111111111111111111111111112"); // Default SOL
  const [outputMint, setOutputMint] = useState(""); // User selected output token
  const [amount, setAmount] = useState("");

  // Initialize Jupiter API Client
  useEffect(() => {
    const initJupiterClient = async () => {
        try {
            const client = createJupiterApiClient();
            setJupiterApiClient(client);
        } catch (error) {
            console.error("Error initializing Jupiter API client:", error);
        }
    };
    initJupiterClient();
}, []);


  const connectWallet = async () => {
    try {
      const { solana } = window;
      if (solana && solana.isPhantom) {
        const response = await solana.connect();
        const walletAddr = response.publicKey.toString();
        setWalletAddress(walletAddr);

        fetchTokens(walletAddr);
        const transactions = await fetchTransactions(walletAddr);
        setTransactions(transactions);
      } else {
        setError("Phantom Wallet not found! Please install it.");
      }
    } catch (err) {
      console.error("Error connecting wallet:", err);
      setError("Failed to connect wallet. Please try again.");
    }
  };

  const fetchTransactions = async (address) => {
    try {
      const connection = new Connection(SOLANA_MAINNET, "confirmed");
      const publicKey = new PublicKey(address);
  
      const signatures = await connection.getSignaturesForAddress(publicKey, { limit: 5 });
      if (!signatures || signatures.length === 0) {
        console.warn("No transactions found for this wallet address.");
        return [];
      }
  
      const transactions = await Promise.all(
        signatures.map(async (signatureInfo) => {
          const transaction = await connection.getParsedTransaction(signatureInfo.signature, "confirmed");
          return transaction;
        })
      );

      return transactions.filter((tx) => tx !== null);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      setError("Error fetching transactions. Please try again later.");
      return [];
    }
  };

  const fetchTokens = async (address) => {
    const connection = new Connection(SOLANA_MAINNET);
    const tokensList = [];

    try {
        const solBalance = await connection.getBalance(new PublicKey(address));
        if (solBalance > 0) {
            tokensList.push({ name: "SOL", mint: "So11111111111111111111111111111111111111112", amount: (solBalance / 10 ** 9).toFixed(4) });
        }

        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
            new PublicKey(address),
            {
                programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
            }
        );

        tokenAccounts.value.forEach((account) => {
            const tokenInfo = account.account.data.parsed.info;
            const tokenAmount = tokenInfo.tokenAmount.uiAmount || 0;
            const mintAddress = tokenInfo.mint;

            if (tokenAmount > 0) { // Only show tokens with a balance
                tokensList.push({
                    name: mintAddress, 
                    mint: mintAddress,
                    amount: tokenAmount.toFixed(4),
                });
            }
        });

        // Sort tokens from highest to lowest balance
        tokensList.sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount));
        setTokens(tokensList);
    } catch (err) {
        console.error("Error fetching tokens:", err);
        setError("Error fetching token balances. Please try again later.");
    }
};

  const handleSearch = async () => {
    if (searchedAddress.trim() !== "") {
      const searchedTxns = await fetchTransactions(searchedAddress);
      setSearchedTransactions(searchedTxns);
    }
  };

  const handleSwap = async () => {
    console.log("Starting Swap...");
    console.log("Input Mint:", inputMint);
    console.log("Output Mint:", outputMint);
    console.log("Amount:", amount);

    if (!walletAddress) {
        setError("Please connect your wallet first.");
        console.log("Error: Wallet not connected.");
        return;
    }
    if (!inputMint || !outputMint || !amount) {
        setError("Please fill all swap fields.");
        console.log("Error: Swap fields empty.");
        return;
    }
    if (!jupiterApiClient) {
        setError("Jupiter API client is not initialized.");
        console.log("Error: Jupiter API client missing.");
        return;
    }

    // Ensure the outputMint is a valid Solana Token Mint Address
    const validMintAddresses = {
        "SOL": "So11111111111111111111111111111111111111112",
        "USDC": "BXXkv6z44iWh4ujtbHn34DtakGDvLodPU7PfuJb9k59A",
        "wETH": "7vfCXTdGp2sZ8eMrhXzLxLDxF6tfAsaTepT76uXoeNsp"
    };

    if (!validMintAddresses[inputMint] || !validMintAddresses[outputMint]) {
        setError("Invalid token selection.");
        console.log("Error: Invalid token mint selected.");
        return;
    }

    try {
        console.log("Fetching best swap route...");

        // Convert amount correctly (adjusting for decimals)
        let decimals = 9; // Default to 9 decimals (SOL)
        if (outputMint === "USDC") decimals = 6; // USDC uses 6 decimals

        const formattedAmount = (parseFloat(amount) * Math.pow(10, decimals)).toString();

        const quoteResponse = await jupiterApiClient.quoteGet({
            inputMint: validMintAddresses[inputMint],
            outputMint: validMintAddresses[outputMint],
            amount: formattedAmount, // Corrected amount format
        });

        if (!quoteResponse.data || quoteResponse.data.length === 0) {
            setError("No available swap routes for the selected tokens.");
            console.log("Error: No swap routes found.");
            return;
        }

        const bestRoute = quoteResponse.data[0];
        console.log("Best route found:", bestRoute);
        alert(`Best swap route found! Price Impact: ${bestRoute.priceImpactPct}`);
    } catch (err) {
        console.error("Jupiter API Error:", err);
        setError("Failed to fetch swap route. Please try again.");
    }
};



  const highestToken = tokens[0]; // First token in the sorted list
  const remainingTokens = tokens.slice(1); // All other tokens

  return (
    <div className="container">
      <header className="header">Phantom Wallet Tracker</header>
      <div className="content">
        <div className="wallet-info">
          {!walletAddress ? (
            <button className="connect-btn" onClick={connectWallet}>
              Connect Wallet
            </button>
          ) : (
            <div className="wallet-address">
              <p><strong>Wallet Address:</strong></p>
              <p>{walletAddress}</p>
            </div>
          )}
        </div>

        {/* Search bar */}
        <div className="search-section">
          <input
            type="text"
            className="search-input"
            placeholder="Enter wallet address"
            value={searchedAddress}
            onChange={(e) => setSearchedAddress(e.target.value)}
          />
          <button className="search-btn" onClick={handleSearch}>Search</button>
        </div>

        {/* Display Tokens (Updated to match your preferred format) */}
        {walletAddress && (
          <div className="tokens">
            <table className="tokens-table">
              <thead>
                <tr>
                  <th>Token Name</th>
                  <th>Token Available</th>
                </tr>
              </thead>
            </table>

            {highestToken && (
              <table className="highlighted-table">
                <tbody>
                  <tr>
                    <td>{highestToken.name}</td>
                    <td>{highestToken.amount}</td>
                  </tr>
                </tbody>
              </table>
            )}

            {remainingTokens.length > 0 && (
              <table className="tokens-table">
                <tbody>
                  {remainingTokens.map((token, index) => (
                    <tr key={index}>
                      <td>{token.name}</td>
                      <td>{token.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
{walletAddress && (
    <div className="swap-section">
        <h3>Swap Tokens</h3>

        <label>Select Token to Swap From:</label>
<select value={inputMint} onChange={(e) => setInputMint(e.target.value)}>
    {tokens.map((token, index) => (
        <option key={index} value={token.mint}>
            {token.name} ({token.amount})
        </option>
    ))}
</select>

<label>Select Token to Swap To:</label>
<select value={outputMint} onChange={(e) => setOutputMint(e.target.value)}>
    {tokens.filter(token => token.mint !== inputMint).map((token, index) => (
        <option key={index} value={token.mint}>
            {token.name} ({token.amount})
        </option>
    ))}
</select>


        <label>Amount to Swap:</label>
        <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
        />

        <button className="swap-btn" onClick={handleSwap}>Find Best Swap</button>
    </div>
)}


        {/* Display Transactions for Connected Wallet */}
        {walletAddress && transactions.length > 0 && (
          <div className="transactions">
            <h3>Last 5 Transactions for {walletAddress}</h3>
            <table className="transactions-table">
              <thead>
                <tr>
                  <th>Transaction Hash</th>
                  <th>Slot</th>
                  <th>Amount (SOL)</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx, index) => (
                  <tr key={index}>
                    <td>{tx.transaction.message.recentBlockhash}</td>
                    <td>{tx.slot}</td>
                    <td>{tx.meta?.preBalances[0] && tx.meta?.postBalances[0] 
                      ? ((tx.meta.postBalances[0] - tx.meta.preBalances[0]) / 10 ** 9).toFixed(4) 
                      : "N/A"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Display Transactions for Searched Wallet */}
        {searchedTransactions.length > 0 && (
          <div className="transactions">
            <h3>Last 5 Transactions for {searchedAddress}</h3>
            <table className="transactions-table">
              <thead>
                <tr>
                  <th>Transaction Hash</th>
                  <th>Slot</th>
                  <th>Amount (SOL)</th>
                </tr>
              </thead>
              <tbody>
                {searchedTransactions.map((tx, index) => (
                  <tr key={index}>
                    <td>{tx.transaction.message.recentBlockhash}</td>
                    <td>{tx.slot}</td>
                    <td>{tx.meta?.preBalances[0] && tx.meta?.postBalances[0] 
                      ? ((tx.meta.postBalances[0] - tx.meta.preBalances[0]) / 10 ** 9).toFixed(4) 
                      : "N/A"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
};

export default App;
