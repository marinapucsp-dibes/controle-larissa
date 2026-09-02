'use client';

import { useState } from 'react';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      if (!res.ok) {
        setError('Código de acesso incorreto.');
        setLoading(false);
        return;
      }
      window.location.href = '/';
    } catch (e) {
      setError('Não foi possível entrar. Tente novamente.');
      setLoading(false);
    }
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="brand-mark" style={{ margin: '0 auto 18px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 17l5-5 4 4 9-9"></path>
            <path d="M14 7h7v7"></path>
          </svg>
        </div>
        <h1>Controle Larissa</h1>
        <p className="login-subtitle">Digite o código de acesso para entrar</p>
        <label className="field">
          <span>Código de acesso</span>
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </label>
        {error ? <p className="login-error">{error}</p> : null}
        <button className="btn-primary" type="submit" disabled={!password || loading} style={{ width: '100%', justifyContent: 'center' }}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
