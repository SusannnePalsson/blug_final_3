import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Toast from '../components/Toast.jsx';
import { api } from '../api.js';
import { useAuth } from '../state/auth.jsx';

export default function ThreadView() {
  const { idOrTitle } = useParams();
  const decoded = decodeURIComponent(idOrTitle || '');
  const nav = useNavigate();
  const { user } = useAuth();

  const [data, setData] = useState(null);
  const [msg, setMsg] = useState(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');

  const [memberUserId, setMemberUserId] = useState('');
  const [moderatorUserId, setModeratorUserId] = useState('');

  const [editingThread, setEditingThread] = useState(false);
  const [threadTitle, setThreadTitle] = useState('');
  const [threadDescription, setThreadDescription] = useState('');
  const [threadVisibility, setThreadVisibility] = useState('public');

  async function load() {
    try {
      setMsg(null);

      const isNumeric = /^\d+$/.test(decoded);

      const result = isNumeric
        ? await api.getThreadById(decoded)
        : await api.getThreadByTitle(decoded);

      setData(result);

      const t = result?.thread;
      setThreadTitle(t?.title ?? '');
      setThreadDescription(t?.description ?? '');
      setThreadVisibility(t?.visibility ?? 'public');
    } catch (e) {
      setMsg(e.message || String(e));
    }
  }

  useEffect(() => {
    load();
  }, [decoded]);

  const thread = data?.thread;
  const messages = data?.messages ?? [];

  const threadOwnerId =
    thread?.owner_id ??
    thread?.owner_user_id ??
    thread?.ownerId ??
    null;

  const isAdmin = String(user?.role ?? '').toLowerCase() === 'admin';
  const isOwner =
    !!user?.id &&
    threadOwnerId !== null &&
    String(user.id) === String(threadOwnerId);

  const isModerator = !!data?.isModerator;

  const canManageThread = !!user && (isAdmin || isOwner || isModerator);
  const canPost = !!user && !!thread?.id;

  const formatted = useMemo(() => {
    return messages.map(m => ({
      ...m,
      when: m.date && m.time ? `${m.date} ${m.time}` : ''
    }));
  }, [messages]);

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <h1>{thread?.title ?? `Tråd ${decoded}`}</h1>
            {thread && (
              <div className="muted">
                Thread #{thread.id} • Skapad {new Date(thread.created).toLocaleString()}
              </div>
            )}
          </div>

          <div className="row">
            <button onClick={load} disabled={busy}>Uppdatera</button>
            <button onClick={() => nav(-1)}>Tillbaka</button>
          </div>
        </div>

        <Toast msg={msg} onClose={() => setMsg(null)} />

        {msg && msg.toLowerCase().includes('access forbidden') && (
          <div className="muted" style={{ marginTop: 8 }}>
            Den här tråden är privat. Logga in och se till att du är medlem i tråden, trådägare eller admin.
          </div>
        )}
      </div>

      {canManageThread && thread?.id && (
        <div className="card">
          <h2>Hantera tråden</h2>
          <hr />

          <div className="grid" style={{ gap: 16 }}>
            <div className="grid" style={{ gap: 8 }}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="label">Trådinställningar</label>
                {!editingThread ? (
                  <button
                    onClick={() => {
                      setEditingThread(true);
                      setThreadTitle(thread?.title ?? '');
                      setThreadDescription(thread?.description ?? '');
                      setThreadVisibility(thread?.visibility ?? 'public');
                    }}
                  >
                    Redigera tråd
                  </button>
                ) : null}
              </div>

              {!editingThread ? (
                <div className="grid" style={{ gap: 6 }}>
                  <div><strong>Namn:</strong> {thread?.title ?? '-'}</div>
                  <div><strong>Beskrivning:</strong> {thread?.description || 'Ingen beskrivning'}</div>
                  <div><strong>Synlighet:</strong> {thread?.visibility ?? 'public'}</div>
                </div>
              ) : (
                <div className="grid" style={{ gap: 10 }}>
                  <input
                    className="input"
                    value={threadTitle}
                    onChange={e => setThreadTitle(e.target.value)}
                    placeholder="Trådens namn"
                  />

                  <textarea
                    className="input"
                    rows={4}
                    value={threadDescription}
                    onChange={e => setThreadDescription(e.target.value)}
                    placeholder="Trådens beskrivning"
                  />

                  <select
                    className="input"
                    value={threadVisibility}
                    onChange={e => setThreadVisibility(e.target.value)}
                  >
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                  </select>

                  <div className="row" style={{ gap: 10 }}>
                    <button
                      disabled={busy || threadTitle.trim().length < 2}
                      onClick={async () => {
                        console.log('SAVE THREAD CLICKED', {
                          threadId: thread?.id,
                          threadTitle,
                          threadDescription,
                          threadVisibility,
                          hasUpdateThread: typeof api.updateThread,
                          hasSetThreadVisibility: typeof api.setThreadVisibility
                        });

                        try {
                          setBusy(true);
                          setMsg(null);

                          if (!thread?.id) throw new Error('Tråd-id saknas');
                          if (threadTitle.trim().length < 2) {
                            throw new Error('Trådens namn måste vara minst 2 tecken');
                          }

                          const updatePayload = {
                            newtitle: threadTitle.trim(),
                            newdescription: threadDescription.trim()
                          };

                          console.log('PATCH /threads payload =>', updatePayload);
                          const updateRes = await api.updateThread(thread.id, updatePayload);
                          console.log('PATCH /threads response <=', updateRes);

                          console.log('PATCH /threads/:id/visibility payload =>', {
                            visibility: threadVisibility
                          });
                          const visRes = await api.setThreadVisibility(thread.id, threadVisibility);
                          console.log('PATCH /threads/:id/visibility response <=', visRes);

                          await load();
                          setEditingThread(false);
                          setMsg('Tråden uppdaterades.');
                        } catch (e) {
                          console.error('SAVE THREAD FAILED', e);
                          setMsg(e.message || String(e));
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      Spara tråd
                    </button>

                    <button
                      onClick={() => {
                        setEditingThread(false);
                        setThreadTitle(thread?.title ?? '');
                        setThreadDescription(thread?.description ?? '');
                        setThreadVisibility(thread?.visibility ?? 'public');
                      }}
                    >
                      Avbryt
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="grid" style={{ gap: 8 }}>
              <label className="label">Medlem via userId</label>
              <input
                className="input"
                value={memberUserId}
                onChange={e => setMemberUserId(e.target.value)}
                placeholder="t.ex. 7"
              />

              <div className="row" style={{ gap: 10 }}>
                <button
                  disabled={busy || !memberUserId.trim()}
                  onClick={async () => {
                    try {
                      setBusy(true);
                      setMsg(null);
                      await api.addThreadMember(thread.id, memberUserId);
                      setMemberUserId('');
                      setMsg('Medlem tillagd.');
                      await load();
                    } catch (e) {
                      setMsg(e.message || String(e));
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Bjud in medlem
                </button>

                <button
                  disabled={busy || !memberUserId.trim()}
                  onClick={async () => {
                    try {
                      setBusy(true);
                      setMsg(null);
                      await api.removeThreadMember(thread.id, memberUserId);
                      setMemberUserId('');
                      setMsg('Medlem borttagen.');
                      await load();
                    } catch (e) {
                      setMsg(e.message || String(e));
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Ta bort medlem
                </button>
              </div>
            </div>

            <div className="grid" style={{ gap: 8 }}>
              <label className="label">Moderator via userId</label>
              <input
                className="input"
                value={moderatorUserId}
                onChange={e => setModeratorUserId(e.target.value)}
                placeholder="t.ex. 7"
              />

              <div className="row" style={{ gap: 10 }}>
                <button
                  disabled={busy || !moderatorUserId.trim()}
                  onClick={async () => {
                    try {
                      setBusy(true);
                      setMsg(null);
                      await api.assignModerator(thread.id, moderatorUserId);
                      setModeratorUserId('');
                      setMsg('Moderator tillagd.');
                      await load();
                    } catch (e) {
                      setMsg(e.message || String(e));
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Gör moderator
                </button>

                <button
                  disabled={busy || !moderatorUserId.trim()}
                  onClick={async () => {
                    try {
                      setBusy(true);
                      setMsg(null);
                      await api.revokeModerator(thread.id, moderatorUserId);
                      setModeratorUserId('');
                      setMsg('Moderator borttagen.');
                      await load();
                    } catch (e) {
                      setMsg(e.message || String(e));
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Ta bort moderator
                </button>
              </div>
            </div>

            <div className="muted">
              Inloggad som: {user?.username} • role: {user?.role} • ownerId: {String(threadOwnerId ?? '')} • moderator: {String(isModerator)}
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <h2>Inlägg</h2>
        <hr />
        <div className="grid" style={{ gap: 12 }}>
          {formatted.map(m => {
            const isMe = !!user?.username && m.user === user.username;
            const canEditOrDelete = isMe || isAdmin || isOwner || isModerator;
            const isEditing = editingId === m.id;

            return (
              <div key={m.id} className="card" style={{ padding: 12 }}>
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="row" style={{ gap: 8 }}>
                      <strong>{m.user}</strong>
                      <span className="muted">{m.when}</span>
                      {isMe && <span className="badge">ditt</span>}
                      {isAdmin && !isMe && <span className="badge">admin</span>}
                      {isOwner && !isMe && !isAdmin && <span className="badge">owner</span>}
                      {isModerator && !isMe && !isAdmin && !isOwner && <span className="badge">moderator</span>}
                    </div>
                  </div>

                  {canEditOrDelete && !isEditing && (
                    <div className="row">
                      <button
                        onClick={() => {
                          setEditingId(m.id);
                          setEditingText(m.text);
                        }}
                      >
                        Redigera
                      </button>

                      <button
                        onClick={async () => {
                          if (!confirm('Ta bort inlägget?')) return;

                          setBusy(true);
                          setMsg(null);

                          try {
                            await api.deletePost(m.id);
                            await load();
                          } catch (e) {
                            setMsg(e.message || String(e));
                          } finally {
                            setBusy(false);
                          }
                        }}
                      >
                        Ta bort
                      </button>
                    </div>
                  )}
                </div>

                {!isEditing ? (
                  <div style={{ whiteSpace: 'pre-wrap', marginTop: 10 }}>{m.text}</div>
                ) : (
                  <div className="grid" style={{ gap: 10, marginTop: 10 }}>
                    <textarea
                      value={editingText}
                      onChange={e => setEditingText(e.target.value)}
                    />

                    <div className="row">
                      <button
                        disabled={busy || editingText.trim().length < 1}
                        onClick={async () => {
                          setBusy(true);
                          setMsg(null);

                          try {
                            await api.updatePost(m.id, editingText);
                            setEditingId(null);
                            setEditingText('');
                            await load();
                          } catch (e) {
                            setMsg(e.message || String(e));
                          } finally {
                            setBusy(false);
                          }
                        }}
                      >
                        Spara
                      </button>

                      <button
                        onClick={() => {
                          setEditingId(null);
                          setEditingText('');
                        }}
                      >
                        Avbryt
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {!formatted.length && (
            <div className="muted">Inga inlägg ännu.</div>
          )}
        </div>
      </div>

      {canPost ? (
        <div className="card">
          <h2>Nytt inlägg</h2>
          <div className="grid" style={{ gap: 10 }}>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Skriv ditt inlägg..."
            />

            <div className="row">
              <button
                disabled={busy || text.trim().length < 1}
                onClick={async () => {
                  setBusy(true);
                  setMsg(null);

                  try {
                    await api.createPostInThread(thread.id, text);
                    setText('');
                    await load();
                  } catch (e) {
                    setMsg(e.message || String(e));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Skicka
              </button>

              <span className="muted">Som {user?.username}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="card muted">
          Logga in för att skriva inlägg.
          <div style={{ marginTop: 8 }}>
            <Link to="/login"><button>Logga in</button></Link>
          </div>
        </div>
      )}
    </div>
  );
}