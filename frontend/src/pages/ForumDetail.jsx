import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Toast from '../components/Toast.jsx';
import { api } from '../api.js';
import { useAuth } from '../state/auth.jsx';

export default function ForumDetail() {
  const { idOrSlug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [msg, setMsg] = useState(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setMsg(null);

      const key = String(idOrSlug ?? '').trim();
      const isNumeric = /^\d+$/.test(key);

      if (isNumeric) {
        setData(await api.getForumById(key));
        return;
      }

      // Backward compatibility:
      // 1) Try slug
      // 2) Fallback to name
      let resolved = null;
      try {
        resolved = await api.getForumBySlug(key);
      } catch (_) {
        resolved = await api.getForumByName(decodeURIComponent(key));
      }

      const forumId = resolved?.forum?.id ?? resolved?.id ?? resolved?.forumId;
      if (!forumId) throw new Error('Kunde inte hitta forumet.');

      // Redirect to canonical /forums/:id
      navigate(`/forums/${encodeURIComponent(forumId)}`, { replace: true });
      setData(resolved);
    } catch (e) {
      setMsg(e.message || String(e));
    }
  }

  useEffect(() => {
    load();
  }, [idOrSlug]);

  const forum = data?.forum ?? data;

  return (
    <div className="container">
      <Toast msg={msg} onClose={() => setMsg(null)} />

      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>{forum?.name ?? 'Forum'}</h1>
        <button className="btn" onClick={() => navigate('/forums')}>Tillbaka</button>
      </div>

      <p className="muted">{forum?.description ?? ''}</p>

      {user && (
        <div className="card">
          <h2>Skapa tråd</h2>
          <hr />
          <div className="grid" style={{ gap: 8 }}>
            <label className="label">Titel</label>
            <input
              className="input"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />

            <label className="label">Beskrivning</label>
            <textarea
              className="input"
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
            />

            <div className="row" style={{ gap: 10, alignItems: 'center' }}>
              <label className="label">Synlighet</label>
              <select
                className="input"
                value={visibility}
                onChange={e => setVisibility(e.target.value)}
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>

            <div className="row" style={{ gap: 10, alignItems: 'center' }}>
              <button
                className="btn"
                disabled={busy}
                onClick={async () => {
                  try {
                    setBusy(true);
                    setMsg(null);

                    if (!forum?.name) throw new Error('Forum saknar namn');

                    const t = title.trim();
                    if (t.length < 2) throw new Error('Titel måste vara minst 2 tecken');

                    await api.createThread({
                      forum: String(forum.name).trim(),
                      title: t,
                      description: description.trim() || undefined,
                      visibility,
                    });

                    setTitle('');
                    setDescription('');
                    setVisibility('public');

                    await load();
                  } catch (e) {
                    setMsg(e.message || String(e));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Skapa tråd
              </button>

              <span className="muted">Kräver inloggning.</span>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <h2>Trådar</h2>
        <hr />
        <div className="grid" style={{ gap: 10 }}>
          {(data?.threads ?? []).map(t => (
            <Link
              key={t.id}
              to={`/thread/${encodeURIComponent(t.id)}`}
              style={{ textDecoration: 'none' }}
            >
              <div className="card" style={{ padding: 12 }}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{t.title}</div>
                    <div className="muted">
                      Av {t.owner} • {new Date(t.created).toLocaleString()}
                    </div>
                  </div>
                  <span className="badge">Öppna</span>
                </div>
              </div>
            </Link>
          ))}

          {!data?.threads?.length && (
            <div className="muted">Inga trådar i detta forum ännu.</div>
          )}
        </div>
      </div>
    </div>
  );
}
