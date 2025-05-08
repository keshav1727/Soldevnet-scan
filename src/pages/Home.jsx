import React from "react";

const Home = ({ tokens, transactions, walletAddress }) => {
  const highestToken = tokens[0];
  const remainingTokens = tokens.slice(1);

  return (
    
    <>
    <div style={{
      background: "#fff",
      padding: "24px",
      borderRadius: "12px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
      height: "100%",
      overflowY: "auto"
    }}>
      <h2>Token Balances</h2>
      {tokens.length === 0 ? <p>No tokens found.</p> : (
        <>
          <table className="tokens-table">
            <thead>
              <tr><th>Token Name</th><th>Token Available</th></tr>
            </thead>
            <tbody>
              <tr style={{ backgroundColor: "#fff7d1", fontWeight: 600 }}>
                <td>{highestToken.name}</td>
                <td>{highestToken.amount}</td>
              </tr>
              {remainingTokens.map((token, idx) => (
                <tr key={idx}>
                  <td>{token.name}</td>
                  <td>{token.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <h2 style={{ marginTop: "40px" }}>Last 5 Transactions</h2>
      <table className="transactions-table">
        <thead>
          <tr><th>Hash</th><th>Slot</th><th>Amount (SOL)</th></tr>
        </thead>
        <tbody>
          {transactions.map((tx, i) => {
            const accountKeys = tx.transaction.message.accountKeys;
            const index = accountKeys.findIndex(
              (acc) => acc.pubkey?.toBase58?.() === walletAddress
            );

            let amountDisplay = "N/A";
            let color = "black";

            if (
              index !== -1 &&
              tx.meta?.preBalances?.[index] !== undefined &&
              tx.meta?.postBalances?.[index] !== undefined
            ) {
              const delta =
                (tx.meta.postBalances[index] - tx.meta.preBalances[index]) / 1e9;
              amountDisplay = `${delta >= 0 ? "+" : ""}${delta.toFixed(4)}`;
              color = delta > 0 ? "green" : delta < 0 ? "red" : "black";
            }

            return (
              <tr key={i}>
                <td>{tx.transaction.message.recentBlockhash}</td>
                <td>{tx.slot}</td>
                <td style={{ color }}>{amountDisplay}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </>
  );
};

export default Home;
