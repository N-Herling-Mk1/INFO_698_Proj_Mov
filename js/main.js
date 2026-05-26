(function(){
  // ============================================================
  // SCENE SETUP
  // ============================================================
  const stage    = document.getElementById('stage');
  const statusEl = document.getElementById('status');
  const phaseEl  = document.getElementById('phase');
  const led      = document.getElementById('led');

  const W = () => window.innerWidth;
  const H = () => window.innerHeight;

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(50, W() / H(), 0.1, 200);
  // Frame the taller curve — look at midpoint between baseline and peak
  camera.position.set(0, 0.5, 9.0);
  camera.lookAt(0, -0.4, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W(), H());
  renderer.setClearColor(0x050505, 1);
  stage.appendChild(renderer.domElement);

  window.addEventListener('resize', () => {
    camera.aspect = W() / H();
    camera.updateProjectionMatrix();
    renderer.setSize(W(), H());
  });

  // ============================================================
  // BED GRID (TRON-style reticle background, drawn as line segments)
  // ============================================================
  function buildGrid(){
    const size = 30, step = 1.0;
    const positions = [];
    for (let i = -size; i <= size; i += step){
      positions.push(i, -2.5, -size,  i, -2.5, size);   // along z
      positions.push(-size, -2.5, i,  size, -2.5, i);   // along x
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const m = new THREE.LineBasicMaterial({
      color: 0xff8a3d,
      transparent: true,
      opacity: 0.06
    });
    return new THREE.LineSegments(g, m);
  }
  scene.add(buildGrid());

  // ============================================================
  // 3D RIG (industrial fixture frame around the work surface)
  // ============================================================
  // Bounding box for the rig — slightly larger than the curve span
  const RIG = {
    minX: -3.6, maxX: 3.6,
    minY: -2.4, maxY: 2.6,
    minZ: -0.8, maxZ: 0.8
  };

  function buildRig(){
    const group = new THREE.Group();

    const edgeMat = new THREE.MeshStandardMaterial({
      color: 0x44474c,
      roughness: 0.15,
      metalness: 1.0,
      emissive: 0x110800,
      emissiveIntensity: 0.25
    });
    const cornerMat = new THREE.MeshStandardMaterial({
      color: 0x55585c,
      roughness: 0.1,
      metalness: 1.0,
      emissive: 0xff5a10,
      emissiveIntensity: 0.6
    });

    const edgeR = 0.025;  // thin metallic rod radius
    const cornerR = 0.06; // corner ball joint radius

    // Helper: build a cylinder edge between two world points
    function edgeBetween(a, b){
      const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
      const len = Math.hypot(dx, dy, dz);
      const geom = new THREE.CylinderGeometry(edgeR, edgeR, len, 10);
      const mesh = new THREE.Mesh(geom, edgeMat);
      // Position at midpoint
      mesh.position.set((a.x + b.x)/2, (a.y + b.y)/2, (a.z + b.z)/2);
      // Default cylinder is along +Y; orient toward the edge direction
      const dir = new THREE.Vector3(dx, dy, dz).normalize();
      const up  = new THREE.Vector3(0, 1, 0);
      const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
      mesh.quaternion.copy(quat);
      group.add(mesh);
    }

    // 8 corners of the cuboid
    const corners = [
      new THREE.Vector3(RIG.minX, RIG.minY, RIG.minZ), // 0: -x -y -z (front-bottom-left)
      new THREE.Vector3(RIG.maxX, RIG.minY, RIG.minZ), // 1: +x -y -z (front-bottom-right)
      new THREE.Vector3(RIG.maxX, RIG.maxY, RIG.minZ), // 2: +x +y -z (front-top-right)
      new THREE.Vector3(RIG.minX, RIG.maxY, RIG.minZ), // 3: -x +y -z (front-top-left)
      new THREE.Vector3(RIG.minX, RIG.minY, RIG.maxZ), // 4: -x -y +z (back-bottom-left)
      new THREE.Vector3(RIG.maxX, RIG.minY, RIG.maxZ), // 5: +x -y +z (back-bottom-right)
      new THREE.Vector3(RIG.maxX, RIG.maxY, RIG.maxZ), // 6: +x +y +z (back-top-right)
      new THREE.Vector3(RIG.minX, RIG.maxY, RIG.maxZ)  // 7: -x +y +z (back-top-left)
    ];

    // 12 edges of the cuboid (front face, back face, 4 connecting)
    const edges = [
      // Front face
      [0,1], [1,2], [2,3], [3,0],
      // Back face
      [4,5], [5,6], [6,7], [7,4],
      // Connecting
      [0,4], [1,5], [2,6], [3,7]
    ];
    for (const [a, b] of edges) edgeBetween(corners[a], corners[b]);

    // Corner ball joints
    const cornerGeom = new THREE.SphereGeometry(cornerR, 16, 12);
    for (const c of corners){
      const ball = new THREE.Mesh(cornerGeom, cornerMat);
      ball.position.copy(c);
      group.add(ball);
    }

    return group;
  }
  const rig = buildRig();
  scene.add(rig);

  // Lighting — needs to be added once for MeshStandardMaterial to register
  const keyLight = new THREE.DirectionalLight(0xff8a3d, 0.6);
  keyLight.position.set(2, 4, 3);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0x3344aa, 0.25);
  fillLight.position.set(-3, 2, -2);
  scene.add(fillLight);
  // Side rim lights — give the anvil visible 3D volume. Warm amber on the
  // RIGHT (matches the forge fire's color), cool teal on the LEFT.
  const rimRight = new THREE.DirectionalLight(0xff9a44, 0.7);
  rimRight.position.set(8, 1, 0);     // shines from screen-right
  scene.add(rimRight);
  const rimLeft  = new THREE.DirectionalLight(0x4488cc, 0.4);
  rimLeft.position.set(-8, 1, 0);     // shines from screen-left
  scene.add(rimLeft);
  // Front fill — lights the anvil's front face from the camera direction.
  // Without this the front face reads as a dark void; with it, the face
  // catches direct light and reads as a polished worked surface.
  const frontFill = new THREE.DirectionalLight(0xeeeeee, 0.8);
  frontFill.position.set(0, 2, 12);
  scene.add(frontFill);
  const ambient = new THREE.AmbientLight(0x202028, 0.4);
  scene.add(ambient);

  // ============================================================
  // LASER HEADS (mounted on the front top beam, slide along x)
  // ============================================================
  // Each head: small box housing with a downward-pointing emitter, plus a beam
  function buildLaserNode(){
    const group = new THREE.Group();

    // Core sphere — bright when firing, dim when traveling/idle
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x2a2d32,
      roughness: 0.1,
      metalness: 1.0,
      emissive: 0xff3838,
      emissiveIntensity: 0.5
    });
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.085, 16, 12), coreMat);
    group.add(core);

    // Outer glow shell
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xff8a3d, transparent: true, opacity: 0.25,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), glowMat);
    group.add(glow);

    // Beam (downward cylinder)
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xffce3d, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.005, 0.005, 1.0, 8, 1, true),
      beamMat
    );
    beam.position.y = -0.5;
    group.add(beam);

    // Halo around beam (slightly wider for soft glow)
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xff8a3d, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    const halo = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 1.0, 12, 1, true),
      haloMat
    );
    halo.position.y = -0.5;
    group.add(halo);

    return { group, core, coreMat, glow, glowMat, beam, beamMat, halo, haloMat };
  }

  function aimBeam(node, targetY, intensity){
    const length = node.group.position.y - targetY;
    if (length <= 0){
      node.beamMat.opacity = 0;
      node.haloMat.opacity = 0;
      return;
    }
    node.beam.scale.y = length;
    node.beam.position.y = -length / 2;
    node.halo.scale.y = length;
    node.halo.position.y = -length / 2;
    // Beam: nearly opaque, bright yellow-white
    node.beamMat.opacity = Math.min(1, 1.4 * intensity);
    node.beamMat.color.setHex(0xffffe0);
    node.haloMat.opacity = Math.min(1, 0.85 * intensity);
    // Node core: blazing hot
    node.coreMat.emissive.setHex(0xffffcc);
    node.coreMat.emissiveIntensity = 3.5 * intensity;
    node.glowMat.opacity = Math.min(1, 0.9 * intensity);
    node.glowMat.color.setHex(0xffce3d);
  }
  function aimBeamOff(node){
    node.beamMat.opacity = 0;
    node.haloMat.opacity = 0;
    node.beamMat.color.setHex(0xffce3d);
    node.coreMat.emissive.setHex(0xff3838);
    node.coreMat.emissiveIntensity = 0.4;
    node.glowMat.opacity = 0.25;
    node.glowMat.color.setHex(0xff8a3d);
  }

  // Aim beam from node to an arbitrary world-space target.
  // Reorients the beam cylinder to point from the node origin to the target.
  function aimBeamAt(node, tx, ty, tz, intensity){
    const nx = node.group.position.x;
    const ny = node.group.position.y;
    const nz = node.group.position.z;
    const dx = tx - nx, dy = ty - ny, dz = tz - nz;
    const length = Math.hypot(dx, dy, dz);
    if (length <= 0.01){
      node.beamMat.opacity = 0;
      node.haloMat.opacity = 0;
      return;
    }
    // Position beam mesh at midpoint between node and target (in node-local space the midpoint is half the offset)
    node.beam.position.set(dx / 2, dy / 2, dz / 2);
    node.halo.position.set(dx / 2, dy / 2, dz / 2);
    node.beam.scale.y = length;
    node.halo.scale.y = length;
    // Orient cylinder (default along +Y) toward the offset direction
    const dir = new THREE.Vector3(dx, dy, dz).normalize();
    const up  = new THREE.Vector3(0, 1, 0);
    const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
    node.beam.quaternion.copy(quat);
    node.halo.quaternion.copy(quat);

    node.beamMat.opacity = Math.min(1, 1.4 * intensity);
    node.beamMat.color.setHex(0xffffe0);
    node.haloMat.opacity = Math.min(1, 0.85 * intensity);
    node.coreMat.emissive.setHex(0xffffcc);
    node.coreMat.emissiveIntensity = 3.5 * intensity;
    node.glowMat.opacity = Math.min(1, 0.9 * intensity);
    node.glowMat.color.setHex(0xffce3d);
  }

  const laserA = buildLaserNode();
  const laserB = buildLaserNode();
  const laserC = buildLaserNode();
  const laserD = buildLaserNode();
  rig.add(laserA.group);
  rig.add(laserB.group);
  rig.add(laserC.group);
  rig.add(laserD.group);

  // Each node lives on a DIFFERENT arm of the cuboid:
  //   A → top-front horizontal edge   (varies x; fixed y=maxY, z=minZ)
  //   B → top-back  horizontal edge   (varies x; fixed y=maxY, z=maxZ)
  //   C → front-left vertical edge    (varies y; fixed x=minX, z=minZ)
  //   D → front-right vertical edge   (varies y; fixed x=maxX, z=minZ)
  // Park positions: at the upper end of each arm (most "ready" pose).
  laserA.group.position.set(RIG.minX, RIG.maxY, RIG.minZ);
  laserB.group.position.set(RIG.maxX, RIG.maxY, RIG.maxZ);
  laserC.group.position.set(RIG.minX, RIG.maxY, RIG.minZ);
  laserD.group.position.set(RIG.maxX, RIG.maxY, RIG.minZ);
  aimBeamOff(laserA);
  aimBeamOff(laserB);
  aimBeamOff(laserC);
  aimBeamOff(laserD);
  const allLasers = [laserA, laserB, laserC, laserD];

  // Arm definitions — each node's allowed motion path on the frame.
  // For horizontal arms: vary x, fixed y/z. For vertical arms: vary y, fixed x/z.
  const ARMS = {
    A: { kind: 'h', y: RIG.maxY, z: RIG.minZ, xMin: RIG.minX, xMax: RIG.maxX },
    B: { kind: 'h', y: RIG.maxY, z: RIG.maxZ, xMin: RIG.minX, xMax: RIG.maxX },
    C: { kind: 'v', x: RIG.minX, z: RIG.minZ, yMin: RIG.minY, yMax: RIG.maxY },
    D: { kind: 'v', x: RIG.maxX, z: RIG.minZ, yMin: RIG.minY, yMax: RIG.maxY }
  };
  // Helper: given an arm and a parameter u in [0,1], return the world position on that arm
  function armPos(arm, u){
    if (arm.kind === 'h'){
      return [arm.xMin + (arm.xMax - arm.xMin) * u, arm.y, arm.z];
    } else {
      return [arm.x, arm.yMin + (arm.yMax - arm.yMin) * u, arm.z];
    }
  }


  // ============================================================
  // GAUSSIAN CURVE GEOMETRY
  // ============================================================
  // World units: curve sits at z=0, spans x ∈ [-3, 3], centered in rig
  let SIGMA = 0.50;
  let MU = 0.0;
  let CUTOFF_SIGMAS = 3.5;
  const CURVE_AMP = 3.4;        // taller bell — fills more of the frame
  const CURVE_HALF_WIDTH = 3.0;
  const CURVE_BASE_Y = -2.35;   // sits just above the rig floor
  const CURVE_Z = 0.0;
  const CURVE_SAMPLES = 240;

  function gauss(x){
    const dx = x - MU;
    return CURVE_BASE_Y + CURVE_AMP * Math.exp(-(dx*dx) / (2*SIGMA*SIGMA));
  }
  function heightFactor(x){
    // Inside the active cut region (μ ± CUTOFF_SIGMAS·σ): full intensity.
    // Outside: zero (the curve is "cut off")
    const z = Math.abs(x - MU) / SIGMA;
    if (z > CUTOFF_SIGMAS) return 0.0;  // cut off entirely
    if (z <= 3.0) return 1.0;
    return Math.exp(-(z - 3.0) * 2.5);
  }
  // Whether a given x is inside the active cut region
  function inCutRegion(x){
    return Math.abs(x - MU) / SIGMA <= CUTOFF_SIGMAS;
  }

  const curvePoints = [];
  const curveNormals = [];
  const curveH = new Float32Array(CURVE_SAMPLES + 1);

  function rebuildCurve(){
    curvePoints.length = 0;
    curveNormals.length = 0;
    for (let i = 0; i <= CURVE_SAMPLES; i++){
      const x = -CURVE_HALF_WIDTH + (2 * CURVE_HALF_WIDTH) * (i / CURVE_SAMPLES);
      // Outside the cut region: snap to baseline (curve is "trimmed off")
      const y = inCutRegion(x) ? gauss(x) : CURVE_BASE_Y;
      curvePoints.push(new THREE.Vector3(x, y, CURVE_Z));
      curveH[i] = heightFactor(x);
    }
    for (let i = 0; i <= CURVE_SAMPLES; i++){
      const a = curvePoints[Math.max(0, i-1)];
      const b = curvePoints[Math.min(CURVE_SAMPLES, i+1)];
      const tx = b.x - a.x, ty = b.y - a.y;
      const len = Math.hypot(tx, ty) || 1;
      let nx = -ty / len, ny = tx / len;
      if (ny < 0) { nx = -nx; ny = -ny; }
      curveNormals.push(new THREE.Vector2(nx, ny));
    }
  }
  rebuildCurve();

  // Update curve positions in the GPU buffer when geometry rebuilds
  function pushCurveToBuffer(){
    for (let i = 0; i <= CURVE_SAMPLES; i++){
      curvePositions[i*3+0] = curvePoints[i].x;
      curvePositions[i*3+1] = curvePoints[i].y;
      curvePositions[i*3+2] = curvePoints[i].z;
    }
    if (typeof curveGeom !== 'undefined' && curveGeom.attributes.position){
      curveGeom.attributes.position.needsUpdate = true;
    }
  }

  // ----- Curve as two stacked Line passes: outer halo + bright core -----
  // We use a separate position buffer because we want to fade in along etch
  const curvePositions = new Float32Array((CURVE_SAMPLES + 1) * 3);
  for (let i = 0; i <= CURVE_SAMPLES; i++){
    curvePositions[i*3+0] = curvePoints[i].x;
    curvePositions[i*3+1] = curvePoints[i].y;
    curvePositions[i*3+2] = curvePoints[i].z;
  }
  // alpha buffer — per-vertex opacity for the etch reveal
  const curveAlphas = new Float32Array(CURVE_SAMPLES + 1);

  const curveGeom = new THREE.BufferGeometry();
  curveGeom.setAttribute('position', new THREE.BufferAttribute(curvePositions, 3));
  curveGeom.setAttribute('aAlpha',   new THREE.BufferAttribute(curveAlphas, 1));

  const curveShaderMat = (color, baseOpacity) => new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uBaseOpacity: { value: baseOpacity }
    },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    vertexShader: `
      attribute float aAlpha;
      varying float vAlpha;
      void main(){
        vAlpha = aAlpha;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uBaseOpacity;
      varying float vAlpha;
      void main(){
        gl_FragColor = vec4(uColor, vAlpha * uBaseOpacity);
      }
    `
  });

  const curveHalo = new THREE.Line(curveGeom, curveShaderMat(0xff5510, 0.55));
  const curveCore = new THREE.Line(curveGeom, curveShaderMat(0xfff0c0, 1.0));
  scene.add(curveHalo);
  scene.add(curveCore);

  // ----- Mean line — etched during pass 2 (vertical, from baseline up to peak) -----
  const MEAN_LINE_SEGMENTS = 80;
  const meanPositions = new Float32Array((MEAN_LINE_SEGMENTS + 1) * 3);
  const meanAlphas = new Float32Array(MEAN_LINE_SEGMENTS + 1);
  function initMeanLine(){
    const peakY = gauss(MU);
    for (let i = 0; i <= MEAN_LINE_SEGMENTS; i++){
      const t = i / MEAN_LINE_SEGMENTS;
      meanPositions[i*3+0] = MU;
      meanPositions[i*3+1] = CURVE_BASE_Y + (peakY - CURVE_BASE_Y) * t;
      meanPositions[i*3+2] = CURVE_Z;
      meanAlphas[i] = 0;
    }
  }
  initMeanLine();
  const meanGeom = new THREE.BufferGeometry();
  meanGeom.setAttribute('position', new THREE.BufferAttribute(meanPositions, 3));
  meanGeom.setAttribute('aAlpha',   new THREE.BufferAttribute(meanAlphas, 1));
  // Dashed look via per-fragment modulation in the shader
  const etchLineMat = (color, baseOp) => new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uBaseOpacity: { value: baseOp }
    },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    vertexShader: `
      attribute float aAlpha;
      varying float vAlpha;
      varying float vIdx;
      void main(){
        vAlpha = aAlpha;
        vIdx = float(gl_VertexID);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uBaseOpacity;
      varying float vAlpha;
      varying float vIdx;
      void main(){
        // Dashed pattern via index modulo
        float dash = step(0.5, fract(vIdx * 0.25));
        gl_FragColor = vec4(uColor, vAlpha * uBaseOpacity * dash);
      }
    `
  });
  const meanLine = new THREE.Line(meanGeom, etchLineMat(0xffce3d, 0.95));
  scene.add(meanLine);

  function pushMeanLine(){
    const peakY = gauss(MU);
    for (let i = 0; i <= MEAN_LINE_SEGMENTS; i++){
      const t = i / MEAN_LINE_SEGMENTS;
      meanPositions[i*3+0] = MU;
      meanPositions[i*3+1] = CURVE_BASE_Y + (peakY - CURVE_BASE_Y) * t;
      meanPositions[i*3+2] = CURVE_Z;
    }
    meanGeom.attributes.position.needsUpdate = true;
  }

  // ----- Variance line — horizontal at baseline, spans μ ± n·σ -----
  const VAR_LINE_SEGMENTS = 120;
  const varPositions = new Float32Array((VAR_LINE_SEGMENTS + 1) * 3);
  const varAlphas    = new Float32Array(VAR_LINE_SEGMENTS + 1);
  function initVarLine(){
    const leftX  = MU - CUTOFF_SIGMAS * SIGMA;
    const rightX = MU + CUTOFF_SIGMAS * SIGMA;
    for (let i = 0; i <= VAR_LINE_SEGMENTS; i++){
      const t = i / VAR_LINE_SEGMENTS;
      varPositions[i*3+0] = leftX + (rightX - leftX) * t;
      varPositions[i*3+1] = CURVE_BASE_Y + 0.03;
      varPositions[i*3+2] = CURVE_Z;
      varAlphas[i] = 0;
    }
  }
  initVarLine();
  const varGeom = new THREE.BufferGeometry();
  varGeom.setAttribute('position', new THREE.BufferAttribute(varPositions, 3));
  varGeom.setAttribute('aAlpha',   new THREE.BufferAttribute(varAlphas, 1));
  const varLine = new THREE.Line(varGeom, etchLineMat(0x5ec962, 0.85));
  scene.add(varLine);

  function pushVarLine(){
    const leftX  = MU - CUTOFF_SIGMAS * SIGMA;
    const rightX = MU + CUTOFF_SIGMAS * SIGMA;
    for (let i = 0; i <= VAR_LINE_SEGMENTS; i++){
      const t = i / VAR_LINE_SEGMENTS;
      varPositions[i*3+0] = leftX + (rightX - leftX) * t;
      varPositions[i*3+1] = CURVE_BASE_Y + 0.03;
      varPositions[i*3+2] = CURVE_Z;
    }
    varGeom.attributes.position.needsUpdate = true;
  }

  function pushCutLines(){
    // No-op now: cutoff edges are implicit via the variance horizontal endpoints
  }

  // ============================================================
  // WORKPIECE GRID + SWEEPING PLANES
  //   Two translucent planes sweep into the work area. As each plane crosses a
  //   grid line's position, that line lights up. After both planes finish, the
  //   full grid lattice is visible — the "stock" from which the Gaussian is cut.
  // ============================================================
  const GRID = {
    xMin: RIG.minX, xMax: RIG.maxX,
    yMin: RIG.minY, yMax: RIG.maxY,
    z: CURVE_Z,
    nVert: 18,   // vertical lines (varying x)
    nHoriz: 12   // horizontal lines (varying y)
  };

  // Per-line alpha arrays (drive a shader-based fade)
  const gridVertAlphas  = new Float32Array(GRID.nVert);
  const gridHorizAlphas = new Float32Array(GRID.nHoriz);
  const gridVertX  = new Float32Array(GRID.nVert);
  const gridHorizY = new Float32Array(GRID.nHoriz);
  for (let i = 0; i < GRID.nVert; i++){
    gridVertX[i] = GRID.xMin + (GRID.xMax - GRID.xMin) * (i / (GRID.nVert - 1));
  }
  for (let i = 0; i < GRID.nHoriz; i++){
    gridHorizY[i] = GRID.yMin + (GRID.yMax - GRID.yMin) * (i / (GRID.nHoriz - 1));
  }

  // Build grid line segments: each vertical line gets 2 endpoints, each horizontal too.
  // We use a single BufferGeometry with one segment per line and a per-vertex alpha.
  const gridVertCount = GRID.nVert * 2 + GRID.nHoriz * 2;
  const gridPositions = new Float32Array(gridVertCount * 3);
  const gridAlphas    = new Float32Array(gridVertCount);
  const gridIsVert    = new Float32Array(gridVertCount);  // 1 if vertical line, 0 if horizontal
  const gridLineIdx   = new Float32Array(gridVertCount);  // which line this vertex belongs to

  // Fill vertical lines first
  for (let i = 0; i < GRID.nVert; i++){
    const x = gridVertX[i];
    const v0 = i * 2;
    const v1 = i * 2 + 1;
    gridPositions[v0*3+0] = x; gridPositions[v0*3+1] = GRID.yMin; gridPositions[v0*3+2] = GRID.z;
    gridPositions[v1*3+0] = x; gridPositions[v1*3+1] = GRID.yMax; gridPositions[v1*3+2] = GRID.z;
    gridIsVert[v0] = 1; gridIsVert[v1] = 1;
    gridLineIdx[v0] = i; gridLineIdx[v1] = i;
  }
  // Then horizontal lines
  const hOffset = GRID.nVert * 2;
  for (let i = 0; i < GRID.nHoriz; i++){
    const y = gridHorizY[i];
    const v0 = hOffset + i * 2;
    const v1 = hOffset + i * 2 + 1;
    gridPositions[v0*3+0] = GRID.xMin; gridPositions[v0*3+1] = y; gridPositions[v0*3+2] = GRID.z;
    gridPositions[v1*3+0] = GRID.xMax; gridPositions[v1*3+1] = y; gridPositions[v1*3+2] = GRID.z;
    gridIsVert[v0] = 0; gridIsVert[v1] = 0;
    gridLineIdx[v0] = i; gridLineIdx[v1] = i;
  }

  const gridGeom = new THREE.BufferGeometry();
  gridGeom.setAttribute('position', new THREE.BufferAttribute(gridPositions, 3));
  gridGeom.setAttribute('aAlpha',   new THREE.BufferAttribute(gridAlphas, 1));

  const gridMat = new THREE.ShaderMaterial({
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    uniforms: {
      uColor: { value: new THREE.Color(0x5ec962) }
    },
    vertexShader: `
      attribute float aAlpha;
      varying float vAlpha;
      void main(){
        vAlpha = aAlpha;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      varying float vAlpha;
      void main(){
        gl_FragColor = vec4(uColor, vAlpha * 0.85);
      }
    `
  });
  const gridLines = new THREE.LineSegments(gridGeom, gridMat);
  scene.add(gridLines);

  // Push current alphas into the vertex buffer
  function pushGridAlphas(){
    for (let i = 0; i < GRID.nVert; i++){
      const a = gridVertAlphas[i];
      gridAlphas[i * 2]     = a;
      gridAlphas[i * 2 + 1] = a;
    }
    for (let i = 0; i < GRID.nHoriz; i++){
      const a = gridHorizAlphas[i];
      gridAlphas[hOffset + i * 2]     = a;
      gridAlphas[hOffset + i * 2 + 1] = a;
    }
    gridGeom.attributes.aAlpha.needsUpdate = true;
  }
  pushGridAlphas();

  // ----- Sweeping planes -----
  // TWO YZ-planes sweep along x from opposite sides toward the center (x=MU).
  // TWO XZ-planes sweep along y from opposite sides toward a mid-y.
  // All four planes meet in the middle, then retract back to the edges.
  // As each plane crosses a grid line, that line lights up and persists.

  const swPlaneW = (RIG.maxZ - RIG.minZ) * 1.2;
  const swPlaneH_yz = (GRID.yMax - GRID.yMin) * 1.1;
  const swPlaneW_xz = (GRID.xMax - GRID.xMin) * 1.1;
  const swPlaneD_xz = (RIG.maxZ - RIG.minZ) * 1.2;
  const planeColor = 0x5ec962;

  function makeSweepPlane(width, height, rotateAxis){
    const mat = new THREE.MeshBasicMaterial({
      color: planeColor, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
    if (rotateAxis === 'y') mesh.rotation.y = Math.PI / 2;       // YZ-plane (normal along x)
    else if (rotateAxis === 'x') mesh.rotation.x = Math.PI / 2;  // XZ-plane (normal along y)
    mesh.visible = false;
    scene.add(mesh);
    return { mesh, mat };
  }
  // 1 YZ-plane sweeping in x + 1 XZ-plane sweeping in y. They sweep to their
  // intersection and reveal grid lines along the way.
  const yzPlane = makeSweepPlane(swPlaneW, swPlaneH_yz, 'y');
  const xzPlane = makeSweepPlane(swPlaneW_xz, swPlaneD_xz, 'x');
  const sweepPlanes = [yzPlane, xzPlane];

  // Park positions: YZ at xMin (left edge), XZ at yMax (top edge)
  yzPlane.mesh.position.set(GRID.xMin, (GRID.yMin + GRID.yMax) / 2, GRID.z);
  xzPlane.mesh.position.set((GRID.xMin + GRID.xMax) / 2, GRID.yMax, GRID.z);

  // Drive the plane animation. u ∈ [0, 1] is progress through the phase.
  // mode: 'build' reveals grid lines as planes pass; 'erase' clears grid lines
  // as planes pass. Both modes run a full forward sweep then retract.
  function updateSweepingPlanes(u, mode){
    const isErase = mode === 'erase';
    // Sweep ramp: forward to full extent by u=0.4, HOLD at extent until u=0.6,
    // then retract. This gives boundary grid lines enough frames at swept position
    // to fully ramp their alphas (grid alphas use +/-0.06 per frame).
    let inOut;
    if (u < 0.4){
      inOut = u / 0.4;
    } else if (u < 0.6){
      inOut = 1.0;
    } else {
      inOut = 1.0 - (u - 0.6) / 0.4;
    }
    inOut = inOut * inOut * (3 - 2 * inOut);  // smoothstep

    for (const P of sweepPlanes){ P.mesh.visible = true; }

    // YZ plane sweeps from xMin → xMax during the forward half
    const yzX = GRID.xMin + (GRID.xMax - GRID.xMin) * inOut;
    yzPlane.mesh.position.x = yzX;

    // XZ plane sweeps from yMax → yMin (top to bottom)
    const xzY = GRID.yMax + (GRID.yMin - GRID.yMax) * inOut;
    xzPlane.mesh.position.y = xzY;

    // Tint differs for erase: yellow/orange retreat vs green build
    const buildColor = 0x5ec962;
    const eraseColor = 0xff8a3d;
    const targetColor = isErase ? eraseColor : buildColor;
    yzPlane.mat.color.setHex(targetColor);
    xzPlane.mat.color.setHex(targetColor);

    // Opacity envelope
    const op = u < 0.05 ? (u / 0.05) * 0.35
             : (u > 0.95 ? (1 - u) / 0.05 * 0.35 : 0.35);
    yzPlane.mat.opacity = op;
    xzPlane.mat.opacity = op;

    // Track FURTHEST forward position reached so far (so retract still leaves
    // build state intact, and erase progressively clears the swept region).
    if (!updateSweepingPlanes._maxYzX) updateSweepingPlanes._maxYzX = -Infinity;
    if (!updateSweepingPlanes._minXzY) updateSweepingPlanes._minXzY =  Infinity;
    updateSweepingPlanes._maxYzX = Math.max(updateSweepingPlanes._maxYzX, yzX);
    updateSweepingPlanes._minXzY = Math.min(updateSweepingPlanes._minXzY, xzY);
    const swept_yzX = updateSweepingPlanes._maxYzX;
    const swept_xzY = updateSweepingPlanes._minXzY;

    // Vertical grid line at x = gridVertX[i]: affected when swept_yzX ≥ lineX
    // (epsilon tolerance so the boundary line at exactly GRID.xMax still triggers)
    const eps = 1e-3;
    for (let i = 0; i < GRID.nVert; i++){
      const lineX = gridVertX[i];
      if (swept_yzX >= lineX - eps){
        if (isErase){
          gridVertAlphas[i] = Math.max(0, gridVertAlphas[i] - 0.06);
        } else {
          gridVertAlphas[i] = Math.min(1, gridVertAlphas[i] + 0.06);
        }
      }
    }
    // Horizontal grid line at y = gridHorizY[i]: affected when swept_xzY ≤ lineY
    for (let i = 0; i < GRID.nHoriz; i++){
      const lineY = gridHorizY[i];
      if (swept_xzY <= lineY + eps){
        if (isErase){
          gridHorizAlphas[i] = Math.max(0, gridHorizAlphas[i] - 0.06);
        } else {
          gridHorizAlphas[i] = Math.min(1, gridHorizAlphas[i] + 0.06);
        }
      }
    }
    pushGridAlphas();
  }

  // Reset the sweep position-trackers (call when starting a new sweep phase)
  function resetSweepProgress(){
    updateSweepingPlanes._maxYzX = -Infinity;
    updateSweepingPlanes._minXzY =  Infinity;
  }

  function hideSweepingPlanes(){
    for (const P of sweepPlanes){
      P.mesh.visible = false;
      P.mat.opacity = 0;
    }
  }

  // Clear grid alphas (used in reset)
  function clearGrid(){
    for (let i = 0; i < GRID.nVert; i++) gridVertAlphas[i] = 0;
    for (let i = 0; i < GRID.nHoriz; i++) gridHorizAlphas[i] = 0;
    pushGridAlphas();
  }

  // ============================================================
  // 3D LABEL TYPOGRAPHY — small line-art μ and σ² etched into the scene
  // Each label is a LineSegments mesh with per-vertex alpha for progressive reveal.
  // ============================================================

  // Generate a stroke as an array of [x,y] points sampled along a parametric curve.
  // We then convert each consecutive pair into a LineSegments pair.
  function strokeToSegments(pts){
    const segs = [];
    for (let i = 0; i < pts.length - 1; i++){
      segs.push(pts[i][0], pts[i][1], 0,
                pts[i+1][0], pts[i+1][1], 0);
    }
    return segs;
  }

  // μ shape (italic): two vertical strokes joined by a curve at bottom, with a
  // descending tail on the left below the baseline.
  function buildMu(scale){
    const s = scale;
    const segs = [];
    // Left vertical stroke (with slight italic slant)
    const leftStroke = [];
    for (let i = 0; i <= 8; i++){
      const t = i / 8;
      leftStroke.push([-0.35*s + 0.10*s*t, 0.5*s - t*1.0*s]);
    }
    // Descender tail (continues below baseline)
    for (let i = 1; i <= 4; i++){
      const t = i / 4;
      leftStroke.push([-0.25*s + 0.08*s*t, -0.5*s - t*0.4*s]);
    }
    segs.push(...strokeToSegments(leftStroke));

    // Right vertical stroke
    const rightStroke = [];
    for (let i = 0; i <= 8; i++){
      const t = i / 8;
      rightStroke.push([0.20*s + 0.10*s*t, 0.5*s - t*1.0*s]);
    }
    segs.push(...strokeToSegments(rightStroke));

    // Bottom curve connecting left to right (slight U-shape)
    const bottomCurve = [];
    for (let i = 0; i <= 10; i++){
      const t = i / 10;
      const x = -0.25*s + 0.55*s * t;
      const y = -0.5*s + 0.06*s * Math.sin(t * Math.PI);
      bottomCurve.push([x, y]);
    }
    segs.push(...strokeToSegments(bottomCurve));
    return segs;
  }

  // σ shape (Greek sigma): a closed loop with a horizontal tail extending right.
  function buildSigma(scale){
    const s = scale;
    const segs = [];
    // Loop body (oval-ish, slightly italic)
    const loop = [];
    const cx = 0, cy = 0;
    const rx = 0.35 * s, ry = 0.42 * s;
    for (let i = 0; i <= 24; i++){
      const t = i / 24;
      const ang = Math.PI * 1.6 + t * Math.PI * 1.8;  // not a full circle — opens at top
      loop.push([cx + Math.cos(ang) * rx + 0.05*s*t, cy + Math.sin(ang) * ry]);
    }
    segs.push(...strokeToSegments(loop));

    // Top tail (horizontal stroke extending right from the loop's top)
    const tail = [
      [cx + 0.10*s, cy + ry * 0.85],
      [cx + 0.65*s, cy + ry * 0.85]
    ];
    segs.push(...strokeToSegments(tail));

    return segs;
  }

  // Superscript "²" — small "2" shape
  function buildTwo(scale){
    const s = scale;
    const segs = [];
    // Top arc
    const arc = [];
    for (let i = 0; i <= 8; i++){
      const t = i / 8;
      const ang = Math.PI * 0.95 - t * Math.PI * 1.2;
      arc.push([Math.cos(ang) * 0.18*s, 0.20*s + Math.sin(ang) * 0.15*s]);
    }
    segs.push(...strokeToSegments(arc));
    // Diagonal from end of arc to bottom-left
    const diag = [
      [Math.cos(Math.PI * 0.95 - Math.PI * 1.2) * 0.18*s, 0.20*s + Math.sin(Math.PI * 0.95 - Math.PI * 1.2) * 0.15*s],
      [-0.20*s, -0.10*s]
    ];
    segs.push(...strokeToSegments(diag));
    // Bottom horizontal
    const base = [
      [-0.22*s, -0.10*s],
      [ 0.22*s, -0.10*s]
    ];
    segs.push(...strokeToSegments(base));
    return segs;
  }

  // Compose σ² as a sigma + superscript-2 offset to upper-right
  function buildSigmaSq(scale){
    const segs = buildSigma(scale);
    const twoSegs = buildTwo(scale * 0.55);
    // Offset the "2" to upper-right of sigma
    for (let i = 0; i < twoSegs.length; i += 3){
      twoSegs[i]     += 0.85 * scale;    // x offset
      twoSegs[i + 1] += 0.55 * scale;    // y offset
    }
    return segs.concat(twoSegs);
  }

  // Generic helper to build a LineSegments mesh with per-vertex alpha from raw segs
  // ============================================================
  // PALETTES — for letter coloring (warm forge and viridis)
  // ============================================================
  // Returns [r, g, b] in 0..1 range for a t in 0..1.
  function paletteWarm(t){
    // Yellow (1.0, 0.95, 0.3) → gold (1.0, 0.7, 0.15) → red-orange (1.0, 0.3, 0.05)
    const stops = [
      [0.00, 1.00, 0.95, 0.30],
      [0.50, 1.00, 0.65, 0.15],
      [1.00, 1.00, 0.25, 0.08]
    ];
    for (let i = 0; i < stops.length - 1; i++){
      const a = stops[i], b = stops[i+1];
      if (t >= a[0] && t <= b[0]){
        const u = (t - a[0]) / (b[0] - a[0]);
        return [a[1]+(b[1]-a[1])*u, a[2]+(b[2]-a[2])*u, a[3]+(b[3]-a[3])*u];
      }
    }
    return [stops[stops.length-1][1], stops[stops.length-1][2], stops[stops.length-1][3]];
  }
  // Viridis colormap (purple → blue → green → yellow). Five anchor points.
  function paletteViridis(t){
    const stops = [
      [0.00, 0.267, 0.005, 0.329],   // dark purple
      [0.25, 0.283, 0.141, 0.458],   // purple-blue
      [0.50, 0.254, 0.265, 0.530],   // teal-blue
      [0.75, 0.207, 0.372, 0.553],   // green-teal
      [1.00, 0.993, 0.906, 0.144]    // yellow
    ];
    for (let i = 0; i < stops.length - 1; i++){
      const a = stops[i], b = stops[i+1];
      if (t >= a[0] && t <= b[0]){
        const u = (t - a[0]) / (b[0] - a[0]);
        return [a[1]+(b[1]-a[1])*u, a[2]+(b[2]-a[2])*u, a[3]+(b[3]-a[3])*u];
      }
    }
    return [stops[stops.length-1][1], stops[stops.length-1][2], stops[stops.length-1][3]];
  }
  // Build a Float32 color array (R,G,B per vertex) where each LETTER gets a
  // unique palette color based on its index. segArray and letterMeta define
  // which vertices belong to which letter.
  function buildPaletteColors(segArray, letterMeta, paletteFn){
    const vertexCount = segArray.length / 3;
    const colors = new Float32Array(vertexCount * 3);
    // Default fill — fallback if any vertices aren't assigned
    for (let i = 0; i < vertexCount; i++){
      colors[i*3]=1; colors[i*3+1]=1; colors[i*3+2]=1;
    }
    const n = letterMeta.length;
    for (let li = 0; li < n; li++){
      const meta = letterMeta[li];
      const t = (n === 1) ? 0.5 : li / (n - 1);
      const rgb = paletteFn(t);
      const vStart = meta.startSeg * 2;
      const vEnd   = vStart + meta.segCount * 2;
      for (let v = vStart; v < vEnd; v++){
        colors[v*3]   = rgb[0];
        colors[v*3+1] = rgb[1];
        colors[v*3+2] = rgb[2];
      }
    }
    return colors;
  }

  function makeLabelMesh(segArray, color){
    const positions = new Float32Array(segArray);
    const vertexCount = segArray.length / 3;
    const alphas = new Float32Array(vertexCount);
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('aAlpha',   new THREE.BufferAttribute(alphas, 1));
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      uniforms: { uColor: { value: new THREE.Color(color) } },
      vertexShader: `
        attribute float aAlpha;
        varying float vAlpha;
        void main(){
          vAlpha = aAlpha;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vAlpha;
        void main(){
          gl_FragColor = vec4(uColor, vAlpha);
        }
      `
    });
    const mesh = new THREE.LineSegments(geom, mat);
    return { mesh, geom, alphas, segmentCount: vertexCount / 2 };
  }

  // Per-vertex-color variant — each vertex carries its own RGB.
  // segColors: Float32Array of length (segArray.length) with R,G,B per vertex
  // (3 floats per vertex, same vertex count as positions).
  function makeLabelMeshColored(segArray, segColors){
    const positions = new Float32Array(segArray);
    const vertexCount = segArray.length / 3;
    const alphas = new Float32Array(vertexCount);
    const colors = new Float32Array(segColors);
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('aAlpha',   new THREE.BufferAttribute(alphas, 1));
    geom.setAttribute('aColor',   new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexShader: `
        attribute float aAlpha;
        attribute vec3 aColor;
        varying float vAlpha;
        varying vec3 vColor;
        void main(){
          vAlpha = aAlpha;
          vColor = aColor;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        varying vec3 vColor;
        void main(){
          gl_FragColor = vec4(vColor, vAlpha);
        }
      `
    });
    const mesh = new THREE.LineSegments(geom, mat);
    return { mesh, geom, alphas, segmentCount: vertexCount / 2 };
  }

  // Build μ label and σ² label as data objects only — the 3D meshes are NOT
  // added to the scene. The visible labels are the HTML <div> overlays
  // (#labelMu, #labelSigma) which are positioned each frame via updateLabels().
  // The 3D mesh data is still used as anchor points during the etch-phase laser
  // aiming, so we keep them constructed but invisible.
  const MU_LABEL_SCALE  = 0.30;
  const SIG_LABEL_SCALE = 0.30;
  const muLabelObj  = makeLabelMesh(buildMu(MU_LABEL_SCALE), 0xff8a3d);
  const sigLabelObj = makeLabelMesh(buildSigmaSq(SIG_LABEL_SCALE), 0xff8a3d);

  // NOT added to the scene — the HTML overlays are the visible labels.
  muLabelObj.mesh.visible  = false;
  sigLabelObj.mesh.visible = false;

  function positionLabels(){
    // μ label: below baseline, centered on MU
    muLabelObj.mesh.position.set(MU, CURVE_BASE_Y - 0.35, CURVE_Z);
    // σ² label: to the right of variance line's right end
    const rightX = MU + CUTOFF_SIGMAS * SIGMA;
    sigLabelObj.mesh.position.set(rightX + 0.45, CURVE_BASE_Y - 0.05, CURVE_Z);
  }
  positionLabels();

  function clearLabels(){
    for (let i = 0; i < muLabelObj.alphas.length; i++) muLabelObj.alphas[i] = 0;
    for (let i = 0; i < sigLabelObj.alphas.length; i++) sigLabelObj.alphas[i] = 0;
    muLabelObj.geom.attributes.aAlpha.needsUpdate = true;
    sigLabelObj.geom.attributes.aAlpha.needsUpdate = true;
    muLabelObj.mesh.visible = false;
    sigLabelObj.mesh.visible = false;
  }

  // Reveal a fraction of a label (progress 0→1). Lights up segments in order.
  function revealLabel(labelObj, progress){
    labelObj.mesh.visible = true;
    const segCount = labelObj.segmentCount;
    const litSegs  = Math.floor(progress * segCount);
    for (let s = 0; s < segCount; s++){
      const a = s < litSegs ? 1.0 : 0.0;
      labelObj.alphas[s * 2]     = a;
      labelObj.alphas[s * 2 + 1] = a;
    }
    labelObj.geom.attributes.aAlpha.needsUpdate = true;
  }

  // ============================================================
  // SKY NEURAL NETWORK — constellation laid out on a flat plane behind/above the
  // forge. Viridis palette. Built here but hidden until ignition.
  // ============================================================

  // Viridis color stops (kept for future use — neural activations etc.)
  const VIRIDIS = [
    [0.267, 0.005, 0.329],  // 0.0 — deep purple
    [0.282, 0.140, 0.458],
    [0.254, 0.265, 0.530],
    [0.207, 0.372, 0.553],
    [0.164, 0.471, 0.558],
    [0.128, 0.567, 0.551],
    [0.135, 0.659, 0.518],
    [0.478, 0.821, 0.318],
    [0.993, 0.906, 0.144]   // 1.0  — yellow
  ];
  function viridis(t){
    t = Math.max(0, Math.min(1, t));
    const idx = t * (VIRIDIS.length - 1);
    const i0 = Math.floor(idx);
    const i1 = Math.min(VIRIDIS.length - 1, i0 + 1);
    const f  = idx - i0;
    return [
      VIRIDIS[i0][0] + (VIRIDIS[i1][0] - VIRIDIS[i0][0]) * f,
      VIRIDIS[i0][1] + (VIRIDIS[i1][1] - VIRIDIS[i0][1]) * f,
      VIRIDIS[i0][2] + (VIRIDIS[i1][2] - VIRIDIS[i0][2]) * f
    ];
  }

  // Warm amber/gold palette for the sky constellation — matches reference look.
  // t=0 → deep amber/orange, t=0.5 → warm gold, t=1.0 → pale gold/cream
  const AMBER = [
    [0.85, 0.45, 0.18],   // warm orange
    [0.95, 0.62, 0.25],   // amber
    [0.99, 0.78, 0.42],   // bright gold
    [1.00, 0.90, 0.62],   // pale gold
    [1.00, 0.96, 0.82]    // cream
  ];
  function amber(t){
    t = Math.max(0, Math.min(1, t));
    const idx = t * (AMBER.length - 1);
    const i0 = Math.floor(idx);
    const i1 = Math.min(AMBER.length - 1, i0 + 1);
    const f  = idx - i0;
    return [
      AMBER[i0][0] + (AMBER[i1][0] - AMBER[i0][0]) * f,
      AMBER[i0][1] + (AMBER[i1][1] - AMBER[i0][1]) * f,
      AMBER[i0][2] + (AMBER[i1][2] - AMBER[i0][2]) * f
    ];
  }

  // Layout: random scatter through the sky region behind/above the forge.
  // No layered structure — purely constellation-like.
  // LAYERED NEURAL NET — 5 columns: input → H₁ → H₂ → H₃ → output.
  // The network is placed in the sky behind/above the forge. The whole thing
  // sits inside `nnGroup` so it can be scaled as the camera pulls back, staying
  // properly framed at any zoom level.
  const NN = {
    layers: [5, 7, 9, 7, 4],     // node count per column
    // World-space size when first revealed (fits initial zoomed-in view):
    width:  8.0,                  // total horizontal span
    height: 4.2,                  // total vertical span
    z:      -10,                  // depth behind forge
    centerY: 4.5,                 // vertical center (just above forge)
    nodes: [],
    edges: []
  };

  // Group container so we can scale/transform the whole network as one unit
  const nnGroup = new THREE.Group();
  scene.add(nnGroup);

  // Build the layered NN structure
  function buildLayeredNN(){
    NN.nodes.length = 0;
    NN.edges.length = 0;

    const nLayers = NN.layers.length;
    // Layer offsets: indices into NN.nodes for the first node of each layer
    const layerStarts = [0];

    for (let L = 0; L < nLayers; L++){
      const count = NN.layers[L];
      const xL = -NN.width/2 + (NN.width) * (L / (nLayers - 1));
      for (let k = 0; k < count; k++){
        const yK = NN.centerY + (-NN.height/2 + NN.height * ((k + 0.5) / count));
        // viridisT varies by layer position
        const layerT = L / (nLayers - 1);
        NN.nodes.push({
          x: xL,
          y: yK,
          z: NN.z,
          layer: L,
          idxInLayer: k,
          viridisT: 0.25 + layerT * 0.65,
          ignited: 0,         // visible alpha
          pulseFlash: 0,
          revealMode: 'fade', // 'ember' (struck by spark) or 'fade' (just appears)
          revealStartT: 0,    // burnT at which this node begins materializing
          revealed: false,    // once true, ignited has been triggered
          pulse: Math.random() * Math.PI * 2
        });
      }
      if (L < nLayers - 1) layerStarts.push(NN.nodes.length);
    }
    layerStarts.push(NN.nodes.length);  // sentinel for last layer end

    // Build fully-connected edges between successive layers
    for (let L = 0; L < nLayers - 1; L++){
      const startA = layerStarts[L];
      const endA   = layerStarts[L + 1];
      const startB = layerStarts[L + 1];
      const endB   = layerStarts[L + 2];
      for (let a = startA; a < endA; a++){
        for (let b = startB; b < endB; b++){
          NN.edges.push({
            a, b,
            activated: 0,
            flowPhase: Math.random()
          });
        }
      }
    }

    // Stagger the reveal timings.
    // ~50% of nodes get ember strikes, ~50% just fade in.
    const shuffled = NN.nodes.map((_, i) => i);
    for (let i = shuffled.length - 1; i > 0; i--){
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const emberCount = Math.floor(NN.nodes.length * 0.5);
    for (let i = 0; i < shuffled.length; i++){
      const node = NN.nodes[shuffled[i]];
      const isEmber = i < emberCount;
      node.revealMode = isEmber ? 'ember' : 'fade';
      // Stagger reveal start times over a 2.5-second window
      node.revealStartT = 1.5 + (i / shuffled.length) * 2.5;
    }
  }
  buildLayeredNN();

  // ---- Node mesh: buffers sized to NN.nodes.length (32 nodes for 5+7+9+7+4) ----
  const nodePositions = new Float32Array(NN.nodes.length * 3);
  const nodeColors    = new Float32Array(NN.nodes.length * 3);
  const nodeAlphas    = new Float32Array(NN.nodes.length);
  for (let i = 0; i < NN.nodes.length; i++){
    const n = NN.nodes[i];
    nodePositions[i*3+0] = n.x;
    nodePositions[i*3+1] = n.y;
    nodePositions[i*3+2] = n.z;
    const c = viridis(n.viridisT);
    nodeColors[i*3+0] = c[0];
    nodeColors[i*3+1] = c[1];
    nodeColors[i*3+2] = c[2];
    nodeAlphas[i] = 0;   // start invisible
  }
  const nodeGeom = new THREE.BufferGeometry();
  nodeGeom.setAttribute('position', new THREE.BufferAttribute(nodePositions, 3));
  nodeGeom.setAttribute('aColor',   new THREE.BufferAttribute(nodeColors, 3));
  nodeGeom.setAttribute('aAlpha',   new THREE.BufferAttribute(nodeAlphas, 1));

  const nodeMat = new THREE.ShaderMaterial({
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    uniforms: {
      uPixelRatio: { value: window.devicePixelRatio || 1 },
      uSize:       { value: 130.0 }  // bright, clearly visible NN nodes
    },
    vertexShader: `
      attribute vec3 aColor;
      attribute float aAlpha;
      uniform float uPixelRatio;
      uniform float uSize;
      varying vec3 vColor;
      varying float vAlpha;
      void main(){
        vColor = aColor;
        vAlpha = aAlpha;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPos;
        gl_PointSize = max(18.0, uSize * uPixelRatio * (1.0 / -mvPos.z));
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vAlpha;
      void main(){
        vec2 c = gl_PointCoord - vec2(0.5);
        float d = length(c);
        if (d > 0.5) discard;
        // Pinprick core (very small) + extended soft halo for the "star" look
        float core = 1.0 - smoothstep(0.0, 0.05, d);     // tight bright center
        float halo = pow(1.0 - smoothstep(0.05, 0.5, d), 2.5);  // soft falloff
        vec3 outColor = mix(vColor, vec3(1.0, 0.95, 0.85), core);   // core whites out
        float alpha = vAlpha * (core + halo * 0.45);
        gl_FragColor = vec4(outColor, alpha);
      }
    `
  });
  const nnNodesMesh = new THREE.Points(nodeGeom, nodeMat);
  nnNodesMesh.frustumCulled = false;
  nnNodesMesh.visible = false;
  nnGroup.add(nnNodesMesh);

  // ---- Pulse particle mesh: bright sparks traveling along edges ----
  const NN_PULSE_MAX = 200;
  const nnPulsePos    = new Float32Array(NN_PULSE_MAX * 3);
  const nnPulseAlpha  = new Float32Array(NN_PULSE_MAX);
  for (let i = 0; i < NN_PULSE_MAX; i++){
    nnPulsePos[i*3+1] = -1000;
    nnPulseAlpha[i] = 0;
  }
  const nnPulseGeom = new THREE.BufferGeometry();
  nnPulseGeom.setAttribute('position', new THREE.BufferAttribute(nnPulsePos, 3));
  nnPulseGeom.setAttribute('aAlpha',   new THREE.BufferAttribute(nnPulseAlpha, 1));
  const nnPulseMat = new THREE.ShaderMaterial({
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    uniforms: {
      uPixelRatio: { value: window.devicePixelRatio || 1 },
      uColor: { value: new THREE.Color(0xfff0c0) }
    },
    vertexShader: `
      attribute float aAlpha;
      uniform float uPixelRatio;
      varying float vAlpha;
      void main(){
        vAlpha = aAlpha;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPos;
        gl_PointSize = max(8.0, 110.0 * uPixelRatio * (1.0 / -mvPos.z));
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      varying float vAlpha;
      void main(){
        vec2 c = gl_PointCoord - vec2(0.5);
        float d = length(c);
        if (d > 0.5) discard;
        float core = 1.0 - smoothstep(0.0, 0.12, d);
        float halo = pow(1.0 - smoothstep(0.12, 0.5, d), 2.2);
        gl_FragColor = vec4(uColor, vAlpha * (core + halo * 0.55));
      }
    `
  });
  const nnPulseMesh = new THREE.Points(nnPulseGeom, nnPulseMat);
  nnPulseMesh.frustumCulled = false;
  nnGroup.add(nnPulseMesh);

  function pushPulseParticles(){
    let i = 0;
    for (; i < Math.min(nnPulses.length, NN_PULSE_MAX); i++){
      const pulse = nnPulses[i];
      const fromNode = NN.nodes[pulse.fromIdx];
      const toNode   = NN.nodes[pulse.toIdx];
      if (!fromNode || !toNode){
        nnPulsePos[i*3+1] = -1000;
        nnPulseAlpha[i] = 0;
        continue;
      }
      const t = pulse.t;
      nnPulsePos[i*3+0] = fromNode.x + (toNode.x - fromNode.x) * t;
      nnPulsePos[i*3+1] = fromNode.y + (toNode.y - fromNode.y) * t;
      nnPulsePos[i*3+2] = fromNode.z + (toNode.z - fromNode.z) * t;
      // Brighten near the endpoints (fade in / fade out)
      const edgeFalloff = Math.min(1, t * 4) * Math.min(1, (1 - t) * 4);
      nnPulseAlpha[i] = 0.6 + edgeFalloff * 0.6;
    }
    for (; i < NN_PULSE_MAX; i++){
      nnPulsePos[i*3+1] = -1000;
      nnPulseAlpha[i] = 0;
    }
    nnPulseGeom.attributes.position.needsUpdate = true;
    nnPulseGeom.attributes.aAlpha.needsUpdate = true;
  }

  // ---- Edge mesh: LineSegments with per-vertex color + alpha ----
  // Size to actual edge count (189 for fully-connected 5+7+9+7+4 layers)
  const edgePositions = new Float32Array(NN.edges.length * 2 * 3);
  const edgeColors    = new Float32Array(NN.edges.length * 2 * 3);
  const edgeAlphas    = new Float32Array(NN.edges.length * 2);
  for (let i = 0; i < NN.edges.length; i++){
    const e = NN.edges[i];
    const na = NN.nodes[e.a];
    const nb = NN.nodes[e.b];
    edgePositions[i*6+0] = na.x; edgePositions[i*6+1] = na.y; edgePositions[i*6+2] = na.z;
    edgePositions[i*6+3] = nb.x; edgePositions[i*6+4] = nb.y; edgePositions[i*6+5] = nb.z;
    const ca = viridis(na.viridisT);
    const cb = viridis(nb.viridisT);
    edgeColors[i*6+0] = ca[0]; edgeColors[i*6+1] = ca[1]; edgeColors[i*6+2] = ca[2];
    edgeColors[i*6+3] = cb[0]; edgeColors[i*6+4] = cb[1]; edgeColors[i*6+5] = cb[2];
    edgeAlphas[i*2]   = 0;
    edgeAlphas[i*2+1] = 0;
  }
  const edgeGeom = new THREE.BufferGeometry();
  edgeGeom.setAttribute('position', new THREE.BufferAttribute(edgePositions, 3));
  edgeGeom.setAttribute('aColor',   new THREE.BufferAttribute(edgeColors, 3));
  edgeGeom.setAttribute('aAlpha',   new THREE.BufferAttribute(edgeAlphas, 1));

  const edgeMat = new THREE.ShaderMaterial({
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    vertexShader: `
      attribute vec3 aColor;
      attribute float aAlpha;
      varying vec3 vColor;
      varying float vAlpha;
      void main(){
        vColor = aColor;
        vAlpha = aAlpha;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vAlpha;
      void main(){
        gl_FragColor = vec4(vColor, vAlpha * 0.22);
      }
    `
  });
  const nnEdgesMesh = new THREE.LineSegments(edgeGeom, edgeMat);
  nnEdgesMesh.frustumCulled = false;
  nnEdgesMesh.visible = false;
  nnGroup.add(nnEdgesMesh);

  // Push node alphas — called every frame
  function pushNNNodeAlphas(){
    for (let i = 0; i < NN.nodes.length; i++){
      const n = NN.nodes[i];
      nodeAlphas[i] = Math.min(1.6, n.ignited + n.pulseFlash);
    }
    nodeGeom.attributes.aAlpha.needsUpdate = true;
  }
  function pushNNEdgeAlphas(){
    for (let i = 0; i < NN.edges.length; i++){
      const e = NN.edges[i];
      // Base activation (cascade) + pulse modulation (clamped above 1 for bright burst)
      const a = Math.min(2.0, e.activated + (e.pulseBoost || 0));
      edgeAlphas[i*2]   = a;
      edgeAlphas[i*2+1] = a;
    }
    edgeGeom.attributes.aAlpha.needsUpdate = true;
  }

  // Decay the pulse-flash overlay each frame (sharp attack on impact, ~0.3s decay)
  function updateNNPulseFlash(dt){
    const dtS = dt / 1000;
    for (const n of NN.nodes){
      if (n.pulseFlash > 0){
        n.pulseFlash -= dtS * 2.0;   // decay rate
        if (n.pulseFlash < 0) n.pulseFlash = 0;
      }
    }
  }

  function clearNN(){
    for (const n of NN.nodes){
      n.ignited = 0;
      n.pulseFlash = 0;
      n.revealed = false;
    }
    for (const e of NN.edges){
      e.activated = 0;
      e.flowPhase = Math.random();
    }
    // Re-shuffle reveal modes/timings so each replay looks different
    const shuffled = NN.nodes.map((_, i) => i);
    for (let i = shuffled.length - 1; i > 0; i--){
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const emberCount = Math.floor(NN.nodes.length * 0.5);
    for (let i = 0; i < shuffled.length; i++){
      const node = NN.nodes[shuffled[i]];
      node.revealMode = i < emberCount ? 'ember' : 'fade';
      node.revealStartT = 1.5 + (i / shuffled.length) * 2.5;
    }
    pushNNNodeAlphas();
    pushNNEdgeAlphas();
    nnNodesMesh.visible = false;
    nnEdgesMesh.visible = false;
    // Reset group scale
    nnGroup.scale.set(1, 1, 1);
  }

  // Helper: world position of a node (used to target sparks).
  // Nodes live in nnGroup local space — apply the group's transform.
  const _tmpV = new THREE.Vector3();
  function nnNodeWorldPos(idx){
    const n = NN.nodes[idx];
    _tmpV.set(n.x, n.y, n.z);
    nnGroup.localToWorld(_tmpV);
    return [_tmpV.x, _tmpV.y, _tmpV.z];
  }

  // ============================================================
  // UPWARD 3D SPARKS — particles that fly from the burning curve up to
  // NN nodes, igniting each on impact.
  // ============================================================
  const SKY_SPARK_MAX = 120;
  const skySparks = [];   // each: {x,y,z, vx,vy,vz, targetIdx, alive, life}

  const sparkPosArr = new Float32Array(SKY_SPARK_MAX * 3);
  const sparkColArr = new Float32Array(SKY_SPARK_MAX * 3);
  const sparkAlpArr = new Float32Array(SKY_SPARK_MAX);
  // Park all initial positions far behind so they never render until used
  for (let i = 0; i < SKY_SPARK_MAX; i++){
    sparkPosArr[i*3+0] = 0;
    sparkPosArr[i*3+1] = -1000;
    sparkPosArr[i*3+2] = 0;
    sparkColArr[i*3+0] = 1.0;
    sparkColArr[i*3+1] = 0.85;
    sparkColArr[i*3+2] = 0.4;
    sparkAlpArr[i] = 0;
  }
  const skySparkGeom = new THREE.BufferGeometry();
  skySparkGeom.setAttribute('position', new THREE.BufferAttribute(sparkPosArr, 3));
  skySparkGeom.setAttribute('aColor',   new THREE.BufferAttribute(sparkColArr, 3));
  skySparkGeom.setAttribute('aAlpha',   new THREE.BufferAttribute(sparkAlpArr, 1));
  const skySparkMat = new THREE.ShaderMaterial({
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    uniforms: {
      uPixelRatio: { value: window.devicePixelRatio || 1 }
    },
    vertexShader: `
      attribute vec3 aColor;
      attribute float aAlpha;
      uniform float uPixelRatio;
      varying vec3 vColor;
      varying float vAlpha;
      void main(){
        vColor = aColor;
        vAlpha = aAlpha;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPos;
        // Use a non-distance-scaled size so sparks remain visible at far z.
        // Minimum 14px regardless of depth.
        float baseSize = 95.0;
        gl_PointSize = max(20.0, baseSize * uPixelRatio * (1.0 / -mvPos.z) * 2.5);
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vAlpha;
      void main(){
        vec2 c = gl_PointCoord - vec2(0.5);
        float d = length(c);
        if (d > 0.5) discard;
        float core = 1.0 - smoothstep(0.0, 0.10, d);
        float halo = 1.0 - smoothstep(0.10, 0.5, d);
        vec3 hot = vec3(1.0, 0.95, 0.75);
        vec3 outColor = mix(vColor, hot, core);
        gl_FragColor = vec4(outColor, vAlpha * (core + halo * 0.55));
      }
    `
  });
  const skySparkMesh = new THREE.Points(skySparkGeom, skySparkMat);
  skySparkMesh.frustumCulled = false;
  scene.add(skySparkMesh);

  // Spawn a spark from a curve point toward a specific NN node.
  // Uses a parabolic arc: launches strongly upward+toward target, then curves in.
  // On arrival, the target node is fully ignited with a bright pulse-flash.
  function spawnSkySpark(originX, originY, originZ, targetNodeIdx){
    let slot = -1;
    for (let i = 0; i < SKY_SPARK_MAX; i++){
      if (!skySparks[i] || !skySparks[i].alive){
        slot = i; break;
      }
    }
    if (slot < 0) return;
    // Lift the origin point slightly above the flame so the spark visibly
    // launches OUT of the burning curve (not from inside it)
    const launchY = originY + 0.5;
    // Compute target world position via group transform
    const [tx, ty, tz] = nnNodeWorldPos(targetNodeIdx);
    const travelTime = 1.6 + Math.random() * 0.5;
    skySparks[slot] = {
      x: originX, y: launchY, z: originZ,
      startX: originX, startY: launchY, startZ: originZ,
      targetX: tx, targetY: ty, targetZ: tz,
      targetIdx: targetNodeIdx,
      travelTime,
      age: 0,
      // Arc height: how high above the linear midpoint the spark peaks.
      // Random jitter so concurrent sparks look organic.
      arcHeight: 2.0 + Math.random() * 1.5,
      alive: true
    };
  }

  function updateSkySparks(dt){
    const dtS = dt / 1000;
    for (let i = 0; i < SKY_SPARK_MAX; i++){
      const s = skySparks[i];
      if (!s || !s.alive){
        sparkAlpArr[i] = 0;
        continue;
      }
      s.age += dtS;
      const t = Math.min(1, s.age / s.travelTime);
      // Linear interpolation between launch and target
      const lx = s.startX + (s.targetX - s.startX) * t;
      const ly = s.startY + (s.targetY - s.startY) * t;
      const lz = s.startZ + (s.targetZ - s.startZ) * t;
      // Parabolic arc: peaks at t=0.5, zero at endpoints
      const arc = 4 * t * (1 - t) * s.arcHeight;
      s.x = lx;
      s.y = ly + arc;
      s.z = lz;
      sparkPosArr[i*3+0] = s.x;
      sparkPosArr[i*3+1] = s.y;
      sparkPosArr[i*3+2] = s.z;
      sparkAlpArr[i] = 1.0;

      // ARRIVAL: light up the target node with a bright pulse-flash
      if (s.age >= s.travelTime){
        const node = NN.nodes[s.targetIdx];
        if (node){
          node.ignited = 1.0;
          node.pulseFlash = 0.7;
          node.revealed = true;
        }
        s.alive = false;
        sparkAlpArr[i] = 0;
        sparkPosArr[i*3+1] = -1000;
      }
    }
    skySparkGeom.attributes.position.needsUpdate = true;
    skySparkGeom.attributes.aAlpha.needsUpdate = true;
  }

  // Cascade: each newly-ignited node propagates ignition to its connected
  // neighbors after a short delay. Edges activate proportional to how lit
  // their endpoints are.
  function updateNNCascade(dt){
    const dtS = dt / 1000;
    // Cascade: edges between two ignited nodes settle to a DIM baseline (~0.30)
    // so the brighter pulse modulation is clearly visible on top.
    const EDGE_BASELINE = 0.30;
    for (const e of NN.edges){
      const na = NN.nodes[e.a];
      const nb = NN.nodes[e.b];
      if (na.ignited > 0.1 && nb.ignited > 0.1){
        const target = Math.min(na.ignited, nb.ignited) * EDGE_BASELINE;
        e.activated += (target - e.activated) * Math.min(1, dtS * 2.5);
      } else {
        e.activated *= Math.max(0, 1 - dtS * 1.5);
      }
    }
    pushNNNodeAlphas();
    pushNNEdgeAlphas();
  }

  // ============================================================
  // NN LAYER-PROPAGATION PULSES
  // Periodic "fire signal" cascades L→R through all layers (Neural Array style).
  // Each pulse is a DISCRETE particle traveling from one specific node to one
  // specific node along a single edge. On arrival, it flashes the destination
  // and spawns child pulses to 1-2 random next-layer neighbors. Visible as a
  // bright spark moving along the edge.
  // ============================================================
  const nnPulses = [];           // active pulses (each: {fromIdx, toIdx, t, speed})
  let nnPulseSpawnCooldown = 0;

  // Lookup: for a given node idx, what node indices in the NEXT layer is it
  // connected to? Built lazily on first use.
  let _nnForwardConnectionsCache = null;
  function getForwardConnections(nodeIdx){
    if (_nnForwardConnectionsCache === null){
      _nnForwardConnectionsCache = NN.nodes.map(() => []);
      for (const e of NN.edges){
        const na = NN.nodes[e.a];
        const nb = NN.nodes[e.b];
        if (nb.layer === na.layer + 1){
          _nnForwardConnectionsCache[e.a].push(e.b);
        } else if (na.layer === nb.layer + 1){
          _nnForwardConnectionsCache[e.b].push(e.a);
        }
      }
    }
    return _nnForwardConnectionsCache[nodeIdx];
  }

  function spawnPulseFromNode(fromIdx){
    const fromNode = NN.nodes[fromIdx];
    if (fromNode.layer >= NN.layers.length - 1) return;   // no forward connections
    const targets = getForwardConnections(fromIdx);
    if (!targets.length) return;
    // Spawn 1-2 pulses from this node to random next-layer neighbors
    const numPulses = 1 + Math.floor(Math.random() * 2);
    const chosen = new Set();
    for (let n = 0; n < numPulses; n++){
      let toIdx;
      let tries = 0;
      do {
        toIdx = targets[Math.floor(Math.random() * targets.length)];
        tries++;
      } while (chosen.has(toIdx) && tries < 8);
      chosen.add(toIdx);
      nnPulses.push({
        fromIdx,
        toIdx,
        t: 0,
        speed: 1.4 + Math.random() * 0.8   // edge traversal speed (1/sec); slower = more visible motion
      });
    }
    // Flash the source node briefly
    fromNode.pulseFlash = Math.max(fromNode.pulseFlash, 1.0);
  }

  function spawnNNPulse(){
    // Pick a random input-layer node to fire the wave
    const inputCount = NN.layers[0];
    const inputIdx = Math.floor(Math.random() * inputCount);
    // Find that node's index in NN.nodes (input layer starts at idx 0)
    spawnPulseFromNode(inputIdx);
  }

  function findEdgeBetween(idxA, idxB){
    for (const e of NN.edges){
      if ((e.a === idxA && e.b === idxB) || (e.a === idxB && e.b === idxA)) return e;
    }
    return null;
  }

  function updateNNPulses(dt){
    const dtS = dt / 1000;
    // Decay edge pulse boost from prior frame
    for (const e of NN.edges){
      if (e.pulseBoost){
        e.pulseBoost *= Math.max(0, 1 - dtS * 6.0);
        if (e.pulseBoost < 0.01) e.pulseBoost = 0;
      }
    }

    // Spawn new wave roughly every 2.5-4.0s — fires from a random input.
    // Slower cadence so each pulse cascade has time to read before the next one starts.
    nnPulseSpawnCooldown -= dtS;
    if (nnPulseSpawnCooldown <= 0){
      spawnNNPulse();
      nnPulseSpawnCooldown = 2.5 + Math.random() * 1.5;
    }

    // Advance each pulse along its edge
    for (let p = nnPulses.length - 1; p >= 0; p--){
      const pulse = nnPulses[p];
      pulse.t += dtS * pulse.speed;

      // Light up the edge as the pulse travels along it (peak brightness at pulse's current t position)
      const edge = findEdgeBetween(pulse.fromIdx, pulse.toIdx);
      if (edge){
        edge.pulseBoost = Math.max(edge.pulseBoost || 0, 1.4);
      }

      if (pulse.t >= 1.0){
        // ARRIVAL: flash destination node, spawn pulses to its next-layer neighbors
        const toNode = NN.nodes[pulse.toIdx];
        if (toNode){
          toNode.pulseFlash = Math.max(toNode.pulseFlash, 1.2);
        }
        // Continue the wave forward — but only with some probability per pulse
        // so the wave doesn't explode exponentially.
        if (Math.random() < 0.75){
          spawnPulseFromNode(pulse.toIdx);
        }
        nnPulses.splice(p, 1);
      }
    }
  }

  // Helper: world position of a pulse based on its progress along its edge.
  // Returns null if pulse is invalid (used by rendering — see further below).
  function getPulseWorldPos(pulse){
    const fromNode = NN.nodes[pulse.fromIdx];
    const toNode = NN.nodes[pulse.toIdx];
    if (!fromNode || !toNode) return null;
    const t = pulse.t;
    return {
      x: fromNode.x + (toNode.x - fromNode.x) * t,
      y: fromNode.y + (toNode.y - fromNode.y) * t,
      z: fromNode.z + (toNode.z - fromNode.z) * t
    };
  }

  // ============================================================
  // BURN STATE PER CURVE SAMPLE
  // ============================================================
  const curveBurn = new Float32Array(CURVE_SAMPLES + 1);

  // ============================================================
  // 2D FX OVERLAY — layered flame composition
  //   Layers (back→front): smoke, voronoi diamonds, base flame body,
  //   triangle petals, white-hot core stroke, sparks
  // ============================================================
  const fx2d = document.getElementById('fx2d');
  const fxctx = fx2d.getContext('2d');
  function resizeFx2D(){
    fx2d.width  = window.innerWidth  * window.devicePixelRatio;
    fx2d.height = window.innerHeight * window.devicePixelRatio;
    fx2d.style.width  = window.innerWidth + 'px';
    fx2d.style.height = window.innerHeight + 'px';
    fxctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
  }
  resizeFx2D();
  window.addEventListener('resize', resizeFx2D);

  const _projV = new THREE.Vector3();
  function worldToScreen(wx, wy, wz){
    _projV.set(wx, wy, wz).project(camera);
    if (_projV.z > 1 || _projV.z < -1) return null;
    return {
      x: (_projV.x * 0.5 + 0.5) * window.innerWidth,
      y: (-_projV.y * 0.5 + 0.5) * window.innerHeight
    };
  }

  // World-unit to screen-pixel scale at the curve depth (computed once per frame)
  let curvePixelsPerUnit = 100;  // fallback
  function recomputeScale(){
    const a = worldToScreen(0, 0, CURVE_Z);
    const b = worldToScreen(1, 0, CURVE_Z);
    if (a && b){
      // Clamp from below so flames stay visibly dense even at far camera distances
      curvePixelsPerUnit = Math.max(85, Math.abs(b.x - a.x));
    }
  }

  // ----- Pools -----
  const fx2dFlame = [];    // base fire blobs
  const fx2dTri   = [];    // triangle petals
  const fx2dSpark = [];
  const fx2dSmoke = [];
  const FX_CAP_FLAME = 1600;
  const FX_CAP_TRI   = 800;
  const FX_CAP_SPARK = 1200;
  const FX_CAP_SMOKE = 400;
  function pushCapped(arr, cap, obj){
    if (arr.length >= cap) arr.shift();
    arr.push(obj);
  }

  // ----- Pre-rendered sprites -----
  function makeRadialSprite(size, r, g, b){
    const c = document.createElement('canvas');
    c.width = size; c.height = size;
    const cc = c.getContext('2d');
    const grd = cc.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    grd.addColorStop(0,   `rgba(${r},${g},${b},1)`);
    grd.addColorStop(0.5, `rgba(${r},${g},${b},0.55)`);
    grd.addColorStop(1,   `rgba(${r},${g},${b},0)`);
    cc.fillStyle = grd;
    cc.fillRect(0, 0, size, size);
    return c;
  }
  const flameSprites = [
    makeRadialSprite(96, 255, 255, 235),  // white-hot
    makeRadialSprite(96, 255, 220, 140),  // amber-yellow
    makeRadialSprite(96, 255, 150,  50),  // amber
    makeRadialSprite(96, 220,  75,  20),  // red
    makeRadialSprite(96, 100,  25,   8),  // ember
  ];
  const smokeSprite = makeRadialSprite(160, 70, 64, 58);

  // ----- Curve sample → screen mapping cache (rebuilt each frame) -----
  // Three live-control offsets/scales applied to the flame's curve projection
  // during the camera zoom-out. All ramp in via cameraAnimT so the initial
  // sequence is unaffected.
  //   flameYOffsetMax — shifts the flame UP in world units (slider FLAME Y)
  //   flameWidthScale — stretches the flame horizontally relative to MU
  //   flameHeightScale — stretches the flame vertically relative to CURVE_BASE_Y
  let curveScreen = [];
  let flameYOffsetMax = 0.0;
  let flameWidthScale = 3.0;
  let flameHeightScale = 1.95;
  function recomputeCurveScreen(){
    curveScreen.length = 0;
    const animT = cameraAnimT || 0;
    const yShift = flameYOffsetMax * animT;
    // Scale ramps from 1.0 (pre-zoom) to the slider value (full zoom)
    const wScale = 1.0 + (flameWidthScale  - 1.0) * animT;
    const hScale = 1.0 + (flameHeightScale - 1.0) * animT;
    for (let i = 0; i <= CURVE_SAMPLES; i++){
      const p = curvePoints[i];
      // Stretch around the curve's center anchor (MU horizontally, CURVE_BASE_Y vertically)
      const xWorld = MU + (p.x - MU) * wScale;
      const yWorld = CURVE_BASE_Y + (p.y - CURVE_BASE_Y) * hScale + yShift;
      const s = worldToScreen(xWorld, yWorld, p.z);
      const n3 = curveNormals[i];
      let nxScr = 0, nyScr = -1;
      if (s){
        const offWorldX = MU + (p.x + n3.x * 0.1 - MU) * wScale;
        const offWorldY = CURVE_BASE_Y + (p.y + n3.y * 0.1 - CURVE_BASE_Y) * hScale + yShift;
        const so = worldToScreen(offWorldX, offWorldY, p.z);
        if (so){
          const ndx = so.x - s.x;
          const ndy = so.y - s.y;
          const nl  = Math.hypot(ndx, ndy) || 1;
          nxScr = ndx / nl;
          nyScr = ndy / nl;
        }
      }
      curveScreen.push(s ? { x: s.x, y: s.y, nx: nxScr, ny: nyScr, valid: true }
                         : { x: 0, y: 0, nx: 0, ny: 0, valid: false });
    }
  }

  // ----- Spawners -----
  function fx2dSpawnFlame(curveIdx, intensity, h){
    const cs = curveScreen[curveIdx];
    if (!cs || !cs.valid) return;
    const ang = (Math.random() - 0.5) * 0.6;
    const cs_nx = cs.nx * Math.cos(ang) - cs.ny * Math.sin(ang);
    const cs_ny = cs.nx * Math.sin(ang) + cs.ny * Math.cos(ang);
    const speed = (1.0 + Math.random() * 1.2) * (0.6 + h * 0.6);
    const sizeWorld = 0.07 + Math.random() * 0.09;
    const sizePx = sizeWorld * curvePixelsPerUnit * (0.6 + h * 0.6);
    const jitter = curvePixelsPerUnit * 0.025;
    const velScale = curvePixelsPerUnit / 100;
    const decay = 0.024 + Math.random() * 0.020;
    pushCapped(fx2dFlame, FX_CAP_FLAME, {
      x: cs.x + (Math.random() - 0.5) * jitter,
      y: cs.y + (Math.random() - 0.5) * jitter,
      vx: cs_nx * speed * 0.5 * velScale,
      vy: (cs_ny * speed * 0.5 - (0.8 + h * 1.0)) * velScale,
      life: 1.0,
      decay: decay,
      size: sizePx,
      wob: Math.random() * Math.PI * 2,
      wobSpd: 0.10 + Math.random() * 0.14
    });
  }
  function fx2dSpawnTriangle(curveIdx, intensity, h){
    const cs = curveScreen[curveIdx];
    if (!cs || !cs.valid) return;
    const speed = (1.4 + Math.random() * 1.4) * (0.6 + h * 0.6);
    const ang = (Math.random() - 0.5) * 0.7;
    const dx = cs.nx * Math.cos(ang) - cs.ny * Math.sin(ang);
    const dy = cs.nx * Math.sin(ang) + cs.ny * Math.cos(ang);
    const sizePx = (0.06 + Math.random() * 0.07) * curvePixelsPerUnit * (0.7 + h * 0.5);
    const velScale = curvePixelsPerUnit / 100;
    pushCapped(fx2dTri, FX_CAP_TRI, {
      x: cs.x + (Math.random() - 0.5) * curvePixelsPerUnit * 0.02,
      y: cs.y + (Math.random() - 0.5) * curvePixelsPerUnit * 0.02,
      vx: dx * speed * 0.6 * velScale,
      vy: (dy * speed * 0.6 - (1.0 + h * 1.0)) * velScale,
      life: 1.0,
      decay: 0.030 + Math.random() * 0.022,
      size: sizePx
    });
  }
  // Draw a word (letter strokes + optional dots) directly on the flame canvas
  // overlay (fxctx). Letters render with thickness, glow, anti-aliasing — all
  // free from canvas 2D primitives. This is the right tool for "etched on a 2D
  // surface" — no 3D plane geometry, no rectangle artifacts.
  //   data       : output of buildTextWithDots
  //   posWorld   : { x, y, z } where the word center sits in world space
  //   plane      : the makeTextLines object (used for scale, getLetterCenter)
  //   paletteFn  : per-letter color function (t in [0,1] → [r,g,b])
  //   dotColor   : optional [r,g,b] for dots
  //   letterAlphas / dotAlphas : per-element 0..1 reveal alphas
  //   heat       : 0..1 — afterglow warmth (tints toward orange/yellow when 1)
  //   sheenT     : 0..1 (or -1 to disable) — sheen highlight position
  //   thickFrac  : stroke thickness as fraction of letter height (0.10 etc)
  function drawWordOnCanvas(data, posWorld, plane, paletteFn, dotColor,
                            letterAlphas, dotAlphas, heat, sheenT, thickFrac){
    if (data.letterMeta.length === 0) return;
    // Determine pixel scale by projecting a 1-world-unit segment at the word's
    // depth to screen and measuring its length.
    const sCenter = worldToScreen(posWorld.x, posWorld.y, posWorld.z);
    const sRight  = worldToScreen(posWorld.x + 1, posWorld.y, posWorld.z);
    if (!sCenter || !sRight) return;
    const pixelsPerUnit = Math.hypot(sRight.x - sCenter.x, sRight.y - sCenter.y);
    if (pixelsPerUnit < 1) return;

    // The geometry was built in data coords; plane.getLetterCenter() knows the
    // mapping to world. We need to map raw segment endpoints (in data coords)
    // to screen. The geometry-build step uses:
    //   localX = (dataX + cxOff) * scale  where cxOff = -data.width/2,
    //            scale = worldWidth / data.width
    //   worldX = posWorld.x + localX
    const scale = plane.worldWidth / data.width;
    const letterScale = (data.letterMeta[0] ? data.letterMeta[0].centerY * 2.0 : 1.0);
    const cxOff = -data.width / 2;
    const cyOff = -letterScale / 2;

    const dataToScreen = (dx, dy) => {
      const wx = posWorld.x + (dx + cxOff) * scale;
      const wy = posWorld.y + (dy + cyOff) * scale;
      const wz = posWorld.z;
      return worldToScreen(wx, wy, wz);
    };

    // Stroke widths (px) — thickness in world units × pixelsPerUnit
    const strokeW = thickFrac * letterScale * scale * pixelsPerUnit;
    const haloW   = strokeW * 1.5;     // subtle halo — was 2.8 (very glowy)

    // PASS 1: outer halo glow (additive 'lighter' blend, blurred, wider)
    fxctx.save();
    fxctx.globalCompositeOperation = 'lighter';
    for (let li = 0; li < data.letterMeta.length; li++){
      const alpha = letterAlphas[li] || 0;
      if (alpha <= 0) continue;
      const meta = data.letterMeta[li];
      const n = data.letterMeta.length;
      const tCol = (n === 1) ? 0.5 : li / (n - 1);
      const rgb = paletteFn(tCol);
      // Heat tint toward orange — blend RGB toward (1.0, 0.55, 0.18) by heat amount
      const hr = rgb[0] * (1 - heat * 0.5) + 1.0  * heat * 0.5;
      const hg = rgb[1] * (1 - heat * 0.5) + 0.55 * heat * 0.5;
      const hb = rgb[2] * (1 - heat * 0.5) + 0.18 * heat * 0.5;
      const r = Math.min(255, Math.floor(hr * 255));
      const g = Math.min(255, Math.floor(hg * 255));
      const b = Math.min(255, Math.floor(hb * 255));
      fxctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.22})`;
      fxctx.lineWidth = haloW;
      fxctx.lineCap = 'round';
      fxctx.lineJoin = 'round';
      fxctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${alpha * 0.5})`;
      fxctx.shadowBlur = strokeW * 0.6;
      fxctx.beginPath();
      for (let s = meta.startSeg; s < meta.startSeg + meta.segCount; s++){
        const i0 = s * 6;
        const p1 = dataToScreen(data.letterSegs[i0],     data.letterSegs[i0 + 1]);
        const p2 = dataToScreen(data.letterSegs[i0 + 3], data.letterSegs[i0 + 4]);
        if (!p1 || !p2) continue;
        fxctx.moveTo(p1.x, p1.y);
        fxctx.lineTo(p2.x, p2.y);
      }
      fxctx.stroke();
    }
    fxctx.restore();

    // PASS 2: solid inner stroke (normal blend, full opacity, no blur)
    fxctx.save();
    fxctx.globalCompositeOperation = 'source-over';
    for (let li = 0; li < data.letterMeta.length; li++){
      const alpha = letterAlphas[li] || 0;
      if (alpha <= 0) continue;
      const meta = data.letterMeta[li];
      const n = data.letterMeta.length;
      const tCol = (n === 1) ? 0.5 : li / (n - 1);
      const rgb = paletteFn(tCol);
      const hr = rgb[0] * (1 - heat * 0.3) + 1.0  * heat * 0.3;
      const hg = rgb[1] * (1 - heat * 0.3) + 0.55 * heat * 0.3;
      const hb = rgb[2] * (1 - heat * 0.3) + 0.18 * heat * 0.3;
      const r = Math.min(255, Math.floor(hr * 255));
      const g = Math.min(255, Math.floor(hg * 255));
      const b = Math.min(255, Math.floor(hb * 255));
      fxctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      fxctx.lineWidth = strokeW;
      fxctx.lineCap = 'round';
      fxctx.lineJoin = 'round';
      fxctx.shadowBlur = 0;
      fxctx.beginPath();
      for (let s = meta.startSeg; s < meta.startSeg + meta.segCount; s++){
        const i0 = s * 6;
        const p1 = dataToScreen(data.letterSegs[i0],     data.letterSegs[i0 + 1]);
        const p2 = dataToScreen(data.letterSegs[i0 + 3], data.letterSegs[i0 + 4]);
        if (!p1 || !p2) continue;
        fxctx.moveTo(p1.x, p1.y);
        fxctx.lineTo(p2.x, p2.y);
      }
      fxctx.stroke();
    }
    fxctx.restore();

    // PASS 3: sheen highlight (additive bright stripe scrolling across)
    if (sheenT != null && sheenT > -0.5){
      fxctx.save();
      fxctx.globalCompositeOperation = 'lighter';
      for (let li = 0; li < data.letterMeta.length; li++){
        const alpha = letterAlphas[li] || 0;
        if (alpha <= 0) continue;
        const meta = data.letterMeta[li];
        const n = data.letterMeta.length;
        const lt = (n === 1) ? 0.5 : li / (n - 1);
        const d  = (lt - sheenT) / 0.18;
        const sheenAlpha = Math.exp(-d * d) * alpha * 0.50;
        if (sheenAlpha < 0.02) continue;
        fxctx.strokeStyle = `rgba(255, 255, 255, ${sheenAlpha})`;
        fxctx.lineWidth = strokeW * 0.6;
        fxctx.lineCap = 'round';
        fxctx.beginPath();
        for (let s = meta.startSeg; s < meta.startSeg + meta.segCount; s++){
          const i0 = s * 6;
          const p1 = dataToScreen(data.letterSegs[i0],     data.letterSegs[i0 + 1]);
          const p2 = dataToScreen(data.letterSegs[i0 + 3], data.letterSegs[i0 + 4]);
          if (!p1 || !p2) continue;
          fxctx.moveTo(p1.x, p1.y);
          fxctx.lineTo(p2.x, p2.y);
        }
        fxctx.stroke();
      }
      fxctx.restore();
    }

    // PASS 4: dots (if any) — small filled diamonds with glow
    if (dotColor && data.dotMeta.length > 0){
      const dr = Math.min(255, Math.floor(dotColor[0] * 255));
      const dg = Math.min(255, Math.floor(dotColor[1] * 255));
      const db = Math.min(255, Math.floor(dotColor[2] * 255));
      fxctx.save();
      fxctx.globalCompositeOperation = 'lighter';
      for (let di = 0; di < data.dotMeta.length; di++){
        const alpha = dotAlphas[di] || 0;
        if (alpha <= 0) continue;
        const meta = data.dotMeta[di];
        const center = dataToScreen(meta.centerX, meta.centerY);
        if (!center) continue;
        const radius = 0.10 * letterScale * scale * pixelsPerUnit;
        fxctx.fillStyle = `rgba(${dr}, ${dg}, ${db}, ${alpha})`;
        fxctx.shadowColor = `rgba(${dr}, ${dg}, ${db}, ${alpha})`;
        fxctx.shadowBlur = radius * 1.8;
        fxctx.beginPath();
        fxctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
        fxctx.fill();
      }
      fxctx.restore();
    }
  }

  function fx2dSpawnSpark(wx, wy, wz, intensity){
    const s = worldToScreen(wx, wy, wz);
    if (!s) return;
    const ang = Math.random() * Math.PI * 2;
    const speed = (2.2 + Math.random() * 4.0) * intensity;
    pushCapped(fx2dSpark, FX_CAP_SPARK, {
      x: s.x + (Math.random() - 0.5) * 4,
      y: s.y + (Math.random() - 0.5) * 4,
      vx: Math.cos(ang) * speed * 0.7,                // slightly less horizontal spread
      vy: Math.sin(ang) * speed * 0.5 - 4.5 * intensity, // stronger upward bias + weaker random
      life: 1.0,
      decay: 0.012 + Math.random() * 0.016,
      hue: 18 + Math.random() * 32
    });
  }
  function fx2dSpawnSmoke(wx, wy, wz){
    const s = worldToScreen(wx, wy, wz);
    if (!s) return;
    pushCapped(fx2dSmoke, FX_CAP_SMOKE, {
      x: s.x + (Math.random() - 0.5) * 18,
      y: s.y + (Math.random() - 0.5) * 10,
      vx: (Math.random() - 0.5) * 0.6,
      vy: -0.8 - Math.random() * 0.8,
      life: 1.0,
      decay: 0.0028 + Math.random() * 0.003,
      size: 18 + Math.random() * 24,
      grow: 0.14 + Math.random() * 0.10
    });
  }
  // Letter-glow smoke — same physics, but flagged so it renders in a SECOND
  // pass after the anvil/text-plane cuts (instead of being masked by them).
  function fx2dSpawnLetterSmoke(wx, wy, wz){
    const s = worldToScreen(wx, wy, wz);
    if (!s) return;
    pushCapped(fx2dSmoke, FX_CAP_SMOKE, {
      x: s.x + (Math.random() - 0.5) * 18,
      y: s.y + (Math.random() - 0.5) * 10,
      vx: (Math.random() - 0.5) * 0.6,
      vy: -0.8 - Math.random() * 0.8,
      life: 1.0,
      decay: 0.0028 + Math.random() * 0.003,
      size: 18 + Math.random() * 24,
      grow: 0.14 + Math.random() * 0.10,
      letterGlow: true
    });
  }

  // ----- Curve traversal emitter — call each frame -----
  function fx2dEmitFromCurve(intensityMul){
    const stride = 1;
    for (let i = 0; i <= CURVE_SAMPLES; i += stride){
      const b = curveBurn[i];
      if (b < 0.20) continue;
      const h = curveH[i];
      if (h <= 0) continue;
      const baseProb = b * (0.50 + h * 0.50) * intensityMul;
      // Base flame: light coverage so triangles read clearly through it
      if (Math.random() < baseProb * 0.55){
        fx2dSpawnFlame(i, b, h);
      }
      // Triangles: dense, the dominant geometric element of the flame edge
      if (Math.random() < baseProb * 0.95){
        fx2dSpawnTriangle(i, b, h);
      }
    }
  }

  // ----- Voronoi cells: rendered each frame at curve sample positions -----
  function fx2dDrawVoronoi(time){
    const stride = 18;
    const cellSize = curvePixelsPerUnit * 0.06;
    const t = time * 0.001;
    for (let i = 0; i <= CURVE_SAMPLES; i += stride){
      const b = curveBurn[i];
      if (b < 0.30) continue;
      const h = curveH[i];
      if (h <= 0) continue;
      const cs = curveScreen[i];
      if (!cs || !cs.valid) continue;
      // Render diamond at 2 row depths along the outward normal
      for (let row = 0; row < 2; row++){
        const offset = -cellSize * (0.6 + row * 1.2);
        const cx = cs.x + cs.nx * offset;
        const cy = cs.y + cs.ny * offset;
        const flicker = 0.45 + 0.55 * Math.abs(Math.sin(t * 3.0 + i * 0.31 + row * 1.7));
        const intensity = b * h * flicker;
        // Palette: row 0 (closer to curve) brighter, row 1 darker
        const r = 240, g = Math.floor(80 + 120 * intensity), bl = Math.floor(20 + 30 * intensity);
        const alpha = intensity * (row === 0 ? 0.85 : 0.55);
        const size = cellSize * (1.0 - row * 0.2) * (0.7 + flicker * 0.4);
        fxctx.save();
        fxctx.translate(cx, cy);
        fxctx.rotate(Math.PI / 4);  // diamond
        fxctx.globalAlpha = alpha;
        fxctx.fillStyle = `rgb(${r}, ${g}, ${bl})`;
        fxctx.fillRect(-size/2, -size/2, size, size);
        // Bright edge highlight
        fxctx.globalAlpha = alpha * 0.9;
        fxctx.strokeStyle = `rgb(255, ${Math.floor(180 + 60 * intensity)}, ${Math.floor(80 + 80 * intensity)})`;
        fxctx.lineWidth = 1;
        fxctx.strokeRect(-size/2, -size/2, size, size);
        fxctx.restore();
      }
    }
    fxctx.globalAlpha = 1;
  }

  // ----- White-hot core stroke along the burning curve -----
  function fx2dDrawCoreLine(){
    // First pass: wider warm-orange glow underneath
    let inSeg = false;
    fxctx.strokeStyle = 'rgba(255, 180, 80, 0.85)';
    fxctx.lineWidth = 6.5;
    fxctx.lineCap = 'round';
    fxctx.lineJoin = 'round';
    for (let i = 0; i <= CURVE_SAMPLES; i++){
      const b = curveBurn[i];
      const cs = curveScreen[i];
      if (b >= 0.25 && cs && cs.valid){
        if (!inSeg){ fxctx.beginPath(); fxctx.moveTo(cs.x, cs.y); inSeg = true; }
        else { fxctx.lineTo(cs.x, cs.y); }
      } else if (inSeg){
        fxctx.stroke();
        inSeg = false;
      }
    }
    if (inSeg) fxctx.stroke();

    // Second pass: bright white-hot core
    inSeg = false;
    fxctx.strokeStyle = 'rgb(255, 250, 220)';
    fxctx.lineWidth = 3.0;
    for (let i = 0; i <= CURVE_SAMPLES; i++){
      const b = curveBurn[i];
      const cs = curveScreen[i];
      if (b >= 0.25 && cs && cs.valid){
        if (!inSeg){ fxctx.beginPath(); fxctx.moveTo(cs.x, cs.y); inSeg = true; }
        else { fxctx.lineTo(cs.x, cs.y); }
      } else if (inSeg){
        fxctx.stroke();
        inSeg = false;
      }
    }
    if (inSeg) fxctx.stroke();
  }

  // ----- Triangle render helper -----
  function fx2dDrawTriangle(p){
    const ang = Math.atan2(p.vy, p.vx);
    const s = p.size * (0.6 + p.life * 0.7);
    fxctx.save();
    fxctx.translate(p.x, p.y);
    fxctx.rotate(ang);
    // Pick color by age
    const age = 1 - p.life;
    let r=255, g=200, b=80;
    if (age < 0.3){ r=255; g=240; b=200; }
    else if (age < 0.6){ r=255; g=160; b=60; }
    else { r=200; g=70; b=25; }
    fxctx.globalAlpha = p.life * 0.9;
    fxctx.fillStyle = `rgb(${r},${g},${b})`;
    fxctx.beginPath();
    fxctx.moveTo(s, 0);
    fxctx.lineTo(-s*0.5, s*0.55);
    fxctx.lineTo(-s*0.5, -s*0.55);
    fxctx.closePath();
    fxctx.fill();
    fxctx.restore();
  }

  // ----- Per-frame step + render -----
  // Soft warm radial glow at the curve peak — atmospheric backlight from the fire.
  // Intensity follows average burn level so it pulses with the flame.
  function drawBackgroundGlow(){
    // Sample average burn intensity at the peak region
    const peakIdx2 = Math.floor(CURVE_SAMPLES / 2);
    let peakBurn = 0;
    for (let d = -8; d <= 8; d++){
      const ci = peakIdx2 + d;
      if (ci >= 0 && ci <= CURVE_SAMPLES) peakBurn = Math.max(peakBurn, curveBurn[ci]);
    }
    if (peakBurn < 0.15) return;

    const cs = curveScreen[peakIdx2];
    if (!cs || !cs.valid) return;

    // Radius scales with curve size + a slow pulse
    const baseRadius = curvePixelsPerUnit * 4.5;
    const pulse = 0.9 + 0.1 * Math.sin(performance.now() * 0.005);
    const radius = baseRadius * pulse;
    // Position: peak of curve, but biased upward (the heat rises)
    const cx = cs.x;
    const cy = cs.y - curvePixelsPerUnit * 0.6;

    const grad = fxctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    const intensity = peakBurn * 0.45;
    grad.addColorStop(0.00, `rgba(255, 180, 90, ${intensity * 0.85})`);
    grad.addColorStop(0.15, `rgba(255, 130, 50, ${intensity * 0.55})`);
    grad.addColorStop(0.45, `rgba(200,  70, 25, ${intensity * 0.18})`);
    grad.addColorStop(1.00, `rgba(140,  40, 15, 0)`);

    fxctx.save();
    fxctx.globalCompositeOperation = 'lighter';
    fxctx.fillStyle = grad;
    fxctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
    fxctx.restore();
  }

  function updateFx2D(time, dt){
    fxctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    recomputeScale();
    recomputeCurveScreen();

    // 0. Background radial glow at the curve peak — soft warm halo that
    // looks like atmospheric backlight from the fire. Sits behind everything.
    drawBackgroundGlow();

    // 1. Smoke (normal blending, drawn first / behind everything else).
    // Only NON-letter-glow smoke draws here — these are from the Gaussian fire
    // and get masked by the anvil silhouette (correct behavior).
    for (let i = fx2dSmoke.length - 1; i >= 0; i--){
      const p = fx2dSmoke[i];
      p.x += p.vx; p.y += p.vy;
      p.vy *= 0.992;
      p.size += p.grow;
      p.life -= p.decay;
      if (p.life <= 0){ fx2dSmoke.splice(i, 1); continue; }
      if (p.letterGlow) continue;   // drawn later, after anvil/text cut-outs
      fxctx.globalAlpha = p.life * 0.30;
      const d = p.size * 2;
      fxctx.drawImage(smokeSprite, p.x - p.size, p.y - p.size, d, d);
    }
    fxctx.globalAlpha = 1;

    // 2. Voronoi diamonds (normal blending — these are the "structural" cells)
    fx2dDrawVoronoi(time);

    // 3. Base flame body (additive)
    fxctx.globalCompositeOperation = 'lighter';
    // Scale gravity/wobble with on-screen curve size — keeps flames hugging
    // the curve at any camera distance.
    const flameVelScale = curvePixelsPerUnit / 100;
    for (let i = fx2dFlame.length - 1; i >= 0; i--){
      const p = fx2dFlame[i];
      p.wob += p.wobSpd;
      p.vx += Math.sin(p.wob) * 0.05 * flameVelScale;
      p.vy *= 0.985;
      p.vy -= 0.04 * flameVelScale;
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      if (p.life <= 0){ fx2dFlame.splice(i, 1); continue; }
      const age = 1 - p.life;
      const bucket = Math.min(4, (age * 5) | 0);
      const r = p.size * (0.6 + age * 0.5);
      const d = r * 2;
      fxctx.globalAlpha = p.life * 0.78;
      fxctx.drawImage(flameSprites[bucket], p.x - r, p.y - r, d, d);
    }

    // 4. Triangle petals (additive over the body)
    for (let i = fx2dTri.length - 1; i >= 0; i--){
      const p = fx2dTri[i];
      p.vy *= 0.985;
      p.vy -= 0.05 * flameVelScale;
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      if (p.life <= 0){ fx2dTri.splice(i, 1); continue; }
      fx2dDrawTriangle(p);
    }

    // 5. White-hot core (additive, on top of body)
    fx2dDrawCoreLine();

    fxctx.globalCompositeOperation = 'source-over';
    fxctx.globalAlpha = 1;

    // Mask out the anvil silhouette so the 3D anvil (which renders BELOW the
    // canvas) shows through cleanly. Without this, the canvas flame would
    // overdraw the anvil and the backlight effect wouldn't work.
    cutAnvilHole();

    // ETCHED WORDS — drawn directly on the canvas overlay AFTER the anvil hole
    // cut, so the letters sit on top of the (now-revealed) 3D anvil surface.
    // 2D canvas primitives give us thickness, anti-aliasing, glow, and round
    // line caps for free — the right tool for "etched on a flat surface."
    if (textOverlayVisible){
      const projectPos = { x: 0, y: PROJECT_WORLD_Y, z: PROJECT_WORLD_Z };
      const forgePos   = { x: 0, y: FORGE_WORLD_Y,   z: FORGE_WORLD_Z };
      drawWordOnCanvas(projectData, projectPos, projectPlane, PROJECT_PALETTE, null,
                       projectLetterAlphas, projectDotAlphas,
                       textHeat * 0.75, canvasSheenT, 0.18);
      drawWordOnCanvas(forgeData, forgePos, forgePlane, FORGE_PALETTE, [0.99, 0.91, 0.14],
                       forgeLetterAlphas, forgeDotAlphas,
                       textHeat, canvasSheenT, 0.20);
    }

    // Letter-glow smoke (from etched FORGE letters) — drawn AFTER the anvil and
    // text-plane hole cuts so it renders on TOP of the anvil silhouette,
    // visually rising from the letters rather than being masked away.
    for (let i = 0; i < fx2dSmoke.length; i++){
      const p = fx2dSmoke[i];
      if (!p.letterGlow) continue;
      fxctx.globalAlpha = p.life * 0.30;
      const d = p.size * 2;
      fxctx.drawImage(smokeSprite, p.x - p.size, p.y - p.size, d, d);
    }
    fxctx.globalAlpha = 1;

    // 6. Sparks — drawn LAST, AFTER the hole cuts, so they render on top of the
    // text planes. Letter-etch sparks fire AT the letter centers (inside the
    // text-plane rectangles), so they must be drawn after the cuts to be visible.
    fxctx.globalCompositeOperation = 'lighter';
    for (let i = fx2dSpark.length - 1; i >= 0; i--){
      const p = fx2dSpark[i];
      p.x += p.vx;
      p.y += p.vy;
      if (!p.flash) p.vy += 0.55;     // stronger gravity — sparks arc downward visibly
      p.vx *= 0.99;
      p.life -= p.decay;
      if (p.life <= 0){ fx2dSpark.splice(i, 1); continue; }

      if (p.flash){
        // Intense white-hot flash blob — large radial gradient
        const r = p.flashSize * p.life;
        const grad = fxctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        grad.addColorStop(0,    `rgba(255, 255, 240, ${p.life})`);
        grad.addColorStop(0.4,  `rgba(255, 200, 80, ${p.life * 0.7})`);
        grad.addColorStop(1,    `rgba(255, 100, 30, 0)`);
        fxctx.fillStyle = grad;
        fxctx.globalAlpha = 1;
        fxctx.beginPath();
        fxctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        fxctx.fill();
        continue;
      }

      const speed = Math.hypot(p.vx, p.vy);
      const trailLen = Math.min(14, speed * 1.8) * p.life;
      const tx = p.x - (p.vx / Math.max(0.1, speed)) * trailLen;
      const ty = p.y - (p.vy / Math.max(0.1, speed)) * trailLen;
      fxctx.globalAlpha = p.life * 0.65;
      fxctx.strokeStyle = `hsl(${p.hue}, 100%, 60%)`;
      fxctx.lineWidth = 1.6;
      fxctx.lineCap = 'round';
      fxctx.beginPath();
      fxctx.moveTo(tx, ty);
      fxctx.lineTo(p.x, p.y);
      fxctx.stroke();
      fxctx.globalAlpha = p.life;
      fxctx.fillStyle = `hsl(${p.hue}, 100%, 75%)`;
      fxctx.beginPath();
      fxctx.arc(p.x, p.y, 2.0 + p.life * 1.6, 0, Math.PI * 2);
      fxctx.fill();
    }
    fxctx.globalCompositeOperation = 'source-over';
    fxctx.globalAlpha = 1;
  }

  // Cut a rectangular hole in the fx canvas where a text plane projects to screen.
  // Used so the WebGL-rendered text plane visually sits IN FRONT of the 2D flame.
  function cutTextPlaneHole(plane){
    if (!plane || !plane.mesh.visible) return;
    fxctx.save();
    fxctx.globalCompositeOperation = 'destination-out';
    fxctx.fillStyle = 'rgba(0,0,0,1)';
    // Project the 4 corners of the plane to screen
    const hw = plane.worldWidth  / 2;
    const hh = plane.worldHeight / 2;
    const cx = plane.mesh.position.x;
    const cy = plane.mesh.position.y;
    const cz = plane.mesh.position.z;
    const corners = [
      [cx - hw, cy - hh, cz],
      [cx + hw, cy - hh, cz],
      [cx + hw, cy + hh, cz],
      [cx - hw, cy + hh, cz]
    ];
    fxctx.beginPath();
    for (let i = 0; i < 4; i++){
      const v = _anvilProj.set(corners[i][0], corners[i][1], corners[i][2]);
      v.project(camera);
      const sx = (v.x * 0.5 + 0.5) * window.innerWidth;
      const sy = (-v.y * 0.5 + 0.5) * window.innerHeight;
      if (i === 0) fxctx.moveTo(sx, sy); else fxctx.lineTo(sx, sy);
    }
    fxctx.closePath();
    fxctx.fill();
    fxctx.restore();
  }

  // Project the 3D anvil's silhouette to 2D screen space and erase that region
  // from the fx canvas. Uses destination-out compositing.
  function cutAnvilHole(){
    if (!anvilGroup || !anvilGroup.visible) return;
    // Sample the anvil's outer 2D silhouette in MODEL space (matches the
    // ExtrudeGeometry's front face). Project each point to screen via
    // anvilGroup's transform + camera.
    if (!ANVIL_OUTLINE_2D) return;
    fxctx.save();
    fxctx.globalCompositeOperation = 'destination-out';
    fxctx.fillStyle = 'rgba(0,0,0,1)';
    fxctx.beginPath();
    const v = _anvilProj;
    let first = true;
    for (const [mx, my] of ANVIL_OUTLINE_2D){
      v.set(mx, my, ANVIL_EXTRUDE_DEPTH / 2);   // front face of extrude (camera-facing)
      anvilGroup.localToWorld(v);
      v.project(camera);
      const sx = (v.x * 0.5 + 0.5) * window.innerWidth;
      const sy = (-v.y * 0.5 + 0.5) * window.innerHeight;
      if (first){ fxctx.moveTo(sx, sy); first = false; }
      else fxctx.lineTo(sx, sy);
    }
    fxctx.closePath();
    fxctx.fill();
    fxctx.restore();
  }
  const _anvilProj = new THREE.Vector3();

  function clearFx2D(){
    fx2dFlame.length = 0;
    fx2dTri.length = 0;
    fx2dSpark.length = 0;
    fx2dSmoke.length = 0;
    if (fxctx) fxctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  }

  // Compatibility shim: still expose fx2dSpawnFire(wx, wy, wz, intensity, h)
  // for the few call sites that pass world coords directly (not curve-indexed).
  function fx2dSpawnFire(wx, wy, wz, intensity, h){
    const s = worldToScreen(wx, wy, wz);
    if (!s) return;
    const sizePx = (0.20 + Math.random() * 0.25) * curvePixelsPerUnit * (0.6 + h * 0.6);
    pushCapped(fx2dFlame, FX_CAP_FLAME, {
      x: s.x + (Math.random() - 0.5) * curvePixelsPerUnit * 0.04,
      y: s.y + (Math.random() - 0.5) * curvePixelsPerUnit * 0.04,
      vx: (Math.random() - 0.5) * 0.6,
      vy: -(1.0 + h * 1.2),
      life: 1.0,
      decay: 0.020 + Math.random() * 0.018,
      size: sizePx,
      wob: Math.random() * Math.PI * 2,
      wobSpd: 0.10 + Math.random() * 0.14
    });
  }

  // PHASE MACHINE — cinematic timeline
  // ============================================================
  let sequenceActive = false;
  let sequenceStart = 0;
  let phase = 'idle';

  function setPhase(p){
    if (phase === p) return;
    phase = p;
    const lbl = {
      idle: 'IDLE', prescan: 'PRE-SCAN', pause: 'STANDBY',
      status: 'STATUS CHECK', etch: 'ETCH — CURVE', mean: 'ETCH — MEAN',
      variance: 'ETCH — σ²', sigma_lbl: 'ETCH — σ² LABEL', mu_lbl: 'ETCH — μ LABEL',
      erase: 'GRID RETRACT', ignite: 'IGNITION',
      burn: 'BURN SUSTAIN', flyby: 'EQUATION FLYBY'
    };
    const stat = {
      idle: 'FORGE // STANDBY', prescan: 'FORGE // BUILDING GRID',
      pause: 'FORGE // GRID READY', status: 'FORGE // STATUS CHECK',
      etch: 'FORGE // ETCHING CURVE', mean: 'FORGE // ETCHING MEAN',
      variance: 'FORGE // ETCHING σ', sigma_lbl: 'FORGE // ETCHING σ² LABEL',
      mu_lbl: 'FORGE // ETCHING μ LABEL', erase: 'FORGE // RETRACTING GRID',
      ignite: 'FORGE // IGNITION', burn: 'FORGE // BURNING',
      flyby: 'FORGE // EQUATION PRESENT'
    };
    phaseEl.textContent = 'PHASE — ' + lbl[p];
    statusEl.textContent = stat[p];
    const colors = {
      idle: '#ff3838', prescan: '#5ec962', pause: '#5ec962',
      status: '#ffce3d', etch: '#ff8a3d', mean: '#ffce3d',
      variance: '#5ec962', sigma_lbl: '#5ec962', mu_lbl: '#ffce3d',
      erase: '#5ec962', ignite: '#ffce3d', burn: '#ff8a3d', flyby: '#ffce3d'
    };
    led.style.background = colors[p];
    led.style.boxShadow = `0 0 10px ${colors[p]}`;
  }

  // Timeline (seconds from start)
  const T_PRESCAN     = 3.5;   // Two planes sweep inward; grid materializes at intersection
  const T_PAUSE       = 0.8;   // Grid sits, lasers idle
  const T_STATUS      = 1.5;   // Nodes flash green→yellow→red
  const T_ETCH        = 2.0;   // Etch Gaussian shape
  const T_MEAN        = 1.0;   // Etch mean line
  const T_VAR         = 1.0;   // Etch variance line
  const T_SIGMA_LBL   = 0.8;   // Etch σ² typography
  const T_MU_LBL      = 0.8;   // Etch μ typography
  const T_GRID_ERASE  = 2.5;   // Planes sweep back, erasing grid
  const T_IGNITE      = 1.2;   // 4 beams focus on peak
  const T_FLYBY       = 4.5;   // Equation flies in, pauses readable, flies out

  // Phase boundary times (cumulative)
  const T_PRESCAN_END   = T_PRESCAN;
  const T_PAUSE_END     = T_PRESCAN_END + T_PAUSE;
  const T_STATUS_END    = T_PAUSE_END + T_STATUS;
  const T_PASS1         = T_STATUS_END + T_ETCH;
  const T_PASS2A        = T_PASS1 + T_MEAN;
  const T_PASS2B        = T_PASS2A + T_VAR;
  const T_SIGMA_END     = T_PASS2B + T_SIGMA_LBL;
  const T_MU_END        = T_SIGMA_END + T_MU_LBL;
  const T_ERASE_END     = T_MU_END + T_GRID_ERASE;
  const T_IGNITE_END    = T_ERASE_END + T_IGNITE;
  const T_FLYBY_END     = T_IGNITE_END + T_FLYBY;

  // ============================================================
  // ZAP MOTION HELPER
  // A node "zap" cycle is: brief move (zap_move) + brief fire hold (zap_hold) per station.
  // Given a u-progress through a pass and an array of stations (3D points + targetFn),
  // compute current laser pose, beam target, and "firing" flag.
  // ============================================================
  function zapRun(u, stations, opts){
    // u: 0..1 progress through pass
    // stations: array of {pos:[x,y,z], target:[x,y,z]}
    // opts.holdFrac: portion of each station-slot spent firing (vs moving)
    const N = stations.length;
    const holdFrac = (opts && opts.holdFrac) || 0.45;
    const slot = u * N;
    const stIdx = Math.min(N - 1, Math.floor(slot));
    const slotU = slot - stIdx;
    const cur = stations[stIdx];
    const moveFrac = 1 - holdFrac;
    let pos, firing, beamTarget;
    if (slotU < moveFrac){
      // Snappy ease — cubic-ease-out for fast settle
      const t = slotU / moveFrac;
      const ease = 1 - Math.pow(1 - t, 3);
      const prev = stIdx > 0 ? stations[stIdx - 1] : cur;
      pos = [
        prev.pos[0] + (cur.pos[0] - prev.pos[0]) * ease,
        prev.pos[1] + (cur.pos[1] - prev.pos[1]) * ease,
        prev.pos[2] + (cur.pos[2] - prev.pos[2]) * ease
      ];
      firing = false;
      beamTarget = cur.target;
    } else {
      // Hold phase — beam fires with an ERRATIC pulse pattern, not steady.
      // Use deterministic noise based on station index + slotU.
      // Multiple frequency bands stacked, threshold against a noisy gate.
      pos = cur.pos;
      const holdT = (slotU - moveFrac) / holdFrac;  // 0..1 within hold
      // Pulse pattern: stacked sines with offsets give irregular on/off
      const seed = stIdx * 7.13 + 0.31;
      const a = Math.sin(holdT * 41.0 + seed);
      const b = Math.sin(holdT * 23.7 + seed * 1.7);
      const c = Math.sin(holdT * 73.3 + seed * 0.51);
      // Compose & threshold — bias toward firing-on most of the time
      const gate = a * 0.5 + b * 0.3 + c * 0.2;
      firing = gate > -0.15;  // most of the time on, brief stutters off
      // Add intensity wobble even when on
      const intensityNoise = 0.6 + 0.4 * Math.abs(b * c);
      beamTarget = cur.target;
      // Stash intensity hint on result for caller to use
      return { pos, firing, beamTarget, stIdx, slotU, total: N, intensity: intensityNoise };
    }
    return { pos, firing, beamTarget, stIdx, slotU, total: N, intensity: 1.0 };
  }

  function updateBurn(seqT, dt){
    const peakX = MU;
    const peakY = gauss(MU);
    const peakIdx = Math.max(0, Math.min(CURVE_SAMPLES,
      Math.floor((MU + CURVE_HALF_WIDTH) / (2 * CURVE_HALF_WIDTH) * CURVE_SAMPLES)));
    const leftX  = MU - CUTOFF_SIGMAS * SIGMA;
    const rightX = MU + CUTOFF_SIGMAS * SIGMA;

    // Laser node positions are managed by the etch state machine (updateForgeEtch).
    // During the early sequence (prescan/etch/ignite/burn) they stay where
    // startSequence() placed them. We only ensure visibility here.
    for (const L of allLasers){ L.group.visible = true; }

    // ====================================================================
    // PRE-SCAN — two planes (YZ + XZ) sweep to their intersection.
    //   Grid materializes as they pass over each grid line.
    // ====================================================================
    if (seqT < T_PRESCAN_END){
      setPhase('prescan');
      const u = seqT / T_PRESCAN_END;
      for (const L of allLasers){ aimBeamOff(L); }
      updateSweepingPlanes(u, 'build');
    }
    // ====================================================================
    // PAUSE — grid sits, lasers off, planes hidden.
    // ====================================================================
    else if (seqT < T_PAUSE_END){
      setPhase('pause');
      hideSweepingPlanes();
      for (const L of allLasers){ aimBeamOff(L); }
    }
    // ====================================================================
    // STATUS — laser nodes flash green → yellow → red sequentially.
    // ====================================================================
    else if (seqT < T_STATUS_END){
      setPhase('status');
      hideSweepingPlanes();
      const u = (seqT - T_PAUSE_END) / T_STATUS;
      // 3 color stages
      let color, intensity;
      if (u < 0.33){
        color = 0x5ec962;  // green
        intensity = 1.2;
      } else if (u < 0.66){
        color = 0xffce3d;  // yellow
        intensity = 1.4;
      } else {
        color = 0xff3838;  // red
        intensity = 1.6;
      }
      // Pulse brightness with sin to feel alive
      const pulse = 0.6 + 0.4 * Math.abs(Math.sin(u * Math.PI * 12));
      for (const L of allLasers){
        L.coreMat.emissive.setHex(color);
        L.coreMat.emissiveIntensity = intensity * pulse;
        L.glowMat.color.setHex(color);
        L.glowMat.opacity = 0.5 * pulse;
        L.beamMat.opacity = 0;
        L.haloMat.opacity = 0;
      }
    }
    // ====================================================================
    // PASS_CURVE — etch the Gaussian shape. Nodes anchored at corners; beams
    // sweep along the curve as they fire.
    // ====================================================================
    else if (seqT < T_PASS1){
      setPhase('etch');
      const u = (seqT - T_STATUS_END) / T_ETCH;
      // 4 beams sweep through the curve in parallel, each covering a quadrant
      const quadrants = [
        { laser: laserA, xStart: leftX,                xEnd: leftX + (rightX-leftX)*0.25 },
        { laser: laserB, xStart: leftX + (rightX-leftX)*0.25, xEnd: leftX + (rightX-leftX)*0.5 },
        { laser: laserC, xStart: leftX + (rightX-leftX)*0.5,  xEnd: leftX + (rightX-leftX)*0.75 },
        { laser: laserD, xStart: leftX + (rightX-leftX)*0.75, xEnd: rightX }
      ];
      for (const q of quadrants){
        const targetX = q.xStart + (q.xEnd - q.xStart) * u;
        const cIdx = Math.max(0, Math.min(CURVE_SAMPLES,
          Math.floor((targetX + CURVE_HALF_WIDTH) / (2 * CURVE_HALF_WIDTH) * CURVE_SAMPLES)));
        const targetY = curvePoints[cIdx].y;
        aimBeamAt(q.laser, targetX, targetY, CURVE_Z, 1.4);
        // Etch a window around the current target
        const spread = Math.ceil(CURVE_SAMPLES / 32);
        for (let i = Math.max(0, cIdx - spread); i <= Math.min(CURVE_SAMPLES, cIdx + spread); i++){
          const x = curvePoints[i].x;
          if (!inCutRegion(x)) continue;
          curveAlphas[i] = Math.min(1, curveAlphas[i] + dt * 0.025);
        }
        // Heavy spark burst at impact point — each laser throws a flurry
        const sparkBurst = 5 + Math.floor(Math.random() * 4);  // 5-8 per laser per frame
        for (let k = 0; k < sparkBurst; k++){
          fx2dSpawnSpark(targetX, targetY, CURVE_Z, 1.4);
        }
      }
      curveGeom.attributes.aAlpha.needsUpdate = true;
    }
    // ====================================================================
    // PASS_MEAN — etch the mean line (vertical, at MU)
    // ====================================================================
    else if (seqT < T_PASS2A){
      setPhase('mean');
      const u = (seqT - T_PASS1) / T_MEAN;
      // All 4 nodes fire down at the mean line target — beam target Y sweeps up.
      const targetY = CURVE_BASE_Y + (peakY - CURVE_BASE_Y) * u;
      for (const L of allLasers){
        aimBeamAt(L, MU, targetY, CURVE_Z, 1.4);
      }
      // Reveal the mean line up to current progress
      const litSeg = Math.floor(u * MEAN_LINE_SEGMENTS);
      for (let i = 0; i <= litSeg; i++) meanAlphas[i] = 1;
      meanGeom.attributes.aAlpha.needsUpdate = true;
      // Heavy spark burst (4 lasers all hitting the same point)
      const sparkBurst = 22 + Math.floor(Math.random() * 8);  // 22-30/frame
      for (let k = 0; k < sparkBurst; k++){
        fx2dSpawnSpark(MU, targetY, CURVE_Z, 1.4);
      }
    }
    // ====================================================================
    // PASS_VAR — etch the variance line (horizontal, at baseline)
    // ====================================================================
    else if (seqT < T_PASS2B){
      setPhase('variance');
      const u = (seqT - T_PASS2A) / T_VAR;
      // Beam sweeps left → right along the variance line
      const targetX = leftX + (rightX - leftX) * u;
      for (const L of allLasers){
        aimBeamAt(L, targetX, CURVE_BASE_Y + 0.03, CURVE_Z, 1.4);
      }
      const litSeg = Math.floor(u * VAR_LINE_SEGMENTS);
      for (let i = 0; i <= litSeg; i++) varAlphas[i] = 1;
      varGeom.attributes.aAlpha.needsUpdate = true;
      // Heavy spark burst
      const sparkBurst = 22 + Math.floor(Math.random() * 8);
      for (let k = 0; k < sparkBurst; k++){
        fx2dSpawnSpark(targetX, CURVE_BASE_Y + 0.03, CURVE_Z, 1.4);
      }
    }
    // ====================================================================
    // PASS_SIGMA_LBL — etch the σ² typography
    // ====================================================================
    else if (seqT < T_SIGMA_END){
      setPhase('sigma_lbl');
      const u = (seqT - T_PASS2B) / T_SIGMA_LBL;
      // Beams fire at the σ² label position, each with independent jitter
      // so the cut feels like real laser tracing rather than 4 lasers
      // hitting the same point.
      const sigPos = sigLabelObj.mesh.position;
      const jitterAmp = 0.08;   // ±0.08 world units (label is ~0.3 wide)
      for (const L of allLasers){
        const jx = (Math.random() - 0.5) * jitterAmp * 2;
        const jy = (Math.random() - 0.5) * jitterAmp * 2;
        aimBeamAt(L, sigPos.x + jx, sigPos.y + jy, CURVE_Z, 1.3);
      }
      revealLabel(sigLabelObj, u);
      // Heavy spark burst, with same jitter on spawn points so sparks
      // spread across the label area, not from one spot.
      const sparkBurst = 30 + Math.floor(Math.random() * 10);
      for (let k = 0; k < sparkBurst; k++){
        const sx = sigPos.x + (Math.random() - 0.5) * jitterAmp * 2;
        const sy = sigPos.y + (Math.random() - 0.5) * jitterAmp * 2;
        fx2dSpawnSpark(sx, sy, CURVE_Z, 1.5);
      }
    }
    // ====================================================================
    // PASS_MU_LBL — etch the μ typography
    // ====================================================================
    else if (seqT < T_MU_END){
      setPhase('mu_lbl');
      const u = (seqT - T_SIGMA_END) / T_MU_LBL;
      const muPos = muLabelObj.mesh.position;
      const jitterAmp = 0.08;
      for (const L of allLasers){
        const jx = (Math.random() - 0.5) * jitterAmp * 2;
        const jy = (Math.random() - 0.5) * jitterAmp * 2;
        aimBeamAt(L, muPos.x + jx, muPos.y + jy, CURVE_Z, 1.3);
      }
      revealLabel(muLabelObj, u);
      const sparkBurst = 30 + Math.floor(Math.random() * 10);
      for (let k = 0; k < sparkBurst; k++){
        const sx = muPos.x + (Math.random() - 0.5) * jitterAmp * 2;
        const sy = muPos.y + (Math.random() - 0.5) * jitterAmp * 2;
        fx2dSpawnSpark(sx, sy, CURVE_Z, 1.5);
      }
    }
    // ====================================================================
    // GRID_ERASE — same planes replay, this time clearing the grid lines.
    // ====================================================================
    else if (seqT < T_ERASE_END){
      setPhase('erase');
      // First frame entering erase: reset the swept-progress trackers.
      if (!updateBurn._eraseInited){
        resetSweepProgress();
        updateBurn._eraseInited = true;
      }
      const u = (seqT - T_MU_END) / T_GRID_ERASE;
      updateSweepingPlanes(u, 'erase');
      for (const L of allLasers){ aimBeamOff(L); }
    }
    // ====================================================================
    // IGNITION — all 4 beams focus on the peak of the Gaussian.
    // ====================================================================
    else if (seqT < T_IGNITE_END){
      setPhase('ignite');
      hideSweepingPlanes();
      const u = (seqT - T_ERASE_END) / T_IGNITE;
      const pulse = 1.0 + 0.3 * Math.sin(u * Math.PI * 8);
      aimBeamAt(laserA, peakX - 0.05, peakY, CURVE_Z, 1.8 * pulse);
      aimBeamAt(laserB, peakX + 0.05, peakY, CURVE_Z, 1.8 * pulse);
      aimBeamAt(laserC, peakX - 0.05, peakY, CURVE_Z, 1.8 * pulse);
      aimBeamAt(laserD, peakX + 0.05, peakY, CURVE_Z, 1.8 * pulse);

      // Heavy sparks at peak
      const sparkBurst = 1 + Math.floor(dt * 0.05);
      for (let k = 0; k < sparkBurst; k++){
        fx2dSpawnSpark(peakX, peakY, CURVE_Z, 1.5);
      }
      // Initial ignition lights the peak only
      curveBurn[peakIdx] = 0.9;
      curveAlphas[peakIdx] = 1;
      curveGeom.attributes.aAlpha.needsUpdate = true;
    }
    // ====================================================================
    // BURN — flame spreads slowly outward from the peak horizontally.
    //        Equation flies in/out concurrently.
    // ====================================================================
    else {
      setPhase('burn');
      const burnT = seqT - T_IGNITE_END;
      // Beams off — fire takes over (but only while the FORGE etch hasn't begun;
      // once etchPhase advances past IDLE, the etch state machine owns the beams).
      if (typeof etchPhase === 'undefined' || etchPhase === 0 /* IDLE */){
        for (const L of allLasers){ aimBeamOff(L); }
      }

      // Spread burn outward from peak, SLOW rate.
      // burnT controls how far from peak we've reached.
      const sampleDx = (2 * CURVE_HALF_WIDTH) / CURVE_SAMPLES;
      const sigmaSamples = Math.floor((CUTOFF_SIGMAS * SIGMA) / sampleDx);
      // Reach grows over T_FLYBY seconds
      const spreadProgress = Math.min(1, burnT / T_FLYBY);
      const reachIdx = Math.floor(spreadProgress * sigmaSamples);
      for (let d = 0; d <= reachIdx; d++){
        const li = peakIdx - d;
        const ri = peakIdx + d;
        const distFactor = 1.0 - 0.5 * (d / Math.max(1, sigmaSamples));
        if (li >= 0 && inCutRegion(curvePoints[li].x)){
          curveBurn[li] = Math.max(curveBurn[li], 0.85 * distFactor);
          curveAlphas[li] = 1;
        }
        if (ri <= CURVE_SAMPLES && inCutRegion(curvePoints[ri].x)){
          curveBurn[ri] = Math.max(curveBurn[ri], 0.85 * distFactor);
          curveAlphas[ri] = 1;
        }
      }
      // Sustain & flicker on the burning region
      for (let i = 0; i <= CURVE_SAMPLES; i++){
        if (curveBurn[i] > 0){
          const x = curvePoints[i].x;
          if (!inCutRegion(x)){ curveBurn[i] = 0; continue; }
          const target = 0.80 * curveH[i] + 0.05;
          curveBurn[i] = curveBurn[i] * 0.93 + target * 0.07;
          curveBurn[i] *= 0.96 + Math.random() * 0.08;
          if (curveBurn[i] > 1) curveBurn[i] = 1;
          if (curveBurn[i] < 0.1) curveBurn[i] = 0.1;
        }
      }
      curveGeom.attributes.aAlpha.needsUpdate = true;

      if (Math.random() < dt * 0.010){
        fx2dSpawnSmoke(MU, peakY + 0.4, CURVE_Z);
      }

      // --- Reveal the layered NN ---
      // Each node has a revealStartT (staggered 1.5-4.0s) and a revealMode:
      //   'ember' → a spark fires from the burning curve to the node, lighting it on impact
      //   'fade'  → the node smoothly fades in over ~0.6s
      // The network shape is fully established BEFORE the camera pulls back.
      if (burnT > 1.0){
        nnNodesMesh.visible = true;
        nnEdgesMesh.visible = true;

        for (let i = 0; i < NN.nodes.length; i++){
          const node = NN.nodes[i];
          if (node.revealed) continue;
          if (burnT < node.revealStartT) continue;

          if (node.revealMode === 'ember'){
            // Fire one spark from the burning curve to this node
            let bestI = peakIdx;
            for (let tries = 0; tries < 8; tries++){
              const ci = Math.floor(Math.random() * (CURVE_SAMPLES + 1));
              if (curveBurn[ci] > 0.2){ bestI = ci; break; }
            }
            spawnSkySpark(
              curvePoints[bestI].x,
              curvePoints[bestI].y,
              CURVE_Z,
              i
            );
            node.revealed = true;   // mark as triggered; the spark will light it on arrival
          } else {
            // Fade-in: smoothly ramp ignited from 0 to 1 over 0.6s
            const dtS = dt / 1000;
            node.ignited = Math.min(1, node.ignited + dtS / 0.6);
            if (node.ignited >= 1) node.revealed = true;
          }
        }

        updateNNPulseFlash(dt);
        updateNNCascade(dt);
        // Once the network is fully revealed (after staggered reveal completes),
        // start the layer-propagation pulses for the Neural Array communication look.
        if (burnT > 4.5){
          updateNNPulses(dt);
        }
        pushNNNodeAlphas();
        pushNNEdgeAlphas();
        pushPulseParticles();
      }

      // After 5s of burning, network is fully formed → camera begins pull-back.
      // The anvil rises from below the frame to inside the rig (in front of flame).
      // The rig + anvil scale up together so they grow with the camera retreat
      // and remain prominent in the wider frame.
      if (burnT > 5.0){
        anvilGroup.visible = true;
        anvilState.visible = true;
        cameraTargetT = 1.0;

        const easeT = cameraAnimT * cameraAnimT * (3 - 2 * cameraAnimT);

        // NN expands taller AND wider as camera retreats.
        const sX = 1.0 + cameraAnimT * 4.5;
        const sY = 1.0 + cameraAnimT * 5.5;
        nnGroup.scale.set(sX, sY, 1.0);
        const bottomLocal = NN.centerY - NN.height / 2;
        nnGroup.position.y = bottomLocal * (1 - sY);

        // Rig grows with camera so it stays a prominent frame in the final shot.
        // X/Z scale up fully so the laser corners can reach the FORGE region.
        // Y scale is reduced so the cage bottom (RIG.minY × Y-scale) doesn't
        // extend off the bottom of the visible frame at full zoom.
        const rigScale  = 1.0 + cameraAnimT * 2.8;
        const rigScaleY = 1.0 + cameraAnimT * 1.2;   // tighter Y growth keeps cage bottom in frame
        rig.scale.set(rigScale, rigScaleY, rigScale);

        // Larger final anvil — dominates foreground at full zoom.
        // Anvil scale capped at 90% of the previous max (3.71 instead of 4.125).
        const anvilScale = 0.55 * (1.0 + cameraAnimT * 6.5) * 0.90;
        anvilGroup.scale.set(anvilScale, anvilScale, anvilScale);

        // Anvil rises from offscreen to its final y — anchored at the GROUND
        // plane, so the base sits ON the ground rather than buried below it.
        const anvilFinalY = GROUND_Y;
        anvilGroup.position.y = ANVIL_OFFSCREEN_Y + (anvilFinalY - ANVIL_OFFSCREEN_Y) * cameraAnimT;
        // Anvil pushed forward (z=3.5 × rigScale-fraction) so its front face
        // sits IN FRONT of the text planes (text at z=4.2, anvil scale ≈ 3.71
        // means extrude depth ≈ 4.45, half-depth = 2.23 → front face at
        // 3.5*scaleFrac + 2.23). With cameraAnimT=1, front face ~ 5.7 world z.
        const anvilFwd = 0.92 + cameraAnimT * 1.4;   // grows with zoom
        anvilGroup.position.z = anvilFwd;
        anvilGroup.position.x = 0;
      }

      // Anvil edge-glow flicker driven by flame intensity
      updateAnvilFlicker(dt);
    }

    // Always update sky spark physics (cheap, and harmless when none are alive)
    updateSkySparks(dt);
    // Camera animation runs every frame (it eases smoothly even without input)
    updateCameraAnim(dt);
    // FORGE letter etch — runs once camera reaches final position
    updateForgeEtch(dt);

    // Fire emission — only during ignition and burn (no flames during prescan/etch/erase)
    const inBurn   = seqT > T_IGNITE_END;
    const inIgnite = seqT > T_ERASE_END && seqT < T_IGNITE_END;
    let intensityMul;
    if (inBurn) intensityMul = 1.35;
    else if (inIgnite) intensityMul = 0.65;
    else intensityMul = 0.0;
    if (intensityMul > 0) fx2dEmitFromCurve(intensityMul);
  }

  // ============================================================
  // MAIN LOOP
  // ============================================================
  let lastTime = performance.now();

  function loop(){
    const now = performance.now();
    const dt = Math.min(60, now - lastTime);
    lastTime = now;

    if (sequenceActive){
      const seqT = (now - sequenceStart) / 1000;
      updateBurn(seqT, dt);
      updateLabels(seqT);
    }

    // Render 3D scene first
    renderer.render(scene, camera);
    // Then overlay 2D fx (sparks/fire/smoke) on top
    updateFx2D(now, dt);

    requestAnimationFrame(loop);
  }
  loop();

  // ============================================================
  // CONTROLS
  // ============================================================
  function startSequence(){
    resetAll();
    sequenceActive = true;
    sequenceStart = performance.now();
    setPhase('etch');
  }

  function resetAll(){
    sequenceActive = false;
    setPhase('idle');
    for (let i = 0; i < curveBurn.length; i++){
      curveBurn[i] = 0;
      curveAlphas[i] = 0;
    }
    curveGeom.attributes.aAlpha.needsUpdate = true;

    // Clear 2D fx overlay (sparks, fire, smoke)
    clearFx2D();

    // Clear etched lines
    for (let i = 0; i < meanAlphas.length; i++) meanAlphas[i] = 0;
    for (let i = 0; i < varAlphas.length; i++)  varAlphas[i]  = 0;
    meanGeom.attributes.aAlpha.needsUpdate = true;
    varGeom.attributes.aAlpha.needsUpdate  = true;

    // Clear workpiece grid and hide sweeping planes
    clearGrid();
    hideSweepingPlanes();
    resetSweepProgress();
    if (typeof updateBurn !== 'undefined') updateBurn._eraseInited = false;

    // Clear 3D label typography
    clearLabels();
    positionLabels();
    muLabelObj.mesh.scale.set(1, 1, 1);
    sigLabelObj.mesh.scale.set(1, 1, 1);

    // Reset FORGE etch — clear alphas and state so the sequence re-plays cleanly
    etchPhase = ETCH_PHASE.IDLE;
    etchPhaseT = 0;
    _lastProjectSeg = -1;
    _lastForgeSeg = -1;
    _lastDotsSeg = -1;
    smokeTimer = 0;
    for (let i = 0; i < projectLetterAlphas.length; i++) projectLetterAlphas[i] = 0;
    for (let i = 0; i < forgeLetterAlphas.length;   i++) forgeLetterAlphas[i]   = 0;
    for (let i = 0; i < forgeDotAlphas.length;      i++) forgeDotAlphas[i]      = 0;
    // Canvas overlay off until next etch begins
    textOverlayVisible = false;
    textHeat = 0;
    canvasSheenT = -0.4;
    // Restore lasers to default rig-edge positions so they're ready for the next run
    laserA.group.position.set(RIG.minX, RIG.maxY, RIG.minZ);  // front-top-left
    laserB.group.position.set(RIG.maxX, RIG.maxY, RIG.minZ);  // front-top-right
    laserC.group.position.set(RIG.minX, RIG.maxY, RIG.maxZ);  // back-top-left
    laserD.group.position.set(RIG.maxX, RIG.maxY, RIG.maxZ);  // back-top-right
    for (const L of allLasers){ aimBeamOff(L); }
    clearNN();
    // Reset NN ignition state machine
    if (typeof updateBurn !== 'undefined'){
      updateBurn._ignSparkInited = false;
      updateBurn._inputQueue = null;
      updateBurn._nextSparkSpawn = 0;
    }
    // Retire all sky sparks
    for (let i = 0; i < SKY_SPARK_MAX; i++){
      if (skySparks[i]){ skySparks[i].alive = false; }
      sparkAlpArr[i] = 0;
      sparkPosArr[i*3+1] = -1000;
    }
    skySparkGeom.attributes.position.needsUpdate = true;
    skySparkGeom.attributes.aAlpha.needsUpdate = true;

    // Reset camera, anvil, FORGE letters, and group transforms
    resetCamera();
    anvilGroup.visible = false;
    anvilGroup.position.set(0, ANVIL_OFFSCREEN_Y, 0.4);
    anvilGroup.scale.set(0.55, 0.55, 0.55);
    anvilState.visible = false;
    anvilState.revealForgeProgress = 0;
    anvilState.edgeGlow = 0.55;
    anvilState.forgeLightIntensity = 0;
    forgeLight.intensity = 0;
    anvilEdgesMat.opacity = 0.55;
    clearForgeLetters();
    rig.scale.set(1, 1, 1);
    nnGroup.position.set(0, 0, 0);
    nnGroup.scale.set(1, 1, 1);
    // Clear NN propagation pulses
    nnPulses.length = 0;
    nnPulseSpawnCooldown = 0;
    for (const e of NN.edges){ e.pulseBoost = 0; }

    aimBeamOff(laserA);
    aimBeamOff(laserB);
    aimBeamOff(laserC);
    aimBeamOff(laserD);
    // Anchor at the 4 top corners — no movement throughout sequence
    laserA.group.position.set(RIG.minX, RIG.maxY, RIG.minZ);
    laserB.group.position.set(RIG.maxX, RIG.maxY, RIG.minZ);
    laserC.group.position.set(RIG.minX, RIG.maxY, RIG.maxZ);
    laserD.group.position.set(RIG.maxX, RIG.maxY, RIG.maxZ);
    laserA.group.visible = true;
    laserB.group.visible = true;
    laserC.group.visible = true;
    laserD.group.visible = true;

    // Hide math overlays
    const muLabel = document.getElementById('labelMu');
    const sigLabel = document.getElementById('labelSigma');
    if (muLabel) muLabel.classList.remove('show');
    if (sigLabel) sigLabel.classList.remove('show');
    if (equationSprite) equationSprite.visible = false;
  }

  document.getElementById('sequence').addEventListener('click', startSequence);
  document.getElementById('reset').addEventListener('click', resetAll);

  // Flame tuning values — previously exposed via slider widget; now hardcoded
  // to the final tuned values from interactive iteration.
  flameYOffsetMax = 4.0;     // shifts flame upward at full zoom
  flameWidthScale = 3.00;    // horizontal stretch around MU
  flameHeightScale = 1.95;   // vertical stretch around CURVE_BASE_Y

  // ============================================================
  // OVERLAY LABELS — project 3D world points to screen positions
  // ============================================================
  const labelMu     = document.getElementById('labelMu');
  const labelSigma  = document.getElementById('labelSigma');
  const projectV    = new THREE.Vector3();

  function project(x, y, z){
    projectV.set(x, y, z).project(camera);
    return {
      x: (projectV.x * 0.5 + 0.5) * window.innerWidth,
      y: (-projectV.y * 0.5 + 0.5) * window.innerHeight,
      onScreen: projectV.z < 1
    };
  }

  // ============================================================
  // ANVIL — 3D PBR mesh with amber edge wireframe.
  // Backlit by a hot point light at the burning curve. Edge glow modulates with
  // flame intensity for the "shadow dance" effect.
  // ============================================================

  // Ground plane (dark forge floor)
  const GROUND_Y = -5.5;
  {
    const groundGeom = new THREE.PlaneGeometry(80, 80);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x0a0805,
      metalness: 0.3,
      roughness: 0.95
    });
    const ground = new THREE.Mesh(groundGeom, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = GROUND_Y;
    ground.position.z = 0;
    scene.add(ground);
  }

  // ANVIL — 3D extruded silhouette. Built from a THREE.Shape with carefully
  // matched tangents so the horn forms a clean teardrop on the right side
  // of the body. No bevel (causes EdgesGeometry artifacts).
  // ============================================================
  const ANVIL_TOP_Y = 2.55;     // model-space y of the working top face
  const ANVIL_EXTRUDE_DEPTH = 1.2;

  // Silhouette construction, walked counterclockwise starting bottom-left.
  //
  //   Base (foot):    rectangle, y=0 to y=0.55, x=-2.8 to 2.8
  //   Waist:          taper in from base to narrow waist (x=±1.05, y=1.55), then back out
  //   Body block:     rectangle, y=1.85 to y=2.55, x=-2.8 to 2.8
  //   Horn:           projects from RIGHT side of body block. Bottom edge starts
  //                   at (2.8, 1.85), arcs out and slightly up to tip at (6.0, 1.90),
  //                   then top edge arcs back to (2.8, 2.55).
  //   Top face:       flat from x=2.8 to x=-2.8 at y=2.55
  //   Left side:      mirror down (no horn)
  //
  function makeAnvilShape(){
    const s = new THREE.Shape();
    // Classic anvil profile: stepped base flare → waist taper → body.
    // Right side has a STEEP diagonal cut from the waist up to the top corner
    // (no horn). Both sides mirror at the base for 3D depth read.
    s.moveTo(-2.8, 0.00);            // bottom-left of base
    s.lineTo( 2.8, 0.00);            // bottom-right of base
    s.lineTo( 2.8, 0.30);            // top of right base
    s.lineTo( 2.1, 0.50);            // step
    s.lineTo( 1.3, 0.70);            // taper into waist
    s.lineTo( 1.05, 1.55);           // waist right (narrowest)
    s.lineTo( 2.8, 2.55);            // top-right corner of body (steep cut)
    s.lineTo(-2.8, 2.55);            // top face across
    s.lineTo(-2.8, 1.85);            // bottom-left of body
    s.lineTo(-1.3, 1.7);             // mirror flare
    s.lineTo(-1.05, 1.55);           // waist left
    s.lineTo(-1.3, 0.70);            // mirror taper
    s.lineTo(-2.1, 0.50);            // mirror step
    s.lineTo(-2.8, 0.30);            // top of left base
    s.closePath();
    return s;
  }

  const anvilShape = makeAnvilShape();
  const ANVIL_OUTLINE_2D = [
    [-2.8, 0.00], [ 2.8, 0.00], [ 2.8, 0.30],
    [ 2.1, 0.50], [ 1.3, 0.70], [ 1.05, 1.55],
    [ 2.8, 2.55],
    [-2.8, 2.55], [-2.8, 1.85], [-1.3, 1.7 ],
    [-1.05, 1.55], [-1.3, 0.70], [-2.1, 0.50], [-2.8, 0.30]
  ];

  const anvilGeom = new THREE.ExtrudeGeometry(anvilShape, {
    depth: ANVIL_EXTRUDE_DEPTH,
    bevelEnabled: false,
    curveSegments: 32
  });
  anvilGeom.translate(0, 0, -ANVIL_EXTRUDE_DEPTH / 2);

  // Dark steel PBR — picks up warm light from the forge backlight point light
  const anvilMat = new THREE.MeshStandardMaterial({
    color: 0x363737,           // user-specified
    metalness: 0.5,
    roughness: 0.55,
    emissive: 0x111212,
    emissiveIntensity: 0.5,
    flatShading: false
  });
  const anvilMesh = new THREE.Mesh(anvilGeom, anvilMat);

  // Edge wireframe outline — hidden by default. The MeshStandardMaterial
  // shading with rim lights carries the 3D look; the front-face perimeter
  // contour was creating a "flat plane" artifact at the bottom of the anvil.
  // Kept in the scene (in case a debug toggle is useful) but invisible.
  const anvilEdgesGeom = new THREE.EdgesGeometry(anvilGeom, 50);
  const anvilEdgesMat = new THREE.LineBasicMaterial({
    color: 0x884420,
    transparent: true,
    opacity: 0.0,
    blending: THREE.NormalBlending,
    depthWrite: false
  });
  const anvilEdges = new THREE.LineSegments(anvilEdgesGeom, anvilEdgesMat);
  anvilEdges.renderOrder = 2;
  anvilEdges.visible = false;

  var anvilGroup = new THREE.Group();
  anvilGroup.add(anvilMesh);
  anvilGroup.add(anvilEdges);
  anvilGroup.visible = false;
  scene.add(anvilGroup);

  // ============================================================
  // PROJECT F-O-R-G-E etch on anvil top face
  // Block-letter font built as line segments. Drawn on the top face of the
  // anvil (y = 2.55 in model space). Two rows: "PROJECT" then "F-O-R-G-E".
  // ============================================================
  // Each glyph is defined as an array of [x,y] strokes on a unit grid:
  //   width = 1.0 (0 to 1), height = 1.0 (0 to 1)
  // Strokes are arrays of points connected as line segments.
  const GLYPHS = {
    'F': [[[0.25,0],[0.25,1],[0.95,1]], [[0.25,0.55],[0.80,0.55]]],
    'O': [[[0.2,0],[0.8,0],[1,0.2],[1,0.8],[0.8,1],[0.2,1],[0,0.8],[0,0.2],[0.2,0]]],
    'R': [[[0,0],[0,1],[0.7,1],[0.95,0.85],[0.95,0.6],[0.7,0.45],[0,0.45]],
          [[0.4,0.45],[0.95,0]]],
    'G': [
      [[1, 0.8], [0.8, 1], [0.2, 1], [0, 0.8], [0, 0.2], [0.2, 0], [0.8, 0], [1, 0.2], [1, 0.45]],
      [[1, 0.45], [0.55, 0.45]]
    ],
    'E': [[[0.95,0],[0,0],[0,1],[0.95,1]], [[0,0.55],[0.65,0.55]]],
    'P': [[[0,0],[0,1],[0.7,1],[0.95,0.85],[0.95,0.6],[0.7,0.45],[0,0.45]]],
    'J': [[[0.8,1],[0.8,0.2],[0.6,0],[0.2,0],[0,0.2]]],
    'C': [[[1,0.2],[0.8,0],[0.2,0],[0,0.2],[0,0.8],[0.2,1],[0.8,1],[1,0.8]]],
    'T': [[[0,1],[1,1]], [[0.5,1],[0.5,0]]],
    '-': [[[0.15,0.5],[0.85,0.5]]]
  };

  function buildText(text, charScale, gap){
    // Returns flat Float32 array of segment endpoints in [x,y,z] format.
    const segs = [];
    let x = 0;
    for (const ch of text){
      const glyph = GLYPHS[ch];
      if (glyph){
        for (const stroke of glyph){
          for (let i = 0; i < stroke.length - 1; i++){
            const a = stroke[i], b = stroke[i + 1];
            segs.push((x + a[0]) * charScale, a[1] * charScale, 0,
                      (x + b[0]) * charScale, b[1] * charScale, 0);
          }
        }
      }
      x += 1.0 + gap;   // advance one glyph width plus gap
    }
    return { segs, width: x * charScale };
  }

  // Extended text builder: returns per-letter and (optionally) per-dot metadata.
  // Letters and dots become separate segment arrays so they can be etched in
  // different passes with different palettes, in a controlled order.
  //   letterSegs[]: flat float array of letter line segments
  //   letterMeta[]: { startSeg, segCount, centerX, centerY } per letter
  //   dotSegs[]:    flat float array of dot line segments (between letters)
  //   dotMeta[]:    same shape, one entry per dot
  function buildTextWithDots(text, charScale, gap, useDots){
    const letterSegs = [];
    const letterMeta = [];
    const dotSegs    = [];
    const dotMeta    = [];
    let x = 0;
    let prevLetterRightX = null;
    for (let chIdx = 0; chIdx < text.length; chIdx++){
      const ch = text[chIdx];
      const glyph = GLYPHS[ch];
      if (glyph){
        // If a dot belongs between previous letter and this one, place it now.
        if (useDots && prevLetterRightX !== null){
          const dotX = (prevLetterRightX + x) / 2;       // centered horizontally between letters
          const dotY = 0.5;                              // centered vertically (mid-height in glyph space)
          const dotR = 0.10;                             // small radius
          const dotStart = dotSegs.length / 6;
          // Render a tiny diamond (4 segments) as the dot. Pleasingly visible at distance.
          const dx0 = dotX,           dy0 = dotY + dotR;
          const dx1 = dotX + dotR,    dy1 = dotY;
          const dx2 = dotX,           dy2 = dotY - dotR;
          const dx3 = dotX - dotR,    dy3 = dotY;
          dotSegs.push(dx0*charScale, dy0*charScale, 0, dx1*charScale, dy1*charScale, 0);
          dotSegs.push(dx1*charScale, dy1*charScale, 0, dx2*charScale, dy2*charScale, 0);
          dotSegs.push(dx2*charScale, dy2*charScale, 0, dx3*charScale, dy3*charScale, 0);
          dotSegs.push(dx3*charScale, dy3*charScale, 0, dx0*charScale, dy0*charScale, 0);
          dotMeta.push({
            startSeg: dotStart,
            segCount: 4,
            centerX: dotX * charScale,
            centerY: dotY * charScale
          });
        }
        // Now place the letter itself.
        const letStart = letterSegs.length / 6;
        let letCount = 0;
        for (const stroke of glyph){
          for (let i = 0; i < stroke.length - 1; i++){
            const a = stroke[i], b = stroke[i + 1];
            letterSegs.push((x + a[0])*charScale, a[1]*charScale, 0,
                            (x + b[0])*charScale, b[1]*charScale, 0);
            letCount++;
          }
        }
        letterMeta.push({
          startSeg: letStart,
          segCount: letCount,
          centerX: (x + 0.5) * charScale,
          centerY: 0.5 * charScale
        });
        prevLetterRightX = x + 1.0;
      }
      x += 1.0 + gap;
    }
    return { letterSegs, letterMeta, dotSegs, dotMeta, width: x * charScale };
  }

  // Build "PROJECT" and "F·O·R·G·E" as TRUE 3D LINE SEGMENTS — no backing plane.
  // The lines are rendered directly via THREE.LineSegments with per-vertex letter
  // indices and a uniform alphas array, so each letter's reveal alpha can be
  // animated independently. NO PLANE GEOMETRY → no rectangle artifact possible.
  const PROJECT_LETTER_SCALE = 0.35;
  const FORGE_LETTER_SCALE   = 1.30;
  const FORGE_LETTER_GAP     = 0.85;

  const projectData = buildTextWithDots('PROJECT', PROJECT_LETTER_SCALE, 0.30, false);
  const forgeData   = buildTextWithDots('FORGE',   FORGE_LETTER_SCALE,   FORGE_LETTER_GAP, true);

  // Build a 3D line-segment word.
  //   data       : output of buildTextWithDots
  //   paletteFn  : per-letter color function (t in [0,1] → [r,g,b])
  //   dotColor   : optional RGB triple for dots (or null if no dots)
  //   worldWidth : how wide the word is in world space
  // Returns { meshLetters, meshDots, redraw, worldWidth, data, getLetterCenter }.
  function makeTextLines(data, paletteFn, dotColor, worldWidth){
    const n = data.letterMeta.length;
    // Scale factor from data coords to world coords. data.width is in data units;
    // we want the rendered word to span worldWidth.
    const scale = worldWidth / data.width;
    const letterScale = (data.letterMeta[0] ? data.letterMeta[0].centerY * 2.0 : 1.0);
    const worldHeight = letterScale * scale;

    // ---- Letter segments ----
    // For each segment, build a QUAD (4 verts, 2 triangles) to give the stroke
    // visible thickness. Per-vertex attributes:
    //   - aLetterIdx (which letter this vertex belongs to, for alpha lookup)
    //   - aColor     (per-letter RGB from palette)
    //   - aEdgeT     (-1..+1 across stroke width for anti-aliased edges)
    const segCount = data.letterSegs.length / 6;

    // Build a lookup: segment_index → letter_index
    const segToLetter = new Int32Array(segCount);
    for (let li = 0; li < n; li++){
      const meta = data.letterMeta[li];
      for (let s = meta.startSeg; s < meta.startSeg + meta.segCount; s++){
        segToLetter[s] = li;
      }
    }

    // Center the geometry around (0, 0) so the mesh's position sets the center.
    // Data spans x ∈ [0, data.width], y ∈ [0, letterScale]. We want it centered.
    const cxOff = -data.width / 2;
    const cyOff = -letterScale / 2;

    // STROKE THICKNESS — substantially thicker for visibility on the anvil.
    const STROKE_THICKNESS = 0.22 * letterScale * scale;

    // Build each segment as a QUAD (2 triangles) — 4 vertices, 6 indices.
    // The quad extends perpendicular to the segment direction by ±halfThickness.
    // Per-vertex attribute aEdgeT carries -1..+1 across the quad's width, so the
    // fragment shader can do an anti-aliased thickness falloff (full-bright at
    // center, fading at edges).
    const positions  = new Float32Array(segCount * 4 * 3);     // 4 verts × 3 coords
    const letterIdx  = new Float32Array(segCount * 4);
    const colors     = new Float32Array(segCount * 4 * 3);
    const edgeT      = new Float32Array(segCount * 4);          // -1..+1 across stroke width
    const indices    = new Uint32Array(segCount * 6);           // 2 triangles per segment

    for (let s = 0; s < segCount; s++){
      const i0 = s * 6;
      const x1 = (data.letterSegs[i0]     + cxOff) * scale;
      const y1 = (data.letterSegs[i0 + 1] + cyOff) * scale;
      const x2 = (data.letterSegs[i0 + 3] + cxOff) * scale;
      const y2 = (data.letterSegs[i0 + 4] + cyOff) * scale;

      // Direction and perpendicular
      const dx = x2 - x1, dy = y2 - y1;
      const len = Math.max(1e-6, Math.hypot(dx, dy));
      const nx = -dy / len, ny = dx / len;   // perpendicular (rotated 90° CCW)
      const h = STROKE_THICKNESS * 0.5;

      // 4 vertices of the quad
      const v = s * 12;
      // v0: x1 + perp×+h
      positions[v + 0] = x1 + nx * h; positions[v + 1]  = y1 + ny * h; positions[v + 2]  = 0;
      // v1: x1 + perp×-h
      positions[v + 3] = x1 - nx * h; positions[v + 4]  = y1 - ny * h; positions[v + 5]  = 0;
      // v2: x2 + perp×+h
      positions[v + 6] = x2 + nx * h; positions[v + 7]  = y2 + ny * h; positions[v + 8]  = 0;
      // v3: x2 + perp×-h
      positions[v + 9] = x2 - nx * h; positions[v + 10] = y2 - ny * h; positions[v + 11] = 0;

      // Indices (2 triangles): 0-1-2 and 1-3-2
      const iBase = s * 4;
      indices[s * 6 + 0] = iBase + 0;
      indices[s * 6 + 1] = iBase + 1;
      indices[s * 6 + 2] = iBase + 2;
      indices[s * 6 + 3] = iBase + 1;
      indices[s * 6 + 4] = iBase + 3;
      indices[s * 6 + 5] = iBase + 2;

      // edgeT: +1 on perpendicular side, -1 on opposite, for anti-aliased edges
      edgeT[s * 4 + 0] = +1;
      edgeT[s * 4 + 1] = -1;
      edgeT[s * 4 + 2] = +1;
      edgeT[s * 4 + 3] = -1;

      const li = segToLetter[s];
      for (let k = 0; k < 4; k++) letterIdx[s * 4 + k] = li;

      const tCol = (n === 1) ? 0.5 : li / (n - 1);
      const rgb = paletteFn(tCol);
      for (let k = 0; k < 4; k++){
        colors[s * 12 + k * 3 + 0] = rgb[0];
        colors[s * 12 + k * 3 + 1] = rgb[1];
        colors[s * 12 + k * 3 + 2] = rgb[2];
      }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position',   new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('aLetterIdx', new THREE.BufferAttribute(letterIdx, 1));
    geom.setAttribute('aColor',     new THREE.BufferAttribute(colors, 3));
    geom.setAttribute('aEdgeT',     new THREE.BufferAttribute(edgeT, 1));
    geom.setIndex(new THREE.BufferAttribute(indices, 1));

    // Uniform array of per-letter alphas (0..1). Updated each frame.
    const uLetterAlphas = { value: new Float32Array(Math.max(1, n)) };
    // Sheen position (-1 disables sheen). Scrolls left-to-right in data x.
    const uSheenT = { value: -1.0 };
    // Glow multiplier — bumps shader brightness for "fresh etch" feel
    const uGlow = { value: 1.0 };

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      side: THREE.DoubleSide,    // quads visible from both sides (camera-facing)
      uniforms: {
        uAlphas: uLetterAlphas,
        uSheenT: uSheenT,
        uGlow:   uGlow,
        uHeat:   { value: 1.0 },    // 0..1 — fades after etch completes (afterglow)
        uTime:   { value: 0.0 },    // for flickering afterglow
        uNumLetters: { value: n }
      },
      vertexShader: `
        attribute float aLetterIdx;
        attribute vec3  aColor;
        attribute float aEdgeT;
        uniform float uAlphas[${Math.max(1, n)}];
        uniform float uSheenT;
        uniform float uGlow;
        uniform float uNumLetters;
        varying vec3  vColor;
        varying float vAlpha;
        varying float vSheen;
        varying float vEdgeT;
        void main(){
          int li = int(aLetterIdx);
          float a = uAlphas[li];
          vColor = clamp(aColor * uGlow * 1.6, 0.0, 1.0);
          vAlpha = a;
          vEdgeT = aEdgeT;
          float lt = aLetterIdx / max(1.0, uNumLetters - 1.0);
          float d  = (lt - uSheenT) / 0.18;
          vSheen   = exp(-d * d);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3  vColor;
        varying float vAlpha;
        varying float vSheen;
        varying float vEdgeT;
        uniform float uHeat;
        uniform float uTime;
        void main(){
          // Anti-aliased thickness: solid in center, fades toward edges.
          // edgeT is -1..+1 across the stroke width. abs() gives 0 at center, 1 at edges.
          float edgeFade = 1.0 - smoothstep(0.65, 1.0, abs(vEdgeT));

          // Base letter color
          vec3 col = vColor;

          // AFTERGLOW: warm orange/amber tint added on top, simulating heat
          // from fresh laser cutting. Flickers based on uTime and edge position.
          float flicker = 0.85 + 0.15 * sin(uTime * 8.0 + vEdgeT * 3.7);
          vec3  heatHue = vec3(1.0, 0.55, 0.18);    // warm amber
          col = mix(col, col * 0.5 + heatHue, uHeat * flicker * (0.4 + 0.6 * abs(vEdgeT)));

          // Sheen mixes toward white as it sweeps past
          col = mix(col, vec3(1.0, 1.0, 1.0), vSheen * vAlpha * 0.6);

          gl_FragColor = vec4(col, vAlpha * edgeFade);
        }
      `
    });

    const meshLetters = new THREE.Mesh(geom, mat);

    // ---- HALO GLOW MESH ----
    // A second pass: same segments, but built as wider quads with soft gaussian
    // falloff, blended additively. Creates the overflow glow/bleed around strokes.
    const HALO_THICKNESS = STROKE_THICKNESS * 3.5;     // much wider than the stroke
    const haloPositions = new Float32Array(segCount * 4 * 3);
    const haloLetterIdx = new Float32Array(segCount * 4);
    const haloColors    = new Float32Array(segCount * 4 * 3);
    const haloEdgeT     = new Float32Array(segCount * 4);
    const haloIndices   = new Uint32Array(segCount * 6);

    for (let s = 0; s < segCount; s++){
      const i0 = s * 6;
      const x1 = (data.letterSegs[i0]     + cxOff) * scale;
      const y1 = (data.letterSegs[i0 + 1] + cyOff) * scale;
      const x2 = (data.letterSegs[i0 + 3] + cxOff) * scale;
      const y2 = (data.letterSegs[i0 + 4] + cyOff) * scale;
      const dx = x2 - x1, dy = y2 - y1;
      const len = Math.max(1e-6, Math.hypot(dx, dy));
      const nx = -dy / len, ny = dx / len;
      const h = HALO_THICKNESS * 0.5;
      // Extend halo PAST the segment endpoints too, for round end caps
      const tx = dx / len, ty = dy / len;
      const ex = tx * h, ey = ty * h;     // endpoint extension (cap radius = h)

      const v = s * 12;
      // v0: start + perp×+h + (-tangent×h)  (back-left)
      haloPositions[v + 0]  = x1 + nx * h - ex; haloPositions[v + 1]  = y1 + ny * h - ey; haloPositions[v + 2]  = 0;
      // v1: start + perp×-h + (-tangent×h)  (back-right)
      haloPositions[v + 3]  = x1 - nx * h - ex; haloPositions[v + 4]  = y1 - ny * h - ey; haloPositions[v + 5]  = 0;
      // v2: end + perp×+h + (+tangent×h)    (front-left)
      haloPositions[v + 6]  = x2 + nx * h + ex; haloPositions[v + 7]  = y2 + ny * h + ey; haloPositions[v + 8]  = 0;
      // v3: end + perp×-h + (+tangent×h)    (front-right)
      haloPositions[v + 9]  = x2 - nx * h + ex; haloPositions[v + 10] = y2 - ny * h + ey; haloPositions[v + 11] = 0;

      const iBase = s * 4;
      haloIndices[s * 6 + 0] = iBase + 0;
      haloIndices[s * 6 + 1] = iBase + 1;
      haloIndices[s * 6 + 2] = iBase + 2;
      haloIndices[s * 6 + 3] = iBase + 1;
      haloIndices[s * 6 + 4] = iBase + 3;
      haloIndices[s * 6 + 5] = iBase + 2;

      haloEdgeT[s * 4 + 0] = +1;
      haloEdgeT[s * 4 + 1] = -1;
      haloEdgeT[s * 4 + 2] = +1;
      haloEdgeT[s * 4 + 3] = -1;

      const li = segToLetter[s];
      for (let k = 0; k < 4; k++) haloLetterIdx[s * 4 + k] = li;
      const tCol = (n === 1) ? 0.5 : li / (n - 1);
      const rgb = paletteFn(tCol);
      for (let k = 0; k < 4; k++){
        haloColors[s * 12 + k * 3 + 0] = rgb[0];
        haloColors[s * 12 + k * 3 + 1] = rgb[1];
        haloColors[s * 12 + k * 3 + 2] = rgb[2];
      }
    }

    const haloGeom = new THREE.BufferGeometry();
    haloGeom.setAttribute('position',   new THREE.BufferAttribute(haloPositions, 3));
    haloGeom.setAttribute('aLetterIdx', new THREE.BufferAttribute(haloLetterIdx, 1));
    haloGeom.setAttribute('aColor',     new THREE.BufferAttribute(haloColors, 3));
    haloGeom.setAttribute('aEdgeT',     new THREE.BufferAttribute(haloEdgeT, 1));
    haloGeom.setIndex(new THREE.BufferAttribute(haloIndices, 1));

    const haloMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,    // glow bleeds outward
      side: THREE.DoubleSide,
      uniforms: {
        uAlphas: uLetterAlphas,             // share alphas with main strokes
        uHeat:   mat.uniforms.uHeat,        // share heat uniform
        uNumLetters: { value: n }
      },
      vertexShader: `
        attribute float aLetterIdx;
        attribute vec3  aColor;
        attribute float aEdgeT;
        uniform float uAlphas[${Math.max(1, n)}];
        varying vec3  vColor;
        varying float vAlpha;
        varying float vEdgeT;
        void main(){
          int li = int(aLetterIdx);
          vAlpha = uAlphas[li];
          vColor = aColor;
          vEdgeT = aEdgeT;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3  vColor;
        varying float vAlpha;
        varying float vEdgeT;
        uniform float uHeat;
        void main(){
          // Gaussian falloff from stroke center to halo edge
          float d = vEdgeT;
          float falloff = exp(-d * d * 3.0);
          // Saturate the halo color and boost
          vec3 col = vColor * 1.4;
          // Heat tinges halo orange when freshly cut
          col = mix(col, vec3(1.0, 0.65, 0.25), uHeat * 0.35);
          // Additive output: brighter colors with falloff
          gl_FragColor = vec4(col * falloff, vAlpha * falloff * 0.85);
        }
      `
    });

    const meshHalo = new THREE.Mesh(haloGeom, haloMat);
    // Halo renders BEFORE the main strokes (lower renderOrder) so the sharp
    // strokes sit ON TOP of the soft glow. Same scene position as the strokes.
    meshHalo.renderOrder = -1;

    // ---- Dots (optional) ----
    let meshDots = null;
    let uDotAlphas = null;
    if (dotColor && data.dotMeta.length > 0){
      const dCount = data.dotSegs.length / 6;
      const dPos = new Float32Array(dCount * 2 * 3);
      const dIdx = new Float32Array(dCount * 2);
      const dSegToDot = new Int32Array(dCount);
      for (let di = 0; di < data.dotMeta.length; di++){
        const meta = data.dotMeta[di];
        for (let s = meta.startSeg; s < meta.startSeg + meta.segCount; s++){
          dSegToDot[s] = di;
        }
      }
      for (let s = 0; s < dCount; s++){
        const i0 = s * 6;
        const x1 = (data.dotSegs[i0]     + cxOff) * scale;
        const y1 = (data.dotSegs[i0 + 1] + cyOff) * scale;
        const x2 = (data.dotSegs[i0 + 3] + cxOff) * scale;
        const y2 = (data.dotSegs[i0 + 4] + cyOff) * scale;
        dPos[s * 6 + 0] = x1; dPos[s * 6 + 1] = y1; dPos[s * 6 + 2] = 0;
        dPos[s * 6 + 3] = x2; dPos[s * 6 + 4] = y2; dPos[s * 6 + 5] = 0;
        dIdx[s * 2 + 0] = dSegToDot[s];
        dIdx[s * 2 + 1] = dSegToDot[s];
      }
      const dGeom = new THREE.BufferGeometry();
      dGeom.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
      dGeom.setAttribute('aDotIdx',  new THREE.BufferAttribute(dIdx, 1));
      const nDots = data.dotMeta.length;
      uDotAlphas = { value: new Float32Array(Math.max(1, nDots)) };
      const dMat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.NormalBlending,
        uniforms: {
          uAlphas: uDotAlphas,
          uColor:  { value: new THREE.Color(dotColor[0], dotColor[1], dotColor[2]) }
        },
        vertexShader: `
          attribute float aDotIdx;
          uniform float uAlphas[${Math.max(1, nDots)}];
          varying float vAlpha;
          void main(){
            int di = int(aDotIdx);
            vAlpha = uAlphas[di];
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 uColor;
          varying float vAlpha;
          void main(){
            gl_FragColor = vec4(uColor, vAlpha);
          }
        `
      });
      meshDots = new THREE.LineSegments(dGeom, dMat);
    }

    // Update per-frame: pass current alphas into the shader uniforms.
    function redraw(letterAlphas, dotAlphas, glowMul, sheenT){
      // Copy alphas into uniform Float32Array
      for (let i = 0; i < letterAlphas.length && i < uLetterAlphas.value.length; i++){
        uLetterAlphas.value[i] = letterAlphas[i] || 0;
      }
      uGlow.value = glowMul != null ? glowMul : 1.0;
      uSheenT.value = (sheenT == null) ? -1.0 : sheenT;
      if (meshDots && uDotAlphas){
        for (let i = 0; i < dotAlphas.length && i < uDotAlphas.value.length; i++){
          uDotAlphas.value[i] = dotAlphas[i] || 0;
        }
      }
    }

    // World-center of letter index li (used for laser aiming, smoke spawning).
    // The mesh is centered at its position; letter centerX/centerY are in data
    // coords offset by (cxOff, cyOff) and scaled.
    function getLetterCenter(meshPos, meta){
      const lx = (meta.centerX + cxOff) * scale;
      const ly = (meta.centerY + cyOff) * scale;
      return { x: meshPos.x + lx, y: meshPos.y + ly, z: meshPos.z };
    }

    redraw(new Array(n).fill(0), new Array(data.dotMeta.length).fill(0), 1.0, -1.0);

    return {
      meshLetters,
      meshHalo,
      meshDots,
      mat,
      get mesh(){ return meshLetters; },
      redraw,
      setHeat(h){ mat.uniforms.uHeat.value = h; },
      tickTime(t){ mat.uniforms.uTime.value = t; },
      worldWidth,
      worldHeight,
      data,
      getLetterCenter
    };
  }

  // Per-letter palette functions used by the redraw helper
  const PROJECT_PALETTE = paletteWarm;
  // FORGE letters all use the same VIVID green — saturated and bright.
  const FORGE_PALETTE   = (t) => [0.10, 1.00, 0.45];

  // World dimensions for each word's plane
  const PROJECT_PLANE_WIDTH = 9.0;
  const FORGE_PLANE_WIDTH   = 12.25;  // 2× larger (was 6.125)

  var projectPlane = makeTextLines(projectData, PROJECT_PALETTE, null,           PROJECT_PLANE_WIDTH);
  var forgePlane   = makeTextLines(forgeData,   FORGE_PALETTE,   [0.99, 0.91, 0.14], FORGE_PLANE_WIDTH);

  // World positioning — PROJECT just ABOVE FORGE.
  // Z position: must satisfy two constraints to look right:
  //   (a) BEHIND the laser corners (lasers ~z=4.56) so beams shoot INTO the
  //       letters (away from camera) — the cage-corner nodes appear to be
  //       doing the etching from in front
  //   (b) IN FRONT of the anvil (anvil front face ~z=3.75 at full zoom) so the
  //       letters read in front of the working surface, not buried inside it
  // The narrow window between those puts text around z=4.2.
  // World positioning — PROJECT just ABOVE FORGE.
  // Z position: IN FRONT of the anvil's front face. At full camera zoom, the
  // anvil sits forward at world z ≈ 2.32 with extrude half-depth ≈ 2.23, so
  // its front face is at ~4.55. Text planes at z=6.0 sit ~1.5 units in front
  // of the anvil — clearly visible, no occlusion fight via z-buffer alone.
  const FORGE_WORLD_Y   = -1.8;     // FORGE: lower on the anvil body
  const FORGE_WORLD_Z   =  6.0;
  const PROJECT_WORLD_Y =  2.8;     // PROJECT: high on the anvil body
  const PROJECT_WORLD_Z =  6.0;

  projectPlane.meshLetters.position.set(0, PROJECT_WORLD_Y, PROJECT_WORLD_Z);
  forgePlane.meshLetters.position.set(  0, FORGE_WORLD_Y,   FORGE_WORLD_Z);
  // 3D text meshes are NOT added to the scene. The letters are drawn directly
  // on the flame canvas overlay each frame via drawWordOnCanvas() — it's a 2D
  // surface effect (letters etched into the anvil's flat front face), so 2D
  // canvas drawing primitives are the right tool. Mesh positions are kept for
  // the laser-aim helpers (getLetterCenter) to compute world-space targets.
  projectPlane.meshLetters.visible = false;
  forgePlane.meshLetters.visible = false;
  // Halo and dots meshes also unused — 2D canvas handles everything.

  // Overlay reveal state — turns on/off the canvas-overlay drawing in updateFx2D
  var textOverlayVisible = false;
  // Heat parameter (0..1) — drives canvas afterglow tint. 1.0 = fresh-cut hot.
  var textHeat = 0;
  // Sheen scroll position for the canvas overlay
  var canvasSheenT = -0.4;

  // Etch state — per-letter and per-dot alpha arrays (0..1), redrawn each frame.
  const projectLetterAlphas = new Array(projectData.letterMeta.length).fill(0);
  const projectDotAlphas    = new Array(projectData.dotMeta.length).fill(0);
  const forgeLetterAlphas   = new Array(forgeData.letterMeta.length).fill(0);
  const forgeDotAlphas      = new Array(forgeData.dotMeta.length).fill(0);

  // Precompute world-space center of each LETTER for laser aiming.
  // Compute world centers for each letter and dot for both words.
  // Uses the getLetterCenter helper returned by makeTextLines, which knows the
  // exact data-to-world transform for the line-segment geometry.
  const projectLetterWorld = projectData.letterMeta.map(m => projectPlane.getLetterCenter(projectPlane.meshLetters.position, m));
  const forgeLetterWorld   = forgeData.letterMeta.map(m   => forgePlane.getLetterCenter(forgePlane.meshLetters.position,   m));
  // Use meshLetters.position for dots too — meshDots is no longer added to scene
  // and its position was never set, so it's at (0,0,0). meshLetters.position
  // holds the actual world position of the FORGE word.
  const forgeDotWorld      = forgeData.dotMeta.map(m      => forgePlane.getLetterCenter(forgePlane.meshLetters.position, m));

  // ============================================================
  // ETCH STATE MACHINE — drives canvas-textured planes for PROJECT and FORGE
  // Phases (after cameraAnimT >= 0.98):
  //   IDLE → MIGRATE → PROJECT → FORGE → DOTS → GLOW
  // Total etch duration ~3.0 seconds across PROJECT + FORGE + DOTS.
  // ============================================================
  const ETCH_PHASE = { IDLE:0, POWERUP:1, MIGRATE:2, PROJECT:3, FORGE:4, DOTS:5, GLOW:6 };
  var etchPhase = ETCH_PHASE.IDLE;
  var etchPhaseT = 0;
  const ETCH_DUR = {
    powerup: 1.20,   // 3 color beats × 0.35s + short hold = ~1.2s (matches POWERUP_BEAT_DUR below)
    migrate: 1.0,
    project: 3.0,
    forge:   3.0,
    dots:    1.2
  };

  // Initial laser positions (captured on transition into MIGRATE)
  var laserStartPos = [null, null, null, null];

  // Laser corner targets — the cage's front face, pushed slightly forward
  // so the nodes read clearly as being IN FRONT of the cage. Rig-local coords.
  //   front-top-left (1) ----- front-top-right (2)
  //   |                                       |
  //   front-bot-left (3) ----- front-bot-right (4)
  // Forward offset (in rig-local z) beyond cage front face. At rigScale=3.8 at
  // full zoom, local z=1.7 puts the corners at world z ≈ 6.46 — IN FRONT of
  // the text planes (z=6.0) so beams visibly shoot backward into the letters.
  const FRONT_Z_OFFSET = 0.9;
  const LASER_CORNERS_LOCAL = [
    { x: RIG.minX, y: RIG.maxY, z: RIG.maxZ + FRONT_Z_OFFSET },   // (1) front-top-left   → laserA
    { x: RIG.maxX, y: RIG.maxY, z: RIG.maxZ + FRONT_Z_OFFSET },   // (2) front-top-right  → laserB
    { x: RIG.minX, y: RIG.minY, z: RIG.maxZ + FRONT_Z_OFFSET },   // (3) front-bot-left   → laserC
    { x: RIG.maxX, y: RIG.minY, z: RIG.maxZ + FRONT_Z_OFFSET }    // (4) front-bot-right  → laserD
  ];

  // "Power-up" color sequence colors applied to all 4 nodes simultaneously.
  // Three beats: green → yellow → red, each held for ~0.4s, before migration begins.
  const POWERUP_COLORS = [
    { core: 0x33ff66, glow: 0x33ff66 },   // green
    { core: 0xffe833, glow: 0xffce3d },   // yellow
    { core: 0xff3838, glow: 0xff7733 }    // red
  ];
  const POWERUP_BEAT_DUR = 0.35;          // seconds per color beat
  function setNodeColor(node, coreHex, glowHex, intensity){
    node.coreMat.emissive.setHex(coreHex);
    node.coreMat.emissiveIntensity = intensity;
    node.glowMat.color.setHex(glowHex);
    node.glowMat.opacity = Math.min(1, 0.85 * intensity);
    // Beams stay off during power-up — just the node bodies glow
    node.beamMat.opacity = 0;
    node.haloMat.opacity = 0;
  }

  const _forgeAimTmp = new THREE.Vector3();
  var smokeTimer = 0;
  var sheenT = -0.4;       // sweep highlight position across FORGE during GLOW phase

  function aimLasersAtWorldTarget(wx, wy, wz, activeIdx, jitterAmount){
    rig.updateMatrixWorld(true);
    // Jitter: small per-frame random offset applied to the target world position
    // before converting to rig-local. Simulates laser cutting instability.
    const jit = jitterAmount || 0;
    const jx = (Math.random() - 0.5) * jit;
    const jy = (Math.random() - 0.5) * jit;
    const jz = (Math.random() - 0.5) * jit * 0.3;
    const v = _forgeAimTmp.set(wx + jx, wy + jy, wz + jz);
    rig.worldToLocal(v);
    const lx = v.x, ly = v.y, lz = v.z;
    for (let li = 0; li < allLasers.length; li++){
      // Active laser blazes brightest; others fire at lower intensity so the
      // "all four cutting" effect reads visually.
      const intensity = (li === activeIdx) ? 2.8 : 1.2;
      aimBeamAt(allLasers[li], lx, ly, lz, intensity);
    }
  }

  function laserOff(){
    for (const L of allLasers){ aimBeamOff(L); }
  }

  function sparkBurst(wx, wy, wz, count, intensity){
    for (let k = 0; k < count; k++){
      fx2dSpawnSpark(wx, wy, wz, intensity);
    }
    // Intense white-hot flash particles — short-lived, very bright, large
    for (let k = 0; k < 6; k++){
      fx2dSpawnFlash(wx, wy, wz, intensity);
    }
  }

  // Spawn a brief intense flash particle at world coords. Bright white-hot
  // additive blob that fades fast — gives etch impacts their punch.
  function fx2dSpawnFlash(wx, wy, wz, intensity){
    const s = worldToScreen(wx, wy, wz);
    if (!s) return;
    pushCapped(fx2dSpark, FX_CAP_SPARK, {
      x: s.x + (Math.random() - 0.5) * 14,
      y: s.y + (Math.random() - 0.5) * 14,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      life: 1.0,
      decay: 0.035 + Math.random() * 0.025,    // slower fade — lingers longer (~25-35 frames)
      hue: 50 + Math.random() * 10,
      flash: true,
      flashSize: 24 + Math.random() * 18       // much larger blob (was 6-14, now 24-42)
    });
  }

  // Compute per-letter alpha based on etch head, where each letter fades in
  // over `letterFade` seconds once the head reaches it.
  function fillLetterAlphas(progress, count, alphas){
    const headIdx = progress * count;
    let changed = false;
    for (let li = 0; li < count; li++){
      const dist = headIdx - li;
      let a;
      if (dist < 0) a = 0;
      else if (dist > 1.2) a = 1;
      else a = dist / 1.2;
      if (Math.abs(a - alphas[li]) > 0.005){
        alphas[li] = a;
        changed = true;
      }
    }
    return changed;
  }

  function updateForgeEtch(dt){
    const dtSec = dt / 1000;

    if (etchPhase === ETCH_PHASE.IDLE && (cameraAnimT || 0) >= 0.98){
      // Capture current laser positions for the slide
      for (let li = 0; li < allLasers.length; li++){
        const p = allLasers[li].group.position;
        laserStartPos[li] = { x: p.x, y: p.y, z: p.z };
      }
      // Reset all alphas — clean slate
      for (let i = 0; i < projectLetterAlphas.length; i++) projectLetterAlphas[i] = 0;
      for (let i = 0; i < forgeLetterAlphas.length;   i++) forgeLetterAlphas[i]   = 0;
      for (let i = 0; i < forgeDotAlphas.length;      i++) forgeDotAlphas[i]      = 0;
      // Turn on the canvas overlay — letters now drawn each frame on fxctx
      textOverlayVisible = true;
      textHeat = 0;
      canvasSheenT = -0.4;
      laserOff();
      etchPhase = ETCH_PHASE.POWERUP;
      etchPhaseT = 0;
    }

    if (etchPhase === ETCH_PHASE.IDLE) return;
    etchPhaseT += dtSec;

    if (etchPhase === ETCH_PHASE.POWERUP){
      // All 4 nodes cycle GREEN → YELLOW → RED simultaneously, then transition
      // to MIGRATE. Beams stay off, just the node body emissive colors change.
      const beat = Math.min(2, Math.floor(etchPhaseT / POWERUP_BEAT_DUR));
      const c = POWERUP_COLORS[beat];
      // Pulse intensity within the beat — ramp up then plateau
      const beatT = (etchPhaseT - beat * POWERUP_BEAT_DUR) / POWERUP_BEAT_DUR;
      const intensity = 1.2 + Math.min(1, beatT * 2.0) * 2.8;   // 1.2..4.0
      for (const L of allLasers){
        setNodeColor(L, c.core, c.glow, intensity);
      }
      if (etchPhaseT >= ETCH_DUR.powerup){
        etchPhase = ETCH_PHASE.MIGRATE;
        etchPhaseT = 0;
      }
      return;
    }

    if (etchPhase === ETCH_PHASE.MIGRATE){
      // Slide each laser to its assigned CAGE FRONT-FACE CORNER (rig-local).
      // Targets are in rig-local coords so the lasers travel along with the
      // cage as it scales/transforms — they stop AT the cage corners.
      const u = Math.min(1, etchPhaseT / ETCH_DUR.migrate);
      const s = u * u * (3 - 2 * u);
      for (let li = 0; li < allLasers.length; li++){
        const start = laserStartPos[li] || allLasers[li].group.position;
        const end   = LASER_CORNERS_LOCAL[li];
        allLasers[li].group.position.set(
          start.x + (end.x - start.x) * s,
          start.y + (end.y - start.y) * s,
          start.z + (end.z - start.z) * s
        );
      }
      laserOff();
      if (u >= 1){
        // Snap exactly to the corner positions — no asymptotic creep
        for (let li = 0; li < allLasers.length; li++){
          const end = LASER_CORNERS_LOCAL[li];
          allLasers[li].group.position.set(end.x, end.y, end.z);
        }
        etchPhase = ETCH_PHASE.PROJECT;
        etchPhaseT = 0;
      }
      return;
    }

    if (etchPhase === ETCH_PHASE.PROJECT){
      // Fresh-cut afterglow: full heat during active etching
      textHeat = 1.0;
      const u = Math.min(1, etchPhaseT / ETCH_DUR.project);
      const letterCount = projectData.letterMeta.length;
      const headIdx = u * letterCount;
      const curIdx = Math.min(letterCount - 1, Math.floor(headIdx));
      fillLetterAlphas(u, letterCount, projectLetterAlphas);
      if (u < 1.0){
        const t = projectLetterWorld[curIdx];
        const activeIdx = curIdx % 4;
        aimLasersAtWorldTarget(t.x, t.y, t.z, activeIdx, 0.15);
        // Continuous spark stream while cutting — 4-7 sparks PER FRAME with
        // small jitter around the impact point. Plus a big flash burst on new
        // letter advance.
        const streamCount = 4 + (Math.random() * 4) | 0;
        for (let k = 0; k < streamCount; k++){
          const jx = (Math.random() - 0.5) * 0.4;
          const jy = (Math.random() - 0.5) * 0.4;
          fx2dSpawnSpark(t.x + jx, t.y + jy, t.z, 1.6 + Math.random() * 0.8);
        }
        // 2-3 flash blobs per frame — sustained white-hot impact point
        const flashCount = 2 + (Math.random() * 2) | 0;
        for (let k = 0; k < flashCount; k++){
          fx2dSpawnFlash(t.x, t.y, t.z, 2.0);
        }
        if (curIdx !== _lastProjectSeg){
          _lastProjectSeg = curIdx;
          sparkBurst(t.x, t.y, t.z, 40 + (Math.random() * 20) | 0, 2.4);
        }
      } else {
        laserOff();
        etchPhase = ETCH_PHASE.FORGE;
        etchPhaseT = 0;
      }
      return;
    }

    if (etchPhase === ETCH_PHASE.FORGE){
      // FORGE is being actively cut → max heat
      textHeat = 1.0;
      const u = Math.min(1, etchPhaseT / ETCH_DUR.forge);
      const letterCount = forgeData.letterMeta.length;
      const headIdx = u * letterCount;
      const curIdx = Math.min(letterCount - 1, Math.floor(headIdx));
      fillLetterAlphas(u, letterCount, forgeLetterAlphas);
      if (u < 1.0){
        const t = forgeLetterWorld[curIdx];
        const activeIdx = curIdx % 4;
        aimLasersAtWorldTarget(t.x, t.y, t.z, activeIdx, 0.25);
        // FORGE letters are bigger — denser spark stream. 6-10 per frame plus
        // sustained flash blobs.
        const streamCount = 6 + (Math.random() * 5) | 0;
        for (let k = 0; k < streamCount; k++){
          const jx = (Math.random() - 0.5) * 0.7;
          const jy = (Math.random() - 0.5) * 0.7;
          fx2dSpawnSpark(t.x + jx, t.y + jy, t.z, 1.8 + Math.random() * 1.0);
        }
        // 3-5 flash blobs per frame — sustained huge white-hot impact mass
        const flashCount = 3 + (Math.random() * 3) | 0;
        for (let k = 0; k < flashCount; k++){
          fx2dSpawnFlash(t.x, t.y, t.z, 2.2);
        }
        if (curIdx !== _lastForgeSeg){
          _lastForgeSeg = curIdx;
          sparkBurst(t.x, t.y, t.z, 60 + (Math.random() * 30) | 0, 2.8);
        }
      } else {
        laserOff();
        etchPhase = (forgeData.dotMeta.length > 0) ? ETCH_PHASE.DOTS : ETCH_PHASE.GLOW;
        etchPhaseT = 0;
      }
      return;
    }

    if (etchPhase === ETCH_PHASE.DOTS){
      textHeat = 1.0;
      const u = Math.min(1, etchPhaseT / ETCH_DUR.dots);
      const dotCount = forgeData.dotMeta.length;
      if (dotCount === 0){
        etchPhase = ETCH_PHASE.GLOW; etchPhaseT = 0; return;
      }
      const headIdx = u * dotCount;
      const curIdx = Math.min(dotCount - 1, Math.floor(headIdx));
      fillLetterAlphas(u, dotCount, forgeDotAlphas);
      if (u < 1.0){
        const t = forgeDotWorld[curIdx];
        const activeIdx = curIdx % 4;
        aimLasersAtWorldTarget(t.x, t.y, t.z, activeIdx, 0.10);
        // Dots are small — modest stream, but still continuous
        const streamCount = 3 + (Math.random() * 3) | 0;
        for (let k = 0; k < streamCount; k++){
          const jx = (Math.random() - 0.5) * 0.25;
          const jy = (Math.random() - 0.5) * 0.25;
          fx2dSpawnSpark(t.x + jx, t.y + jy, t.z, 1.4 + Math.random() * 0.6);
        }
        // 1-2 flash blobs per frame — bright impact even for small dots
        const flashCount = 1 + (Math.random() * 2) | 0;
        for (let k = 0; k < flashCount; k++){
          fx2dSpawnFlash(t.x, t.y, t.z, 1.7);
        }
        if (curIdx !== _lastDotsSeg){
          _lastDotsSeg = curIdx;
          sparkBurst(t.x, t.y, t.z, 22 + (Math.random() * 10) | 0, 2.0);
        }
      } else {
        laserOff();
        etchPhase = ETCH_PHASE.GLOW;
        etchPhaseT = 0;
      }
      return;
    }

    if (etchPhase === ETCH_PHASE.GLOW){
      // Afterglow fade: letters cool from "fresh cut" (heat=1.0) down to
      // residual warmth (~0.2) over the same window as the smoke fade.
      const GLOW_HEAT_FADE = 6.0;
      textHeat = Math.max(0.15, 1.0 - etchPhaseT / GLOW_HEAT_FADE);
      // Continuous smoke from every etched FORGE letter — each letter emits
      // independently. PROJECT emits sparsely (smaller letters, less heat).
      const GLOW_SMOKE_FADE = 6.0;
      const smokeMul = Math.max(0, 1.0 - etchPhaseT / GLOW_SMOKE_FADE);
      smokeTimer += dtSec;
      if (smokeTimer > 0.06 && smokeMul > 0){
        smokeTimer = 0;
        for (let li = 0; li < forgeLetterWorld.length; li++){
          if (Math.random() < 0.65 * smokeMul){
            const w = forgeLetterWorld[li];
            const jx = (Math.random() - 0.5) * 0.4;
            const jy = (Math.random() - 0.5) * 0.2;
            fx2dSpawnLetterSmoke(w.x + jx, w.y + 0.4 + jy, w.z);
          }
        }
        for (let li = 0; li < projectLetterWorld.length; li++){
          if (Math.random() < 0.18 * smokeMul){
            const w = projectLetterWorld[li];
            const jx = (Math.random() - 0.5) * 0.2;
            fx2dSpawnLetterSmoke(w.x + jx, w.y + 0.25, w.z);
          }
        }
      }

      // Sheen scroll — bright highlight sweeping left-to-right across the
      // letters during GLOW. Period ~3.5s, overshoots both sides for clean entry.
      canvasSheenT += dtSec / 3.5;
      while (canvasSheenT > 1.4) canvasSheenT -= 1.8;
    }
  }
  var _lastProjectSeg = -1;
  var _lastForgeSeg   = -1;
  var _lastDotsSeg    = -1;

  // FORGE point light — placed at the burning curve, behind the anvil
  const forgeLight = new THREE.PointLight(0xff7a30, 0.0, 25, 1.4);
  forgeLight.position.set(0, 0.5, 0);
  scene.add(forgeLight);

  const ANVIL_FINAL_Y = -2.4;
  const ANVIL_OFFSCREEN_Y = -10.0;
  var anvilState = {
    visible: false,
    revealForgeProgress: 0,
    edgeGlow: 0.85,
    forgeLightIntensity: 0
  };

  function revealForgeLetters(progress){
    anvilState.revealForgeProgress = Math.max(0, Math.min(1, progress));
    forgeLetters.visible = anvilState.revealForgeProgress > 0;
    if (forgeLetters.visible){
      const total = FORGE_LETTERS.length;
      const targetLetter = anvilState.revealForgeProgress * total;
      for (let i = 0; i < total; i++){
        const range = forgeSegmentsByLetter[i];
        let a = 0;
        if (targetLetter > i + 1) a = 1;
        else if (targetLetter > i) a = targetLetter - i;
        for (let s = range.start; s < range.end; s++){
          forgeAlphas[s * 2]     = a;
          forgeAlphas[s * 2 + 1] = a;
        }
      }
      forgeGeom.attributes.aAlpha.needsUpdate = true;
    }
  }
  function clearForgeLetters(){
    anvilState.revealForgeProgress = 0;
    for (let i = 0; i < forgeAlphas.length; i++) forgeAlphas[i] = 0;
    forgeGeom.attributes.aAlpha.needsUpdate = true;
    forgeLetters.visible = false;
  }

  // ============================================================
  // FORGE letters — 3D LineSegments mesh sitting on top of the anvil's working
  // face. Tilted slightly forward so they're readable from the camera angle.
  // ============================================================
  function letterF(s){
    return [[-0.4*s, 0.6*s], [-0.4*s, -0.6*s],
            [-0.4*s, 0.6*s], [0.4*s, 0.6*s],
            [-0.4*s, 0.05*s], [0.25*s, 0.05*s]];
  }
  function letterO(s){
    const pts = [];
    const steps = 24;
    for (let i = 0; i < steps; i++){
      const a0 = (i / steps) * Math.PI * 2;
      const a1 = ((i + 1) / steps) * Math.PI * 2;
      pts.push([Math.cos(a0) * 0.45*s, Math.sin(a0) * 0.6*s]);
      pts.push([Math.cos(a1) * 0.45*s, Math.sin(a1) * 0.6*s]);
    }
    return pts;
  }
  function letterR(s){
    return [[-0.4*s, 0.6*s], [-0.4*s, -0.6*s],
            [-0.4*s, 0.6*s], [0.25*s, 0.6*s],
            [0.25*s, 0.6*s], [0.4*s, 0.45*s],
            [0.4*s, 0.45*s], [0.4*s, 0.15*s],
            [0.4*s, 0.15*s], [0.25*s, 0.0*s],
            [0.25*s, 0.0*s], [-0.4*s, 0.0*s],
            [-0.05*s, 0.0*s], [0.4*s, -0.6*s]];
  }
  function letterG(s){
    const pts = [];
    const steps = 24;
    for (let i = 0; i < steps; i++){
      const a0 = -Math.PI * 0.15 + (i / steps) * Math.PI * 1.9;
      const a1 = -Math.PI * 0.15 + ((i + 1) / steps) * Math.PI * 1.9;
      pts.push([Math.cos(a0) * 0.45*s, Math.sin(a0) * 0.6*s]);
      pts.push([Math.cos(a1) * 0.45*s, Math.sin(a1) * 0.6*s]);
    }
    pts.push([0.05*s, -0.05*s], [0.45*s, -0.05*s]);
    pts.push([0.45*s, -0.05*s], [0.45*s, -0.35*s]);
    return pts;
  }
  function letterE(s){
    return [[-0.4*s, 0.6*s], [-0.4*s, -0.6*s],
            [-0.4*s, 0.6*s], [0.4*s, 0.6*s],
            [-0.4*s, 0.0*s], [0.25*s, 0.0*s],
            [-0.4*s, -0.6*s], [0.4*s, -0.6*s]];
  }
  const FORGE_LETTERS = [letterF, letterO, letterR, letterG, letterE];

  const FORGE_TEXT_SCALE = 0.32;
  const FORGE_LETTER_SPACING = 0.85;
  const forgeSegmentsByLetter = [];
  const allForgeSegs = [];
  const totalLetters = FORGE_LETTERS.length;
  const forgeTotalWidth = (totalLetters - 1) * FORGE_LETTER_SPACING;
  for (let i = 0; i < totalLetters; i++){
    const letterPts = FORGE_LETTERS[i](FORGE_TEXT_SCALE);
    const xOffset = -forgeTotalWidth / 2 + i * FORGE_LETTER_SPACING;
    const segsStart = allForgeSegs.length / 6;
    for (let j = 0; j < letterPts.length; j += 2){
      const p0 = letterPts[j];
      const p1 = letterPts[j + 1];
      allForgeSegs.push(xOffset + p0[0], p0[1], 0,
                        xOffset + p1[0], p1[1], 0);
    }
    const segsEnd = allForgeSegs.length / 6;
    forgeSegmentsByLetter.push({ start: segsStart, end: segsEnd });
  }
  const forgePositions = new Float32Array(allForgeSegs);
  const forgeAlphas    = new Float32Array(forgePositions.length / 3);
  const forgeGeom = new THREE.BufferGeometry();
  forgeGeom.setAttribute('position', new THREE.BufferAttribute(forgePositions, 3));
  forgeGeom.setAttribute('aAlpha',   new THREE.BufferAttribute(forgeAlphas, 1));
  const forgeMat = new THREE.ShaderMaterial({
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
    uniforms: { uColor: { value: new THREE.Color(0xffd060) } },
    vertexShader: `
      attribute float aAlpha;
      varying float vAlpha;
      void main(){
        vAlpha = aAlpha;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      varying float vAlpha;
      void main(){
        gl_FragColor = vec4(uColor, vAlpha);
      }
    `
  });
  const forgeLetters = new THREE.LineSegments(forgeGeom, forgeMat);
  // Place FORGE on the front face of the anvil body block, centered.
  // Body block spans y=1.85 to y=2.55; center at y=2.20. Front face at +z.
  forgeLetters.position.set(0, 2.20, ANVIL_EXTRUDE_DEPTH / 2 + 0.01);
  forgeLetters.rotation.x = 0;
  forgeLetters.visible = false;
  // FORGE letters intentionally NOT added to scene — will be re-enabled later.
  // anvilGroup.add(forgeLetters);

  // Per-frame: flame-driven flicker for the anvil edge glow and forge backlight.
  // Sample the average curveBurn intensity to drive both.
  function updateAnvilFlicker(dt){
    if (!anvilGroup.visible) return;
    let sum = 0, count = 0;
    for (let i = 0; i <= CURVE_SAMPLES; i++){
      if (curveBurn[i] > 0.1){ sum += curveBurn[i]; count++; }
    }
    const avgBurn = count > 0 ? sum / count : 0;
    const flicker = avgBurn * (0.85 + Math.random() * 0.30);
    // Edge wireframe opacity — base 0.55, flame-driven boost up to ~1.0
    const targetEdgeGlow = 0.55 + flicker * 0.55;
    anvilState.edgeGlow += (targetEdgeGlow - anvilState.edgeGlow) * 0.18;
    anvilEdgesMat.opacity = Math.max(0.4, Math.min(1.0, anvilState.edgeGlow));

    // Forge backlight — point light intensity follows flame
    const targetLight = avgBurn * 2.8 * (0.9 + Math.random() * 0.2);
    anvilState.forgeLightIntensity += (targetLight - anvilState.forgeLightIntensity) * 0.18;
    forgeLight.intensity = anvilState.forgeLightIntensity;
  }


  // ============================================================
  // CAMERA ANIMATION — pull-back to reveal anvil + sky NN
  // ============================================================
  const CAMERA_INITIAL = { pos: [0, 0.5, 9], look: [0, -0.4, 0] };
  const CAMERA_PULLED  = { pos: [0, 1.5, 32], look: [0, 2.0, 0] };
  var cameraAnimT = 0;    // 0 = initial, 1 = pulled back (var so it's hoisted)
  var cameraTargetT = 0;
  let cameraLookAt = new THREE.Vector3(...CAMERA_INITIAL.look);

  function updateCameraAnim(dt){
    const dtS = dt / 1000;
    // Ease toward target
    // Faster easing — anvil reaches final size in ~2s instead of ~5s
    cameraAnimT += (cameraTargetT - cameraAnimT) * Math.min(1, dtS * 0.65);
    // Snap to target once close enough — prevents asymptotic creep that makes
    // the anvil keep growing infinitesimally forever.
    if (Math.abs(cameraTargetT - cameraAnimT) < 0.005){
      cameraAnimT = cameraTargetT;
    }
    const t = cameraAnimT;
    const smoothT = t * t * (3 - 2 * t);
    const ix = CAMERA_INITIAL.pos[0], iy = CAMERA_INITIAL.pos[1], iz = CAMERA_INITIAL.pos[2];
    const px = CAMERA_PULLED.pos[0],  py = CAMERA_PULLED.pos[1],  pz = CAMERA_PULLED.pos[2];
    camera.position.set(
      ix + (px - ix) * smoothT,
      iy + (py - iy) * smoothT,
      iz + (pz - iz) * smoothT
    );
    const ilx = CAMERA_INITIAL.look[0], ily = CAMERA_INITIAL.look[1], ilz = CAMERA_INITIAL.look[2];
    const plx = CAMERA_PULLED.look[0],  ply = CAMERA_PULLED.look[1],  plz = CAMERA_PULLED.look[2];
    cameraLookAt.set(
      ilx + (plx - ilx) * smoothT,
      ily + (ply - ily) * smoothT,
      ilz + (plz - ilz) * smoothT
    );
    camera.lookAt(cameraLookAt);
  }

  function resetCamera(){
    cameraAnimT = 0;
    cameraTargetT = 0;
    camera.position.set(...CAMERA_INITIAL.pos);
    cameraLookAt.set(...CAMERA_INITIAL.look);
    camera.lookAt(cameraLookAt);
  }

  // ----- 3D Equation Sprite (flies from far -z toward camera and past) -----
  function buildEquationSprite(){
    const W = 1280, H = 256;
    const cnv = document.createElement('canvas');
    cnv.width = W; cnv.height = H;
    const ctx = cnv.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    // Subtle background glow
    const grd = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, W*0.5);
    grd.addColorStop(0, 'rgba(255, 138, 61, 0.15)');
    grd.addColorStop(1, 'rgba(255, 138, 61, 0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);

    // Equation text — italic serif, amber
    ctx.fillStyle = '#ffce3d';
    ctx.shadowColor = 'rgba(255, 206, 61, 0.9)';
    ctx.shadowBlur = 18;
    ctx.font = 'italic 92px Georgia, "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const cx = W/2, cy = H/2;
    // Left: "f(x) =" — comfortable margin from canvas left edge
    ctx.fillText('ƒ(x) =', cx - 430, cy);
    // Fraction: numerator "1" / denominator "σ√(2π)"
    ctx.font = 'italic 56px Georgia, serif';
    ctx.fillText('1', cx - 210, cy - 28);
    ctx.fillText('σ√(2π)', cx - 210, cy + 38);
    // Fraction bar
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ffce3d';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - 270, cy + 6);
    ctx.lineTo(cx - 150, cy + 6);
    ctx.stroke();
    ctx.shadowBlur = 18;
    // "e"
    ctx.font = 'italic 92px Georgia, serif';
    ctx.fillText('e', cx - 30, cy);
    // Exponent: -(x-μ)²/2σ²
    ctx.font = 'italic 44px Georgia, serif';
    ctx.textAlign = 'left';
    ctx.fillText('−(x−μ)² / (2σ²)', cx + 10, cy - 35);

    const tex = new THREE.CanvasTexture(cnv);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      depthTest: false
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(10, 2, 1);   // wider sprite to match new canvas aspect
    sprite.visible = false;
    sprite.renderOrder = 998;
    return sprite;
  }
  const equationSprite = buildEquationSprite();
  scene.add(equationSprite);

  function updateEquationSprite(seqT){
    // Sprite is visible during the burn phase only — starts when ignition ends.
    if (seqT < T_IGNITE_END || seqT > T_FLYBY_END){
      equationSprite.visible = false;
      return;
    }
    equationSprite.visible = true;
    const u = (seqT - T_IGNITE_END) / T_FLYBY;

    // Trajectory in 3 phases:
    //   FLY IN:  u ∈ [0, 0.35]   — z: -60 → 2  (deep behind to comfortable readable distance)
    //   PAUSE:   u ∈ [0.35, 0.70] — z: 2 (held steady, fully readable for ~1 sec)
    //   FLY OUT: u ∈ [0.70, 1.0]  — z: 2 → 12 (accelerates past camera)
    const holdZ = 2.0;   // readable distance from camera (which is at z=9)
    const startZ = -60;
    const endZ   = 12;
    let z;
    if (u < 0.35){
      const t = u / 0.35;
      const ease = 1 - Math.pow(1 - t, 2.5);   // ease-out (decelerates as it approaches hold)
      z = startZ + (holdZ - startZ) * ease;
    } else if (u < 0.70){
      z = holdZ;   // HOLD
    } else {
      const t = (u - 0.70) / 0.30;
      const ease = t * t * t;                   // ease-in (accelerates away from hold)
      z = holdZ + (endZ - holdZ) * ease;
    }

    // Y position: low, below the curve. Sits near baseline so equation is clearly
    // "in front of" the workpiece rather than overlapping the flame.
    const lowY = CURVE_BASE_Y - 0.5;
    // X position: slightly right of MU for compositional balance
    equationSprite.position.set(MU + 0.8, lowY, z);

    // Opacity: fade in during FLY IN, full during PAUSE, fade out during FLY OUT
    let op;
    if (u < 0.20)       op = u / 0.20;
    else if (u < 0.80)  op = 1.0;
    else                op = (1.0 - u) / 0.20;
    equationSprite.material.opacity = Math.max(0, Math.min(1, op));
  }

  function updateLabels(seqT){
    // Smoothstep-eased version of cameraAnimT so labels glide smoothly
    const animT = cameraAnimT || 0;
    const easeT = animT * animT * (3 - 2 * animT);

    // === μ label: drifts from etch position to ANVIL TOP-RIGHT corner ===
    // Original etch anchor: just below the curve baseline at MU
    const muOrigX = MU,                      muOrigY = CURVE_BASE_Y - 0.25;
    // Target: top-right of the anvil (final dimensions at full zoom)
    // anvilScale_final ≈ 4.125, GROUND_Y = -5.5, top face y = +2.55 model units
    const ANVIL_FINAL_SCALE = 0.55 * (1.0 + 1.0 * 6.5) * 0.90;   // 3.71
    const muTargetX  =  2.0 * ANVIL_FINAL_SCALE;          // top-right area, inset from edge
    const muTargetY  =  GROUND_Y + 2.55 * ANVIL_FINAL_SCALE + 1.2;   // above the top face
    const muWorldX = muOrigX + (muTargetX - muOrigX) * easeT;
    const muWorldY = muOrigY + (muTargetY - muOrigY) * easeT;
    const muScreen = project(muWorldX, muWorldY, CURVE_Z);
    labelMu.style.left = muScreen.x + 'px';
    labelMu.style.top  = muScreen.y + 'px';
    const muVisible = seqT > T_MU_END - 0.2;
    labelMu.classList.toggle('show', muVisible);

    // === σ² label: drifts from etch position to ANVIL TOP-LEFT corner ===
    const rightX = MU + CUTOFF_SIGMAS * SIGMA;
    const sigOrigX = rightX + 0.4,           sigOrigY = CURVE_BASE_Y + 0.05;
    const sigTargetX = -2.0 * ANVIL_FINAL_SCALE;
    const sigTargetY =  GROUND_Y + 2.55 * ANVIL_FINAL_SCALE + 1.2;
    const sigWorldX = sigOrigX + (sigTargetX - sigOrigX) * easeT;
    const sigWorldY = sigOrigY + (sigTargetY - sigOrigY) * easeT;
    const sigScreen = project(sigWorldX, sigWorldY, CURVE_Z);
    labelSigma.style.left = sigScreen.x + 'px';
    labelSigma.style.top  = sigScreen.y + 'px';
    const sigVisible = seqT > T_SIGMA_END - 0.2;
    labelSigma.classList.toggle('show', sigVisible);

    updateEquationSprite(seqT);
  }

  // autostart
  setTimeout(startSequence, 400);
})();
