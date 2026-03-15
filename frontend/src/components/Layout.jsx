import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../state/auth.jsx';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  return (
    <>
      <div className="nav">
        <div className="container row" style={{ justifyContent: 'space-between' }}>
          <div className="row">
            <Link to="/" style={{ fontWeight: 800 }}>Blug</Link>
            <NavLink to="/forums" style={({ isActive }) => ({ opacity: isActive ? 1 : 0.75 })}>Forum</NavLink>
            <NavLink to="/threads" style={({ isActive }) => ({ opacity: isActive ? 1 : 0.75 })}>Trådar</NavLink>
          </div>
          <div className="row">
            {user ? (
              <>
                <span className="badge">
                  <strong>{user.username}</strong>
                  <span className="muted">({user.role})</span>
                </span>
                <button
                  onClick={async () => {
                    await logout();
                    nav('/login');
                  }}
                >Logga ut</button>
              </>
            ) : (
              <>
                <NavLink to="/login" style={({ isActive }) => ({ opacity: isActive ? 1 : 0.75 })}>Logga in</NavLink>
                <NavLink to="/register" style={({ isActive }) => ({ opacity: isActive ? 1 : 0.75 })}>Skapa konto</NavLink>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="container">
        {children}
      </div>
    </>
  );
}
