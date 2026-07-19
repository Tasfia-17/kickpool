"use client";
import { useState } from 'react';

export default function MakeVIPPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult('');
    const res = await fetch('/api/admin/vip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email })
    });
    const data = await res.json();
    setResult(data.message || (res.ok ? 'Başarılı!' : 'Hata!'));
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: 400, margin: 'auto', padding: 32 }}>
      <h2>Kullanıcıyı VIP Yap</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Kullanıcı adı"
          value={username}
          onChange={e => setUsername(e.target.value)}
          style={{ width: '100%', marginBottom: 8 }}
        />
        <input
          type="email"
          placeholder="E-posta (opsiyonel)"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={{ width: '100%', marginBottom: 8 }}
        />
        <button type="submit" disabled={loading} style={{ width: '100%' }}>
          VIP Yap
        </button>
      </form>
      {result && <div style={{ marginTop: 16 }}>{result}</div>}
    </div>
  );
}
