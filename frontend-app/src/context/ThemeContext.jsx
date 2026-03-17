import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Users } from '../utils/api';

export const COLORS = [
  { id: 'amber',  label: 'Âmbar',     swatch: '#c9891a' },
  { id: 'blue',   label: 'Azul',      swatch: '#3b82f6' },
  { id: 'teal',   label: 'Esmeralda', swatch: '#14b8a6' },
  { id: 'violet', label: 'Violeta',   swatch: '#8b5cf6' },
  { id: 'rose',   label: 'Rosa',      swatch: '#f43f5e' },
];

export const FONTS = [
  { id: 'inter',    label: 'Inter',     css: "'Inter', system-ui, sans-serif"       },
  { id: 'poppins',  label: 'Poppins',   css: "'Poppins', system-ui, sans-serif"     },
  { id: 'roboto',   label: 'Roboto',    css: "'Roboto', system-ui, sans-serif"      },
  { id: 'playfair', label: 'Playfair',  css: "'Playfair Display', Georgia, serif"   },
  { id: 'mono',     label: 'Mono',      css: "'JetBrains Mono', monospace"          },
];

// CSS variable palettes (R G B space-separated, no commas)
const PALETTES = {
  amber: {
    50:'253 249 239', 100:'250 240 210', 200:'243 222 160', 300:'234 199 100',
    400:'224 169 48',  500:'201 137 26',  600:'172 108 20',  700:'139 80 20',
    800:'114 64 23',   900:'94 53 23',    950:'53 26 8',
  },
  blue: {
    50:'239 246 255', 100:'219 234 254', 200:'191 219 254', 300:'147 197 253',
    400:'96 165 250',  500:'59 130 246',  600:'37 99 235',   700:'29 78 216',
    800:'30 64 175',   900:'30 58 138',   950:'23 37 84',
  },
  teal: {
    50:'240 253 250', 100:'204 251 241', 200:'153 246 228', 300:'94 234 212',
    400:'45 212 191',  500:'20 184 166',  600:'13 148 136',  700:'15 118 110',
    800:'17 94 89',    900:'19 78 74',    950:'4 47 46',
  },
  violet: {
    50:'245 243 255', 100:'237 233 254', 200:'221 214 254', 300:'196 181 253',
    400:'167 139 250', 500:'139 92 246',  600:'124 58 237',  700:'109 40 217',
    800:'91 33 182',   900:'76 29 149',   950:'46 16 101',
  },
  rose: {
    50:'255 241 242', 100:'255 228 230', 200:'254 205 211', 300:'253 164 175',
    400:'251 113 133', 500:'244 63 94',   600:'225 29 72',   700:'190 18 60',
    800:'159 18 57',   900:'136 19 55',   950:'76 5 25',
  },
};

function applyColor(colorId) {
  const palette = PALETTES[colorId] || PALETTES.amber;
  const root    = document.documentElement;
  Object.entries(palette).forEach(([shade, val]) => {
    root.style.setProperty(`--brand-${shade}`, val);
  });
}

function applyFont(fontId) {
  const font = FONTS.find(f => f.id === fontId) || FONTS[0];
  document.documentElement.style.setProperty('--font-body', font.css);
}

function computeDark(mode) {
  if (mode === 'dark')  return true;
  if (mode === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [mode,  setMode]  = useState(() => localStorage.getItem('theme-mode')  || 'dark');
  const [color, setColor] = useState(() => localStorage.getItem('theme-color') || 'violet');
  const [font,  setFont]  = useState(() => localStorage.getItem('theme-font')  || 'inter');

  const dark = computeDark(mode);

  // Apply dark class
  useEffect(() => {
    document.documentElement.classList.toggle('dark', computeDark(mode));

    if (mode === 'auto') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = e => document.documentElement.classList.toggle('dark', e.matches);
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
  }, [mode]);

  // Apply color palette
  useEffect(() => { applyColor(color); }, [color]);

  // Apply font
  useEffect(() => { applyFont(font); }, [font]);

  // Load preferences from DB when the user is authenticated (token present)
  const loadFromDB = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const r = await Users.getMe();
    if (r.ok && r.data?.data?.preferences) {
      const p = r.data.data.preferences;
      if (p.themeMode)  { setMode(p.themeMode);   localStorage.setItem('theme-mode',  p.themeMode);  }
      if (p.themeColor) { setColor(p.themeColor);  localStorage.setItem('theme-color', p.themeColor); }
      if (p.themeFont)  { setFont(p.themeFont);    localStorage.setItem('theme-font',  p.themeFont);  }
    }
  }, []);

  useEffect(() => { loadFromDB(); }, [loadFromDB]);

  // Save to localStorage immediately + persist to DB (fire-and-forget)
  const setAndSaveMode = v => {
    setMode(v);
    localStorage.setItem('theme-mode', v);
    Users.savePreferences({ themeMode: v });
  };
  const setAndSaveColor = v => {
    setColor(v);
    localStorage.setItem('theme-color', v);
    Users.savePreferences({ themeColor: v });
  };
  const setAndSaveFont = v => {
    setFont(v);
    localStorage.setItem('theme-font', v);
    Users.savePreferences({ themeFont: v });
  };

  // Legacy toggle kept for any code that still calls it
  const toggle = () => setAndSaveMode(mode === 'dark' ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ dark, mode, color, font, toggle, setMode: setAndSaveMode, setColor: setAndSaveColor, setFont: setAndSaveFont, loadFromDB }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
