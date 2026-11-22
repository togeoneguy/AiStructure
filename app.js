import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.181.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.181.0/examples/jsm/controls/OrbitControls.js';

const captcha=document.querySelector('#captcha');
const app=document.querySelector('#app');

captcha.querySelector('form').addEventListener('submit',e=>{
  e.preventDefault();
  if(!document.querySelector('#captcha-check').checked){alert('Поставьте галочку');return;}
  captcha.hidden=true;
  app.hidden=false;
  initScene();
});

let scene,camera,renderer,controls,world,selected='openrouter/free';

function initScene(){
  const canvas=document.querySelector('#scene');
  renderer=new THREE.WebGLRenderer({canvas,antialias:true});
  renderer.setPixelPixelRatio?.(Math.min(devicePixelRatio,2));
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  scene=new THREE.Scene();scene.background=new THREE.Color('#0d0f13');
  camera=new THREE.PerspectiveCamera(45,canvas.clientWidth/canvas.clientHeight,.1,100);camera.position.set(7,6,7);
  controls=new OrbitControls(camera,canvas);controls.enableDamping=true;
  scene.add(new THREE.HemisphereLight(0xffffff,0x26324a,2));
  const sun=new THREE.DirectionalLight(0xffffff,3);sun.position.set(5,8,4);scene.add(sun);
  scene.add(new THREE.GridHelper(20,20,0x38413f,0x20242a));
  world=new THREE.Group();scene.add(world);
  const animate=()=>{controls.update();renderer.setSize(canvas.clientWidth,canvas.clientHeight,false);renderer.render(scene,camera);requestAnimationFrame(animate)};
  animate();
}

function clearScene(){while(world.children.length)world.remove(world.children[0]);}

function buildScene(plan){
  clearScene();
  const colors=['#9dfc72','#729dfc','#fc9272','#d3ad72'];
  const objects=Array.isArray(plan.objects)?plan.objects.slice(0,12):[];
  if(!objects.length){createFallback(plan.description||plan.name||'');return;}

  objects.forEach((object,i)=>{
    const size=Math.max(.2,Math.min(4,Number(object.size)||1));
    let geometry;
    switch(object.type){
      case 'sphere':geometry=new THREE.SphereGeometry(size*.45,16,12);break;
      case 'cylinder':geometry=new THREE.CylinderGeometry(size*.35,size*.45,size,10);break;
      case 'cone':geometry=new THREE.ConeGeometry(size*.45,size,10);break;
      default:geometry=new THREE.BoxGeometry(size,size,size);
    }
    const validColor=/^#[0-9a-f]{6}$/i.test(object.color||'')?object.color:colors[i%colors.length];
    const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:validColor,roughness:.45}));
    mesh.position.set(Math.max(-8,Math.min(8,Number(object.x)||0)),Math.max(0,Math.min(8,Number(object.y)||0)),Math.max(-8,Math.min(8,Number(object.z)||0)));
    world.add(mesh);
  });

  const floor=new THREE.Mesh(new THREE.BoxGeometry(12,.12,12),new THREE.MeshStandardMaterial({color:0x1c211e}));floor.position.y=-.08;world.add(floor);
  document.querySelector('#empty').hidden=true;
}

function createFallback(prompt){
  const hash=[...prompt].reduce((n,c)=>n+c.charCodeAt(0),0);
  buildScene({objects:Array.from({length:6+hash%7},(_,i)=>({type:['box','sphere','cylinder','cone'][i%4],x:Math.cos(i)*2,y:1,z:Math.sin(i)*2,size:1+(i%3)*.35,color:['#9dfc72','#729dfc','#fc9272','#d3ad72'][i%4]}))});
}

document.querySelectorAll('.model').forEach(button=>button.addEventListener('click',()=>{
  document.querySelectorAll('.model').forEach(item=>item.classList.remove('active'));
  button.classList.add('active');selected=button.dataset.model;
  document.querySelector('#model-name').textContent=selected;
}));

const steps=document.querySelector('#steps');
const messages=document.querySelector('#messages');
function addMessage(text,kind){const node=document.createElement('div');node.className=kind;node.textContent=text;messages.append(node);messages.scrollTop=messages.scrollHeight;}

async function runSteps(prompt){
  const events=['Анализ описания','Запрос к '+selected,'Строю примитивы','Проверка сцены'];
  steps.replaceChildren();
  for(const event of events){const item=document.createElement('div');item.textContent='• '+event;steps.append(item);await new Promise(resolve=>setTimeout(resolve,300));}
}

document.querySelector('#prompt-form').addEventListener('submit',async e=>{
  e.preventDefault();
  const input=document.querySelector('#prompt');
  const prompt=input.value.trim();
  if(!prompt)return;
  input.value='';
  addMessage(prompt,'user');
  runSteps(prompt);

  try{
    const response=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt,model:selected})});
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||'Ошибка сервиса');

    let plan;
    try{plan=JSON.parse(data.reply);}catch{plan={name:'Scene',description:data.reply,objects:[]};}
    buildScene(plan);
    addMessage(plan.description||plan.name||'Сцена создана','assistant');
  }catch(error){
    createFallback(prompt);
    addMessage(error.message+'. Показана локальная демо-сцена.','assistant');
  }
});

window.addEventListener('resize',()=>{if(renderer){renderer.setSize(document.querySelector('#scene').clientWidth,document.querySelector('#scene').clientHeight,false)}});
