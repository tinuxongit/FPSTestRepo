export const CITY_OPERATION = {
  id: 'last-transmission',
  index: 51,
  biome: 'metropolis',
  seed: 912731,
  name: 'Last Transmission',
  description: 'Fight through Meridian District, restore the west relay, sabotage the jammer, eliminate the Warden commander, hold the command spire and extract under fire.',
  difficulty: 3,
  estimatedMinutes: 28,
  handcrafted: true,
  acts: [
    { type: 'uplink', label: 'Restore the West Relay', point: [-13, 50], hold: 3.5, radio: 'RAVEN: West relay is dark. Bring it online so I can map the district.', spawn: [[-8,72],[-18,54],[-42,62],[-7,38]] },
    { type: 'sabotage', label: 'Sabotage the Warden Jammer', point: [13, 8], amount: 1, hold: 4.5, radio: 'RAVEN: Jammer is east of the boulevard. Cut it before their reinforcements lock us in.', spawn: [[9,16],[28,20],[46,28],[48,-2],[18,-4]] },
    { type: 'hunt', label: 'Eliminate the Field Commander', point: [-6, -43], radio: 'RAVEN: Commander is moving through the lower concourse. Take the shot.', spawn: [[-9,-24],[8,-30],[-28,-38],[19,-50]] },
    { type: 'defense', label: 'Hold the Command Spire Uplink', point: [0, -91], amount: 30, radio: 'RAVEN: Uplink is live. Hold the plaza while I punch the transmission through.', spawn: [[-11,-70],[13,-72],[-25,-91],[25,-92],[0,-112]] },
    { type: 'extraction', label: 'Board Extraction', point: [50, -101], hold: 3, radio: 'RAVEN: Transmission is away. Bird is on the east pad. Move!' }
  ]
};

function building(structures, colliders, x, z, w, d, h, variant=0){
  structures.push({x,z,w,d,h,variant});
  colliders.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,minY:0,maxY:h});
}

export function createCityLayout(){
  const structures=[],colliders=[];
  const blocks=[
    [-27,83,22,24,28,0], [27,82,22,25,36,1], [-52,83,18,26,18,2], [52,84,18,24,24,3],
    [-28,47,24,27,42,1], [29,46,24,28,30,0], [-53,48,18,25,22,2], [53,45,18,28,33,1],
    [-29,11,24,25,32,0], [30,10,25,24,48,3], [-53,9,18,25,26,2], [53,12,18,25,20,0],
    [-29,-30,24,29,38,3], [29,-31,24,28,31,0], [-53,-29,18,27,24,2], [53,-32,18,27,36,1],
    [-29,-70,23,27,30,0], [29,-70,23,26,42,1], [-54,-69,18,29,22,2], [54,-72,18,27,28,3],
    [-31,-104,24,20,20,4], [31,-105,24,20,22,4]
  ];
  for(const s of blocks) building(structures,colliders,...s);
  colliders.push(
    {minX:-66,maxX:-63,minZ:-124,maxZ:112,minY:0,maxY:20},
    {minX:63,maxX:66,minZ:-124,maxZ:112,minY:0,maxY:20},
    {minX:-66,maxX:66,minZ:109,maxZ:113,minY:0,maxY:20},
    {minX:-66,maxX:66,minZ:-125,maxZ:-121,minY:0,maxY:20}
  );
  const spawn=[];
  for(const z of [96,72,50,30,10,-10,-30,-50,-70,-90,-110]){
    spawn.push({x:-8,z},{x:8,z});
    if(z>-100) spawn.push({x:-44,z:z+3},{x:44,z:z-3});
  }
  return {size:260,seed:CITY_OPERATION.seed,start:{x:0,z:98},structures,colliders,spawn};
}
