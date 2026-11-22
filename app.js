import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.181.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.181.0/examples/jsm/controls/OrbitControls.js';
import { GLTFExporter } from 'https://cdn.jsdelivr.net/npm/three@0.181.0/examples/jsm/exporters/GLTFExporter.js';

const canvas=document.querySelector('#scene');
const modelSelect=document.querySelector('#model-select');
const messages=document.querySelector('#messages');
const steps=document.querySelector('#steps');
const statusText=document.querySelector('#status-text');
const activityState=document.querySelector('#activity-state');
const activityPulse=document.querySelector('.activity-pulse');
const sendButton=document.querySelector('#send-button');
let scene,camera,renderer,controls,world,selectedModel='',isBusy=false;
const fallbackModels=[
  {id:'openrouter/free',name:'OpenRouter Free — авто-выбор'},
  {id:'deepseek/deepseek-r1:free',name:'DeepSeek R1 — бесплатный тариф'},
  {id:'google/gemma-3-27b-it:free',name:'Gemma 3 27B — бесплатный тариф'}
];

function initScene(){
  scene=new THREE.Scene();scene.background=new THREE.Color('#0e1116');
  camera=new THREE.PerspectiveCamera(42,1,.1,500);camera.position.set(9,8,11);
  renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.setSize(canvas.clientWidth,canvas.clientHeight,false);
  controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.075;controls.target.set(0,1,0);controls.minDistance=2;controls.maxDistance=80;
  scene.add(new THREE.HemisphereLight(0xe4eeff,0x293329,2.1));
  const keyLight=new THREE.DirectionalLight(0xffefcf,3.2);keyLight.position.set(7,12,8);scene.add(keyLight);
  const fillLight=new THREE.DirectionalLight(0x9dbfff,1.1);fillLight.position.set(-7,5,-5);scene.add(fillLight);
  const grid=new THREE.GridHelper(40,40,0x48544a,0x252b31);grid.position.y=-.035;scene.add(grid);
  const axes=new THREE.AxesHelper(1.2);axes.position.set(.03,.02,.03);scene.add(axes);
  world=new THREE.Group();world.name='AiStructure Scene';scene.add(world);
  const resizeObserver=new ResizeObserver(()=>resizeScene());resizeObserver.observe(canvas.parentElement);
  const animate=()=>{controls.update();renderer.render(scene,camera);requestAnimationFrame(animate)};animate();
}
function resizeScene(){if(!renderer||!canvas.clientWidth||!canvas.clientHeight)return;renderer.setSize(canvas.clientWidth,canvas.clientHeight,false);camera.aspect=canvas.clientWidth/canvas.clientHeight;camera.updateProjectionMatrix();}
function clearScene(){while(world.children.length){const object=world.children.pop();object.geometry?.dispose();if(Array.isArray(object.material))object.material.forEach(m=>m.dispose());else object.material?.dispose();}}
function setView(){if(!world||!world.children.length){camera.position.set(9,8,11);controls.target.set(0,1,0);controls.update();return;}const bounds=new THREE.Box3().setFromObject(world);const center=bounds.getCenter(new THREE.Vector3());const size=bounds.getSize(new THREE.Vector3());const radius=Math.max(size.x,size.y,size.z,2);controls.target.copy(center);camera.position.copy(center).add(new THREE.Vector3(radius*1.25,radius*.9,radius*1.4));camera.near=Math.max(.01,radius/100);camera.far=radius*100;camera.updateProjectionMatrix();controls.update();}
function addFloor(){const floor=new THREE.Mesh(new THREE.PlaneGeometry(30,30),new THREE.MeshStandardMaterial({color:'#242a27',roughness:.95,side:THREE.DoubleSide}));floor.rotation.x=-Math.PI/2;floor.position.y=-.04;floor.name='Ground';world.add(floor);}
function safeNumber(value,fallback=0,min=-20,max=20){const number=Number(value);return Number.isFinite(number)?THREE.MathUtils.clamp(number,min,max):fallback;}
function buildScene(plan){
  clearScene();
  const types={box:THREE.BoxGeometry,sphere:THREE.SphereGeometry,cylinder:THREE.CylinderGeometry,cone:THREE.ConeGeometry};
  const objects=Array.isArray(plan?.objects)?plan.objects.slice(0,40):[];
  for(const [index,item] of objects.entries()){
    const type=types[item?.type]?'': 'box';
    const shape=types[item?.type]||THREE.BoxGeometry;
    const size=safeNumber(item?.size,1,.15,8);
    let geometry;
    if(shape===THREE.SphereGeometry)geometry=new THREE.SphereGeometry(size/2,24,16);
    else if(shape===THREE.CylinderGeometry)geometry=new THREE.CylinderGeometry(size*.35,size*.45,size,16);
    else if(shape===THREE.ConeGeometry)geometry=new THREE.ConeGeometry(size*.5,size,16);
    else geometry=new THREE.BoxGeometry(size,size,size);
    const color=/^#[0-9a-f]{6}$/i.test(item?.color||'')?item.color:['#a4f477','#8eb8ff','#ffc27a','#d7a8ff'][index%4];
    const material=new THREE.MeshStandardMaterial({color,roughness:.56,metalness:.04});
    const mesh=new THREE.Mesh(geometry,material);mesh.name=String(item?.name||`${type||item?.type||'Object'} ${index+1}`).slice(0,64);
    mesh.position.set(safeNumber(item?.x),safeNumber(item?.y,size/2,0,20),safeNumber(item?.z));
    mesh.rotation.set(safeNumber(item?.rotationX,0,-6.28,6.28),safeNumber(item?.rotationY,0,-6.28,6.28),safeNumber(item?.rotationZ,0,-6.28,6.28));
    mesh.castShadow=true;mesh.receiveShadow=true;world.add(mesh);
  }
  if(!objects.length)createDemoScene(plan?.description||plan?.name||'');
  addFloor();
  document.querySelector('#empty').hidden=true;
  document.querySelector('#scene-title').textContent=String(plan?.name||'Созданная сцена').slice(0,64);
  setView();
}
function createDemoScene(prompt=''){const palette=['#a4f477','#8eb8ff','#ffc27a','#d7a8ff'];for(let i=0;i<8;i++){const mesh=new THREE.Mesh(i%2?new THREE.BoxGeometry(1.4,1.4,1.4):new THREE.CylinderGeometry(.55,.72,1.7,12),new THREE.MeshStandardMaterial({color:palette[i%4],roughness:.65}));const angle=i/8*Math.PI*2;mesh.position.set(Math.cos(angle)*2,0.85,Math.sin(angle)*2);mesh.name=`Demo object ${i+1}`;world.add(mesh);}if(prompt)document.querySelector('#scene-title').textContent='Демо-сцена';}
function addMessage(text,kind='assistant'){
  const row=document.createElement('div');row.className=`message ${kind==='user'?'user-message':'assistant-message'}`;
  if(kind!=='user'){const avatar=document.createElement('span');avatar.className='message-avatar';avatar.textContent='A';row.append(avatar);}
  const content=document.createElement('div');content.className='message-content';content.textContent=text;row.append(content);messages.append(row);messages.scrollTop=messages.scrollHeight;
}
function setActivity(label,detail,busy=false){activityState.textContent=label;steps.textContent=detail;activityPulse.classList.toggle('working',busy);statusText.textContent=busy?'ИИ строит сцену':'Студия готова';}
async function loadModels(){
  try{
    const response=await fetch('/api/models',{headers:{Accept:'application/json'}});
    if(!response.ok)throw new Error('API-моделей недоступно');
    const data=await response.json();
    const models=Array.isArray(data.models)&&data.models.length?data.models:fallbackModels;
    renderModels(models,data.source==='live');
  }catch{renderModels(fallbackModels,false);document.querySelector('#model-note').textContent='Каталог не загрузился. В статическом хостинге чат/API не работает — нужен запуск сервера.';}
}
function renderModels(models,isLive){
  modelSelect.replaceChildren();
  for(const model of models){const option=document.createElement('option');option.value=model.id;option.textContent=model.name||model.id;modelSelect.append(option);}
  selectedModel=modelSelect.value;
  document.querySelector('#model-note').textContent=isLive?'Только модели с нулевой ценой в каталоге OpenRouter. Лимиты могут меняться.':'Список-кэш бесплатных вариантов. Для чата нужен OPENROUTER_API_KEY на сервере.';
}
modelSelect.addEventListener('change',()=>{selectedModel=modelSelect.value;const option=modelSelect.selectedOptions[0];document.querySelector('#model-note').textContent=`Выбрана ${option?.textContent||selectedModel}. Бесплатные лимиты устанавливает провайдер.`;});

async function sendPrompt(prompt){
  if(isBusy)return;
  isBusy=true;sendButton.disabled=true;setActivity('Работаю','Проверяю описание…',true);addMessage(prompt,'user');
  try{
    const response=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({prompt,model:selectedModel})});
    const data=await response.json().catch(()=>({}));
    if(!response.ok){if(response.status===503)throw new Error('API-ключ не настроен. Запустите сервер и задайте OPENROUTER_API_KEY; GitHub Pages не запускает backend.');throw new Error(data.error||`Сервис вернул ошибку ${response.status}`);}
    setActivity('Генерирую сцену','Ответ модели получен — разбираю 3D-план…',true);
    let plan;try{plan=JSON.parse(data.reply);}catch{throw new Error('Модель вернула ответ не в формате плана сцены. Попробуйте другую бесплатную модель.');}
    if(!plan||!Array.isArray(plan.objects))throw new Error('В ответе нет списка объектов. Попробуйте переформулировать запрос.');
    buildScene(plan);addMessage(plan.description||`Сцена «${plan.name||'Без названия'}» создана.`);setActivity('Готово',`${plan.objects.length} объектов в сцене.`);
  }catch(error){addMessage(error.message||'Не удалось выполнить запрос.');setActivity('Не удалось',error.message||'Проверьте соединение и настройки API.');}
  finally{isBusy=false;sendButton.disabled=false;}
}
document.querySelector('#prompt-form').addEventListener('submit',event=>{event.preventDefault();const input=document.querySelector('#prompt');const prompt=input.value.trim();if(prompt){input.value='';sendPrompt(prompt);}});
document.querySelector('#prompt').addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();document.querySelector('#prompt-form').requestSubmit();}});
document.querySelector('#view-home').addEventListener('click',setView);
document.querySelector('#reset-scene').addEventListener('click',()=>{clearScene();document.querySelector('#empty').hidden=false;document.querySelector('#scene-title').textContent='Новая сцена';setView();setActivity('Ожидаю задачу','Опиши объект, чтобы начать.');});
document.querySelector('#export-scene').addEventListener('click',()=>{
  if(!world.children.length){setActivity('Нет объектов','Сначала создай сцену, затем экспортируй её.');return;}
  const exporter=new GLTFExporter();exporter.parse(world,result=>{const blob=new Blob([result],{type:'model/gltf-binary'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='aistructure-scene.glb';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},error=>setActivity('Экспорт не удался',String(error)),{binary:true});
});
initScene();loadModels();
