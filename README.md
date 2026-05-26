# FORGE — Stage 1B

TRON Ares-aesthetic 3D animation: Gaussian curve ignites a forge fire, laser nodes etch "PROJECT FORGE" into an anvil surface.

## Structure

```
forge_stage1b/
├── index.html              ← entry point (markup, mounts canvases, loads CSS+JS)
├── css/
│   └── styles.css          ← all visual styling (HUD, fonts, layout, glow effects)
└── js/
    └── main.js             ← single IIFE containing the entire scene+animation
```

## Run locally

The browser blocks `file://` loads of separate JS files in some contexts. Serve over a local HTTP server:

```bash
# from this directory:
python3 -m http.server 8000

# then visit:
# http://localhost:8000/
```

Or any equivalent (npx serve, php -S, etc).

## Build sequence (animation phases)

1. **PRESCAN** — two sweep planes (YZ + XZ) scan the rig volume, grid materializes as they pass
2. **STATUS** — laser nodes light up green → yellow → red
3. **ETCH** — Gaussian curve geometry is etched into the air (μ axis + σ² shape)
4. **IGNITE** — first sparks fly along the curve
5. **BURN** — curve becomes a burning Gaussian flame with full particle layers (smoke, voronoi cells, triangles, embers, sparks, core)
6. **CAMERA ZOOM-OUT** — camera pulls back to reveal the full forge
7. **POWERUP** — laser nodes flash green → yellow → red
8. **MIGRATE** — laser nodes slide to the 4 corners of the cage front face
9. **PROJECT etch** — top word etched letter-by-letter with sparks/flashes
10. **FORGE etch** — bottom word etched (bigger, slower, more dramatic)
11. **DOTS etch** — bullet dots between FORGE letters
12. **GLOW** — afterglow effect, continuous smoke from letters, sheen sweeps across, all fades

## Tech

- Three.js r128 (loaded from CDN, no build step required)
- All particle FX rendered on a 2D `<canvas>` overlay (sparks, flame, smoke, etched letters) layered over the WebGL scene
- Single IIFE with all logic inline — designed for one-file iteration speed; modular split deferred until design settles

## TODO — Modular split of `js/main.js`

**Status:** deferred. Estimated 4 hours of focused work. Do this once the design has stopped iterating, OR when a second developer needs to work on the project, OR when modules become candidates for reuse in other scenes.

**Recommended path** — staged so each step is independently testable. After each step, hard-refresh and confirm the full sequence still runs end-to-end before moving on.

### Phase A — risk-free pure-data extractions (~30 min)

These contain no shared state, just constants and functions. No cycles possible.

| File | Approx lines | Contents |
|---|---|---|
| `constants.js` | ~30 | `RIG`, `CURVE_*`, `TIMING_*`, `GROUND_Y`, color/timing constants |
| `palettes.js` | ~180 | `paletteWarm`, `paletteViridis`, color interpolation helpers |
| `glyphs.js` | ~580 | `GLYPHS` table, `buildTextWithDots`, `makeTextLines`, `drawWordOnCanvas` |

### Phase B — scene infrastructure (~45 min)

Single-direction dependencies. Import constants from Phase A.

| File | Approx lines | Contents |
|---|---|---|
| `scene-setup.js` | ~30 | THREE init, camera, lights, renderer |
| `grid-bed.js` | ~30 | TRON reticle background grid |
| `workpiece.js` | ~230 | Floor grid, sweeping prescan planes, ground plane |
| `labels-overlay.js` | ~15 | HTML μ/σ² screen-position projection |
| `math-labels-3d.js` | ~120 | 3D etched μ/σ² line art |

### Phase C — domain modules (~1.5 hr)

Each handles one functional area. Cross-references between these are where TDZ-style bugs hide — test thoroughly after each.

| File | Approx lines | Contents |
|---|---|---|
| `rig.js` | ~270 | `buildRig`, laser node construction, `aimBeamAt`/`aimBeamOff` helpers |
| `curve.js` | ~215 | Gaussian curve buffer geometry, `curveBurn`/`curveScreen` arrays |
| `nn.js` | ~400 | Sky neural network constellation |
| `nn-pulses.js` | ~130 | Layer-propagation pulses |
| `sky-sparks.js` | ~160 | Upward 3D spark particles |
| `anvil.js` | ~85 | Anvil mesh, materials, position animation |
| `forge-3d-letters.js` | ~125 | Legacy 3D letter geometry (consider deleting — unused) |

### Phase D — orchestration (~1 hr)

These coordinate the others. Most likely to have circular-dependency issues.

| File | Approx lines | Contents |
|---|---|---|
| `flame-fx.js` | ~800 | `fxctx`, all 2D canvas particle systems (smoke/voronoi/triangles/sparks/core) |
| `zap-motion.js` | ~430 | `zapRun` laser-sweep motion helper |
| `etch-state.js` | ~390 | `ETCH_PHASE` machine, `updateForgeEtch`, POWERUP/MIGRATE/PROJECT/FORGE/DOTS/GLOW |
| `camera-anim.js` | ~190 | Camera pullback interpolation |
| `sequence-state.js` | ~60 | Sequence start/reset/phase tracking |
| `controls.js` | ~125 | `startSequence`, `resetAll`, button wiring |
| `main.js` | ~25 | Entry, `loop()`, autostart |

### Notes / Watch-outs

- **TDZ exposure increases.** In the current IIFE, forward references throw a runtime error. In ES modules, circular imports give `undefined` silently. Several bugs this session were TDZ-style; the modular split makes these harder to spot. Recommendation: use `import * as X from './x.js'` namespacing rather than named imports during the migration, so references resolve lazily.
- **Shared state symbols.** At least 60+ symbols cross natural module boundaries (`scene`, `camera`, `cameraAnimT`, `etchPhase`, `etchPhaseT`, `curveBurn`, `curveScreen`, `allLasers`, `rig`, `fxctx`, `pixelsPerUnit`, `worldToScreen`, etc.). Plan for either a small `state.js` mutable-state module that everyone imports, or pass state into module factory functions explicitly.
- **No build step required.** Use native ES modules (`<script type="module" src="js/main.js">`). The CDN Three.js import path stays the same. No bundler/webpack/vite needed.
- **Test after each phase.** Don't try to split all 21 files in one go. After each extraction, run the full sequence and confirm visual + behavioral parity.
- **Time budget.** ~4 hours total includes debugging cycles. A clean greenfield split would be faster; the cost here is preserving exact current behavior while restructuring.

