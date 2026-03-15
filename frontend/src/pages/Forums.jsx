import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Toast from '../components/Toast.jsx';
import { api } from '../api.js';
import { useAuth } from '../state/auth.jsx';

export default function Forums() {
  const { user } = useAuth();
  const [forums, setForums] = useState([]);
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState(null);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setMsg(null);
      setForums(await api.getForums());
    } catch (e) {
      setMsg(e.message);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return forums;
    return forums.filter(f => String(f.name).toLowerCase().includes(s));
  }, [forums, q]);

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h1>Forum</h1>
          <button onClick={load} disabled={busy}>Uppdatera</button>
        </div>
        <Toast message={msg} />

        <div className="grid" style={{ gap: 10 }}>
          <input placeholder="Sök forum..." value={q} onChange={e => setQ(e.target.value)} />

          {user && (
            <div className="grid grid-2">
              <div className="card" style={{ padding: 12 }}>
                <h3>Skapa forum</h3>
                <div className="row">
                  <div style={{ flex: 1 }}>
                    <input placeholder="Forum-namn" value={newName} onChange={e => setNewName(e.target.value)} />
                  </div>
                  <button
                    disabled={busy || newName.trim().length < 2}
                    onClick={async () => {
                      setBusy(true);
                      setMsg(null);
                      try {
                        await api.createForum(newName.trim());
                        setNewName('');
                        await load();
                      } catch (e) {
                        setMsg(e.message);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >Skapa</button>
                </div>
                <div className="muted" style={{ marginTop: 6 }}>Kräver inloggning.</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid" style={{ gap: 12 }}>
        {filtered.map(f => (
          <Link key={f.id} to={`/forums/${f.id}`} style={{ textDecoration: 'none' }}>
            <div className="card">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 18 }}>{f.name}</div>
                  <div className="muted">Trådar: {f.amount_of_threads}</div>
                </div>
                <span className="badge">Öppna</span>
              </div>
            </div>
          </Link>
        ))}
        {!filtered.length && (
          <div className="card muted">Inga forum hittades.</div>
        )}
      </div>
    </div>
  );
}
