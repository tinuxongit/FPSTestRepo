import * as THREE from 'three';

const canvas = document.getElementById('game');
const contextErrors = [];

canvas.addEventListener('webglcontextcreationerror', event => {
  const message = event.statusMessage || 'WebGL context creation failed without a status message.';
  contextErrors.push(message);
  console.warn('WebGL context creation error:', message);
});

const contextAttributes = {
  alpha: false,
  antialias: true,
  depth: true,
  stencil: false,
  premultipliedAlpha: true,
  preserveDrawingBuffer: false,
  powerPreference: 'default',
  failIfMajorPerformanceCaveat: false
};

const nativeGetContext = canvas.getContext.bind(canvas);
let gl = null;
let kind = null;

function tryContext(type) {
  try {
    const context = nativeGetContext(type, contextAttributes);
    if (context) {
      gl = context;
      kind = type === 'webgl2' ? 'WebGL 2' : 'WebGL 1';
      return true;
    }
  } catch (error) {
    contextErrors.push(`${type}: ${error?.message || error}`);
  }
  return false;
}

tryContext('webgl2') || tryContext('webgl') || tryContext('experimental-webgl');

// Lock Three.js onto the context that Firefox successfully created above. This
// also avoids re-requesting a context with a forced high-performance GPU hint.
if (gl) {
  canvas.getContext = function getExistingGameContext(type, attrs) {
    if (kind === 'WebGL 2' && type === 'webgl2') return gl;
    if (kind === 'WebGL 1' && (type === 'webgl' || type === 'experimental-webgl')) return gl;
    return nativeGetContext(type, attrs);
  };
}

window.__fpsGLContext = gl;
window.__fpsWebGLInfo = {
  kind,
  errors: contextErrors,
  renderer: gl ? gl.getParameter(gl.RENDERER) : null,
  vendor: gl ? gl.getParameter(gl.VENDOR) : null,
  version: gl ? gl.getParameter(gl.VERSION) : null
};

console.info('FPS WebGL preflight:', window.__fpsWebGLInfo);

if (!gl) {
  const panel = document.getElementById('webgl-error');
  const paragraph = panel?.querySelector('p');
  if (paragraph) {
    const detail = contextErrors.length ? contextErrors.join(' | ') : 'Firefox returned null for WebGL2, WebGL1 and experimental-webgl.';
    paragraph.textContent = `No WebGL context could be created. ${detail}`;
  }
}

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
