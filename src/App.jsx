import React, { useState, useEffect } from "react";
import {
  Connection,
  PublicKey,
  Transaction
} from "@solana/web3.js";
import { createJupiterApiClient } from "@jup-ag/api";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

import Home from "./pages/Home";
import Swap from "./pages/Swap";
import Search from "./pages/Search";

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
  const [activeTab, setActiveTab] = useState("home");

  



  useEffect(() => {
    if (!publicKey) {
      setWalletAddress(null);
      setTokens([]);
      setTransactions([]);
      setSearchedTransactions([]);
      setSearchedAddress("");
      setInputMint(validMintAddresses["SOL"]);
      setOutputMint("");
      setAmount("");
      setError("");
      window.scrollTo(0, 0);
    }
  }, [publicKey]);

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

  useEffect(() => {
    if (publicKey) {
      const addr = publicKey.toString();
      setWalletAddress(addr);
      fetchTokens(addr);
      fetchTransactions(addr).then(setTransactions);
    }
  }, [publicKey]);

  useEffect(() => {
    setError(""); // clear error when changing tabs
  }, [activeTab]);

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

  return (
    <div className="container">
      <header className="header">Solana Wallet Tracker (Phantom + Backpack)</header>

      {!walletAddress ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            position: "relative",
            zIndex: 10,
            marginBottom: "20px"
          }}
        >
          <WalletMultiButton />
        </div>
      ) : (
        <div style={{ display: "flex", height: "100vh" }}>
          {/* Sidebar */}
          <div
            style={{
              width: "240px",
              minWidth: "240px",
              background: "#1e1e2f",
              color: "#fff",
              padding: "30px 20px",
              display: "flex",
              flexDirection: "column",
              gap: "25px",
              height: "100vh",
              position: "fixed",
              top: 0,
              left: 0,
              zIndex: 1000,
              boxSizing: "border-box"
            }}
          >
            {/* Wallet Button on Top */}
            <div style={{ position: "relative", zIndex: 999 }}>
              <WalletMultiButton />
            </div>

            {/* Tabs */}
            {["home", "swap", "search"].map((tab) => (
              <div
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: "12px 16px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  backgroundColor: activeTab === tab ? "#3f3f5e" : "transparent",
                  fontWeight: activeTab === tab ? "bold" : "normal",
                  transition: "background 0.3s"
                }}
              >
                {{
                  home: "🏠 Home",
                  swap: "🔁 Swap",
                  search: "🔍 Search Txns"
                }[tab]}
              </div>
            ))}
          </div>

          {/* Content Area */}
          <div
            style={{
              flex: 1,
              marginLeft: "240px",
              height: "100vh",
              overflowY: "auto",
              backgroundColor: "#f4f6f8",
              padding: "40px",
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column"
            }}
          >
            {/* Wallet address display */}
            <p><strong>Wallet Address:</strong> {walletAddress}</p>

            {/* Tabs */}
            {activeTab === "home" && (
              <Home tokens={tokens} transactions={transactions} walletAddress={walletAddress} />
            )}

            {activeTab === "swap" && (
              <Swap
                tokens={tokens}
                inputMint={inputMint}
                outputMint={outputMint}
                amount={amount}
                setInputMint={setInputMint}
                setOutputMint={setOutputMint}
                setAmount={setAmount}
                handleSwap={handleSwap}
                error={error}
                setError={setError}
              />
            )}

            {activeTab === "search" && (
              <Search
                searchedAddress={searchedAddress}
                setSearchedAddress={setSearchedAddress}
                handleSearch={handleSearch}
                searchedTransactions={searchedTransactions}
              />
            )}
          </div>
        </div>
      )}
      
    </div>
  );
};

export default App;
