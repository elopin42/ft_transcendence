'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DebugPanel() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (e) {
      // ignore — on redirige quand même
    }
    router.push('/');
  };

  return (
    <div style={{ position: 'fixed', bottom: 10, right: 10, zIndex: 9999 }}>
      {/* Bouton burger */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: open ? '#333' : '#555',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: 40,
          height: 40,
          cursor: 'pointer',
          fontSize: 18,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {open ? '✕' : '☰'}
      </button>

      {/* Menu déroulant */}
      {open && (
        <div
          style={{
            position: 'absolute',
            bottom: 50,
            right: 0,
            background: '#1a1a1a',
            border: '1px solid #333',
            borderRadius: 8,
            padding: 8,
            minWidth: 150,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <button
            onClick={handleLogout}
            style={{
              background: '#ff4444',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            Déconnexion
          </button>
        </div>
      )}
    </div>
  );
}
