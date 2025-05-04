import React, { useState, useEffect } from "react";
import {
  Connection,
  PublicKey,
  Transaction
} from "@solana/web3.js";
import { createJupiterApiClient } from "@jup-ag/api";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

import "./App.css";

const SOLANA_MAINNET = "https://mainnet.helius-rpc.com/?api-key=b3cb3faa-2f54-43d8-ba4e-483089666126";

const validMintAddresses = {
  "SOL": "So11111111111111111111111111111111111111112",
  "USDC": "BXXkv6z44iWh4ujtbHn34DtakGDvLodPU7PfuJb9k59A",
  "wETH": "7vfCXTdGp2sZ8eMrhXzLxLDxF6tfAsaTepT76uXoeNsp"
};

const App = () => {
  const { publicKey, signTransaction } = useWallet();
  const [walletAddress, setWalletAddress] = useState(null);
  const [searchedAddress, setSearchedAddress] = useState("");
  const [tokens, setTokens] = useState([]);
  const [error, setError] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [searchedTransactions, setSearchedTransactions] = useState([]);
  const [jupiterApiClient, setJupiterApiClient] = useState(null);
  const [inputMint, setInputMint] = useState(validMintAddresses["SOL"]);
  const [outputMint, setOutputMint] = useState("");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (!publicKey) {
      // Reset sab states
      setWalletAddress(null);
      setTokens([]);
      setTransactions([]);
      setSearchedTransactions([]);
      setSearchedAddress("");
      setInputMint(validMintAddresses["SOL"]);
      setOutputMint("");
      setAmount("");
      setError("");
  
      // Page scroll back to top
      window.scrollTo(0, 0);
    }
  }, [publicKey]);
  

  // Setup Jupiter
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

  // Set wallet address and fetch tokens
  useEffect(() => {
    if (publicKey) {
      const addr = publicKey.toString();
      setWalletAddress(addr);
      fetchTokens(addr);
      fetchTransactions(addr).then(setTransactions);
    }
  }, [publicKey]);

  const fetchTransactions = async (address) => {
    try {
      const connection = new Connection(SOLANA_MAINNET, "confirmed");
      const publicKey = new PublicKey(address);
      const signatures = await connection.getSignaturesForAddress(publicKey, { limit: 5 });

      if (!signatures || signatures.length === 0) return [];

      const txs = await Promise.all(
        signatures.map(async ({ signature }) =>
          await connection.getParsedTransaction(signature, "confirmed")
        )
      );

      return txs.filter(Boolean);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      setError("Error fetching transactions.");
      return [];
    }
  };

  const fetchTokens = async (address) => {
    const connection = new Connection(SOLANA_MAINNET);
    const tokensList = [];
    const mintToName = {
      "So11111111111111111111111111111111111111112": "SOL",
      "BXXkv6z44iWh4ujtbHn34DtakGDvLodPU7PfuJb9k59A": "USDC",
      "7vfCXTdGp2sZ8eMrhXzLxLDxF6tfAsaTepT76uXoeNsp": "wETH",
    };

    try {
      const solBalance = await connection.getBalance(new PublicKey(address));
      tokensList.push({
        name: "SOL",
        mint: validMintAddresses["SOL"],
        amount: (solBalance / 1e9).toFixed(4),
      });

      const response = await connection.getParsedTokenAccountsByOwner(
        new PublicKey(address),
        { programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA") }
      );

      const fetchedMints = [];

      response.value.forEach((account) => {
        const info = account.account.data.parsed.info;
        const mint = info.mint;
        const amount = info.tokenAmount.uiAmount || 0;

        tokensList.push({
          name: mintToName[mint] || mint,
          mint,
          amount: amount.toFixed(4),
        });

        fetchedMints.push(mint);
      });

      for (const [mint, name] of Object.entries(mintToName)) {
        if (!fetchedMints.includes(mint) && mint !== validMintAddresses["SOL"]) {
          tokensList.push({ name, mint, amount: "0.0000" });
        }
      }

      tokensList.sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount));
      setTokens(tokensList);
    } catch (err) {
      console.error("Error fetching tokens:", err);
      setError("Error fetching token balances.");
    }
  };

  const handleSearch = async () => {
    if (searchedAddress.trim()) {
      const txs = await fetchTransactions(searchedAddress);
      setSearchedTransactions(txs);
    }
  };

  const handleSwap = async () => {
    if (!walletAddress) return setError("Connect wallet first.");
    if (!inputMint || !outputMint || !amount) return setError("All fields are required.");
    if (!jupiterApiClient) return setError("Jupiter API not ready.");

    try {
      const connection = new Connection(SOLANA_MAINNET);
      let decimals = 9;

      if (inputMint !== validMintAddresses["SOL"]) {
        const tokenInfo = await connection.getParsedAccountInfo(new PublicKey(inputMint));
        const tokenData = tokenInfo.value?.data?.parsed?.info;
        decimals = tokenData?.decimals || 9;
      }

      const formattedAmount = (parseFloat(amount) * Math.pow(10, decimals)).toString();
      const quote = await jupiterApiClient.quoteGet({
        inputMint,
        outputMint,
        amount: formattedAmount,
        slippage: 1,
      });

      const routes = Array.isArray(quote) ? quote : quote.data;
      if (!routes?.length) return setError("No route found.");

      const bestRoute = routes[0];
      const { swapTransaction } = await jupiterApiClient.swapPost({
        route: bestRoute,
        userPublicKey: walletAddress,
      });

      const tx = Transaction.from(Buffer.from(swapTransaction, "base64"));
      tx.feePayer = new PublicKey(walletAddress);
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      const signedTx = await signTransaction(tx);
      const txid = await connection.sendRawTransaction(signedTx.serialize());
      await connection.confirmTransaction(txid, "confirmed");

      alert(`Swap successful! Tx ID: ${txid}`);
    } catch (error) {
      console.error("Swap failed:", error);
      setError("Swap failed. Try again.");
    }
  };

  const highestToken = tokens[0];
  const remainingTokens = tokens.slice(1);

  return (
    <div className="container">
      <header className="header">Solana Wallet Tracker (Phantom + Backpack)</header>
      <div className="content">
        <div className="wallet-info">
          <WalletMultiButton />
          {walletAddress && (
            <div className="wallet-address">
              <p><strong>Wallet Address:</strong></p>
              <p>{walletAddress}</p>
            </div>
          )}
        </div>

        <div className="search-section">
          <h3>Search for Last 5 Transactions (by Address)</h3>
          <input
            type="text"
            className="search-input"
            placeholder="Enter wallet address"
            value={searchedAddress}
            onChange={(e) => setSearchedAddress(e.target.value)}
          />
          <button className="search-btn" onClick={handleSearch}>Search</button>
        </div>

        {walletAddress && (
          <div className="tokens">
            <table className="tokens-table">
              <thead>
                <tr><th>Token Name</th><th>Token Available</th></tr>
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
                  {remainingTokens.map((token, idx) => (
                    <tr key={idx}>
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
            <label>Swap From:</label>
            <select value={inputMint} onChange={(e) => setInputMint(e.target.value)}>
              {tokens.map((token, i) => (
                <option key={i} value={token.mint}>
                  {token.name} ({token.amount})
                </option>
              ))}
            </select>

            <label>Swap To:</label>
            <select value={outputMint} onChange={(e) => setOutputMint(e.target.value)}>
              {tokens.filter(t => t.mint !== inputMint).map((token, i) => (
                <option key={i} value={token.mint}>
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

        {walletAddress && transactions.length > 0 && (
          <div className="transactions">
            <h3>Last 5 Transactions for {walletAddress}</h3>
            <table className="transactions-table">
              <thead>
                <tr><th>Hash</th><th>Slot</th><th>Amount (SOL)</th></tr>
              </thead>
              <tbody>
                {transactions.map((tx, i) => (
                  <tr key={i}>
                    <td>{tx.transaction.message.recentBlockhash}</td>
                    <td>{tx.slot}</td>
                    <td>
                      {tx.meta?.preBalances[0] && tx.meta?.postBalances[0]
                        ? ((tx.meta.postBalances[0] - tx.meta.preBalances[0]) / 1e9).toFixed(4)
                        : "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {searchedTransactions.length > 0 && (
          <div className="transactions">
            <h3>Last 5 Transactions for {searchedAddress}</h3>
            <table className="transactions-table">
              <thead>
                <tr><th>Hash</th><th>Slot</th><th>Amount (SOL)</th></tr>
              </thead>
              <tbody>
                {searchedTransactions.map((tx, i) => (
                  <tr key={i}>
                    <td>{tx.transaction.message.recentBlockhash}</td>
                    <td>{tx.slot}</td>
                    <td>
                      {tx.meta?.preBalances[0] && tx.meta?.postBalances[0]
                        ? ((tx.meta.postBalances[0] - tx.meta.preBalances[0]) / 1e9).toFixed(4)
                        : "N/A"}
                    </td>
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
