export const CLASSES = {
  vanguard: { id:'vanguard', name:'Vanguard', tagline:'Shock assault specialist', ability:'Overdrive', abilityDescription:'Boost movement, fire rate and reload speed for 9 seconds.', color:0x37bfff, health:110, armor:80, speed:1.08, weapon:'rifle', cooldown:28 },
  bulwark: { id:'bulwark', name:'Bulwark', tagline:'Heavy armor / suppression', ability:'Aegis Core', abilityDescription:'Reinforce armor and absorb incoming damage for 11 seconds.', color:0xffa648, health:145, armor:145, speed:.82, weapon:'lmg', cooldown:34 },
  trapper: { id:'trapper', name:'Trapper', tagline:'Area denial architect', ability:'Minefield', abilityDescription:'Deploy a fan of smart proximity charges in front of you.', color:0xb7ff58, health:100, armor:65, speed:1.0, weapon:'smg', cooldown:20 },
  engineer: { id:'engineer', name:'Engineer', tagline:'Autonomous weapons expert', ability:'Sentry Nest', abilityDescription:'Deploy an autonomous multi-target sentry turret.', color:0x65e6ff, health:105, armor:75, speed:.96, weapon:'rifle', cooldown:27 },
  spectre: { id:'spectre', name:'Spectre', tagline:'Recon marksman', ability:'Ghost Pulse', abilityDescription:'Reveal targets and dramatically increase critical damage.', color:0xe485ff, health:90, armor:55, speed:1.13, weapon:'dmr', cooldown:24 },
  lifeline: { id:'lifeline', name:'Lifeline', tagline:'Combat sustain medic', ability:'Nanite Surge', abilityDescription:'Regenerate health and armor with an emergency nanite cloud.', color:0x64ffbd, health:110, armor:70, speed:1.02, weapon:'rifle', cooldown:25 },
};
export const CLASS_LIST = Object.values(CLASSES);
