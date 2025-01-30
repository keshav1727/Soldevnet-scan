import React, { useState } from "react";
import { Connection, PublicKey } from "@solana/web3.js";
import './App.css'; 

const App = () => {
  const [walletAddress, setWalletAddress] = useState(null);
  const [searchedAddress, setSearchedAddress] = useState("");
  const [tokens, setTokens] = useState([]);
  const [error, setError] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [searchedTransactions, setSearchedTransactions] = useState([]);

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
      const connection = new Connection("https://api.devnet.solana.com", "confirmed");
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
    const connection = new Connection("https://api.devnet.solana.com");
    const tokensList = [];

    try {
      const solBalance = await connection.getBalance(new PublicKey(address));
      tokensList.push({ name: "SOL", amount: (solBalance / 10 ** 9).toFixed(4) });

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

        tokensList.push({
          name: mintAddress, 
          amount: tokenAmount.toFixed(4),
        });
      });

      const knownTokens = ["SOL", "ETH", "USDC", "Polygon", "BNB"];
      knownTokens.forEach((token) => {
        if (!tokensList.find((t) => t.name === token)) {
          tokensList.push({ name: token, amount: "0.0000" });
        }
      });

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
