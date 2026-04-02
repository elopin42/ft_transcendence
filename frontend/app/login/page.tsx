'use client';
import './login.css';
import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const response = await fetch('http://localhost:4000/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (response.ok) {
      localStorage.setItem('token', data.token);
      window.location.href = '/dashboard';
    } else {
      setError(data.message || 'Erreur de connexion');
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <div style={{ flex: 1 }}>
        <form className="container" onSubmit={handleSubmit}>
          <div className="input-container">
            <div className="input-content">
              <div className="input-dist">
                <div className="input-type">
                  <input
                    className="input-is"
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                  <input
                    className="input-is"
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>
          </div>
          {error && <p>{error}</p>}
          <button className="submit-button" type="submit" >Log in</button>
          <a href="/register">Register</a>
        </form>
      </div>

      <div style={{ flex: 1 }}>
        <div className="bg">
          {/* trackers */}
          {Array.from({ length: 25 }, (_, i) => (
            <div key={i} className={`tracker tr-${i + 1}`}></div>
          ))}
          <div className="glow-background"></div>
          <div className="particles">
            <div className="dust d1"></div>
            <div className="dust d2"></div>
            <div className="dust d3"></div>
          </div>
          <div className="stage">
            <div className="scene">
              <div className="bob-wrapper">
                <div className="diamond">
                  <div className="facet table"></div>
                  <div className="facet crown c1"></div>
                  <div className="facet crown c2"></div>
                  <div className="facet crown c3"></div>
                  <div className="facet crown c4"></div>
                  <div className="facet crown c5"></div>
                  <div className="facet crown c6"></div>
                  <div className="facet crown c7"></div>
                  <div className="facet crown c8"></div>
                  <div className="facet pavilion p1"></div>
                  <div className="facet pavilion p2"></div>
                  <div className="facet pavilion p3"></div>
                  <div className="facet pavilion p4"></div>
                  <div className="facet pavilion p5"></div>
                  <div className="facet pavilion p6"></div>
                  <div className="facet pavilion p7"></div>
                  <div className="facet pavilion p8"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
