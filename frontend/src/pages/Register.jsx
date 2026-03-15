import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Toast from '../components/Toast.jsx';
import { api } from '../api.js';

export default function Register() {
  const nav = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  return (
    <div className="grid" style={{ maxWidth: 520 }}>
      <div className="card">
        <h1>Skapa konto</h1>
        <Toast message={msg} />
        <div className="grid" style={{ gap: 10 }}>
          <label>
            <div className="muted" style={{ marginBottom: 6 }}>Användarnamn</div>
            <input value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" />
          </label>
          <label>
            <div className="muted" style={{ marginBottom: 6 }}>E-post</div>
            <input value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
          </label>
          <label>
            <div className="muted" style={{ marginBottom: 6 }}>Lösenord</div>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" />
          </label>
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setMsg(null);
              try {
                await api.register({ username: username.trim(), email: email.trim(), password });
                nav('/login');
              } catch (e) {
                setMsg(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >Skapa konto</button>
          <div className="muted">
            Har du redan konto? <Link to="/login">Logga in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
