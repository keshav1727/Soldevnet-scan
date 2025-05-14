// pages/Swap.jsx
import React from "react";

const Swap = ({
  tokens,
  inputMint,
  outputMint,
  amount,
  setInputMint,
  setOutputMint,
  setAmount,
  handleSwap,
  error
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
        justifyContent: "center"
      }}
    >
      <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "24px" }}>
        🔁 Swap Tokens
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "20px",
          marginBottom: "20px"
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <label style={{ fontWeight: "500", marginBottom: "6px" }}>Swap From:</label>
          <select
            value={inputMint}
            onChange={(e) => setInputMint(e.target.value)}
            style={{
              padding: "10px",
              borderRadius: "8px",
              border: "1px solid #ccc"
            }}
          >
            {tokens.map((token, i) => (
              <option key={i} value={token.mint}>
                {token.name} ({token.amount})
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <label style={{ fontWeight: "500", marginBottom: "6px" }}>Swap To:</label>
          <select
            value={outputMint}
            onChange={(e) => setOutputMint(e.target.value)}
            style={{
              padding: "10px",
              borderRadius: "8px",
              border: "1px solid #ccc"
            }}
          >
            <option value="">-- Select Token --</option>
            {tokens
              .filter((token) => token.mint !== inputMint)
              .map((token, i) => (
                <option key={i} value={token.mint}>
                  {token.name} ({token.amount})
                </option>
              ))}
          </select>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", maxWidth: "300px" }}>
        <label style={{ fontWeight: "500", marginBottom: "6px" }}>Amount to Swap:</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="e.g., 1.5"
          style={{
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid #ccc",
            marginBottom: "16px"
          }}
        />

        {/* Error Message */}
        {error && (
          <div style={{ color: "red", marginBottom: "12px", fontWeight: "500" }}>
            {error}
          </div>
        )}

        <button
          onClick={handleSwap}
          style={{
            padding: "12px 20px",
            background: "#4a5cf0",
            color: "#fff",
            borderRadius: "8px",
            border: "none",
            fontWeight: "600",
            cursor: "pointer",
            transition: "background 0.3s"
          }}
        >
          Find Best Swap
        </button>
      </div>
    </div>
  );
};

export default Swap;
