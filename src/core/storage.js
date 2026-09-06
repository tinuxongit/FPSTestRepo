const KEY = 'ashfall-horizon-profile-v1';
const QUALITY = new Set(['low', 'medium', 'high', 'ultra']);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const finite = (value, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const fresh = () => ({
  xp: 0,
  rank: 1,
  completed: {},
  settings: { sensitivity: .0019, quality: 'high', volume: .8 },
  lastClass: 'vanguard'
});

export function normalizeProfile(raw = {}) {
  const base = fresh();
  const source = raw && typeof raw === 'object' ? raw : {};
  const settings = source.settings && typeof source.settings === 'object' ? source.settings : {};
  const xp = Math.max(0, finite(source.xp, base.xp));

  return {
    ...base,
    ...source,
    xp,
    rank: Math.max(1, Math.floor(finite(source.rank, base.rank))),
    completed: source.completed && typeof source.completed === 'object' && !Array.isArray(source.completed)
      ? { ...source.completed }
      : {},
    settings: {
      sensitivity: clamp(finite(settings.sensitivity, base.settings.sensitivity), .0003, .01),
      quality: QUALITY.has(settings.quality) ? settings.quality : base.settings.quality,
      volume: clamp(finite(settings.volume, base.settings.volume), 0, 1)
    },
    lastClass: typeof source.lastClass === 'string' && source.lastClass ? source.lastClass : base.lastClass
  };
}

export function loadProfile() {
  try {
    return normalizeProfile(JSON.parse(localStorage.getItem(KEY) || '{}'));
  } catch {
    return fresh();
  }
}

export function saveProfile(profile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(normalizeProfile(profile)));
  } catch {}
}

export function awardXP(profile, xp) {
  profile.xp = Math.max(0, finite(profile.xp, 0) + Math.max(0, finite(xp, 0)));
  profile.rank = Math.max(1, Math.floor(Math.sqrt(profile.xp / 850)) + 1);
  saveProfile(profile);
  return profile.rank;
}
