import { OPERATIONS } from '../data/maps.js';import { CLASS_LIST,CLASSES } from '../data/classes.js';import { CITY_OPERATION } from '../levels/city-layout.js';
export class Menu {
  constructor({profile}){this.profile=profile;this.selectedOp=CITY_OPERATION.id;this.selectedClass=profile.lastClass||'vanguard';this.deployFn=null;this.build();}
  build(){
    const sel=document.getElementById('operation-select');const ops=[CITY_OPERATION,...OPERATIONS];
    for(const o of ops){const opt=document.createElement('option');opt.value=o.id;opt.textContent=o.id===CITY_OPERATION.id?`FEATURED · ${o.name}`:`${String(o.index).padStart(2,'0')} · ${o.name}`;sel.append(opt);}sel.value=this.selectedOp;
    sel.onchange=()=>{this.selectedOp=sel.value;this.updateOp();};
    const picker=document.getElementById('class-picker');for(const c of CLASS_LIST){const b=document.createElement('button');b.textContent=c.name;b.dataset.id=c.id;b.onclick=()=>{this.selectedClass=c.id;this.updateClass();};picker.append(b);}this.updateOp();this.updateClass();
    document.getElementById('deploy-button').onclick=()=>this.deployFn?.({operationId:this.selectedOp,classId:this.selectedClass,endless:false,quality:this.profile.settings.quality||'high'});
    document.getElementById('endless-button').onclick=()=>this.deployFn?.({operationId:'endless',classId:this.selectedClass,endless:true,quality:this.profile.settings.quality||'high'});
  }
  updateOp(){const o=this.selectedOp===CITY_OPERATION.id?CITY_OPERATION:OPERATIONS.find(x=>x.id===this.selectedOp);document.getElementById('operation-description').textContent=o.description;}
  updateClass(){const c=CLASSES[this.selectedClass];document.getElementById('class-description').textContent=`${c.tagline}. ${c.ability}: ${c.abilityDescription}`;document.querySelectorAll('#class-picker button').forEach(b=>b.classList.toggle('selected',b.dataset.id===c.id));}
  onDeploy(fn){this.deployFn=fn;}show(){document.getElementById('menu').classList.add('show');}
}
