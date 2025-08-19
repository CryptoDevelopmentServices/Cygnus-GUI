/* renderer.jsx — Cygnus Node Monitor (Electron + React, no bundler required) */
const { useEffect, useState } = React;

/* ---------- Config & helpers ---------- */
const DEFAULT_RPC = localStorage.getItem('cygnus_rpc') || 'http://127.0.0.1:6228';
const DEFAULT_ADDR = localStorage.getItem('cygnus_addr') || '';

async function rpc(rpcUrl, method, params = []) {
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: Math.floor(Math.random() * 1e9), method, params }),
  });
  if (!res.ok) throw new Error(`RPC HTTP ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error.message || 'RPC Error');
  return json.result;
}

function hexToInt(h) {
  if (h == null) return 0;
  try { return parseInt(h, 16) || 0; } catch { return 0; }
}

function formatUnitsHex(weiHex, decimals = 18, maxFrac = 6) {
  try {
    const wei = BigInt(weiHex);
    const base = 10n ** BigInt(decimals);
    const whole = wei / base;
    const frac = wei % base;
    let fracStr = frac.toString().padStart(decimals, '0').replace(/0+$/, '');
    if (fracStr.length > maxFrac) fracStr = fracStr.slice(0, maxFrac);
    return fracStr ? `${whole.toString()}.${fracStr}` : whole.toString();
  } catch {
    return '0';
  }
}

function useInterval(fn, ms) {
  useEffect(() => {
    const t = setInterval(fn, ms);
    return () => clearInterval(t);
  }, [fn, ms]);
}

/* ---------- Cards ---------- */
function StatusCard({ rpcUrl }) {
  const [state, setState] = useState({
    online: false,
    block: '-',
    peers: 0,
    syncing: false,
    mining: false,
    hashrate: 0,
  });

  const refresh = async () => {
    try {
      const [bn, peerHex, mining, hashrateHex, syncing] = await Promise.all([
        rpc(rpcUrl, 'eth_blockNumber'),
        rpc(rpcUrl, 'net_peerCount'),
        rpc(rpcUrl, 'eth_mining'),
        rpc(rpcUrl, 'eth_hashrate'),
        rpc(rpcUrl, 'eth_syncing').catch(() => false),
      ]);
      setState({
        online: true,
        block: hexToInt(bn).toLocaleString(),
        peers: hexToInt(peerHex),
        syncing: !!(syncing && syncing !== false),
        mining: !!mining,
        hashrate: hexToInt(hashrateHex),
      });
    } catch {
      setState((s) => ({ ...s, online: false, block: '-', peers: 0, hashrate: 0, mining: false, syncing: false }));
    }
  };

  useEffect(() => { refresh(); }, [rpcUrl]);
  useInterval(refresh, 2500);

  const dotClass = state.online ? 'ok' : 'bad';

  return (
    <div className="card col-8">
      <h3>Node Status</h3>
      <div className="kv">
        <div className="item"><div className="key">Online</div><div className="val"><span className={`status-dot ${dotClass}`}></span>{state.online ? 'Online' : 'Offline'}</div></div>
        <div className="item"><div className="key">Block</div><div className="val">{state.block}</div></div>
        <div className="item"><div className="key">Peers</div><div className="val">{state.peers}</div></div>
        <div className="item"><div className="key">Syncing</div><div className="val">{state.syncing ? 'Yes' : 'No'}</div></div>
        <div className="item"><div className="key">Mining</div><div className="val">{state.mining ? 'Yes' : 'No'}</div></div>
        <div className="item"><div className="key">Hashrate</div><div className="val">{state.hashrate ? `${(state.hashrate / 1e6).toFixed(2)} MH/s` : '—'}</div></div>
      </div>
    </div>
  );
}

function WalletCard({ rpcUrl }) {
  const [addr, setAddr] = useState(DEFAULT_ADDR);
  const [bal, setBal] = useState('—');
  const [err, setErr] = useState('');

  const load = async () => {
    setErr('');
    if (!addr || !addr.startsWith('0x') || addr.length < 10) { setBal('—'); return; }
    try {
      const wei = await rpc(rpcUrl, 'eth_getBalance', [addr, 'latest']);
      setBal(`${formatUnitsHex(wei, 18, 6)} CNS`);
      localStorage.setItem('cygnus_addr', addr);
    } catch (e) {
      setErr('Failed to load balance (check RPC and address)');
      setBal('—');
    }
  };

  useEffect(() => { load(); }, [rpcUrl]);
  useInterval(load, 5000);

  return (
    <div className="card col-4">
      <h3>Wallet Balance</h3>
      <input className="input" placeholder="0x... address" value={addr} onChange={e => setAddr(e.target.value.trim())} />
      <div style={{ height: 8 }} />
      <div className="small">Auto-refreshing every 5s</div>
      <div className="val" style={{ marginTop: 6, fontSize: 22 }}>{bal}</div>
      {err && <div className="small" style={{ color: '#ff6b6b', marginTop: 6 }}>{err}</div>}
      <div style={{ height: 10 }} />
      <button className="btn" onClick={load}>Refresh</button>
    </div>
  );
}

function MiningControls({ rpcUrl }) {
  const [running, setRunning] = useState(false);
  const [threads, setThreads] = useState(1);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const check = async () => {
    try {
      const m = await rpc(rpcUrl, 'eth_mining');
      setRunning(!!m);
    } catch {
      setRunning(false);
    }
  };

  useEffect(() => { check(); }, [rpcUrl]);

  const start = async () => {
    setBusy(true); setMsg('');
    try {
      await rpc(rpcUrl, 'miner_start', [Math.max(1, Number(threads) || 1)]);
      setRunning(true);
      setMsg('Mining started');
    } catch (e) {
      setMsg('Failed to start mining. Ensure geth HTTP has the "miner" API enabled.');
    } finally { setBusy(false); }
  };

  const stop = async () => {
    setBusy(true); setMsg('');
    try {
      await rpc(rpcUrl, 'miner_stop');
      setRunning(false);
      setMsg('Mining stopped');
    } catch (e) {
      setMsg('Failed to stop mining.');
    } finally { setBusy(false); }
  };

  return (
    <div className="card row">
      <h3>Mining</h3>
      <div className="flex">
        <div className="small">Threads</div>
        <input
          className="input"
          style={{ maxWidth: 90 }}
          type="number"
          min="1"
          value={threads}
          onChange={e => setThreads(e.target.value)}
        />
        <button className="btn" disabled={busy || running} onClick={start}>Start</button>
        <button className="btn" disabled={busy || !running} onClick={stop}>Stop</button>
        <div className="small">Status: {running ? 'Running' : 'Stopped'}</div>
      </div>
      {msg && <div className="small" style={{ marginTop: 8 }}>{msg}</div>}
    </div>
  );
}

function Settings({ rpcUrl, setRpcUrl }) {
  const [temp, setTemp] = useState(rpcUrl);
  const save = () => {
    const v = temp.trim();
    setRpcUrl(v);
    localStorage.setItem('cygnus_rpc', v);
  };
  return (
    <div className="card row">
      <h3>Settings</h3>
      <div className="flex">
        <div className="small">RPC URL</div>
        <input className="input" value={temp} onChange={e => setTemp(e.target.value)} style={{ maxWidth: 420 }} />
        <button className="btn" onClick={save}>Save</button>
        <div className="small">Example: http://127.0.0.1:6228</div>
      </div>
    </div>
  );
}

/* ---------- App ---------- */
function App() {
  const [rpcUrl, setRpcUrl] = useState(DEFAULT_RPC);

  return (
    <>
      <div className="header">
        <h1>🌌 Cygnus Node Monitor</h1>
        <div className="small">Connected to: {rpcUrl}</div>
      </div>
      <div className="container">
        <StatusCard rpcUrl={rpcUrl} />
        <WalletCard rpcUrl={rpcUrl} />
        <MiningControls rpcUrl={rpcUrl} />
        <Settings rpcUrl={rpcUrl} setRpcUrl={setRpcUrl} />
      </div>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
