// src/App.js
import React, { useState, useEffect } from "react";
import { ethers } from "ethers";

function App() {
  const [tab, setTab] = useState("wallet");
  const [wallet, setWallet] = useState(null);
  const [balance, setBalance] = useState("0");
  const [address, setAddress] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [provider, setProvider] = useState(null);
  const [rpcUrl, setRpcUrl] = useState(
    localStorage.getItem("cygnusRpc") || "http://127.0.0.1:8545"
  );

  useEffect(() => {
    setProvider(new ethers.JsonRpcProvider(rpcUrl));
  }, [rpcUrl]);

  const createWallet = async () => {
    const w = ethers.Wallet.createRandom();
    setWallet(w);
    setAddress(w.address);
    setPrivateKey(w.privateKey);
    alert("⚠️ Please save your private key somewhere safe:\n\n" + w.privateKey);
  };

  const importWallet = async (pk) => {
    try {
      const w = new ethers.Wallet(pk, provider);
      setWallet(w);
      setAddress(w.address);
      setPrivateKey(pk);
      alert("✅ Wallet imported. Keep your private key safe!");
    } catch (e) {
      alert("❌ Invalid private key");
    }
  };

  const refreshBalance = async () => {
    if (wallet && provider) {
      const bal = await provider.getBalance(wallet.address);
      setBalance(ethers.formatEther(bal));
    }
  };

  const copyPrivateKey = () => {
    navigator.clipboard.writeText(privateKey);
    alert("✅ Private key copied to clipboard!");
  };

  useEffect(() => {
    const savedPk = localStorage.getItem("cygnusWallet");
    if (savedPk) importWallet(savedPk);
  }, []);

  useEffect(() => {
    refreshBalance();
  }, [wallet, provider]);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6">
      <h1 className="text-3xl font-bold mb-6 text-center">🚀 Cygnus Wallet</h1>

      {/* Tabs */}
      <div className="flex flex-wrap justify-center space-x-4 mb-6">
        {["wallet", "send", "mining", "peers", "settings"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-6 py-3 rounded-lg font-semibold transition min-w-[100px] ${
              tab === t
                ? "bg-indigo-600 text-white shadow-lg"
                : "bg-gray-700 hover:bg-gray-600"
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="w-full max-w-md flex flex-col items-center">
        {/* Wallet Tab */}
        {tab === "wallet" && (
          <div className="bg-gray-800 p-6 rounded-xl shadow-md space-y-4 w-full flex flex-col items-center">
            {wallet ? (
              <>
                <p className="text-center">
                  <b>Address:</b>{" "}
                  <span className="text-indigo-400 break-all">{address}</span>
                </p>
                <p className="text-center">
                  <b>Balance:</b> {balance} <span className="text-green-400">CNS</span>
                </p>
                <p className="text-sm text-gray-400 text-center">
                  ⚠️ Keep your private key safe!
                </p>
                <input
                  type="text"
                  readOnly
                  value={privateKey}
                  className="w-full p-2 rounded bg-gray-700 text-white text-center break-all"
                />
                <button
                  onClick={copyPrivateKey}
                  className="bg-indigo-600 hover:bg-indigo-500 py-2 px-4 rounded-lg mt-2"
                >
                  Copy Private Key
                </button>
                <button
                  onClick={refreshBalance}
                  className="bg-green-600 hover:bg-green-500 py-2 px-4 rounded-lg mt-2"
                >
                  Refresh Balance
                </button>
              </>
            ) : (
              <div className="space-y-4 flex flex-col items-center w-full">
                <button
                  onClick={createWallet}
                  className="w-full bg-green-600 hover:bg-green-500 py-2 rounded-lg"
                >
                  Create Wallet
                </button>
                <button
                  onClick={() => {
                    const pk = prompt("Enter private key");
                    if (pk) importWallet(pk);
                  }}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 py-2 rounded-lg"
                >
                  Import Wallet
                </button>
              </div>
            )}
          </div>
        )}

        {/* Send Tab */}
        {tab === "send" && wallet && (
          <div className="bg-gray-800 p-6 rounded-xl shadow-md w-full flex flex-col items-center">
            <SendTx wallet={wallet} provider={provider} />
          </div>
        )}

        {/* Mining Tab */}
        {tab === "mining" && (
          <div className="bg-gray-800 p-6 rounded-xl shadow-md w-full flex flex-col items-center">
            <Mining rpcUrl={rpcUrl} />
          </div>
        )}

        {/* Peers Tab */}
        {tab === "peers" && (
          <div className="bg-gray-800 p-6 rounded-xl shadow-md w-full flex flex-col items-center">
            <Peers rpcUrl={rpcUrl} />
          </div>
        )}

        {/* Settings Tab */}
        {tab === "settings" && (
          <div className="bg-gray-800 p-6 rounded-xl shadow-md w-full flex flex-col items-center">
            <Settings rpcUrl={rpcUrl} setRpcUrl={setRpcUrl} />
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------- Send Transaction ----------------
function SendTx({ wallet, provider }) {
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("");

  const send = async () => {
    try {
      const tx = await wallet.sendTransaction({
        to,
        value: ethers.parseEther(amount),
      });
      setStatus(`📤 Tx sent: ${tx.hash}`);
      await tx.wait();
      setStatus(`✅ Confirmed: ${tx.hash}`);
    } catch (e) {
      setStatus("❌ Error: " + e.message);
    }
  };

  return (
    <div className="space-y-4 flex flex-col items-center w-full">
      <h2 className="text-xl font-bold text-center mb-2">Send Transaction</h2>
      <input
        placeholder="Recipient"
        value={to}
        onChange={(e) => setTo(e.target.value)}
        className="w-full p-2 rounded bg-gray-700 text-white text-center"
      />
      <input
        placeholder="Amount (CNS)"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="w-full p-2 rounded bg-gray-700 text-white text-center"
      />
      <button
        onClick={send}
        className="w-full bg-indigo-600 hover:bg-indigo-500 py-2 rounded-lg"
      >
        Send
      </button>
      {status && <p className="text-sm mt-2 text-center">{status}</p>}
    </div>
  );
}

// ---------------- Mining ----------------
function Mining({ rpcUrl }) {
  const [mining, setMining] = useState(false);
  const [hashrate, setHashrate] = useState("0");

  const toggleMining = async (start) => {
    const method = start ? "miner_start" : "miner_stop";
    await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method,
        params: start ? [1] : [],
        id: 1,
      }),
    });
    setMining(start);
  };

  const poll = async () => {
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_hashrate",
        params: [],
        id: 1,
      }),
    });
    const data = await res.json();
    setHashrate(parseInt(data.result, 16) / 1000000 + " MH/s");
  };

  useEffect(() => {
    const int = setInterval(poll, 5000);
    return () => clearInterval(int);
  }, []);

  return (
    <div className="space-y-3 flex flex-col items-center w-full">
      <h2 className="text-xl font-bold text-center">Mining Control</h2>
      <p>Mining: {mining ? "⛏️ Active" : "❌ Stopped"}</p>
      <p>Hashrate: {hashrate}</p>
      <div className="flex space-x-3 w-full">
        <button
          onClick={() => toggleMining(true)}
          className="flex-1 bg-green-600 hover:bg-green-500 py-2 rounded-lg"
        >
          Start
        </button>
        <button
          onClick={() => toggleMining(false)}
          className="flex-1 bg-red-600 hover:bg-red-500 py-2 rounded-lg"
        >
          Stop
        </button>
      </div>
    </div>
  );
}

// ---------------- Peers ----------------
function Peers({ rpcUrl }) {
  const [peers, setPeers] = useState([]);
  const [status, setStatus] = useState("");

  const fetchPeers = async () => {
    try {
      const res = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "admin_peers",
          params: [],
          id: 1,
        }),
      });
      const data = await res.json();
      setPeers(data.result || []);
    } catch (e) {
      setStatus("❌ Error fetching peers: " + e.message);
    }
  };

  useEffect(() => {
    fetchPeers();
    const interval = setInterval(fetchPeers, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-3 flex flex-col items-center w-full">
      <h2 className="text-xl font-bold text-center">🌐 Connected Peers</h2>
      {status && <p className="text-red-400">{status}</p>}
      {peers.length === 0 && <p className="text-gray-400">No peers connected</p>}
      <ul className="list-disc list-inside max-h-64 overflow-y-auto bg-gray-800 p-3 rounded-lg w-full">
        {peers.map((p, i) => (
          <li key={i} className="text-sm break-all text-center">
            {p?.id || p?.name || JSON.stringify(p)}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------- Settings ----------------
function Settings({ rpcUrl, setRpcUrl }) {
  const [tempUrl, setTempUrl] = useState(rpcUrl);

  const saveRpc = () => {
    localStorage.setItem("cygnusRpc", tempUrl);
    setRpcUrl(tempUrl);
    alert("✅ RPC URL saved: " + tempUrl);
  };

  return (
    <div className="space-y-4 flex flex-col items-center w-full">
      <h2 className="text-xl font-bold text-center">⚙️ Settings</h2>
      <p className="text-center">Current RPC: {rpcUrl}</p>
      <input
        value={tempUrl}
        onChange={(e) => setTempUrl(e.target.value)}
        placeholder="Enter RPC URL"
        className="w-full p-2 rounded bg-gray-700 text-white text-center"
      />
      <button
        onClick={saveRpc}
        className="w-full bg-indigo-600 hover:bg-indigo-500 py-2 rounded-lg"
      >
        Save
      </button>
    </div>
  );
}

export default App;
