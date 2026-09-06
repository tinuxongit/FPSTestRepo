import { mulberry32 } from '../core/math.js';

function blocked(x,z,colliders,pad=.8){return colliders.some(c=>x>c.minX-pad&&x<c.maxX+pad&&z>c.minZ-pad&&z<c.maxZ+pad);}

export function generateLayout(seed,biome){
  const r=mulberry32(seed),colliders=[],structures=[],spawn=[],size=72,border=36,start={x:0,z:20};
  colliders.push(
    {minX:-border,maxX:border,minZ:-border,maxZ:-border+.8},
    {minX:-border,maxX:border,minZ:border-.8,maxZ:border},
    {minX:-border,maxX:-border+.8,minZ:-border,maxZ:border},
    {minX:border-.8,maxX:border,minZ:-border,maxZ:border}
  );
  for(let i=0,tries=0;i<30&&tries<500;tries++){
    const x=(r()-.5)*58,z=(r()-.5)*58,w=2.5+r()*7,d=2.5+r()*7,h=1.5+r()*10;
    if(Math.hypot(x-start.x,z-start.z)<7)continue;
    const box={minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2};
    if(structures.some(s=>Math.abs(x-s.x)<(w+s.w)/2+.7&&Math.abs(z-s.z)<(d+s.d)/2+.7))continue;
    structures.push({x,z,w,d,h,variant:Math.floor(r()*4)});colliders.push(box);i++;
  }
  // Flood-fill free cells from the guaranteed start and choose only reachable spawn points.
  const cell=2,half=size/2,n=Math.ceil(size/cell),sx=Math.floor((start.x+half)/cell),sz=Math.floor((start.z+half)/cell),queue=[[sx,sz]],seen=new Set([`${sx},${sz}`]),free=[];
  while(queue.length){const [cx,cz]=queue.shift(),wx=cx*cell-half+cell/2,wz=cz*cell-half+cell/2;if(blocked(wx,wz,colliders,.55))continue;free.push({x:wx,z:wz});for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const x=cx+dx,z=cz+dz,k=`${x},${z}`;if(x<0||z<0||x>=n||z>=n||seen.has(k))continue;seen.add(k);queue.push([x,z]);}}
  for(let i=0;i<40&&free.length;i++){const idx=Math.floor(r()*free.length),p=free.splice(idx,1)[0];if(Math.hypot(p.x-start.x,p.z-start.z)>5)spawn.push(p);else i--;}
  return{size,colliders,structures,spawn,seed,biome,start};
}
