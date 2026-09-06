export class Input {
  constructor(canvas) {
    this.canvas=canvas;this.keys=new Set();this.pressed=new Set();this.buttons=new Set();this.mouseDX=0;this.mouseDY=0;this.testLocked=false;
    window.addEventListener('keydown',e=>{if(!this.keys.has(e.code))this.pressed.add(e.code);this.keys.add(e.code);});
    window.addEventListener('keyup',e=>this.keys.delete(e.code));
    window.addEventListener('mousedown',e=>this.buttons.add(e.button));window.addEventListener('mouseup',e=>this.buttons.delete(e.button));
    window.addEventListener('mousemove',e=>{if(this.locked){this.mouseDX+=e.movementX;this.mouseDY+=e.movementY;}});window.addEventListener('contextmenu',e=>e.preventDefault());
  }
  down(code){return this.keys.has(code);} wasPressed(code){return this.pressed.has(code);} button(i){return this.buttons.has(i);}
  consumeLook(){const d={x:this.mouseDX,y:this.mouseDY};this.mouseDX=this.mouseDY=0;return d;}
  endFrame(){this.pressed.clear();}
  clear(){this.keys.clear();this.pressed.clear();this.buttons.clear();this.mouseDX=this.mouseDY=0;}
  async lock(){if(this.testLocked)return true;try{const p=this.canvas.requestPointerLock();if(p?.then)await p;return document.pointerLockElement===this.canvas;}catch{return false;}}
  get locked(){return this.testLocked||document.pointerLockElement===this.canvas;}
}
