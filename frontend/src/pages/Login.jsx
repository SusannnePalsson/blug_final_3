import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Toast from '../components/Toast.jsx';
import { useAuth } from '../state/auth.jsx';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  return (
    <div className="grid" style={{ maxWidth: 520 }}>
      <div className="card">
        <h1>Logga in</h1>
        <Toast message={msg} />
        <div className="grid" style={{ gap: 10 }}>
          <label>
            <div className="muted" style={{ marginBottom: 6 }}>Användarnamn</div>
            <input value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" />
          </label>
          <label>
            <div className="muted" style={{ marginBottom: 6 }}>Lösenord</div>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
          </label>
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setMsg(null);
              try {
                await login(username.trim(), password);
                nav('/forums');
              } catch (e) {
                setMsg(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >Logga in</button>
          <div className="muted">
            Inget konto? <Link to="/register">Skapa konto</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
