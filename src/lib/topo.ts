/*
 * Animated topographic background, ported from the design playground
 * (reference/topo-playground-unified.html). One terrain + hydrology +
 * feature tracker, two renderings: Day is a NatGeo paper map (stepped
 * hypsometric fills, hillshade); Night is additive neon glow lines.
 * Toggling relights the SAME world — lakes, names, elevations persist.
 *
 * Params are locked per the design spec; no runtime controls.
 */

const PARAMS = {
  scale: 2,
  warp: 1.4,
  stretch: 1,
  levels: 41,
  tint: 0.85,
  relief: 0.4,
  glow: 0.2,
  water: 0.15,
  speed: 0.15,
  poi: 3,
  hyps: true,
  cel: false,
  elev: true, // night: color lines by elevation
};

const NAMES: Record<string, string[]> = {
  peak: [
    "Mt. Singularity", "Overhang Point", "Mt. Foom", "The Bitter Summit",
    "SOTA Summit", "Capability Ridge", "Emergence Peak", "Grokking Point",
    "Mt. Improbable", "Benchmark Bluff", "Hallucination Heights", "Mt. Moloch",
    "Chinchilla Crest", "Scaling Pinnacle", "The Mesa Optimizer",
    "Schmidhuber Spur", "Hanson's Horn", "Sutskever Summit",
    "Amodei Arête", "Compute Cornice",
  ],
  basin: [
    "Uncanny Valley", "Basin of Attraction", "Local Minimum",
    "The Global Minimum", "Trough of Disillusionment", "AI Winter Cirque",
    "Overfitting Hollow", "Mode Collapse Crater",
    "Sycophancy Sink", "Reward Hacking Hollow", "Vanishing Gradient Gulch",
    "Wireheading Well", "Catastrophic Forgetting Crater",
    "The Memorization Pit", "Paperclip Depression", "Dying ReLU Gully",
    "The Latent Space", "Waluigi Basin", "Sunk Cost Caldera", "Roko's Basin",
  ],
  saddle: [
    "Saddle Point", "Decision Boundary", "Sim2Real Gap",
    "Generalization Gap", "Overton Pass", "Double Crux Col",
    "Explore–Exploit Col", "The Timelines Divide", "Hessian's Notch",
    "Eigenvalue Gap", "The Great Filter", "Chesterton's Gate",
    "P(doom) Pass", "Pause Pass", "The Hard Fork", "Alignment Gap",
    "Second-Order Pass", "Midjourney Pass",
  ],
  lake: [
    "Turing Tarn", "The Data Lake", "Reservoir Computing", "Lake Wobegon",
    "Entropy Pool", "Dropout Pond", "Latent Lagoon", "The Gaussian Pool",
    "Bayes Bay", "Tanh Tarn", "The Slop Slough", "RLHF Reservoir",
    "Softmax Springs", "Pond of Diminishing Returns", "Information Bottleneck",
  ],
};

function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffled<T>(arr: T[], rand: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ---------------- Shaders ---------------- */

const VERT = `#version 300 es
const vec2 P[3] = vec2[3](vec2(-1.,-1.), vec2(3.,-1.), vec2(-1.,3.));
void main(){ gl_Position = vec4(P[gl_VertexID], 0., 1.); }
`;

const FRAG = `#version 300 es
precision highp float;
out vec4 outColor;
uniform vec2 u_outRes;
uniform vec2 u_cssRes;
uniform float u_time, u_scale, u_warp, u_stretch, u_levels;
uniform float u_tint, u_relief, u_glow, u_vmin, u_vmax, u_wblend;
uniform vec2 u_seed;
uniform int u_output, u_hyps, u_cel, u_elev, u_night;
uniform sampler2D u_levelA;
uniform sampler2D u_levelB;

vec2 hash2(vec2 p){
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}
float gnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f*f*f*(f*(f*6.0-15.0)+10.0);
  return mix(mix(dot(hash2(i), f), dot(hash2(i+vec2(1,0)), f-vec2(1,0)), u.x),
             mix(dot(hash2(i+vec2(0,1)), f-vec2(0,1)), dot(hash2(i+vec2(1,1)), f-vec2(1,1)), u.x), u.y);
}
float fbm(vec2 p){
  float s = 0.0, a = 0.5, n = 0.0;
  for(int i = 0; i < 4; i++){ s += a * gnoise(p); n += a; p *= 2.0; a *= 0.5; }
  return s / n;
}
float field(vec2 p, float t){
  p += u_seed;
  vec2 q = vec2(fbm(p + vec2( 0.31*t,  0.17*t)),
                fbm(p + vec2(5.2, 1.3) + vec2(-0.23*t, 0.27*t)));
  vec2 r = vec2(fbm(p + u_warp*q + vec2(1.7, 9.2) + vec2(0.12*t, -0.19*t)),
                fbm(p + u_warp*q + vec2(8.3, 2.8)));
  return fbm(p + u_warp*r);
}
// day: stepped hypsometric land tints with a snowline top band
vec3 dayRamp(float t){
  vec3 c0 = vec3(0.604, 0.749, 0.541);
  vec3 c1 = vec3(0.729, 0.827, 0.612);
  vec3 c2 = vec3(0.878, 0.878, 0.706);
  vec3 c3 = vec3(0.867, 0.749, 0.549);
  vec3 c4 = vec3(0.741, 0.580, 0.400);
  vec3 c5 = vec3(0.973, 0.973, 0.965);
  t = clamp(t, 0.0, 1.0);
  if (t < 0.28) return mix(c0, c1, t/0.28);
  if (t < 0.50) return mix(c1, c2, (t-0.28)/0.22);
  if (t < 0.72) return mix(c2, c3, (t-0.50)/0.22);
  if (t < 0.92) return mix(c3, c4, (t-0.72)/0.20);
  return c5;
}
// night: indigo -> violet -> magenta -> orange -> hot cream
vec3 nightRamp(float t){
  vec3 c0 = vec3( 60.,  48., 160.)/255.;
  vec3 c1 = vec3(124., 100., 255.)/255.;
  vec3 c2 = vec3(216.,  96., 180.)/255.;
  vec3 c3 = vec3(255., 126.,  48.)/255.;
  vec3 c4 = vec3(255., 205., 150.)/255.;
  t = clamp(t, 0.0, 1.0);
  if (t < 0.30) return mix(c0, c1, t/0.30);
  if (t < 0.55) return mix(c1, c2, (t-0.30)/0.25);
  if (t < 0.80) return mix(c2, c3, (t-0.55)/0.25);
  return mix(c3, c4, (t-0.80)/0.20);
}
void main(){
  vec2 pix = vec2(gl_FragCoord.x, u_outRes.y - gl_FragCoord.y) / u_outRes * u_cssRes;
  float s = u_scale / max(u_cssRes.x, u_cssRes.y);
  vec2 p = vec2(pix.x * s * u_stretch, pix.y * s);
  float v = field(p, u_time);
  float v01 = clamp(v * 0.806 + 0.5, 0.0, 1.0);

  if (u_output == 1) { // raw field encode for CPU readback
    float e = v01 * 255.0;
    outColor = vec4(floor(e)/255.0, fract(e), 0.0, 1.0);
    return;
  }

  // frozen per-seed legend: bands/contours use normalized elevation;
  // water and shading stay in raw units
  float vn = clamp((v01 - u_vmin) / max(u_vmax - u_vmin, 1e-4), 0.0, 1.0);
  float lv = vn * u_levels;
  float g = fwidth(lv) + 1e-5;
  float d = abs(fract(lv) - 0.5);
  float core  = 1.0 - smoothstep(0.40*g, 1.30*g, d);
  float coreI = 1.0 - smoothstep(0.90*g, 2.20*g, d);
  float halo  = 1.0 - smoothstep(0.0, 8.0*g, d);
  float isIdx = (mod(floor(lv), 5.0) < 0.5) ? 1.0 : 0.0;
  float band = (floor(lv / 5.0) * 5.0 + 2.5) / u_levels;
  float tc = (floor(lv) + 0.5) / u_levels;

  // shared water surface (per-basin, CPU priority-flood, crossfaded)
  vec2 uvw = pix / u_cssRes;
  float wl = mix(texture(u_levelA, uvw).r, texture(u_levelB, uvw).r, u_wblend);
  float fw01 = fwidth(v01) + 1e-6;
  float flatSurf = 1.0 - smoothstep(0.0015, 0.004, fwidth(wl));
  float wmask = (1.0 - smoothstep(wl - 0.002 - fw01, wl - 0.002 + fw01, v01)) * flatSurf;
  float depth = clamp((wl - v01) / 0.08, 0.0, 1.0);
  float sw = (1.0 - smoothstep(0.0, 1.6 * fw01, abs(v01 - wl))) * flatSurf;

  vec3 col;
  if (u_night == 0) {
    // ---------- DAY: ink on paper ----------
    vec3 shade = vec3(1.0);
    if (u_relief > 0.001) {
      float e2 = 2.0 * s;
      float vx = field(p + vec2(e2, 0.0), u_time);
      float vy = field(p + vec2(0.0, e2), u_time);
      vec2 grad = vec2(vx - v, vy - v);
      vec3 nrm = normalize(vec3(-grad * u_relief * 90.0, 1.0));
      vec3 L = normalize(vec3(-0.55, -0.55, 0.66));
      float lam = clamp(dot(nrm, L), 0.0, 1.0);
      if (u_cel == 1) {
        float xq = lam * 4.0;
        float aa = clamp(fwidth(xq) * 1.5, 0.02, 0.35);
        lam = (floor(xq) + smoothstep(0.5 - aa, 0.5 + aa, fract(xq))) / 4.0;
        shade = mix(vec3(0.60, 0.63, 0.70), vec3(1.14, 1.11, 1.06), lam);
      } else {
        shade = mix(vec3(0.62, 0.65, 0.71), vec3(1.18, 1.15, 1.10), lam);
      }
    }
    vec3 paper = vec3(0.957, 0.937, 0.878);
    vec3 fill = (u_hyps == 1) ? mix(paper, dayRamp(band), u_tint) : paper;
    vec3 land = fill * shade;
    land = mix(land, vec3(0.607, 0.416, 0.204), core * 0.55);
    land = mix(land, vec3(0.455, 0.290, 0.118), coreI * 0.70 * isIdx);
    vec3 wat = mix(vec3(0.760, 0.878, 0.914), vec3(0.580, 0.780, 0.860), depth);
    wat *= mix(vec3(1.0), shade, 0.35);
    col = mix(land, wat, wmask);
    col = mix(col, vec3(0.290, 0.470, 0.600), sw * 0.75);
  } else {
    // ---------- NIGHT: additive glow with blob vignette ----------
    vec2 b1 = vec2(0.10, 1.00) * u_cssRes; float r1 = 0.60 * u_cssRes.x;
    vec2 b2 = vec2(0.86, 0.68) * u_cssRes; float r2 = 0.54 * u_cssRes.x;
    float w1 = exp(-dot(pix-b1, pix-b1)/(r1*r1));
    float w2 = exp(-dot(pix-b2, pix-b2)/(r2*r2));
    float a = min(1.0, pow(max(w1, w2), 0.55) * 1.05);
    vec3 elevCol = nightRamp(tc);
    vec3 posCol = (w1*vec3(124.,100.,255.) + w2*vec3(255.,126.,48.)) / max(w1+w2, 1e-6) / 255.;
    vec3 lineCol = (u_elev == 1) ? elevCol : posCol;
    vec3 bg = mix(vec3(0.039, 0.035, 0.063), vec3(0.047, 0.039, 0.075), pix.y / u_cssRes.y);
    vec3 land = bg + lineCol * a * (core * 0.45 + halo * 0.10 * u_glow);
    // lakes: matte dark-blue water with a single clean shoreline stroke
    float aw = clamp(a * 1.8, 0.0, 1.0);
    vec3 wat = vec3(0.050, 0.085, 0.145);
    col = mix(land, mix(bg, wat, aw), wmask);
    col += vec3(0.30, 0.65, 0.90) * sw * aw * 0.45;
  }
  outColor = vec4(col, 1.0);
}
`;

/* ---------------- Overlay ink ---------------- */

const DAY_INK = {
  name: "#3a3226", red: "#b3392f", slate: "#5b7ba6", lake: "#2e6a8f",
  mark: "#47372a", grid: "rgba(110, 145, 175, 0.28)", gridLabel: "rgba(90, 120, 150, 0.8)",
  plus: "rgba(58, 50, 38, 0.5)",
};
const NIGHT_INK = {
  lake: "#8fd0f0",
  grid: "rgba(139, 123, 255, 0.14)", gridLabel: "rgba(150, 140, 200, 0.65)",
  plus: "rgba(139, 123, 255, 0.5)",
};

const NRAMP: [number, number[]][] = [
  [0.00, [60, 48, 160]], [0.30, [124, 100, 255]], [0.55, [216, 96, 180]],
  [0.80, [255, 126, 48]], [1.00, [255, 205, 150]],
];
function nightRampColor(t: number): number[] {
  t = Math.max(0, Math.min(1, t));
  for (let i = 1; i < NRAMP.length; i++) {
    if (t <= NRAMP[i][0]) {
      const [t0, c0] = NRAMP[i - 1], [t1, c1] = NRAMP[i];
      const u = (t - t0) / (t1 - t0);
      return [c0[0] + u * (c1[0] - c0[0]), c0[1] + u * (c1[1] - c0[1]), c0[2] + u * (c1[2] - c0[2])];
    }
  }
  return NRAMP[NRAMP.length - 1][1];
}
function hexA(hex: string, a: number) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a.toFixed(3)})`;
}
function rgbA(c: number[], a: number) {
  return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a.toFixed(3)})`;
}

interface Feature {
  x: number; y: number; tx: number; ty: number;
  type: "peak" | "basin" | "saddle"; v: number; lake: boolean;
  name: string; alpha: number; talpha: number; born: number; lastSeen: number;
  matched?: boolean;
}
interface Candidate {
  x: number; y: number; type: "peak" | "basin" | "saddle";
  v: number; score: number; lake?: boolean; used?: boolean;
}

export interface TopoHandle {
  setNight(n: boolean): void;
  destroy(): void;
}

export function createTopo(
  glCanvas: HTMLCanvasElement,
  overlay: HTMLCanvasElement,
  opts: { night: boolean },
): TopoHandle | null {
  const gl = glCanvas.getContext("webgl2");
  const octx = overlay.getContext("2d");
  if (!gl || !octx) return null; // no WebGL2: page falls back to flat theme bg

  let night = opts.night;
  let destroyed = false;

  function compile(type: number, src: string) {
    const sh = gl!.createShader(type)!;
    gl!.shaderSource(sh, src);
    gl!.compileShader(sh);
    if (!gl!.getShaderParameter(sh, gl!.COMPILE_STATUS))
      throw new Error(gl!.getShaderInfoLog(sh) || "shader error");
    return sh;
  }
  const prog = gl.createProgram()!;
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
    throw new Error(gl.getProgramInfoLog(prog) || "link error");
  gl.useProgram(prog);

  const U: Record<string, WebGLUniformLocation | null> = {};
  for (const n of ["u_outRes", "u_cssRes", "u_time", "u_scale", "u_warp", "u_stretch", "u_levels",
    "u_tint", "u_relief", "u_glow", "u_vmin", "u_vmax", "u_wblend",
    "u_seed", "u_output", "u_hyps", "u_cel", "u_elev", "u_night"])
    U[n] = gl.getUniformLocation(prog, n);
  gl.uniform1i(gl.getUniformLocation(prog, "u_levelA"), 0);
  gl.uniform1i(gl.getUniformLocation(prog, "u_levelB"), 1);

  const FIELD_W = 192;
  let FIELD_H = 120;
  const fieldTex = gl.createTexture();
  const fieldFbo = gl.createFramebuffer();
  let fieldPixels: Uint8Array = new Uint8Array(0);
  const levelTexA = gl.createTexture();
  const levelTexB = gl.createTexture();
  let levelFlip = false;

  function initLevelTex(tex: WebGLTexture | null, data: Float32Array) {
    gl!.bindTexture(gl!.TEXTURE_2D, tex);
    gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.R16F, FIELD_W, FIELD_H, 0, gl!.RED, gl!.FLOAT, data);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
  }

  function sizeFieldBuffer(W: number, H: number) {
    FIELD_H = Math.max(16, Math.round(FIELD_W * H / W));
    gl!.activeTexture(gl!.TEXTURE2);
    gl!.bindTexture(gl!.TEXTURE_2D, fieldTex);
    gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, FIELD_W, FIELD_H, 0, gl!.RGBA, gl!.UNSIGNED_BYTE, null);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.NEAREST);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.NEAREST);
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, fieldFbo);
    gl!.framebufferTexture2D(gl!.FRAMEBUFFER, gl!.COLOR_ATTACHMENT0, gl!.TEXTURE_2D, fieldTex, 0);
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
    fieldPixels = new Uint8Array(FIELD_W * FIELD_H * 4);
    const zeros = new Float32Array(FIELD_W * FIELD_H);
    gl!.activeTexture(gl!.TEXTURE0); initLevelTex(levelTexA, zeros);
    gl!.activeTexture(gl!.TEXTURE1); initLevelTex(levelTexB, zeros);
    allocHydro();
  }

  /* ---------------- Hydrology (shared, zero-allocation) ---------------- */

  let terrGrid!: Float32Array, levelGrid!: Float32Array;
  let lakes: { k: number }[] = [];
  let normMin = 0, normMaxDay = 1, normMaxNight = 1, normInit = false;
  let snowRand = 0.5;
  let hydroN = 0, filledGrid!: Float32Array, hydroSeen!: Uint8Array, capSeen!: Uint8Array,
    selSeen!: Uint8Array, heapLev!: Float32Array, heapIdx!: Int32Array, stackBuf!: Int32Array,
    levelTmp!: Float32Array, winRMax!: Float32Array, winRMin!: Float32Array,
    winMaxG!: Float32Array, winMinG!: Float32Array;

  function allocHydro() {
    hydroN = FIELD_W * FIELD_H;
    terrGrid = new Float32Array(hydroN);
    levelGrid = new Float32Array(hydroN);
    filledGrid = new Float32Array(hydroN);
    hydroSeen = new Uint8Array(hydroN);
    capSeen = new Uint8Array(hydroN);
    selSeen = new Uint8Array(hydroN);
    heapLev = new Float32Array(hydroN + 1);
    heapIdx = new Int32Array(hydroN + 1);
    stackBuf = new Int32Array(hydroN);
    levelTmp = new Float32Array(hydroN);
    winRMax = new Float32Array(hydroN); winRMin = new Float32Array(hydroN);
    winMaxG = new Float32Array(hydroN); winMinG = new Float32Array(hydroN);
    lakes.length = 0;
    normInit = false;
  }

  function priorityFlood() {
    const W = FIELD_W, H = FIELD_H;
    hydroSeen.fill(0);
    let hs = 0;
    function push(l: number, i: number) {
      let c = ++hs;
      heapLev[c] = l; heapIdx[c] = i;
      while (c > 1) {
        const p = c >> 1;
        if (heapLev[p] <= heapLev[c]) break;
        let t = heapLev[p]; heapLev[p] = heapLev[c]; heapLev[c] = t;
        let ti = heapIdx[p]; heapIdx[p] = heapIdx[c]; heapIdx[c] = ti;
        c = p;
      }
    }
    for (let i = 0; i < W; i++) {
      let k = i;
      if (!hydroSeen[k]) { hydroSeen[k] = 1; push(terrGrid[k], k); }
      k = (H - 1) * W + i;
      if (!hydroSeen[k]) { hydroSeen[k] = 1; push(terrGrid[k], k); }
    }
    for (let j = 0; j < H; j++) {
      let k = j * W;
      if (!hydroSeen[k]) { hydroSeen[k] = 1; push(terrGrid[k], k); }
      k = j * W + W - 1;
      if (!hydroSeen[k]) { hydroSeen[k] = 1; push(terrGrid[k], k); }
    }
    while (hs > 0) {
      const lev = heapLev[1], k = heapIdx[1];
      heapLev[1] = heapLev[hs]; heapIdx[1] = heapIdx[hs]; hs--;
      let c = 1;
      for (;;) {
        const l = 2 * c, r = l + 1;
        let m = c;
        if (l <= hs && heapLev[l] < heapLev[m]) m = l;
        if (r <= hs && heapLev[r] < heapLev[m]) m = r;
        if (m === c) break;
        let t = heapLev[m]; heapLev[m] = heapLev[c]; heapLev[c] = t;
        let ti = heapIdx[m]; heapIdx[m] = heapIdx[c]; heapIdx[c] = ti;
        c = m;
      }
      filledGrid[k] = lev;
      const x = k % W, y = (k / W) | 0;
      if (x > 0) { const n = k - 1; if (!hydroSeen[n]) { hydroSeen[n] = 1; push(terrGrid[n] > lev ? terrGrid[n] : lev, n); } }
      if (x < W - 1) { const n = k + 1; if (!hydroSeen[n]) { hydroSeen[n] = 1; push(terrGrid[n] > lev ? terrGrid[n] : lev, n); } }
      if (y > 0) { const n = k - W; if (!hydroSeen[n]) { hydroSeen[n] = 1; push(terrGrid[n] > lev ? terrGrid[n] : lev, n); } }
      if (y < H - 1) { const n = k + W; if (!hydroSeen[n]) { hydroSeen[n] = 1; push(terrGrid[n] > lev ? terrGrid[n] : lev, n); } }
    }
  }

  let lakeRand = 0.5;
  function targetLakeCount() {
    const nMax = Math.round(PARAMS.water * 20);
    return nMax <= 0 ? 0 : Math.max(1, Math.round(lakeRand * nMax));
  }

  function descendToMin(k: number) {
    const W = FIELD_W, H = FIELD_H;
    for (let step = 0; step < 64; step++) {
      const x = k % W, y = (k / W) | 0;
      let best = k, bv = terrGrid[k];
      if (x > 0 && terrGrid[k - 1] < bv) { bv = terrGrid[k - 1]; best = k - 1; }
      if (x < W - 1 && terrGrid[k + 1] < bv) { bv = terrGrid[k + 1]; best = k + 1; }
      if (y > 0 && terrGrid[k - W] < bv) { bv = terrGrid[k - W]; best = k - W; }
      if (y < H - 1 && terrGrid[k + W] < bv) { bv = terrGrid[k + W]; best = k + W; }
      if (best === k) return k;
      k = best;
    }
    return k;
  }

  function fillLakeFrom(minIdx: number) {
    if (capSeen[minIdx]) return 0;
    const L = filledGrid[minIdx];
    if (L <= terrGrid[minIdx] + 0.006) return 0;
    const W = FIELD_W, H = FIELD_H;
    let head = 0, size = 0;
    stackBuf[size++] = minIdx; capSeen[minIdx] = 1;
    while (head < size) {
      const k = stackBuf[head++];
      const x = k % W, y = (k / W) | 0;
      if (x > 0) { const n = k - 1; if (!capSeen[n] && filledGrid[n] > terrGrid[n] + 1e-5) { capSeen[n] = 1; stackBuf[size++] = n; } }
      if (x < W - 1) { const n = k + 1; if (!capSeen[n] && filledGrid[n] > terrGrid[n] + 1e-5) { capSeen[n] = 1; stackBuf[size++] = n; } }
      if (y > 0) { const n = k - W; if (!capSeen[n] && filledGrid[n] > terrGrid[n] + 1e-5) { capSeen[n] = 1; stackBuf[size++] = n; } }
      if (y < H - 1) { const n = k + W; if (!capSeen[n] && filledGrid[n] > terrGrid[n] + 1e-5) { capSeen[n] = 1; stackBuf[size++] = n; } }
    }
    for (let q = 0; q < size; q++) {
      const k = stackBuf[q];
      if (terrGrid[k] < L) levelGrid[k] = L;
    }
    return size;
  }

  function selectNewLakes(count: number) {
    if (count <= 0) return;
    const W = FIELD_W, H = FIELD_H, N = hydroN;
    selSeen.fill(0);
    const cands: { minIdx: number; depth: number }[] = [];
    for (let s0 = 0; s0 < N; s0++) {
      if (selSeen[s0] || capSeen[s0] || filledGrid[s0] <= terrGrid[s0] + 0.006) continue;
      let head = 0, size = 0, minT = Infinity, minIdx = s0, touches = false;
      stackBuf[size++] = s0; selSeen[s0] = 1;
      while (head < size) {
        const k = stackBuf[head++];
        if (capSeen[k]) touches = true;
        if (terrGrid[k] < minT) { minT = terrGrid[k]; minIdx = k; }
        const x = k % W, y = (k / W) | 0;
        if (x > 0) { const n = k - 1; if (!selSeen[n] && filledGrid[n] > terrGrid[n] + 1e-5) { selSeen[n] = 1; stackBuf[size++] = n; } }
        if (x < W - 1) { const n = k + 1; if (!selSeen[n] && filledGrid[n] > terrGrid[n] + 1e-5) { selSeen[n] = 1; stackBuf[size++] = n; } }
        if (y > 0) { const n = k - W; if (!selSeen[n] && filledGrid[n] > terrGrid[n] + 1e-5) { selSeen[n] = 1; stackBuf[size++] = n; } }
        if (y < H - 1) { const n = k + W; if (!selSeen[n] && filledGrid[n] > terrGrid[n] + 1e-5) { selSeen[n] = 1; stackBuf[size++] = n; } }
      }
      if (!touches && size <= 0.20 * N)
        cands.push({ minIdx, depth: filledGrid[minIdx] - minT });
    }
    cands.sort((a, b) => b.depth - a.depth);
    for (const c of cands) {
      if (count <= 0) break;
      if (fillLakeFrom(c.minIdx) > 0) { lakes.push({ k: c.minIdx }); count--; }
    }
  }

  function updateLakes() {
    priorityFlood();
    const want = targetLakeCount();
    for (let li = lakes.length - 1; li >= 0; li--) {
      const m = descendToMin(lakes[li].k);
      if (filledGrid[m] <= terrGrid[m] + 0.006) { lakes.splice(li, 1); continue; }
      let dup = false;
      for (let q = 0; q < li; q++) if (lakes[q].k === m) { dup = true; break; }
      if (dup) { lakes.splice(li, 1); continue; }
      lakes[li].k = m;
    }
    while (lakes.length > want) {
      let si = 0, sd = Infinity;
      for (let q = 0; q < lakes.length; q++) {
        const d = filledGrid[lakes[q].k] - terrGrid[lakes[q].k];
        if (d < sd) { sd = d; si = q; }
      }
      lakes.splice(si, 1);
    }
    levelGrid.fill(0);
    capSeen.fill(0);
    for (let li = lakes.length - 1; li >= 0; li--)
      if (fillLakeFrom(lakes[li].k) === 0) lakes.splice(li, 1);
    if (lakes.length < want) selectNewLakes(want - lakes.length);

    // shoreline skirt: hold the flat surface 3 cells past the shore so
    // the rendered shoreline is a full-res terrain iso-line
    const W = FIELD_W, H = FIELD_H;
    for (let it = 0; it < 3; it++) {
      levelTmp.set(levelGrid);
      for (let j = 0; j < H; j++) {
        for (let i = 0; i < W; i++) {
          const k = j * W + i;
          if (levelTmp[k] !== 0) continue;
          const iL = i > 0, iR = i < W - 1, jU = j > 0, jD = j < H - 1;
          let m = 0;
          if (iL && levelTmp[k - 1] > m) m = levelTmp[k - 1];
          if (iR && levelTmp[k + 1] > m) m = levelTmp[k + 1];
          if (jU && levelTmp[k - W] > m) m = levelTmp[k - W];
          if (jD && levelTmp[k + W] > m) m = levelTmp[k + W];
          if (iL && jU && levelTmp[k - W - 1] > m) m = levelTmp[k - W - 1];
          if (iR && jU && levelTmp[k - W + 1] > m) m = levelTmp[k - W + 1];
          if (iL && jD && levelTmp[k + W - 1] > m) m = levelTmp[k + W - 1];
          if (iR && jD && levelTmp[k + W + 1] > m) m = levelTmp[k + W + 1];
          if (m > 0 && terrGrid[k] >= m) levelGrid[k] = m;
        }
      }
    }
  }

  /* ---------------- Seed / names ---------------- */

  let seed = 1337;
  let seedVec = [0, 0];
  let namePools: Record<string, string[]> = NAMES;
  let nameIdx: Record<string, number> = { peak: 0, basin: 0, saddle: 0, lake: 0 };
  let randDecor: () => number = Math.random;
  let decor: { marks: { x: number; y: number; s: number; a: number }[] } | null = null;

  function reseed(newSeed: number) {
    seed = newSeed;
    const r = mulberry32(seed);
    seedVec = [r() * 200 - 100, r() * 200 - 100];
    namePools = {
      peak: shuffled(NAMES.peak, r),
      basin: shuffled(NAMES.basin, r),
      saddle: shuffled(NAMES.saddle, r),
      lake: shuffled(NAMES.lake, r),
    };
    nameIdx = { peak: 0, basin: 0, saddle: 0, lake: 0 };
    lakeRand = r();
    snowRand = r();
    lakes.length = 0;
    randDecor = mulberry32(seed ^ 0x9e3779b9);
    decor = null;
    features.length = 0;
    normInit = false;
  }
  function nextName(type: string) {
    const pool = namePools[type];
    return pool[nameIdx[type]++ % pool.length];
  }

  /* ---------------- Feature detection + temporal tracking ---------------- */

  const UPDATE_MS = 350;
  const features: Feature[] = [];
  let lastDetect = 0;

  function rawDecode(i: number, j: number) {
    const k = ((FIELD_H - 1 - j) * FIELD_W + i) * 4;
    return (fieldPixels[k] + fieldPixels[k + 1] / 255) / 255;
  }

  function detectCandidates(W: number, H: number): Candidate[] {
    const cands: Candidate[] = [];
    const FW = FIELD_W, FH = FIELD_H, w = 5;
    const cellX = W / FW, cellY = H / FH;

    for (let j = 0; j < FH; j++) {
      const base = j * FW;
      for (let i = 0; i < FW; i++) {
        const i0 = i - w < 0 ? 0 : i - w, i1 = i + w >= FW ? FW - 1 : i + w;
        let mx = -1e9, mn = 1e9;
        for (let ii = i0; ii <= i1; ii++) {
          const v = terrGrid[base + ii];
          if (v > mx) mx = v;
          if (v < mn) mn = v;
        }
        winRMax[base + i] = mx; winRMin[base + i] = mn;
      }
    }
    for (let j = 0; j < FH; j++) {
      const j0 = j - w < 0 ? 0 : j - w, j1 = j + w >= FH ? FH - 1 : j + w;
      for (let i = 0; i < FW; i++) {
        let mx = -1e9, mn = 1e9;
        for (let jj = j0; jj <= j1; jj++) {
          const a = winRMax[jj * FW + i], b = winRMin[jj * FW + i];
          if (a > mx) mx = a;
          if (b < mn) mn = b;
        }
        winMaxG[j * FW + i] = mx; winMinG[j * FW + i] = mn;
      }
    }

    for (let j = 2; j < FH - 2; j++) {
      for (let i = 2; i < FW - 2; i++) {
        const px = (i + 0.5) * cellX, py = (j + 0.5) * cellY;
        if (px < 0.06 * W || px > 0.94 * W || py < 0.07 * H || py > 0.93 * H) continue;
        const k = j * FW + i;
        const c = terrGrid[k];
        if (c === winMaxG[k]) { cands.push({ x: px, y: py, type: "peak", v: c, score: 0.9 + c }); continue; }
        if (c === winMinG[k]) { cands.push({ x: px, y: py, type: "basin", v: c, score: 1.9 - c, lake: levelGrid[k] > c + 1e-4 }); continue; }

        const ring = [terrGrid[k + 1], terrGrid[k + FW + 1], terrGrid[k + FW], terrGrid[k + FW - 1],
          terrGrid[k - 1], terrGrid[k - FW - 1], terrGrid[k - FW], terrGrid[k - FW + 1]];
        let changes = 0, amp = 0;
        for (let q = 0; q < 8; q++) {
          const a = ring[q] - c, b = ring[(q + 1) & 7] - c;
          if ((a > 0) !== (b > 0)) changes++;
          const aa = a < 0 ? -a : a;
          if (aa > amp) amp = aa;
        }
        if (changes >= 4 && amp > 0.004) cands.push({ x: px, y: py, type: "saddle", v: c, score: 1.0 });
      }
    }
    return cands;
  }

  function updateFeatures(now: number, W: number, H: number) {
    const cands = detectCandidates(W, H);
    const matchR = Math.min(W, H) * 0.16;
    const minDist = Math.min(W, H) * 0.22;

    for (const f of features) f.matched = false;
    for (const f of features) {
      let best: Candidate | null = null, bd = matchR;
      for (const c of cands) {
        if (c.used || c.type !== f.type) continue;
        const d = Math.hypot(c.x - f.tx, c.y - f.ty);
        if (d < bd) { bd = d; best = c; }
      }
      if (best) {
        best.used = true;
        f.tx = best.x; f.ty = best.y; f.v = best.v;
        if (best.lake !== undefined && !!best.lake !== !!f.lake) {
          f.lake = !!best.lake;
          f.name = nextName(f.lake ? "lake" : "basin");
        }
        f.matched = true; f.lastSeen = now;
      }
    }

    for (const f of features)
      if (!f.matched && now - f.lastSeen > 1100) f.talpha = 0;

    for (let i = features.length - 1; i >= 0; i--)
      if (features[i].talpha === 0 && features[i].alpha < 0.02) features.splice(i, 1);

    const alive = features.filter(f => f.talpha > 0);
    cands.sort((a, b) => b.score - a.score);
    for (const c of cands) {
      if (alive.length >= PARAMS.poi) break;
      if (c.used) continue;
      if (alive.every(f => Math.hypot(f.tx - c.x, f.ty - c.y) > minDist)) {
        const f: Feature = {
          x: c.x, y: c.y, tx: c.x, ty: c.y, type: c.type, v: c.v, lake: !!c.lake,
          name: nextName(c.type === "basin" && c.lake ? "lake" : c.type),
          alpha: 0, talpha: 1, born: now, lastSeen: now,
        };
        features.push(f); alive.push(f);
      }
    }
    alive.sort((a, b) => a.born - b.born);
    while (alive.length > PARAMS.poi) alive.pop()!.talpha = 0;
  }

  /* ---------------- Overlay drawing ---------------- */

  function elevOf(v: number) {
    const vn = (v - normMin) / Math.max(normMaxDay - normMin, 1e-4);
    return Math.round(2000 + vn * 5500);
  }
  function nightT(v: number) {
    return (v - normMin) / Math.max(normMaxNight - normMin, 1e-4);
  }
  function makeDecor(W: number, H: number) {
    const marks = [];
    for (let i = 0; i < 6; i++)
      marks.push({ x: randDecor() * W, y: randDecor() * H, s: 5 + randDecor() * 4, a: 0.3 + randDecor() * 0.3 });
    return { marks };
  }

  function drawCoords(x: number, y: number, W: number, H: number) {
    return [(38.94 - (y / H) * 0.06).toFixed(4), (77.09 - (x / W) * 0.10).toFixed(4)];
  }

  function drawOverlay(W: number, H: number) {
    octx!.clearRect(0, 0, W, H);
    const ink = night ? NIGHT_INK : DAY_INK;

    const GS = 240;
    octx!.strokeStyle = ink.grid;
    octx!.lineWidth = 1;
    octx!.font = "10px ui-monospace, Menlo, monospace";
    octx!.fillStyle = ink.gridLabel;
    for (let x = GS; x < W; x += GS) {
      octx!.beginPath(); octx!.moveTo(x, 0); octx!.lineTo(x, H); octx!.stroke();
      const lonMin = 6 - (x / W) * 6;
      octx!.textAlign = "center";
      octx!.fillText("77°0" + lonMin.toFixed(0) + "'", x, 14);
    }
    for (let y = GS; y < H; y += GS) {
      octx!.beginPath(); octx!.moveTo(0, y); octx!.lineTo(W, y); octx!.stroke();
      const latMin = 56 - (y / H) * 4;
      octx!.textAlign = "left";
      octx!.fillText("38°" + latMin.toFixed(0) + "'", 6, y - 4);
    }

    if (!decor) decor = makeDecor(W, H);
    octx!.strokeStyle = ink.plus;
    for (const m of decor.marks) {
      octx!.globalAlpha = m.a;
      octx!.beginPath();
      octx!.moveTo(m.x - m.s, m.y); octx!.lineTo(m.x + m.s, m.y);
      octx!.moveTo(m.x, m.y - m.s); octx!.lineTo(m.x, m.y + m.s);
      octx!.stroke();
    }
    octx!.globalAlpha = 1;

    const alive = features.filter(f => f.alpha > 0.02);
    alive.sort((a, b) => a.born - b.born);
    alive.forEach((f, i) => (night ? drawFeatureNight : drawFeatureDay)(f, i === 0, W, H));
  }

  function drawFeatureDay(f: Feature, primary: boolean, W: number, H: number) {
    const { x, y, type, v } = f;
    const fade = f.alpha;
    const isLake = type === "basin" && !!f.lake;
    const c = octx!;
    c.save();

    if (primary) {
      c.strokeStyle = hexA(DAY_INK.red, 0.3 * fade);
      c.lineWidth = 1;
      c.setLineDash([5, 7]);
      c.beginPath();
      c.moveTo(0, y); c.lineTo(W, y);
      c.moveTo(x, 0); c.lineTo(x, H);
      c.stroke();
      c.setLineDash([]);
    }

    c.lineWidth = 1;
    if (type === "peak") {
      const s = 8;
      c.fillStyle = hexA(DAY_INK.mark, 0.95 * fade);
      c.beginPath();
      c.moveTo(x, y - s);
      c.lineTo(x + s * 0.9, y + s * 0.65);
      c.lineTo(x - s * 0.9, y + s * 0.65);
      c.closePath(); c.fill();
    } else if (type === "basin") {
      if (!isLake) {
        c.fillStyle = hexA(DAY_INK.mark, 0.95 * fade);
        c.beginPath(); c.arc(x, y, 5, 0, Math.PI * 2); c.fill();
      }
    } else {
      const d = 8, r2 = 3;
      c.fillStyle = hexA(DAY_INK.mark, 0.9 * fade);
      c.beginPath(); c.arc(x, y - d, r2, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(x, y + d, r2, 0, Math.PI * 2); c.fill();
      c.strokeStyle = hexA(DAY_INK.mark, 0.85 * fade);
      c.beginPath(); c.arc(x - d, y, r2, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.arc(x + d, y, r2, 0, Math.PI * 2); c.stroke();
    }

    const elev = elevOf(v);
    if (isLake) {
      c.textAlign = "center";
      c.font = "italic 600 13px Georgia, 'Times New Roman', serif";
      c.fillStyle = hexA(DAY_INK.lake, 0.95 * fade);
      c.fillText(f.name || type, x, y - 4);
      c.font = "11px ui-monospace, Menlo, monospace";
      c.fillStyle = hexA(DAY_INK.lake, 0.8 * fade);
      c.fillText(elev.toLocaleString() + "'", x, y + 12);
    } else {
      const [lat, lon] = drawCoords(x, y, W, H);
      c.textAlign = x > W * 0.72 ? "right" : "left";
      const tx = x > W * 0.72 ? x - 30 : x + 30;
      c.font = "italic 600 14px Georgia, 'Times New Roman', serif";
      c.fillStyle = hexA(DAY_INK.name, 0.95 * fade);
      c.fillText(f.name || type, tx, y - 12);
      c.font = "11px ui-monospace, Menlo, monospace";
      c.fillStyle = hexA(DAY_INK.red, 0.9 * fade);
      c.fillText(elev.toLocaleString() + "'", tx, y + 3);
      c.fillStyle = hexA(DAY_INK.slate, 0.85 * fade);
      c.fillText(lat + "° N  " + lon + "° W", tx, y + 17);
    }
    c.restore();
  }

  function drawFeatureNight(f: Feature, primary: boolean, W: number, H: number) {
    const { x, y, type, v } = f;
    const fade = f.alpha;
    const isLake = type === "basin" && !!f.lake;
    const col = nightRampColor(nightT(v));
    const stroke = (a: number) => rgbA(col, a * fade);
    const c = octx!;
    c.save();

    if (primary) {
      c.strokeStyle = stroke(0.35);
      c.lineWidth = 1;
      c.setLineDash([5, 7]);
      c.beginPath();
      c.moveTo(0, y); c.lineTo(W, y);
      c.moveTo(x, 0); c.lineTo(x, H);
      c.stroke();
      c.setLineDash([]);
    }

    c.lineWidth = 1;
    if (type === "peak") {
      const s = 9;
      c.fillStyle = stroke(0.95);
      c.shadowColor = stroke(1);
      c.shadowBlur = 12;
      c.beginPath();
      c.moveTo(x, y - s);
      c.lineTo(x + s * 0.9, y + s * 0.65);
      c.lineTo(x - s * 0.9, y + s * 0.65);
      c.closePath(); c.fill();
      c.shadowBlur = 0;
    } else if (type === "basin") {
      if (!isLake) {
        c.fillStyle = stroke(0.95);
        c.shadowColor = stroke(1);
        c.shadowBlur = 12;
        c.beginPath(); c.arc(x, y, 5.5, 0, Math.PI * 2); c.fill();
        c.shadowBlur = 0;
      }
    } else {
      const d = 9, r2 = 3.2;
      c.fillStyle = stroke(0.95);
      c.beginPath(); c.arc(x, y - d, r2, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(x, y + d, r2, 0, Math.PI * 2); c.fill();
      c.strokeStyle = stroke(0.9);
      c.beginPath(); c.arc(x - d, y, r2, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.arc(x + d, y, r2, 0, Math.PI * 2); c.stroke();
    }

    const elev = elevOf(v);
    if (isLake) {
      c.textAlign = "center";
      c.font = "11px ui-monospace, Menlo, monospace";
      c.fillStyle = hexA(NIGHT_INK.lake, 0.95 * fade);
      c.shadowColor = hexA(NIGHT_INK.lake, 0.8 * fade);
      c.shadowBlur = 8;
      c.fillText((f.name || type).toUpperCase(), x, y - 4);
      c.shadowBlur = 0;
      c.fillStyle = hexA(NIGHT_INK.lake, 0.75 * fade);
      c.fillText(elev.toLocaleString() + "'", x, y + 12);
    } else {
      const [lat, lon] = drawCoords(x, y, W, H);
      c.textAlign = x > W * 0.72 ? "right" : "left";
      const tx = x > W * 0.72 ? x - 32 : x + 32;
      c.font = "11px ui-monospace, Menlo, monospace";
      c.fillStyle = stroke(0.95);
      c.fillText((f.name || type).toUpperCase() + " · " + elev.toLocaleString() + "'", tx, y - 14);
      c.fillStyle = stroke(0.6);
      c.fillText(lat + "° N  " + lon + "° W", tx, y + 2);
    }
    c.restore();
  }

  /* ---------------- Main loop ---------------- */

  let simTime = 0, lastFrame = 0, fpsEma = 60;
  let cssW = 0, cssH = 0, dpr = 1;
  let raf = 0;

  /* Device tiers: full-scale animation; adaptive render-scale shrink when
     fps < 28; static single render under 15 fps or reduced motion. */
  const isMobile = typeof matchMedia !== "undefined" &&
    (matchMedia("(pointer: coarse)").matches || (navigator.maxTouchPoints || 0) > 1);
  let glScale = isMobile ? 0.75 : 1.0;
  let staticMode = false, staticPending = 0;
  let adaptAt = 0;
  const probeGrace = performance.now() + 2500;

  function applyGLSize() {
    glCanvas.width = Math.max(2, Math.round(cssW * dpr * glScale));
    glCanvas.height = Math.max(2, Math.round(cssH * dpr * glScale));
    glCanvas.style.width = cssW + "px"; glCanvas.style.height = cssH + "px";
  }

  function staticRerender(forceTick: boolean) {
    if (!staticMode) return;
    if (forceTick) lastDetect = -1e9;
    cancelAnimationFrame(staticPending);
    staticPending = requestAnimationFrame(frame);
  }
  function enterStatic() {
    if (staticMode) return;
    staticMode = true;
    staticRerender(true);
  }

  function resize() {
    if (destroyed) return;
    dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.25 : 1.5);
    cssW = Math.floor(glCanvas.parentElement?.clientWidth ?? window.innerWidth);
    cssH = Math.floor(glCanvas.parentElement?.clientHeight ?? window.innerHeight);
    applyGLSize();
    overlay.width = cssW * dpr; overlay.height = cssH * dpr;
    overlay.style.width = cssW + "px"; overlay.style.height = cssH + "px";
    octx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    sizeFieldBuffer(cssW, cssH);
    decor = null;
    staticRerender(true);
  }

  function setCommonUniforms() {
    gl!.uniform1f(U.u_time, simTime);
    gl!.uniform1f(U.u_scale, PARAMS.scale);
    gl!.uniform1f(U.u_warp, PARAMS.warp);
    gl!.uniform1f(U.u_stretch, PARAMS.stretch);
    gl!.uniform1f(U.u_levels, PARAMS.levels);
    gl!.uniform1f(U.u_tint, PARAMS.tint);
    gl!.uniform1f(U.u_relief, PARAMS.relief);
    gl!.uniform1f(U.u_glow, PARAMS.glow);
    gl!.uniform1f(U.u_vmin, normMin);
    gl!.uniform1f(U.u_vmax, night ? normMaxNight : normMaxDay);
    gl!.uniform2f(U.u_seed, seedVec[0], seedVec[1]);
    gl!.uniform2f(U.u_cssRes, cssW, cssH);
    gl!.uniform1i(U.u_hyps, PARAMS.hyps ? 1 : 0);
    gl!.uniform1i(U.u_cel, PARAMS.cel ? 1 : 0);
    gl!.uniform1i(U.u_elev, PARAMS.elev ? 1 : 0);
    gl!.uniform1i(U.u_night, night ? 1 : 0);
  }

  function frame(now: number) {
    if (destroyed) return;
    const dt = Math.min(0.1, (now - lastFrame) / 1000 || 0.016);
    lastFrame = now;
    fpsEma = fpsEma * 0.95 + (1 / dt) * 0.05;

    simTime += dt * PARAMS.speed * 0.10;

    gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
    gl!.viewport(0, 0, glCanvas.width, glCanvas.height);
    setCommonUniforms();
    gl!.uniform2f(U.u_outRes, glCanvas.width, glCanvas.height);
    gl!.uniform1i(U.u_output, 0);
    gl!.drawArrays(gl!.TRIANGLES, 0, 3);

    if (now - lastDetect > UPDATE_MS) {
      lastDetect = now;
      gl!.bindFramebuffer(gl!.FRAMEBUFFER, fieldFbo);
      gl!.viewport(0, 0, FIELD_W, FIELD_H);
      gl!.uniform2f(U.u_outRes, FIELD_W, FIELD_H);
      gl!.uniform1i(U.u_output, 1);
      gl!.drawArrays(gl!.TRIANGLES, 0, 3);
      gl!.readPixels(0, 0, FIELD_W, FIELD_H, gl!.RGBA, gl!.UNSIGNED_BYTE, fieldPixels);
      gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);

      let mMin = 1, mMax = 0;
      for (let j2 = 0; j2 < FIELD_H; j2++)
        for (let i2 = 0; i2 < FIELD_W; i2++) {
          const tv = rawDecode(i2, j2);
          terrGrid[j2 * FIELD_W + i2] = tv;
          if (tv < mMin) mMin = tv;
          if (tv > mMax) mMax = tv;
        }
      // freeze the legends on the first tick of each seed
      if (!normInit) {
        normMin = mMin - 0.02;
        normMaxDay = mMax + 0.6 * snowRand;
        normMaxNight = mMax + 0.02;
        normInit = true;
      }
      updateLakes();

      levelFlip = !levelFlip;
      gl!.activeTexture(levelFlip ? gl!.TEXTURE1 : gl!.TEXTURE0);
      gl!.bindTexture(gl!.TEXTURE_2D, levelFlip ? levelTexB : levelTexA);
      gl!.texSubImage2D(gl!.TEXTURE_2D, 0, 0, 0, FIELD_W, FIELD_H, gl!.RED, gl!.FLOAT, levelGrid);

      updateFeatures(now, cssW, cssH);
    }
    gl!.activeTexture(gl!.TEXTURE0);
    gl!.bindTexture(gl!.TEXTURE_2D, levelFlip ? levelTexA : levelTexB);
    gl!.activeTexture(gl!.TEXTURE1);
    gl!.bindTexture(gl!.TEXTURE_2D, levelFlip ? levelTexB : levelTexA);
    gl!.uniform1f(U.u_wblend, staticMode ? 1 : Math.min(1, (now - lastDetect) / UPDATE_MS));

    const k = 1 - Math.exp(-dt * 3.5);
    const ka = 1 - Math.exp(-dt * 2.5);
    for (const f of features) {
      if (staticMode) { f.x = f.tx; f.y = f.ty; f.alpha = f.talpha; }
      else {
        f.x += (f.tx - f.x) * k;
        f.y += (f.ty - f.y) * k;
        f.alpha += (f.talpha - f.alpha) * ka;
      }
    }

    drawOverlay(cssW, cssH);

    if (!staticMode) {
      // adaptive quality: shrink the GL buffer before giving up on motion
      if (now > adaptAt) {
        adaptAt = now + 1500;
        if (now > probeGrace) {
          if (fpsEma < 28 && glScale > 0.55) {
            glScale = Math.max(0.55, glScale - 0.15);
            applyGLSize();
          } else if (fpsEma < 15) {
            enterStatic();
            return;
          }
        }
      }
      raf = requestAnimationFrame(frame);
    }
  }

  /* ---------------- Wiring ---------------- */

  const onResize = () => resize();
  const onOrient = () => setTimeout(resize, 250);
  window.addEventListener("resize", onResize);
  window.addEventListener("orientationchange", onOrient);

  reseed((Math.random() * 1e9) | 0);
  resize();
  if (typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches)
    staticMode = true;
  raf = requestAnimationFrame(frame);
  if (staticMode) staticRerender(true);

  return {
    setNight(n: boolean) {
      if (night === n) return;
      night = n;
      staticRerender(false);
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      cancelAnimationFrame(staticPending);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onOrient);
      gl!.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
