// serviceIcons.jsx — Preset barbershop service icons + ServiceIcon renderer
import {
  Scissors, Droplets, Sparkles, Wind, Star, Zap, Flame,
  Smile, Sun, Brush, Feather, Layers, Crown, SprayCan,
} from 'lucide-react';

// ── Preset definitions ────────────────────────────────────────────────────────
export const PRESET_ICONS = [
  { key: 'scissors',  label: 'Tesoura',      Icon: Scissors  },
  { key: 'razor',     label: 'Navalha',      Icon: Feather   },
  { key: 'clippers',  label: 'Máquina',      Icon: Zap       },
  { key: 'beard',     label: 'Barba',        Icon: Layers    },
  { key: 'shampoo',   label: 'Shampoo',      Icon: Droplets  },
  { key: 'spray',     label: 'Spray',        Icon: SprayCan  },
  { key: 'dryer',     label: 'Secador',      Icon: Wind      },
  { key: 'color',     label: 'Coloração',    Icon: Sun       },
  { key: 'treatment', label: 'Tratamento',   Icon: Sparkles  },
  { key: 'premium',   label: 'Premium',      Icon: Crown     },
  { key: 'relax',     label: 'Relaxamento',  Icon: Smile     },
  { key: 'brush',     label: 'Escova',       Icon: Brush     },
  { key: 'hot',       label: 'Hot Towel',    Icon: Flame     },
  { key: 'star',      label: 'Destaque',     Icon: Star      },
];

const PRESET_MAP = Object.fromEntries(PRESET_ICONS.map(p => [p.key, p.Icon]));

// ── ServiceIcon ───────────────────────────────────────────────────────────────
// Renders either a preset Lucide icon or an uploaded image
export function ServiceIcon({ icon, size = 20, className = '' }) {
  if (!icon) {
    return <Scissors size={size} className={className} />;
  }

  if (icon.startsWith('preset:')) {
    const key = icon.replace('preset:', '');
    const Icon = PRESET_MAP[key] || Scissors;
    return <Icon size={size} className={className} />;
  }

  // Uploaded image URL
  return (
    <img
      src={icon}
      alt="ícone do serviço"
      style={{ width: size, height: size }}
      className={`object-cover rounded ${className}`}
    />
  );
}
