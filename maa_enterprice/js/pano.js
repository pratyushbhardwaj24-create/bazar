// 360° panorama viewer for the storefront photo. Drag to look around,
// scroll or pinch to zoom, arrow keys when focused.
import * as THREE from 'three';

export function createPano(container, src, { startLon = 0 } = {}) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, 1, 1, 1100);
  const geo = new THREE.SphereGeometry(500, 60, 40);
  geo.scale(-1, 1, 1);
  const tex = new THREE.TextureLoader().load(src, () => container.classList.add('is-loaded'));
  tex.colorSpace = THREE.SRGBColorSpace;
  scene.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex })));

  let lon = startLon;
  let lat = 0;
  let auto = !reduced;
  let drag = null;
  const pointers = new Map();
  let pinchStart = 0;
  let fovStart = 75;

  const el = renderer.domElement;
  // vertical swipes still scroll the page on phones; sideways drags look around
  el.style.touchAction = 'pan-y';

  el.addEventListener('pointerdown', (e) => {
    el.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, e);
    auto = false;
    if (pointers.size === 1) drag = { x: e.clientX, y: e.clientY, lon, lat };
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchStart = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      fovStart = camera.fov;
    }
    container.classList.add('is-dragging');
  });
  el.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, e);
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      setFov(fovStart * (pinchStart / d));
      return;
    }
    if (!drag) return;
    const k = camera.fov / el.clientHeight;
    lon = drag.lon - (e.clientX - drag.x) * k;
    lat = Math.max(-80, Math.min(80, drag.lat + (e.clientY - drag.y) * k));
  });
  const end = (e) => {
    pointers.delete(e.pointerId);
    if (pointers.size === 0) { drag = null; container.classList.remove('is-dragging'); }
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  el.addEventListener('wheel', (e) => {
    e.preventDefault();
    setFov(camera.fov + e.deltaY * 0.04);
  }, { passive: false });

  container.tabIndex = 0;
  container.addEventListener('keydown', (e) => {
    const step = 6;
    if (e.key === 'ArrowLeft') lon -= step;
    else if (e.key === 'ArrowRight') lon += step;
    else if (e.key === 'ArrowUp') lat = Math.min(80, lat + step);
    else if (e.key === 'ArrowDown') lat = Math.max(-80, lat - step);
    else if (e.key === '+' || e.key === '=') setFov(camera.fov - 5);
    else if (e.key === '-') setFov(camera.fov + 5);
    else return;
    auto = false;
    e.preventDefault();
  });

  function setFov(f) {
    camera.fov = Math.max(35, Math.min(95, f));
    camera.updateProjectionMatrix();
  }

  function resize() {
    const { clientWidth: w, clientHeight: h } = container;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(container);
  resize();

  let visible = false;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(container);

  const target = new THREE.Vector3();
  renderer.setAnimationLoop(() => {
    if (!visible) return;
    if (auto) lon += 0.04;
    const phi = THREE.MathUtils.degToRad(90 - lat);
    const theta = THREE.MathUtils.degToRad(lon);
    target.set(500 * Math.sin(phi) * Math.cos(theta), 500 * Math.cos(phi), 500 * Math.sin(phi) * Math.sin(theta));
    camera.lookAt(target);
    renderer.render(scene, camera);
  });

  return {
    lookAt(l, la = 0) { lon = l; lat = la; auto = false; },
    zoom(delta) { setFov(camera.fov + delta); auto = false; },
  };
}
