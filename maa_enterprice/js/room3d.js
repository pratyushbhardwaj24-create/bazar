// 3D room visualiser: a small living room whose floor and feature wall
// are re-tiled live with procedural textures. Drag to orbit, scroll/pinch to zoom.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { byId, planSurface, drawSurfaceBase, drawPlacements } from './textures.js';

const FLOOR_MM = [4000, 4000];
const WALL_MM = [4000, 3000];
const PX_PER_MM = 0.5;
const GROUT = { light: '#d9d6cf', dark: '#3d4148' };

export function createRoom(container, opts = {}) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.78;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe6e8e7);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 50);
  camera.position.set(2.9, 1.75, 3.4);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(-0.3, 0.75, -0.5);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 2.2;
  controls.maxDistance = 6.2;
  controls.minPolarAngle = 0.35;
  controls.maxPolarAngle = 1.45;
  controls.minAzimuthAngle = -0.15;
  controls.maxAzimuthAngle = 1.65;
  controls.autoRotate = !reduced;
  controls.autoRotateSpeed = 0.6;
  controls.addEventListener('start', () => { controls.autoRotate = false; });
  controls.update();
  // On touch screens let vertical swipes scroll the page; sideways drags turn the room.
  renderer.domElement.style.touchAction = 'pan-y';

  // Lights
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb8b2a6, 0.4));
  const sun = new THREE.DirectionalLight(0xfff1dc, 1.7);
  sun.position.set(-1.2, 4.5, 2.8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -3; sun.shadow.camera.right = 3;
  sun.shadow.camera.top = 3; sun.shadow.camera.bottom = -3;
  sun.shadow.bias = -0.0005;
  sun.shadow.radius = 4;
  scene.add(sun);

  // Surfaces painted from canvas
  function makeSurface(mm) {
    const canvas = document.createElement('canvas');
    canvas.width = mm[0] * PX_PER_MM;
    canvas.height = mm[1] * PX_PER_MM;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const mat = new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.3, metalness: 0 });
    return { canvas, ctx: canvas.getContext('2d'), tex, mat, mm };
  }

  const floor = makeSurface(FLOOR_MM);
  const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), floor.mat);
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.receiveShadow = true;
  scene.add(floorMesh);

  const wall = makeSurface(WALL_MM);
  const wallMesh = new THREE.Mesh(new THREE.PlaneGeometry(4, 3), wall.mat);
  wallMesh.position.set(0, 1.5, -2);
  wallMesh.receiveShadow = true;
  scene.add(wallMesh);

  const paint = new THREE.MeshStandardMaterial({ color: 0xe9e7e1, roughness: 0.95 });
  const sideWall = new THREE.Mesh(new THREE.PlaneGeometry(4, 3), paint);
  sideWall.rotation.y = Math.PI / 2;
  sideWall.position.set(-2, 1.5, 0);
  sideWall.receiveShadow = true;
  scene.add(sideWall);

  // Window on the side wall
  const windowGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.3, 1.4),
    new THREE.MeshBasicMaterial({ color: 0xf4f8ff })
  );
  windowGlow.rotation.y = Math.PI / 2;
  windowGlow.position.set(-1.99, 1.55, 0.6);
  scene.add(windowGlow);
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x1c2b5a, roughness: 0.6 });
  const addFrame = (w, h, x, y, z) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.04, h, w), frameMat);
    b.position.set(x, y, z);
    scene.add(b);
  };
  addFrame(1.38, 0.05, -1.97, 2.27, 0.6);
  addFrame(1.38, 0.05, -1.97, 0.83, 0.6);
  addFrame(0.05, 1.45, -1.97, 1.55, -0.07);
  addFrame(0.05, 1.45, -1.97, 1.55, 1.27);
  addFrame(0.03, 1.45, -1.97, 1.55, 0.6);

  // Skirting
  const skirtMat = new THREE.MeshStandardMaterial({ color: 0xf5f4f0, roughness: 0.5 });
  const sk1 = new THREE.Mesh(new THREE.BoxGeometry(4, 0.08, 0.015), skirtMat);
  sk1.position.set(0, 0.04, -1.99);
  scene.add(sk1);
  const sk2 = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.08, 4), skirtMat);
  sk2.position.set(-1.99, 0.04, 0);
  scene.add(sk2);

  // Furniture for scale
  const fabric = new THREE.MeshStandardMaterial({ color: 0x2f3f73, roughness: 0.9 });
  const sofa = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.42, 0.85), fabric);
  seat.position.y = 0.21;
  const back = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.5, 0.2), fabric);
  back.position.set(0, 0.62, -0.33);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.6, 0.85), fabric);
  armL.position.set(-1.05, 0.3, 0);
  const armR = armL.clone();
  armR.position.x = 1.05;
  [seat, back, armL, armR].forEach((m) => { m.castShadow = true; m.receiveShadow = true; sofa.add(m); });
  sofa.position.set(-0.2, 0.06, -1.45);
  const legMat = new THREE.MeshStandardMaterial({ color: 0x3b2a1e, roughness: 0.6 });
  for (const [x, z] of [[-1, 0.35], [1, 0.35], [-1, -0.35], [1, -0.35]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.02, 0.06), legMat);
    leg.position.set(x - 0.2, 0.03, z - 1.45);
    scene.add(leg);
  }
  scene.add(sofa);

  const tableTop = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.42, 0.04, 48),
    new THREE.MeshPhysicalMaterial({ color: 0xc2913e, roughness: 0.35, metalness: 0.6 })
  );
  tableTop.position.set(0.1, 0.42, -0.25);
  tableTop.castShadow = true;
  scene.add(tableTop);
  const tableLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.12, 0.4, 24), legMat);
  tableLeg.position.set(0.1, 0.2, -0.25);
  tableLeg.castShadow = true;
  scene.add(tableLeg);

  const pot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.12, 0.34, 32),
    new THREE.MeshStandardMaterial({ color: 0xf3f1ea, roughness: 0.4 })
  );
  pot.position.set(-1.6, 0.17, 0.9 - 1.6);
  pot.castShadow = true;
  scene.add(pot);
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x3f7a4f, roughness: 0.8 });
  for (let i = 0; i < 7; i++) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.13 + Math.random() * 0.06, 12, 10), leafMat);
    leaf.position.set(-1.6 + (Math.random() - 0.5) * 0.3, 0.5 + i * 0.09, -0.7 + (Math.random() - 0.5) * 0.3);
    leaf.scale.y = 1.4;
    leaf.castShadow = true;
    scene.add(leaf);
  }

  // Tiling state
  const state = { floor: opts.floor || 'statuario', wall: opts.wall || 'fishscale', layout: 'straight', grout: 'light' };
  const anims = [];

  function retile(surface, matId, layout, animate) {
    const mat = byId[matId];
    surface.mat.roughness = mat.rough;
    surface.mat.clearcoat = mat.rough < 0.3 ? 0.7 : 0;
    surface.mat.clearcoatRoughness = 0.15;
    surface.mat.needsUpdate = true;
    const plan = planSurface(mat, surface.mm, PX_PER_MM, layout);
    const grout = GROUT[state.grout];
    const groutPx = Math.max(1.5, 3 * PX_PER_MM);
    const cx = plan.W * 0.75;
    const cy = plan.H; // near the viewer
    const rot = plan.diagonal ? Math.PI / 4 : 0;
    const center = (p) => {
      let x = p.x + p.w / 2;
      let y = p.y + p.h / 2;
      if (rot) {
        const c = Math.cos(rot); const s = Math.sin(rot);
        [x, y] = [x * c - y * s + plan.W / 2, x * s + y * c + plan.H / 2];
      }
      return [x, y];
    };
    const items = plan.placements
      .map((p) => { const [x, y] = center(p); return { p, d: Math.hypot(x - cx, y - cy), x, y }; })
      .filter((it) => it.x > -plan.pw * 2 && it.x < plan.W + plan.pw * 2 && it.y > -plan.ph * 2 && it.y < plan.H + plan.ph * 2)
      .sort((a, b) => a.d - b.d);

    // cancel a running animation on this surface
    for (let i = anims.length - 1; i >= 0; i--) if (anims[i].surface === surface) anims.splice(i, 1);

    const drawCells = (list) => {
      const ctx = surface.ctx;
      ctx.save();
      if (plan.diagonal) { ctx.translate(plan.W / 2, plan.H / 2); ctx.rotate(rot); }
      ctx.fillStyle = grout;
      for (const it of list) ctx.fillRect(it.p.x - 1, it.p.y - 1, it.p.w + 2, it.p.h + 2);
      ctx.restore();
      drawPlacements(ctx, plan, mat, list.map((it) => it.p), groutPx);
      surface.tex.needsUpdate = true;
    };

    if (!animate || reduced) {
      drawSurfaceBase(surface.ctx, plan, grout);
      drawCells(items);
      return;
    }
    anims.push({ surface, items, drawn: 0, start: performance.now(), duration: 950, drawCells, maxD: items.length ? items[items.length - 1].d : 1 });
  }

  function stepAnims(now) {
    for (let i = anims.length - 1; i >= 0; i--) {
      const a = anims[i];
      const t = Math.min(1, (now - a.start) / a.duration);
      const eased = 1 - Math.pow(1 - t, 2);
      const limit = eased * a.maxD;
      let end = a.drawn;
      while (end < a.items.length && a.items[end].d <= limit) end++;
      if (end > a.drawn) { a.drawCells(a.items.slice(a.drawn, end)); a.drawn = end; }
      if (t >= 1) { if (a.drawn < a.items.length) a.drawCells(a.items.slice(a.drawn)); anims.splice(i, 1); }
    }
  }

  retile(floor, state.floor, state.layout, false);
  retile(wall, state.wall, 'straight', false);

  // Sizing and render loop
  let visible = true;
  function resize() {
    const { clientWidth: w, clientHeight: h } = container;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w < 560 ? 52 : 42;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(container);
  resize();
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(container);

  renderer.setAnimationLoop((now) => {
    if (!visible) return;
    stepAnims(now);
    controls.update();
    renderer.render(scene, camera);
  });

  return {
    state,
    setFloor(id) { state.floor = id; retile(floor, id, state.layout, true); },
    setWall(id) { state.wall = id; retile(wall, id, 'straight', true); },
    setLayout(layout) { state.layout = layout; retile(floor, state.floor, layout, true); },
    setGrout(g) { state.grout = g; retile(floor, state.floor, state.layout, true); retile(wall, state.wall, 'straight', true); },
    resetView() {
      camera.position.set(2.9, 1.75, 3.4);
      controls.target.set(-0.3, 0.75, -0.5);
      controls.update();
    },
    snapshot() { return renderer.domElement.toDataURL('image/jpeg', 0.9); },
  };
}
