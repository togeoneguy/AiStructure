import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.181.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.181.0/examples/jsm/controls/OrbitControls.js';

const captcha=document.querySelector('#captcha'),app=document.querySelector('#app');
captcha.querySelector('form').addEventListener('submit',e=>{e.preventDefault();if(!document.querySelector('#captcha-check').checked)return alert('Поставьте галочку');captcha.hidden=true;app.hidden=false;initScene();});

let scene, camera, renderer, controls, world;
function initScene(){
 const canvas=document.querySelector('#scene');renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(canvas.clientWidth,canvas.clientHeight,false);
 scene=new THREE.Scene();scene.background=new THREE.Color('#0d0f13');camera=new THREE.PerspectiveCamera(45,canvas.clientWidth/canvas.clientHeight,.1,100);camera.position.set(7,6,7);
 controls=new OrbitControls(camera,canvas);controls.enableDamping=true;
 scene.add(new THREE.HemisphereLight(0xffffff,0x26324a,2));const sun=new THREE.DirectionalLight(0xffffff,3);sun.position.set(5,8,4);scene.add(sun);
 const grid=new THREE.GridHelper(20,20,0x38413f,0x20242a);scene.add(grid);world=new THREE.Group();scene.add(world);
 function animate(){controls.update();renderer.setSize(canvas.clientWidth,canvas.clientHeight,false);renderer.render(scene,camera);requestAnimationFrame(animate)}animate();
}
function clearScene(){while(world.children.length)world.remove(world.children[0])}
function buildScene(prompt){clearScene();const hash=[...prompt].reduce((n,c)=>n+c.charCodeAt(0),0);const mats=[0x9dfc72,0x729dfc,0xfc9272,0xd3ad72].map(c=>new THREE.MeshStandardMaterial({color:c,roughness:.45}));
 const count=Math.min(18,5+hash%12);for(let i=0;i<count;i++){const a=(i/count)*Math.PI*2,r=1.5+(i%3)*.55;const h=.7+(hash+i*17)%32/10;const geo=i%4===0?new THREE.BoxGeometry(h,h,h):i%4===1?new THREE.CylinderGeometry(h*.35,h*.45,h,8):i%4===2?new THREE.SphereGeometry(h*.45,16,12):new THREE.ConeGeometry(h*.45,h,8);const m=new THREE.Mesh(geo,mats[i%mats.length]);m.position.set(Math.cos(a)*r,h/2,Math.sin(a)*r);m.rotation.y=(hash+i)/7;world.add(m)}
 const floor=new THREE.Mesh(new THREE.BoxGeometry(6,.12,6),new THREE.MeshStandardMaterial({color:0x1c211e}));floor.position.y=-.06;world.add(floor);document.querySelector('#empty').hidden=true;
}

let selected='openrouter/free';document.querySelectorAll('.model').forEach(b=>b.onclick=()=>{document.querySelectorAll('.model').forEach(x=>x.classList.remove('active'));b.classList.add('active');selected=b.dataset.model;document.querySelector('#model-name').textContent=selected});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
document.querySelector('#prompt-form').addEventListener('submit',async e=>{e.preventChild;});
