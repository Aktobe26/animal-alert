'use client';

import { useEffect, useState } from 'react';
import Map from '@/components/Map';

type Animal = 'cow' | 'horse' | 'camel';

export default function Home() {
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [animal, setAnimal] = useState<Animal>('cow');

  /* ================= GEOLOCATION ================= */

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (p) =>
        setPos({
          lat: p.coords.latitude,
          lng: p.coords.longitude,
        }),
      (err) => {
        console.error('Geolocation error:', err);
      },
      { enableHighAccuracy: true }
    );
  }, []);

  if (!pos) {
    return <div style={loading}>📍 Определяем местоположение…</div>;
  }

  /* ================= RENDER ================= */

  return (
    <>
      <Map lat={pos.lat} lng={pos.lng} />

      <div style={panel}>
        <button
          style={{ ...btn, background: '#16a34a' }}
          onClick={() => {
            setAnimal('cow');
            (window as any).addAnimal('cow');
          }}
        >
          🐄 Корова
        </button>

        <button
          style={{ ...btn, background: '#2563eb' }}
          onClick={() => {
            setAnimal('horse');
            (window as any).addAnimal('horse');
          }}
        >
          🐎 Лошадь
        </button>

        <button
          style={{ ...btn, background: '#d97706' }}
          onClick={() => {
            setAnimal('camel');
            (window as any).addAnimal('camel');
          }}
        >
          🐪 Верблюд
        </button>
      </div>
    </>
  );
}

/* ================= STYLES ================= */

const panel: React.CSSProperties = {
  position: 'fixed',
  bottom: 20,
  left: '50%',
  transform: 'translateX(-50%)',
  display: 'flex',
  gap: 10,
  zIndex: 9999,
};

const btn: React.CSSProperties = {
  color: '#fff',
  border: 'none',
  padding: '12px 18px',
  borderRadius: 14,
  fontSize: 15,
  cursor: 'pointer',
};

const loading: React.CSSProperties = {
  width: '100vw',
  height: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 18,
};
