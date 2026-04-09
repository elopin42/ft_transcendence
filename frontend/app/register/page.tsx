
'use client';
import { useState } from 'react';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // pour envoyer les cookies (utile pour le login 42 qui utilise les cookies)
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (response.ok) {
      // Plus de document.cookie ! Le backend set le cookie httpOnly lui-même
      window.location.href = '/dashboard'; // changement claude proposé ! ancien : window.location.href = '/login';
    } else {
      setError(data.message || 'Erreur de connexion');
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Mot de passe"
        value={password}
        onChange={e => setPassword(e.target.value)}
        required
      />
      {error && <p>{error}</p>}
      <button type="submit">Se enregistrer</button>
    </form>
  );
}

