import React from 'react';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="card">
        <h1>Blug – forum GUI</h1>
        <p className="muted">
          Frontend för att logga in, se forum, trådar och inlägg (posts) mot ert befintliga API.
        </p>
        <div className="row">
          <Link to="/forums"><button>Öppna forum</button></Link>
          <Link to="/threads"><button>Se senaste trådar</button></Link>
        </div>
      </div>

      <div className="card">
        <h2>Tips</h2>
        <ul>
          <li>Starta API:t först (Blug.Api) och sedan frontend (Blug.Web).</li>
          <li>Frontend använder cookies (session) och CSRF-token via <code>/csrf-token</code>.</li>
        </ul>
      </div>
    </div>
  );
}
