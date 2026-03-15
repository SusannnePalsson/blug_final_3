import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Forums from './pages/Forums.jsx';
import ForumDetail from './pages/ForumDetail.jsx';
import Threads from './pages/Threads.jsx';
import ThreadView from './pages/ThreadView.jsx';
import { AuthProvider, useAuth } from './state/auth.jsx';

function Gate({ children }) {
  const { ready } = useAuth();

  if (!ready) {
    return <div className="card">Laddar...</div>;
  }

  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Layout>
        <Gate>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forums" element={<Forums />} />
            <Route path="/forums/:idOrSlug" element={<ForumDetail />} />
            <Route path="/threads" element={<Threads />} />
            <Route path="/thread/:idOrTitle" element={<ThreadView />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Gate>
      </Layout>
    </AuthProvider>
  );
}