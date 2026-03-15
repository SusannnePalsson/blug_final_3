import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Toast from '../components/Toast.jsx';
import { api } from '../api.js';

export default function Threads() {
  const [threads, setThreads] = useState([]);
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState(null);

  async function load() {
    try {
      setMsg(null);
      setThreads(await api.getThreads());
    } catch (e) {
      setMsg(e.message);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return threads;
    return threads.filter(t => (
      String(t.title).toLowerCase().includes(s) ||
      String(t.forum).toLowerCase().includes(s) ||
      String(t.owner).toLowerCase().includes(s)
    ));
  }, [threads, q]);

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h1>Trådar</h1>
          <button onClick={load}>Uppdatera</button>
        </div>
        <Toast message={msg} />
        <input placeholder="Sök titel/forum/ägare..." value={q} onChange={e => setQ(e.target.value)} />
      </div>

      <div className="grid" style={{ gap: 12 }}>
        {filtered.map(t => (
          <Link key={t.id} to={`/thread/${encodeURIComponent(t.id)}`} style={{ textDecoration: 'none' }}>
            <div className="card">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 800 }}>{t.title}</div>
                  <div className="muted">{t.forum} • Av {t.owner} • {new Date(t.created).toLocaleString()}</div>
                </div>
                <span className="badge">Öppna</span>
              </div>
            </div>
          </Link>
        ))}
        {!filtered.length && <div className="card muted">Inga trådar hittades.</div>}
      </div>
    </div>
  );
}
