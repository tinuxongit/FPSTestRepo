import { BIOMES } from './biomes.js';

const templates = [
  ['metropolis','Spirefall','Break through a collapsing megacity and sever the orbital command spire.'],
  ['jungle','Emerald Knife','Advance through a monsoon jungle where enemy sensors hide beneath the canopy.'],
  ['town','Silent Borough','Clear a frontier settlement occupied by autonomous hunter teams.'],
  ['glacier','White Furnace','Infiltrate a cryogenic weapons laboratory cut into a glacier.'],
  ['desert','Sunspear','Sabotage a desert refinery supplying the enemy armored divisions.'],
  ['harbor','Black Tide','Seize a storm-battered naval port and disable its carrier uplink.'],
  ['foundry','Molten Crown','Fight across an automated foundry built above active magma channels.'],
  ['marsh','Green Static','Track a signal through a flooded toxic marsh full of sensor interference.'],
  ['orbital','Broken Halo','Assault a low-gravity orbital assembly yard above the night side of Earth.'],
  ['exclusion','Ground Zero','Enter an abandoned exclusion zone and contain an unstable prototype device.'],
];
const objectives = ['uplink','defense','sabotage','hunt','extraction'];
export const OPERATIONS = [];
for (let family = 0; family < templates.length; family++) {
  const [biome, baseName, baseDescription] = templates[family];
  for (let variant = 1; variant <= 5; variant++) {
    const index = family * 5 + variant;
    const seed = 1327 + index * 977;
    const finalType = biome === 'exclusion' && variant === 5 ? 'containment' : objectives[(variant + family) % objectives.length];
    OPERATIONS.push({
      id:`op-${String(index).padStart(2,'0')}`, index, biome, seed,
      name:`${baseName} ${['I','II','III','IV','V'][variant-1]}`,
      description:`${baseDescription} Tactical layout ${variant} uses a distinct seed, route network and combat director profile.`,
      difficulty: 1 + Math.floor((index-1)/10),
      estimatedMinutes: 16 + (index % 5) * 5,
      acts: [
        { type:'uplink', label:'Reach the forward uplink', amount:1 },
        { type: variant % 2 ? 'eliminate' : 'sabotage', label: variant % 2 ? 'Break the blocking force' : 'Destroy power relays', amount: variant % 2 ? 10 + variant*3 : 3 },
        { type: finalType, label: finalType === 'containment' ? 'Arm the containment device and evacuate' : finalType === 'defense' ? 'Hold the tactical relay' : finalType === 'hunt' ? 'Eliminate the field commander' : finalType === 'sabotage' ? 'Collapse enemy logistics' : 'Reach extraction', amount: finalType === 'defense' ? 55 : 1 },
      ]
    });
  }
}
export const ENDLESS_OPERATION = { id:'endless', index:999, biome:'metropolis', seed:99173, name:'Endless Front', description:'Infinite escalating combat across a regenerating city sector.', difficulty:3, estimatedMinutes:999, endless:true, acts:[{type:'endless', label:'Survive as long as possible', amount:Infinity}] };
export function operationById(id) { return OPERATIONS.find(op => op.id === id) || OPERATIONS[0]; }
export function operationBiome(op) { return BIOMES[op.biome]; }
