'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/lib/supabase';



/* ================= TYPES ================= */

type Animal = 'cow' | 'horse' | 'camel';

type AnimalRow = {
  id: string;
  lat: number;
  lng: number;
  type: Animal;
  created_at: string;
  danger: number;
  confirmations: number;
};

/* ================= CONFIG ================= */

const TTL_MS = 60 * 60 * 1000; // 60 минут

const ICONS: Record<Animal, string> = {
  cow: '/icons/cow.png',
  horse: '/icons/horse.png',
  camel: '/icons/camel.png',
};

type Props = {
  lat: number;
  lng: number;
};

/* ================= COMPONENT ================= */

export default function Map({ lat, lng }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);

  /* ================= MAP INIT ================= */

useEffect(() => {
  if (!mapRef.current || map.current) return;

  // ✅ ВАЖНО: токен ТОЛЬКО ЗДЕСЬ
  mapboxgl.accessToken =
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN as string;

  if (!mapboxgl.accessToken) {
    console.error('❌ MAPBOX TOKEN NOT FOUND');
    return;
  }

  map.current = new mapboxgl.Map({
    container: mapRef.current,
    style: 'mapbox://styles/mapbox/dark-v11',
    center: [lng, lat],
    zoom: 16,
  });

  new mapboxgl.Marker({ color: '#22d3ee' })
    .setLngLat([lng, lat])
    .addTo(map.current);

  loadAnimals();
}, [lat, lng]);

  /* ================= LOAD WITH TTL ================= */

  async function loadAnimals() {
    if (!map.current) return;

    markers.current.forEach((m) => m.remove());
    markers.current = [];

    const since = new Date(Date.now() - TTL_MS).toISOString();

    const { data, error } = await supabase
      .from('animals')
      .select('*')
      .gte('created_at', since);

    if (error) {
      console.error(error);
      return;
    }

    data?.forEach(createMarker);
  }

  /* ================= MARKER ================= */

function createMarker(a: AnimalRow) {
  if (!map.current) return;

  const container = document.createElement('div');
  container.style.position = 'relative';
  container.style.width = '42px';
  container.style.height = '42px';
  container.style.cursor = 'pointer';

  const img = document.createElement('img');
  img.src = ICONS[a.type];
  img.style.width = '42px';
  img.style.height = '42px';

  const badge = document.createElement('div');
  badge.style.position = 'absolute';
  badge.style.top = '-18px';
  badge.style.left = '50%';
  badge.style.transform = 'translateX(-50%)';
  badge.style.fontSize = '11px';
  badge.style.padding = '2px 6px';
  badge.style.borderRadius = '8px';
  badge.style.color = '#fff';
  badge.style.background = dangerColor(a.danger);
  badge.style.whiteSpace = 'nowrap';

  const counter = document.createElement('div');
  counter.style.position = 'absolute';
  counter.style.bottom = '-16px';
  counter.style.left = '50%';
  counter.style.transform = 'translateX(-50%)';
  counter.style.fontSize = '10px';
  counter.style.color = '#9ca3af';
  counter.innerText = `👍 ${a.confirmations}`;

  container.appendChild(badge);
  container.appendChild(img);
  container.appendChild(counter);

  const marker = new mapboxgl.Marker(container)
    .setLngLat([a.lng, a.lat])
    .addTo(map.current);

  markers.current.push(marker);

  /* ===== POPUP ===== */
  const popup = new mapboxgl.Popup({
    offset: 30,
    closeButton: true,
  }).setHTML(`
    <div style="font-size:13px">
      <b>${animalLabel(a.type)}</b><br/>
      ⏱ Осталось: <span id="ttl-${a.id}">--:--</span><br/>
      ⚠ Опасность: ${dangerText(a.danger)}<br/>
      👍 Подтверждений: ${a.confirmations}
    </div>
  `);

  marker.setPopup(popup);

  /* ⏱ TTL TIMER */
  const created = new Date(a.created_at).getTime();
  const timer = setInterval(() => {
    const left = TTL_MS - (Date.now() - created);

    if (left <= 0) {
      clearInterval(timer);
      marker.remove();
      return;
    }

    const time = formatTime(left);
    badge.innerText = time;

    const ttlEl = document.getElementById(`ttl-${a.id}`);
    if (ttlEl) ttlEl.innerText = time;
  }, 1000);

  /* 👍 CONFIRMATION (1 per user) */
  const confirmKey = `confirmed_${a.id}`;
  const alreadyConfirmed = localStorage.getItem(confirmKey);

  if (!alreadyConfirmed) {
  container.onclick = async () => {
    const confirmKey = `confirmed_${a.id}`;

    // 🔒 повторное подтверждение
    if (localStorage.getItem(confirmKey)) return;

    // 📏 ПРОВЕРКА ДИСТАНЦИИ
    const dist = distanceMeters(lat, lng, a.lat, a.lng);

    if (dist > 150) {
      alert('Вы слишком далеко для подтверждения (нужно ≤ 150 м)');
      return;
    }

    localStorage.setItem(confirmKey, '1');

    const newDanger = Math.min(3, a.danger + 1);
    const newConf = a.confirmations + 1;

    await supabase
      .from('animals')
      .update({
        danger: newDanger,
        confirmations: newConf,
      })
      .eq('id', a.id);

    // 🔄 обновляем визуально
    badge.style.background = dangerColor(newDanger);
    counter.innerText = `👍 ${newConf}`;
  };
}
}


  /* ================= ADD ANIMAL (ONLY BUTTON) ================= */

  async function addAnimal(type: Animal) {
  // 1️⃣ СРАЗУ рисуем локальный маркер
  createMarker({
    id: 'local-' + Date.now(),
    lat,
    lng,
    type,
    created_at: new Date().toISOString(),
    danger: 1,
    confirmations: 0,
  });

  // 2️⃣ ПИШЕМ В SUPABASE
  const { error } = await supabase.from('animals').insert({
    type,
    lat,
    lng,
    danger: 1,
    confirmations: 0,
  });

  if (error) {
    console.error('Insert error:', error);
  }
}


  /* expose */
  useEffect(() => {
    (window as any).addAnimal = addAnimal;
  }, [lat, lng]);

  /* ================= REALTIME ================= */

  useEffect(() => {
    const channel = supabase
      .channel('animals-rt')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'animals' },
        loadAnimals
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  /* ================= TTL REFRESH ================= */

  useEffect(() => {
    const i = setInterval(loadAnimals, 60_000);
    return () => clearInterval(i);
  }, []);

  return <div ref={mapRef} style={{ width: '100vw', height: '100vh' }} />;
}

/* ================= HELPERS ================= */

function formatTime(ms: number) {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function dangerColor(level: number) {
  if (level >= 3) return '#dc2626';
  if (level === 2) return '#f59e0b';
  return '#16a34a';
}

function animalLabel(type: Animal) {
  if (type === 'cow') return '🐄 Корова';
  if (type === 'horse') return '🐎 Лошадь';
  return '🐪 Верблюд';
}

function dangerText(level: number) {
  if (level >= 3) return 'высокая';
  if (level === 2) return 'средняя';
  return 'низкая';
}

function distanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
) 

{
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
