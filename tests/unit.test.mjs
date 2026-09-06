import test from 'node:test';
import assert from 'node:assert/strict';
import { OPERATIONS } from '../src/data/maps.js';
import { CLASSES } from '../src/data/classes.js';
import { WEAPONS } from '../src/data/weapons.js';
import { generateLayout } from '../src/world/layout.js';
import { NavigationGrid } from '../src/world/navigation.js';
import { circleAabb } from '../src/world/collision.js';
import { mulberry32,hashString } from '../src/core/math.js';
import { normalizeProfile } from '../src/core/storage.js';
import { CITY_OPERATION,createCityLayout } from '../src/levels/city-layout.js';

test('contains 50 operation variants',()=>assert.equal(OPERATIONS.length,50));
test('has six distinct classes',()=>assert.equal(Object.keys(CLASSES).length,6));
test('all classes reference weapons',()=>{for(const c of Object.values(CLASSES))assert.ok(WEAPONS[c.weapon]);});
test('layout deterministic',()=>assert.deepEqual(generateLayout(55,'jungle'),generateLayout(55,'jungle')));
test('PRNG deterministic',()=>{const a=mulberry32(7),b=mulberry32(7);assert.deepEqual([a(),a(),a()],[b(),b(),b()]);});
test('hash deterministic',()=>assert.equal(hashString('ashfall'),hashString('ashfall')));
test('collision detects overlap',()=>assert.equal(circleAabb(0,0,1,{minX:-.2,maxX:.2,minZ:-.2,maxZ:.2}),true));
test('all operation starts have reachable objective cells',()=>{for(const op of OPERATIONS){const l=generateLayout(op.seed,op.biome),n=new NavigationGrid(l);const objective=l.spawn[3]||{x:10,z:10};assert.equal(n.reachable({x:0,z:20},objective),true,op.id);}});
test('featured city has five authored mission acts',()=>assert.equal(CITY_OPERATION.acts.length,5));
test('featured city objectives are reachable from deployment',()=>{const l=createCityLayout(),n=new NavigationGrid(l);for(const act of CITY_OPERATION.acts){assert.equal(n.reachable(l.start,{x:act.point[0],z:act.point[1]}),true,act.label);}});

test('stale settings inherit a finite default volume',()=>{
  const profile=normalizeProfile({settings:{quality:'high',sensitivity:.002}});
  assert.equal(Number.isFinite(profile.settings.volume),true);
  assert.equal(profile.settings.volume,.8);
});

test('invalid persisted settings are clamped and sanitized',()=>{
  const profile=normalizeProfile({settings:{quality:'broken',sensitivity:Infinity,volume:NaN}});
  assert.equal(profile.settings.quality,'high');
  assert.equal(profile.settings.sensitivity,.0019);
  assert.equal(profile.settings.volume,.8);
});
