import * as THREE from "three";

export function mountEffects(mode) {
  const scope = {
    frames: new Set(), cleanups: [], active: true,
    frame(callback) {
      if (!this.active) return;
      const id = requestAnimationFrame((time) => {
        this.frames.delete(id);
        if (this.active) callback(time);
      });
      this.frames.add(id);
      return id;
    },
    listen(target, name, callback) {
      target.addEventListener(name, callback);
      this.cleanups.push(() => target.removeEventListener(name, callback));
    },
  };
// Effects Engine

// THREE.JS PARTICLE NETWORK (Hero)
function initParticles() {
  const canvas = document.getElementById('global-particles');
  if (!canvas || typeof THREE === 'undefined') return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  scope.cleanups.push(() => {
    scene.traverse(object => {
      object.geometry?.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach(material => material?.dispose());
    });
    renderer.dispose();
  });
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Particles
  const particleCount = 120;
  const positions = new Float32Array(particleCount * 3);
  const velocities = [];
  const spread = 20;

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * spread;
    positions[i * 3 + 1] = (Math.random() - 0.5) * spread;
    positions[i * 3 + 2] = (Math.random() - 0.5) * spread;
    velocities.push({
      x: (Math.random() - 0.5) * 0.008,
      y: (Math.random() - 0.5) * 0.008,
      z: (Math.random() - 0.5) * 0.008,
    });
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0xFFA820,
    size: 0.06,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);

  // Lines between nearby particles
  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0xFFA820,
    transparent: true,
    opacity: 0.08,
    blending: THREE.AdditiveBlending,
  });

  let linesMesh = null;

  function updateLines() {
    if (linesMesh) { scene.remove(linesMesh); linesMesh.geometry.dispose(); }

    const linePositions = [];
    const threshold = 4;

    for (let i = 0; i < particleCount; i++) {
      for (let j = i + 1; j < particleCount; j++) {
        const dx = positions[i * 3] - positions[j * 3];
        const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
        const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < threshold) {
          linePositions.push(
            positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2],
            positions[j * 3], positions[j * 3 + 1], positions[j * 3 + 2]
          );
        }
      }
    }

    if (linePositions.length > 0) {
      const lineGeometry = new THREE.BufferGeometry();
      lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
      linesMesh = new THREE.LineSegments(lineGeometry, lineMaterial);
      scene.add(linesMesh);
    }
  }

  camera.position.z = 12;

  // Mouse interaction
  let mouseX = 0, mouseY = 0;
  scope.listen(document, 'mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
  });

  // Animation
  let frame = 0;
  function animate() {
    scope.frame(animate);
    frame++;

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] += velocities[i].x;
      positions[i * 3 + 1] += velocities[i].y;
      positions[i * 3 + 2] += velocities[i].z;

      // Bounce
      const half = spread / 2;
      if (Math.abs(positions[i * 3]) > half) velocities[i].x *= -1;
      if (Math.abs(positions[i * 3 + 1]) > half) velocities[i].y *= -1;
      if (Math.abs(positions[i * 3 + 2]) > half) velocities[i].z *= -1;
    }

    geometry.attributes.position.needsUpdate = true;

    // Update lines every 3 frames for performance
    if (frame % 3 === 0) updateLines();

    // Subtle camera movement following mouse
    camera.position.x += (mouseX * 2 - camera.position.x) * 0.02;
    camera.position.y += (mouseY * 1.5 - camera.position.y) * 0.02;
    camera.lookAt(0, 0, 0);

    // Slow rotation
    points.rotation.y += 0.0005;
    if (linesMesh) linesMesh.rotation.y += 0.0005;

    renderer.render(scene, camera);
  }

  animate();

  // Resize handler
  scope.listen(window, 'resize', () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });
}

// THREE.JS WIREFRAME GEAR (Home Hero)
function initGear() {
  const canvas = document.getElementById('gear-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  scope.cleanups.push(() => {
    scene.traverse(object => {
      object.geometry?.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach(material => material?.dispose());
    });
    renderer.dispose();
  });
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Build gear shape as points + lines
  const gearGroup = new THREE.Group();

  // Gear parameters
  const teeth = 16;
  const innerR = 2.2;
  const outerR = 3.0;
  const toothDepth = 0.6;
  const thickness = 0.6;

  // Generate gear profile points (2D, then extrude)
  function gearProfile() {
    const pts = [];
    const step = (Math.PI * 2) / teeth;
    for (let i = 0; i < teeth; i++) {
      const a0 = i * step;
      const a1 = a0 + step * 0.15;
      const a2 = a0 + step * 0.35;
      const a3 = a0 + step * 0.5;
      const a4 = a0 + step * 0.65;
      const a5 = a0 + step * 0.85;
      // Outer base
      pts.push([Math.cos(a0) * outerR, Math.sin(a0) * outerR]);
      pts.push([Math.cos(a1) * outerR, Math.sin(a1) * outerR]);
      // Tooth rise
      pts.push([Math.cos(a2) * (outerR + toothDepth), Math.sin(a2) * (outerR + toothDepth)]);
      // Tooth top
      pts.push([Math.cos(a3) * (outerR + toothDepth), Math.sin(a3) * (outerR + toothDepth)]);
      // Tooth fall
      pts.push([Math.cos(a4) * (outerR + toothDepth), Math.sin(a4) * (outerR + toothDepth)]);
      // Back to base
      pts.push([Math.cos(a5) * outerR, Math.sin(a5) * outerR]);
    }
    return pts;
  }

  const profile = gearProfile();

  // Two gears layered: coral base + amber on top
  // Light point follows cursor, clamped to max radius from gear center
  const defaultLightPos = new THREE.Vector3(-(outerR + toothDepth), outerR + toothDepth, 0);
  const lightPoint = defaultLightPos.clone();
  const maxLightRadius = defaultLightPos.length(); // distance of default position from center
  const maxDist = (outerR + toothDepth) * 2.5;

  const amberMaterial = new THREE.LineBasicMaterial({
    color: 0xFFA820,
    vertexColors: true,
    transparent: true,
    opacity: 1.0,
    blending: THREE.AdditiveBlending,
  });

  const coralMaterial = new THREE.LineBasicMaterial({
    color: 0xad4400,
    vertexColors: true,
    transparent: true,
    opacity: 1.0,
    blending: THREE.AdditiveBlending,
  });

  const glowMaterial = new THREE.LineBasicMaterial({
    color: 0xFFA820,
    transparent: true,
    opacity: 0.15,
    blending: THREE.AdditiveBlending,
  });

  // Track all geometry pairs for per-frame color updates
  const gearLinePairs = []; // [{amberGeo, coralGeo}, ...]

  function addGearLine(geo) {
    const amberGeo = geo;
    const coralGeo = geo.clone();
    // Initialize color attributes
    const count = amberGeo.attributes.position.count;
    amberGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    coralGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    gearLinePairs.push({ amberGeo, coralGeo });
    gearGroup.add(new THREE.Line(amberGeo, amberMaterial));
    gearGroup.add(new THREE.Line(coralGeo, coralMaterial));
  }

  // Update vertex colors based on world-space position each frame
  const _v = new THREE.Vector3();
  function updateGearColors() {
    for (const pair of gearLinePairs) {
      const pos = pair.amberGeo.attributes.position;
      const amberCol = pair.amberGeo.attributes.color;
      const coralCol = pair.coralGeo.attributes.color;
      for (let i = 0; i < pos.count; i++) {
        _v.set(pos.getX(i), pos.getY(i), pos.getZ(i));
        // Transform to world space
        gearGroup.localToWorld(_v);
        const dist = _v.distanceTo(lightPoint);
        const t = Math.min(dist / maxDist, 1.0);
        // How far is the light from gear center (0 = center, 1 = edge)
        const intensity = Math.min(lightPoint.length() / maxLightRadius, 1.0);
        // Amber: lerp between full brightness (cursor at center) and distance-based (cursor at edge)
        const a = 1.0 - (1.0 - t) * intensity;
        amberCol.setXYZ(i, a, a, a);
        // Coral: only visible when cursor is at edge, near the light point
        const c = Math.pow(1 - t, 0.5) * intensity;
        coralCol.setXYZ(i, c, c, c);
      }
      amberCol.needsUpdate = true;
      coralCol.needsUpdate = true;
    }
  }

  // Front face outline
  function faceLoop(z) {
    const pts = [];
    for (const p of profile) {
      pts.push(new THREE.Vector3(p[0], p[1], z));
    }
    pts.push(pts[0].clone());
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    return geo;
  }

  const frontGeo = faceLoop(thickness / 2);
  const backGeo = faceLoop(-thickness / 2);
  addGearLine(frontGeo);
  addGearLine(backGeo);

  // Glow copies
  gearGroup.add(new THREE.Line(frontGeo.clone(), glowMaterial));
  gearGroup.add(new THREE.Line(backGeo.clone(), glowMaterial));

  // Connecting edges (front to back at each profile point)
  for (let i = 0; i < profile.length; i += 3) {
    const p = profile[i];
    const connGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(p[0], p[1], thickness / 2),
      new THREE.Vector3(p[0], p[1], -thickness / 2),
    ]);
    addGearLine(connGeo);
  }

  // Inner circle (hub)
  const hubR = 1.0;
  const hubPts = [];
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    hubPts.push(new THREE.Vector3(Math.cos(a) * hubR, Math.sin(a) * hubR, thickness / 2));
  }
  addGearLine(new THREE.BufferGeometry().setFromPoints(hubPts));

  const hubBack = [];
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    hubBack.push(new THREE.Vector3(Math.cos(a) * hubR, Math.sin(a) * hubR, -thickness / 2));
  }
  addGearLine(new THREE.BufferGeometry().setFromPoints(hubBack));

  // Spokes connecting hub to gear body
  const spokeCount = 6;
  for (let i = 0; i < spokeCount; i++) {
    const a = (i / spokeCount) * Math.PI * 2;
    const spoke = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(Math.cos(a) * hubR, Math.sin(a) * hubR, 0),
      new THREE.Vector3(Math.cos(a) * innerR, Math.sin(a) * innerR, 0),
    ]);
    addGearLine(spoke);
  }

  // Center axle hole
  const axleR = 0.4;
  const axlePts = [];
  for (let i = 0; i <= 32; i++) {
    const a = (i / 32) * Math.PI * 2;
    axlePts.push(new THREE.Vector3(Math.cos(a) * axleR, Math.sin(a) * axleR, thickness / 2 + 0.01));
  }
  addGearLine(new THREE.BufferGeometry().setFromPoints(axlePts));

  // Initial slight angle so it's not a flat front view
  gearGroup.rotation.x = -0.4;
  gearGroup.rotation.y = -0.3;

  scene.add(gearGroup);
  camera.position.set(0, 0, window.innerWidth <= 1024 ? 14 : 11);

  // Mouse interaction
  let mouseX = 0, mouseY = 0;
  let gearMouseX = 0, gearMouseY = 0;
  const _raycaster = new THREE.Raycaster();
  const _gearPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const _intersect = new THREE.Vector3();

  scope.listen(document, 'mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(e.clientY / window.innerHeight) * 2 + 1;

    // Mouse position relative to gear canvas
    const rect = canvas.getBoundingClientRect();
    gearMouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    gearMouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  });

  function animate() {
    scope.frame(animate);

    // Update light point to follow cursor, clamped to max radius
    _raycaster.setFromCamera({ x: gearMouseX, y: gearMouseY }, camera);
    if (_raycaster.ray.intersectPlane(_gearPlane, _intersect)) {
      // Clamp to max radius
      const dist = _intersect.length();
      if (dist > maxLightRadius) {
        _intersect.normalize().multiplyScalar(maxLightRadius);
      }
      lightPoint.lerp(_intersect, 0.1); // smooth follow
    }

    // Slow rotation
    gearGroup.rotation.z += 0.003;

    // Tilt with mouse (additive to base angle)
    gearGroup.rotation.x += (-0.4 + mouseY * 0.25 - gearGroup.rotation.x) * 0.03;
    gearGroup.rotation.y += (-0.3 + mouseX * 0.25 - gearGroup.rotation.y) * 0.03;

    // Update world matrix before computing world-space colors
    gearGroup.updateMatrixWorld(true);
    updateGearColors();

    renderer.render(scene, camera);
  }

  animate();

  scope.listen(window, 'resize', () => {
    if (canvas.clientWidth === 0 || canvas.clientHeight === 0) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    camera.aspect = w / h;
    camera.position.z = window.innerWidth <= 1024 ? 14 : 11;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  });
}

// THREE.JS WIREFRAME CALENDAR (Events Hero)
// Honestly unsure if this looks good
function initCalendar() {
  const canvas = document.getElementById('calendar-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  scope.cleanups.push(() => {
    scene.traverse(object => {
      object.geometry?.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach(material => material?.dispose());
    });
    renderer.dispose();
  });
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const AMBER = 0xFFA820, CORAL = 0xFF944F;
  // page geometry: origin at the top edge, where the binding is
  const W = 5.2, H = 4.4, CORNER = 0.22, HEADER = 0.8, COLS = 7, ROWS = 5;
  const cellW = W / COLS, cellH = (H - HEADER) / ROWS;

  function lineMat(opacity, color = AMBER) {
    return new THREE.LineBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });
  }
  function fillMat(opacity, color = CORAL) {
    return new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false });
  }
  function v(x, y, z) { return new THREE.Vector3(x, y, z); }
  function roundedRect(w, h, r, z) {
    const shape = new THREE.Shape();
    const x = -w / 2, y = -h;
    shape.moveTo(x + r, y);
    shape.lineTo(x + w - r, y); shape.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
    shape.lineTo(x + w, y + h - r); shape.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
    shape.lineTo(x + r, y + h); shape.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
    shape.lineTo(x, y + r); shape.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
    return shape.getPoints(6).map(pt => v(pt.x, pt.y, z));
  }
  function cellCenter(col, row) {
    return { x: -W / 2 + col * cellW + cellW / 2, y: -HEADER - row * cellH - cellH / 2 };
  }

  // one page of the stack. `markers` are {c, r, today?} cells with an event
  function makePage(markers, firstDay, lastDay) {
    const page = new THREE.Group();
    const mats = []; // [material, baseOpacity, markerOnly]
    const track = (m, base, marker = false) => { mats.push([m, base, marker]); return m; };
    const edge = track(lineMat(0.9), 0.9), mid = track(lineMat(0.42), 0.42), faint = track(lineMat(0.16), 0.16);

    page.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(roundedRect(W, H, CORNER, 0)), edge));
    page.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([v(-W / 2, -HEADER, 0.005), v(W / 2, -HEADER, 0.005)]), edge));

    // weekday ticks in the header, short dashes centred on each column
    const ticks = [];
    for (let c = 0; c < COLS; c++) {
      const { x } = cellCenter(c, 0);
      ticks.push(v(x - cellW * 0.16, -HEADER * 0.55, 0.005), v(x + cellW * 0.16, -HEADER * 0.55, 0.005));
    }
    page.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(ticks), mid));

    const grid = [];
    for (let c = 1; c < COLS; c++) grid.push(v(-W / 2 + c * cellW, -HEADER, 0), v(-W / 2 + c * cellW, -H + 0.001, 0));
    for (let r = 1; r < ROWS; r++) grid.push(v(-W / 2, -HEADER - r * cellH, 0), v(W / 2, -HEADER - r * cellH, 0));
    page.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(grid), faint));

    // a small tick in each day cell stands in for the date number; cells outside the month stay empty
    const days = [];
    for (let i = 0; i < COLS * ROWS; i++) {
      if (i < firstDay || i > lastDay) continue;
      const { x, y } = cellCenter(i % COLS, Math.floor(i / COLS));
      days.push(v(x - cellW * 0.36, y + cellH * 0.3, 0.005), v(x - cellW * 0.36 + 0.16, y + cellH * 0.3, 0.005));
    }
    page.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(days), mid));

    const pulses = [];
    markers.forEach(({ c, r, today }, i) => {
      const { x, y } = cellCenter(c, r);
      const mw = cellW * 0.7, mh = cellH * 0.58;
      const fill = track(fillMat(0.14), 0.14, true);
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(mw, mh), fill);
      mesh.position.set(x, y, 0.01);
      page.add(mesh);
      const outline = track(lineMat(0.8, CORAL), 0.8, true);
      page.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([
        v(x - mw / 2, y + mh / 2, 0.012), v(x + mw / 2, y + mh / 2, 0.012), v(x + mw / 2, y - mh / 2, 0.012), v(x - mw / 2, y - mh / 2, 0.012),
      ]), outline));
      pulses.push({ fill, outline, phase: i * 1.7 });
      if (today) {
        const ring = [];
        const rr = Math.min(cellW, cellH) * 0.46;
        for (let k = 0; k <= 40; k++) { const a = (k / 40) * Math.PI * 2; ring.push(v(x + Math.cos(a) * rr, y + Math.sin(a) * rr, 0.015)); }
        page.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(ring), track(lineMat(0.95), 0.95, true)));
      }
    });

    page.userData = { mats, pulses };
    page.setDepth = (index) => {
      // only the front page shows its events; pages behind are just faint paper
      const mult = [1, 0.3, 0.16, 0.09][index] ?? 0.08;
      page.position.z = -index * 0.14;
      page.rotation.set(0, 0, index ? (index % 2 ? 0.012 : -0.012) * index : 0);
      mats.forEach(([m, base, marker]) => { m.opacity = marker && index ? 0 : base * mult; });
      page.userData.mult = index ? 0 : 1;
    };
    return page;
  }

  const cal = new THREE.Group();
  const stack = [
    makePage([{ c: 1, r: 0 }, { c: 4, r: 1 }, { c: 2, r: 2, today: true }, { c: 5, r: 3 }], 2, 32),
    makePage([{ c: 0, r: 1 }, { c: 3, r: 2 }, { c: 6, r: 3, today: true }], 5, 34),
    makePage([{ c: 2, r: 0 }, { c: 5, r: 2 }, { c: 1, r: 4 }], 0, 29),
    makePage([{ c: 3, r: 1, today: true }, { c: 4, r: 3 }], 3, 33),
  ];
  stack.forEach((page, i) => { page.setDepth(i); cal.add(page); });

  // ring binding along the top edge
  const ringMat = lineMat(0.9);
  for (let i = -1; i <= 1; i++) {
    const rx = i * (W / 3.2), pts = [];
    for (let k = 0; k <= 36; k++) {
      const a = (k / 36) * Math.PI * 2;
      pts.push(v(rx, 0.02 + Math.sin(a) * 0.27, -0.2 + Math.cos(a) * 0.27));
    }
    cal.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), ringMat));
    const slot = [v(rx - 0.09, -0.02, 0.01), v(rx + 0.09, -0.02, 0.01)];
    cal.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(slot), lineMat(0.5)));
  }

  cal.position.y = H / 2 - 0.1;
  cal.rotation.x = -0.22;
  cal.rotation.y = -0.18;
  scene.add(cal);
  camera.position.set(0, 0.2, window.innerWidth <= 1024 ? 14 : 11);

  let mouseX = 0, mouseY = 0;
  scope.listen(document, 'mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
  });

  function animate(now) {
    scope.frame(animate);
    const t = now / 1000;

    cal.rotation.z = Math.sin(t * 0.5) * 0.025;
    cal.rotation.x += (-0.22 + mouseY * 0.14 - cal.rotation.x) * 0.04;
    cal.rotation.y += (-0.18 + mouseX * 0.14 - cal.rotation.y) * 0.04;

    stack.forEach(page => page.userData.pulses.forEach(({ fill, outline, phase }) => {
      const k = 0.5 + 0.5 * Math.sin(t * 1.6 + phase);
      fill.opacity = (0.08 + 0.12 * k) * page.userData.mult;
      outline.opacity = (0.55 + 0.4 * k) * page.userData.mult;
    }));

    renderer.render(scene, camera);
  }
  scope.frame(animate);

  scope.listen(window, 'resize', () => {
    if (canvas.clientWidth === 0 || canvas.clientHeight === 0) return;
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.position.z = window.innerWidth <= 1024 ? 14 : 11;
    camera.updateProjectionMatrix();
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  });
}


function initHeroParticles() {
  const canvas = document.querySelector('.hero-particles');
  if (!canvas) return;
  setupDualHelixCanvas(canvas);
}

function setupDualHelixCanvas(canvas) {
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  // Tuning knobs.
  const POINTS = 80;           // samples per strand (over the full helix length)
  const ROT_MS = 11000;        // ms for one full helix rotation
  const TURNS_PER_1000 = 4;    // visible helix turns per 1000 strand-units
  const TILT_DEG = 26;         // outward lean (left helix +, right helix −)
  const ORIGIN_FRAC = 0.20;    // helix top x-position as fraction of width
  const TEAL = '16, 186, 224';

  let w = 0, h = 0;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return false;
    w = rect.width;
    h = rect.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return true;
  }

  // Draw one helix anchored at (originX, 0) and tilted by tiltDeg degrees.
  // Positive tilt rotates clockwise in canvas coords (y-down), so a point
  // at local (0, +y) maps to world (originX − y·sin(tilt), y·cos(tilt)) —
  // i.e. positive tilt swings the bottom of the strand to the LEFT.
  function drawHelix(now, originX, tiltDeg) {
    const tiltRad = (tiltDeg * Math.PI) / 180;
    // Strand long enough to extend past the viewport bottom even after
    // tilting — scale with viewport diagonal.
    const length = Math.max(h * 1.7, Math.hypot(w, h) * 0.95);
    const amp = Math.min(w * 0.055, 60);
    const turns = (length / 1000) * TURNS_PER_1000;
    const phase = (now / ROT_MS) * Math.PI * 2;

    // Sample strand points in local (un-tilted) coords.
    const s1 = new Array(POINTS);
    const s2 = new Array(POINTS);
    for (let i = 0; i < POINTS; i++) {
      const t = i / (POINTS - 1);
      const y = t * length;
      const a = t * turns * Math.PI * 2 + phase;
      s1[i] = { x: amp * Math.cos(a),           y, depth: Math.sin(a) };
      s2[i] = { x: amp * Math.cos(a + Math.PI), y, depth: Math.sin(a + Math.PI) };
    }

    ctx.save();
    ctx.translate(originX, 0);
    ctx.rotate(tiltRad);

    // Rungs first (so dots paint over them at crossings).
    for (let i = 0; i < POINTS; i++) {
      const sep = Math.abs(s1[i].x - s2[i].x) / (amp * 2);
      const a = sep * 0.22;
      if (a < 0.01) continue;
      ctx.strokeStyle = `rgba(${TEAL}, ${a.toFixed(3)})`;
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(s1[i].x, s1[i].y);
      ctx.lineTo(s2[i].x, s2[i].y);
      ctx.stroke();
    }

    // Particles z-sorted back-to-front.
    const all = s1.concat(s2);
    all.sort((p, q) => p.depth - q.depth);
    for (const p of all) {
      const front = (p.depth + 1) / 2;
      const a = 0.18 + 0.72 * front;
      const r = 2.0 + 2.6 * front;
      ctx.fillStyle = `rgba(${TEAL}, ${a.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function draw(now) {
    if (w === 0 || h === 0) {
      if (!resize()) {
        scope.frame(draw);
        return;
      }
    }

    ctx.clearRect(0, 0, w, h);
    // Left helix anchored at 20% of viewport width, tilts +26° → bottom
    // swings left, off-screen. Right is the mirror.
    drawHelix(now, w * ORIGIN_FRAC,         TILT_DEG);
    drawHelix(now, w * (1 - ORIGIN_FRAC),  -TILT_DEG);
    scope.frame(draw);
  }

  resize();
  scope.listen(window, 'resize', resize);
  scope.frame(draw);
}


  const initializers = mode === "hackathon" ? [initHeroParticles] : mode === "background" ? [initParticles] : [...(mode === "home" ? [initGear] : []), ...(mode === "events" ? [initCalendar] : [])];
  initializers.forEach(initialize => {
    try { initialize(); }
    catch (error) { console.warn("Decorative artwork is unavailable", error); }
  });
  return () => {
    scope.active = false;
    scope.frames.forEach(id => cancelAnimationFrame(id));
    scope.cleanups.reverse().forEach(cleanup => cleanup());
  };
}
