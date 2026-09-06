const KEY = 'ashfall-horizon-profile-v1';
const fresh = () => ({ xp: 0, rank: 1, completed: {}, settings: { sensitivity: .0019 }, lastClass: 'vanguard' });
export function loadProfile() { try { return { ...fresh(), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return fresh(); } }
export function saveProfile(profile) { try { localStorage.setItem(KEY, JSON.stringify(profile)); } catch {} }
export function awardXP(profile, xp) { profile.xp += xp; profile.rank = Math.max(1, Math.floor(Math.sqrt(profile.xp / 850)) + 1); saveProfile(profile); return profile.rank; }
