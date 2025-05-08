import React from "react";

const Search = ({
  searchedAddress,
  setSearchedAddress,
  handleSearch,
  searchedTransactions
}) => {
  return (
    <div
    style={{
      background: "#fff",
      padding: "30px 40px",
      borderRadius: "12px",
      boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center" // to center content vertically (optional)
    }}
  >
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

      {searchedTransactions.length > 0 && (
        <div className="transactions" style={{ marginTop: "20px" }}>
          <h3>Last 5 Transactions for {searchedAddress}</h3>
          <table className="transactions-table">
            <thead>
              <tr><th>Hash</th><th>Slot</th><th>Amount (SOL)</th></tr>
            </thead>
            <tbody>
              {searchedTransactions.map((tx, i) => {
                const accountKeys = tx.transaction.message.accountKeys;
                const index = accountKeys.findIndex(
                  (acc) => acc.pubkey?.toBase58?.() === searchedAddress
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
      )}
    </div>
    </div>
  );
};

export default Search;
