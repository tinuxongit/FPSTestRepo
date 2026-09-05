import * as THREE from 'three';

// Three.js r162 copies Object3D.userData through JSON serialization inside clone().
// Enemy hitboxes keep a live reference back to their parent enemy root, which is
// intentionally cyclic. Temporarily remove that reference while cloning so the
// geometry clone succeeds, then restore it on both objects.
const originalClone = THREE.Object3D.prototype.clone;

THREE.Object3D.prototype.clone = function cloneWithoutCyclicEnemyRoot(recursive = true) {
  const data = this.userData;
  const hasEnemyRoot = !!data && Object.prototype.hasOwnProperty.call(data, 'enemyRoot');

  if (!hasEnemyRoot) return originalClone.call(this, recursive);

  const enemyRoot = data.enemyRoot;
  delete data.enemyRoot;

  try {
    const cloned = originalClone.call(this, recursive);
    cloned.userData.enemyRoot = enemyRoot;
    return cloned;
  } finally {
    data.enemyRoot = enemyRoot;
  }
};
