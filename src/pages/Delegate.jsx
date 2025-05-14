// pages/Delegate.jsx
import React, { useEffect, useState } from "react";
import {
  Connection,
  PublicKey,
} from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";

const SOLANA_MAINNET = "https://mainnet.helius-rpc.com/?api-key=b3cb3faa-2f54-43d8-ba4e-483089666126";

const Delegate = () => {
  const { publicKey } = useWallet();
  const [delegations, setDelegations] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchDelegatedStakes = async () => {
    if (!publicKey) return;

    setLoading(true);
    setDelegations([]);

    try {
      const connection = new Connection(SOLANA_MAINNET, "confirmed");
      const stakeAccounts = await connection.getParsedProgramAccounts(
        new PublicKey("Stake11111111111111111111111111111111111111"),
        {
          filters: [
            {
              memcmp: {
                offset: 44, // authorized.staker offset
                bytes: publicKey.toBase58(),
              },
            },
          ],
        }
      );

      const formatted = stakeAccounts
        .map(({ pubkey, account }) => {
          const info = account.data.parsed.info;
          const delegated = info?.stake?.delegation;

          if (!delegated) return null;

          return {
            stakeAccount: pubkey.toBase58(),
            delegatedAmount: delegated.stake / 1e9, // convert lamports to SOL
            validator: delegated.voter,
          };
        })
        .filter(Boolean);

      setDelegations(formatted);
    } catch (err) {
      console.error("Error fetching delegated stakes:", err);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchDelegatedStakes();
  }, [publicKey]);

  return (
    <div>
      <h2>🗳️ Delegated Stake Overview</h2>
      {!publicKey && <p>⚠️ Connect your wallet to view delegation info.</p>}

      {loading ? (
        <p>Loading delegated tokens...</p>
      ) : delegations.length === 0 ? (
        <p>No delegated tokens found.</p>
      ) : (
        <table style={{ width: "100%", marginTop: "20px", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "#ddd" }}>
              <th style={{ padding: "10px", textAlign: "left" }}>Stake Account</th>
              <th style={{ padding: "10px", textAlign: "left" }}>Validator</th>
              <th style={{ padding: "10px", textAlign: "left" }}>Amount (SOL)</th>
            </tr>
          </thead>
          <tbody>
            {delegations.map((d, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #ccc" }}>
                <td style={{ padding: "10px" }}>{d.stakeAccount}</td>
                <td style={{ padding: "10px" }}>{d.validator}</td>
                <td style={{ padding: "10px" }}>{d.delegatedAmount.toFixed(4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Delegate;
