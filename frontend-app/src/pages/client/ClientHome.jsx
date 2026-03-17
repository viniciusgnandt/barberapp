import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, LocateFixed, List, Map, X, ChevronDown } from 'lucide-react';
import { Portal } from '../../utils/api';
import { cn } from '../../utils/cn';

const TYPES = [
  { value: 'todos',       label: 'Todos' },
  { value: 'barbearia',   label: 'Barbearia' },
  { value: 'salao',       label: 'Salão' },
  { value: 'manicure',    label: 'Manicure' },
  { value: 'sobrancelha', label: 'Sobrancelha' },
  { value: 'cilios',      label: 'Cílios' },
  { value: 'outros',      label: 'Outros' },
];

const RADII = [
  { value: '5',    label: '5 km' },
  { value: '10',   label: '10 km' },
  { value: '20',   label: '20 km' },
  { value: '9999', label: 'Todos' },
];

const ESTABLISHMENT_LABELS = {
  barbearia: 'Barbearia', salao: 'Salão de Beleza',
  manicure: 'Manicure', sobrancelha: 'Sobrancelha',
  cilios: 'Cílios', outros: 'Outros',
};

function ShopCard({ shop, onClick }) {
  const initials = shop.name?.slice(0, 2).toUpperCase();
  const isOpen = (() => {
    if (!shop.openingHours?.length) return null;
    const now = new Date();
    const day = shop.openingHours.find(h => h.day === now.getDay());
    if (!day || !day.open) return false;
    const [oh, om] = day.from.split(':').map(Number);
    const [ch, cm] = day.to.split(':').map(Number);
    const nowM = now.getHours() * 60 + now.getMinutes();
    return nowM >= oh * 60 + om && nowM < ch * 60 + cm;
  })();

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 hover:border-violet-300 dark:hover:border-violet-700 hover:shadow-md transition-all"
    >
      <div className="flex items-start gap-3">
        <div className="w-14 h-14 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0 overflow-hidden">
          {shop.logo
            ? <img src={shop.logo} alt={shop.name} className="w-full h-full object-cover" />
            : <span className="text-lg font-bold text-violet-700 dark:text-violet-300">{initials}</span>
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{shop.name}</h3>
            {isOpen !== null && (
              <span className={cn('shrink-0 text-xs font-medium px-1.5 py-0.5 rounded-full', isOpen
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400')}>
                {isOpen ? 'Aberto' : 'Fechado'}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{ESTABLISHMENT_LABELS[shop.establishmentType] || shop.establishmentType}</p>
          {(shop.address || shop.city) && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 flex items-center gap-1 truncate">
              <MapPin size={11} />
              {[shop.address, shop.city, shop.state].filter(Boolean).join(', ')}
            </p>
          )}
        </div>
      </div>
      {shop.distance != null && (
        <div className="mt-3 pt-3 border-t border-gray-50 dark:border-gray-800 flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400 font-medium">
          <MapPin size={11} />
          {shop.distance < 1 ? `${Math.round(shop.distance * 1000)} m` : `${shop.distance.toFixed(1)} km`}
        </div>
      )}
    </button>
  );
}

// ── Map view using Leaflet CDN ────────────────────────────────────────────────
function MapView({ shops, userLocation, onShopClick }) {
  const mapRef      = useRef(null);
  const instanceRef = useRef(null);

  useEffect(() => {
    let cssLink, script;

    const init = () => {
      if (!mapRef.current) return;
      if (instanceRef.current) { instanceRef.current.remove(); instanceRef.current = null; }

      const L    = window.L;
      const dark = window.matchMedia('(prefers-color-scheme: dark)').matches
        || document.documentElement.classList.contains('dark');

      const center = userLocation
        ? [userLocation.lat, userLocation.lng]
        : [-23.5225, -46.1875];
      const zoom = userLocation ? 13 : 12;

      const map = L.map(mapRef.current, { zoomControl: false }).setView(center, zoom);
      instanceRef.current = map;

      // Zoom control no canto inferior direito
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Tile CartoDB Light (fixo)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap © CartoDB',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map);

      if (userLocation) {
        // Pulsing dot para o usuário
        const userIcon = L.divIcon({
          className: '',
          html: `
            <div style="position:relative;width:20px;height:20px">
              <div style="position:absolute;inset:0;border-radius:50%;background:#7c3aed;opacity:0.25;animation:pulse 2s infinite;"></div>
              <div style="position:absolute;top:3px;left:3px;width:14px;height:14px;border-radius:50%;background:#7c3aed;border:2.5px solid white;box-shadow:0 2px 6px rgba(124,58,237,0.5);"></div>
            </div>
            <style>@keyframes pulse{0%,100%{transform:scale(1);opacity:0.25}50%{transform:scale(1.8);opacity:0.08}}</style>`,
          iconAnchor: [10, 10],
          iconSize: [20, 20],
        });
        L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
          .bindPopup('<div style="font-size:12px;font-weight:600;color:#7c3aed">📍 Você está aqui</div>')
          .addTo(map);

        // Círculo de 10 km
        L.circle([userLocation.lat, userLocation.lng], {
          radius:      10000,
          color:       '#7c3aed',
          fillColor:   '#7c3aed',
          fillOpacity: dark ? 0.05 : 0.04,
          weight:      1.5,
          dashArray:   '8 5',
        }).addTo(map);
      }

      // Cores por tipo de estabelecimento
      const TYPE_COLOR = {
        barbearia: '#7c3aed', salao: '#db2777', manicure: '#f59e0b',
        sobrancelha: '#10b981', cilios: '#3b82f6', outros: '#6b7280',
      };

      // Pin SVG customizado
      const pinIcon = (color) => L.divIcon({
        className: '',
        html: `<svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 0C6.268 0 0 6.268 0 14c0 9.333 14 22 14 22S28 23.333 28 14C28 6.268 21.732 0 14 0z" fill="${color}"/>
          <circle cx="14" cy="14" r="6" fill="white"/>
        </svg>`,
        iconAnchor: [14, 36],
        iconSize:   [28, 36],
        popupAnchor: [0, -36],
      });

      // Calcula status de funcionamento
      const getStatus = (openingHours) => {
        if (!openingHours?.length) return null;
        const now    = new Date();
        const today  = now.getDay();
        const nowMin = now.getHours() * 60 + now.getMinutes();
        const entry  = openingHours.find(h => h.day === today);
        if (entry && entry.open) {
          const [oh, om] = entry.from.split(':').map(Number);
          const [ch, cm] = entry.to.split(':').map(Number);
          if (nowMin >= oh * 60 + om && nowMin < ch * 60 + cm)
            return { isOpen: true, text: `Aberto até às ${entry.to}` };
          if (nowMin < oh * 60 + om)
            return { isOpen: false, text: `Abrirá hoje às ${entry.from}` };
        }
        const DAY_NAMES = ['domingo','segunda','terça','quarta','quinta','sexta','sábado'];
        for (let i = 1; i <= 7; i++) {
          const next = openingHours.find(h => h.day === (today + i) % 7);
          if (next?.open) {
            const label = i === 1 ? 'amanhã' : DAY_NAMES[(today + i) % 7];
            return { isOpen: false, text: `Abrirá ${label} às ${next.from}` };
          }
        }
        return { isOpen: false, text: 'Fechado' };
      };

      // Marcadores dos estabelecimentos
      shops.forEach(shop => {
        if (shop.location?.coordinates?.length === 2) {
          const [lng, lat] = shop.location.coordinates;
          const color = TYPE_COLOR[shop.establishmentType] || TYPE_COLOR.outros;
          const dist  = shop.distance != null
            ? (shop.distance < 1 ? `${Math.round(shop.distance * 1000)} m` : `${shop.distance.toFixed(1)} km`)
            : null;

          const typeLabel = { barbearia:'Barbearia', salao:'Salão de Beleza', manicure:'Manicure', sobrancelha:'Sobrancelha', cilios:'Cílios', outros:'Outros' }[shop.establishmentType] || shop.establishmentType;
          const status   = getStatus(shop.openingHours);
          const popup = `
            <div style="min-width:190px;font-family:system-ui,sans-serif">
              <p style="font-size:13px;font-weight:700;margin:0 0 2px;color:#111827">${shop.name}</p>
              <p style="font-size:11px;font-weight:600;color:${color};margin:0 0 4px">${typeLabel}</p>
              ${status ? `<p style="font-size:11px;font-weight:600;margin:0 0 4px;color:${status.isOpen?'#10b981':'#f59e0b'}">${status.isOpen?'● Aberto':'● Fechado'} · <span style="font-weight:400">${status.text}</span></p>` : ''}
              <p style="font-size:11px;color:#6b7280;margin:0 0 6px">${shop.city || ''}</p>
              ${dist ? `<p style="font-size:11px;color:${color};font-weight:600;margin:0 0 6px">📍 ${dist} de distância</p>` : ''}
              <a href="/client/shop/${shop._id}" style="display:inline-block;font-size:11px;font-weight:700;color:white;background:${color};padding:4px 10px;border-radius:6px;text-decoration:none">Ver detalhes →</a>
            </div>`;

          L.marker([lat, lng], { icon: pinIcon(color) }).bindPopup(popup, {
            maxWidth: 220,
            className: 'custom-popup',
          }).addTo(map);
        }
      });

      // Estilo do popup
      const style = document.getElementById('leaflet-popup-style') || document.createElement('style');
      style.id = 'leaflet-popup-style';
      style.textContent = `
        .custom-popup .leaflet-popup-content-wrapper {
          border-radius: 14px !important;
          box-shadow: 0 8px 24px rgba(0,0,0,0.15) !important;
          padding: 0 !important;
          border: 1px solid rgba(0,0,0,0.06) !important;
        }
        .custom-popup .leaflet-popup-content { margin: 12px 14px !important; }
        .custom-popup .leaflet-popup-tip-container { margin-top: -1px; }
        .leaflet-control-zoom { border: none !important; box-shadow: 0 2px 8px rgba(0,0,0,0.12) !important; border-radius: 10px !important; overflow:hidden; }
        .leaflet-control-zoom a { border: none !important; border-radius: 0 !important; }
      `;
      document.head.appendChild(style);
    };

    if (window.L) {
      init();
    } else {
      cssLink = document.createElement('link');
      cssLink.rel = 'stylesheet';
      cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(cssLink);

      script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = init;
      document.head.appendChild(script);
    }

    return () => {
      if (instanceRef.current) { instanceRef.current.remove(); instanceRef.current = null; }
    };
  }, [shops, userLocation]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={mapRef} className="w-full rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800" style={{ height: 'calc(100dvh - 280px)', minHeight: 380 }} />
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
function loadSavedLocation() {
  try { const s = localStorage.getItem('clientUserLocation'); return s ? JSON.parse(s) : null; }
  catch { return null; }
}

export default function ClientHome() {
  const navigate = useNavigate();

  const [shops,        setShops]       = useState([]);
  const [loading,      setLoading]     = useState(true);
  const [q,            setQ]           = useState('');
  const [type,         setType]        = useState('todos');
  const [radius,       setRadius]      = useState('20');
  const [view,         setView]        = useState('map');
  const [userLocation, setUserLocation] = useState(loadSavedLocation);
  const [locLoading,   setLocLoading]  = useState(false);
  const [locDenied,    setLocDenied]   = useState(false);
  const locAsked = useRef(false);

  const saveLocation = (loc) => {
    setUserLocation(loc);
    localStorage.setItem('clientUserLocation', JSON.stringify(loc));
  };

  const fetchShops = useCallback(async (overrides = {}) => {
    setLoading(true);
    const params = {
      ...(q && { q }),
      ...(type !== 'todos' && { type }),
      ...overrides,
    };
    const loc = overrides.lat ? { lat: overrides.lat, lng: overrides.lng } : userLocation;
    if (loc) {
      params.lat    = loc.lat;
      params.lng    = loc.lng;
      params.radius = overrides.radius ?? radius;
    }
    const r = await Portal.Barbershops.search(params);
    setLoading(false);
    if (r.ok) setShops(r.data.data);
  }, [q, type, radius, userLocation]);

  // Solicita localização automaticamente ao montar
  useEffect(() => {
    if (locAsked.current) return;
    locAsked.current = true;
    const saved = loadSavedLocation();
    if (saved) { fetchShops({ lat: saved.lat, lng: saved.lng, radius }); return; }
    if (!navigator.geolocation) { fetchShops(); return; }
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        saveLocation(loc);
        setLocLoading(false);
        fetchShops({ lat: loc.lat, lng: loc.lng, radius });
      },
      () => {
        setLocLoading(false);
        setLocDenied(true);
        fetchShops();
      },
      { timeout: 8000 },
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (locAsked.current) fetchShops();
  }, [type, radius]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e) => {
    e.preventDefault();
    fetchShops();
  };

  const handleLocate = () => {
    if (!navigator.geolocation) { setLocDenied(true); return; }
    setLocLoading(true);
    setLocDenied(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        saveLocation(loc);
        setLocLoading(false);
        setLocDenied(false);
        fetchShops({ lat: loc.lat, lng: loc.lng, radius });
      },
      () => { setLocDenied(true); setLocLoading(false); },
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Descobrir</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Encontre estabelecimentos próximos</p>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Buscar estabelecimento..."
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-colors"
          />
          {q && (
            <button type="button" onClick={() => { setQ(''); fetchShops({ q: undefined }); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          )}
        </div>
        <button type="button" onClick={handleLocate} disabled={locLoading} title="Usar minha localização"
          className={cn('px-3 py-2.5 rounded-xl border transition-colors', userLocation
            ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400'
            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-500 hover:text-violet-600 hover:border-violet-400')}>
          <LocateFixed size={16} className={locLoading ? 'animate-spin' : ''} />
        </button>
      </form>

      {locDenied && !userLocation && (
        <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
          <MapPin size={16} className="text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Localização não habilitada</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Habilite a localização no seu navegador para ver estabelecimentos próximos a você.</p>
          </div>
          <button type="button" onClick={handleLocate} disabled={locLoading}
            className="shrink-0 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:underline">
            {locLoading ? 'Buscando...' : 'Tentar novamente'}
          </button>
        </div>
      )}

      {/* Filters row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Type pills */}
        <div className="flex gap-1.5 flex-wrap">
          {TYPES.map(t => (
            <button key={t.value} onClick={() => setType(t.value)}
              className={cn('px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                type === t.value
                  ? 'bg-violet-600 text-white'
                  : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-violet-400')}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Distance selector */}
        {userLocation && (
          <div className="relative ml-auto">
            <select value={radius} onChange={e => setRadius(e.target.value)}
              className="appearance-none pl-3 pr-7 py-1.5 text-xs font-medium rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-500/30">
              {RADII.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        )}

        {/* View toggle */}
        <div className={cn('flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden', userLocation ? '' : 'ml-auto')}>
          <button onClick={() => setView('list')} className={cn('px-3 py-1.5 text-xs font-medium transition-colors', view === 'list' ? 'bg-violet-600 text-white' : 'bg-white dark:bg-gray-900 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800')}>
            <List size={14} />
          </button>
          <button onClick={() => setView('map')} className={cn('px-3 py-1.5 text-xs font-medium transition-colors border-l border-gray-200 dark:border-gray-700', view === 'map' ? 'bg-violet-600 text-white' : 'bg-white dark:bg-gray-900 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800')}>
            <Map size={14} />
          </button>
        </div>
      </div>

      {/* Results count */}
      {!loading && shops.length > 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {shops.length} estabelecimento{shops.length !== 1 ? 's' : ''} encontrado{shops.length !== 1 ? 's' : ''}
          {userLocation ? ` em até ${radius === '9999' ? '∞' : radius + ' km'}` : ''}
        </p>
      )}

      {/* Content */}
      {loading ? (
        view === 'map' ? (
          <div className="w-full rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" style={{ height: 'calc(100dvh - 280px)', minHeight: 380 }} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
            ))}
          </div>
        )
      ) : view === 'map' ? (
        <div className="relative">
          <MapView shops={shops} userLocation={userLocation} />
          {/* Legend */}
          <div className="absolute bottom-3 left-3 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-xl px-3 py-2 shadow-md border border-gray-100 dark:border-gray-800 flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-violet-600 inline-block" />
              Você
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-gray-400 dark:bg-gray-500 inline-block" />
              {shops.length} estabelecimento{shops.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      ) : shops.length === 0 ? (
        <div className="text-center py-16">
          <Search size={36} className="text-gray-200 dark:text-gray-700 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum estabelecimento encontrado.</p>
          {!userLocation && (
            <button onClick={handleLocate} className="mt-3 text-sm text-violet-600 dark:text-violet-400 font-medium hover:underline">
              Usar minha localização
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {shops.map(shop => (
            <ShopCard key={shop._id} shop={shop} onClick={() => navigate(`/client/shop/${shop._id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}
