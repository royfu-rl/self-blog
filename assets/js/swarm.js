// One swarm of particles re-forms into a figure per chapter.
// experience.js drives it by scroll, film.js by time. Returns false without WebGL.
// Add a chapter: write a scene (i, t) => put(...), then list it in ALL.
window.startSwarm = ({ canvas, box, order, fit, progress, onActive }) => {
  const gl = canvas.getContext('webgl', { antialias: false });
  if (!gl) return false;


  // ---- Helpers ----
  const { sin, cos, exp, floor, sqrt, min, max, abs, PI } = Math;
  const TAU = PI * 2;
  const fract = x => x - floor(x);
  const mix = (a, b, t) => a + (b - a) * t;
  const clamp = x => x < 0 ? 0 : x > 1 ? 1 : x;
  const ease = x => x * x * (3 - 2 * x);
  const smooth = (a, b, x) => ease(clamp((x - a) / (b - a)));
  const bell = (x, width) => exp(-x * x * width);
  const hash = (a, b = 0) => fract(sin(a * 12.9898 + b * 78.233) * 43758.5453);

  const N = innerWidth < 860 ? 6000 : 14000;
  const noise = seed => Float32Array.from({ length: N }, (_, i) => hash(i + 1, seed));
  const R1 = noise(1), R2 = noise(2), R3 = noise(3), R4 = noise(4), R5 = noise(5), R6 = noise(6);

  // A scene writes one particle: x y z, r g b, size
  const out = new Float32Array(7);
  const put = (x, y, z, c, bright = 1, size = 1) => {
    out[0] = x; out[1] = y; out[2] = z;
    out[3] = c[0] * bright; out[4] = c[1] * bright; out[5] = c[2] * bright;
    out[6] = size;
  };
  const blend = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];


  // ---- Scene: opening, a breathing sphere ----
  const PALE = [.62, .72, .95];
  const opening = (i, t) => {
    const y = 1 - 2 * (i + .5) / N, ring = sqrt(1 - y * y), a = i * 2.39996 + t * .08;
    const r = .78 * (1 + .07 * sin(y * 7 + t * .9) * sin(a * 3 - t * .5));
    put(r * ring * cos(a), r * y, r * ring * sin(a), PALE, .34 + .3 * R1[i], .9 + R2[i]);
  };


  // ---- Scene: Game AI, two teams push three lanes ----
  const BLUE = [.28, .62, 1], RED = [1, .36, .2], DIM = [.3, .4, .52], RIVER = [.14, .5, .66];
  const CORNER = .64;
  const LANES = [
    [[-CORNER, -CORNER], [-CORNER, CORNER], [CORNER, CORNER]],
    [[-CORNER, -CORNER], [CORNER, CORNER]],
    [[-CORNER, -CORNER], [CORNER, -CORNER], [CORNER, CORNER]],
  ];
  const onLane = (lane, s) => {
    const path = LANES[lane], n = path.length - 1, k = min(n - 1, floor(s * n)), u = s * n - k;
    return [mix(path[k][0], path[k + 1][0], u), mix(path[k][1], path[k + 1][1], u)];
  };
  const flat = (x, y, z, c, b, s) => put((x - y) * .707, (x + y) * .707, z, c, b, s);   // turn the square into a diamond

  const game = (i, t) => {
    const kind = R1[i];
    if (kind < .6) {                                           // units walk from their base to the front
      const lane = floor(R2[i] * 3), blue = R3[i] < .5;
      const front = .5 + .17 * sin(t * .32 + lane * 2.1);
      const walk = fract(R4[i] + t * .07);
      const s = blue ? walk * front : 1 - walk * (1 - front);
      const [x, y] = onLane(lane, s);
      const spark = bell(s - front, 400);
      flat(x + (R5[i] - .5) * .09, y + (R6[i] - .5) * .09, .2 * spark * R5[i], blue ? BLUE : RED, .5 + 1.2 * spark, 1.05 + spark);
    } else if (kind < .68) {                                   // river across the map
      const s = fract(R2[i] + t * .012) * 2 - 1;
      flat(s * CORNER, -s * CORNER + (R3[i] - .5) * .12 + .03 * sin(s * 9 + t), 0, RIVER, .62, .9);
    } else if (kind < .84) {                                   // jungle
      flat((R2[i] - .5) * 2 * CORNER, (R3[i] - .5) * 2 * CORNER, 0, DIM, .3 + .4 * sin(t + R4[i] * TAU) ** 2, .9);
    } else if (kind < .9) {                                    // map edge
      const p = R2[i] * 4, side = floor(p), f = (p - side) * 2 - 1, e = CORNER * 1.14;
      const x = side < 2 ? f * e : side === 2 ? -e : e, y = side < 2 ? (side ? e : -e) : f * e;
      flat(x, y, 0, DIM, .62, .85);
    } else {                                                   // bases
      const blue = R2[i] < .5, a = R3[i] * TAU + t * .4, r = .09 * sqrt(R4[i]) + .03;
      const at = blue ? -CORNER : CORNER;
      flat(at + r * cos(a), at + r * sin(a), .05 * R4[i], blue ? BLUE : RED, .9, 1.2);
    }
  };


  // ---- Scene: Search Agent, a query branches and reward flows back ----
  const GOLD = [1, .78, .24], SLATE = [.45, .57, .78];
  const TREE = (() => {
    const nodes = [{ x: 0, y: 0, z: 0, depth: 0, up: -1, hit: true }];
    let seed = 40;
    const grow = (up, angle, span, depth) => {
      if (depth > 4) return;
      const kids = depth === 0 ? 5 : 2 + floor(hash(seed++) * 2);
      for (let k = 0; k < kids; k++) {
        const a = angle - span / 2 + span * (k + .5) / kids + (hash(seed++) - .5) * .1;
        const r = .195 * depth + .22;
        nodes.push({ x: r * cos(a), y: r * sin(a), z: (hash(seed++) - .5) * .3, depth: depth + 1, up, hit: false });
        grow(nodes.length - 1, a, span / kids * 1.1, depth + 1);
      }
    };
    grow(0, 0, TAU, 0);
    const leaves = nodes.filter(n => n.depth === 5);           // the answers that earn reward
    for (const f of [.08, .3, .55, .82]) {
      for (let n = leaves[floor(f * leaves.length)]; n; n = nodes[n.up]) n.hit = true;
    }
    const edges = nodes.slice(1);
    const weighted = edges.flatMap(e => Array(e.hit ? 5 : 1).fill(e));
    const ofParticle = Array.from({ length: N }, (_, i) => weighted[floor(R2[i] * weighted.length)]);
    return { nodes, ofParticle };
  })();

  const search = (i, t) => {
    const e = TREE.ofParticle[i], p = TREE.nodes[e.up];
    const s = R1[i] < .78 ? fract(R3[i] + t * .1) : 1;         // most particles flow along edges, the rest rest on nodes
    const spread = s === 1 ? .026 : .007;
    const x = mix(p.x, e.x, s) + (R5[i] - .5) * spread;
    const y = mix(p.y, e.y, s) + (R6[i] - .5) * spread;
    const z = mix(p.z, e.z, s);
    const turn = t * .05, c = cos(turn), d = sin(turn);
    const pulse = e.hit ? bell(fract(t * .22) * 6 - (5 - (p.depth + s)), 5) : 0;   // reward travels leaf to root
    put(x * c - y * d, x * d + y * c, z, e.hit ? GOLD : SLATE, e.hit ? .6 + 1.6 * pulse : .62, e.hit ? 1.05 + .9 * pulse : .95);
  };


  // ---- Scene: KAT-Coder, each dot is a sandbox ----
  const RUN = [.9, .66, .22], PASS = [.2, 1, .56], FAIL = [1, .24, .2];
  const COLS = Math.ceil(sqrt(N));
  const coder = (i, t) => {
    const gx = ((i % COLS) / (COLS - 1) * 2 - 1) * .84, gy = (floor(i / COLS) / (COLS - 1) * 2 - 1) * .84;
    const episode = R1[i] + t * .2, k = floor(episode), phase = episode - k;
    const passRate = .45 + .45 * smooth(-.6, .6, sin(gx * 1.4 + gy * .9 - t * .22));   // training sweeps across the fleet
    const wave = .08 * sin(gx * 4.5 + t * .7) * cos(gy * 3.6 - t * .5);
    if (phase < .55) return put(gx, gy, wave, RUN, .2 + .22 * sin(t * 3 + R2[i] * TAU) ** 2, .9);
    const pop = 1 - (phase - .55) / .45;
    const pass = hash(i, k) < passRate;
    put(gx, gy, wave + .1 * pop * pop, pass ? PASS : FAIL, (pass ? .42 : .75) + .8 * pop, 1 + .8 * pop);
  };


  // ---- Scene: Kling-Critic, a walking figure breaks in one frame ----
  const FILM = [.7, .78, .9], CORAL = [1, .3, .42], MINT = [.45, 1, .8];
  const FRAMES = 5, BROKEN = 3, HALF_W = .18, HALF_H = .15, MID = .13;
  const frameAt = k => (k - (FRAMES - 1) / 2) * .4;
  const POSES = Array.from({ length: FRAMES }, (_, k) => {     // head + torso + four limbs, Muybridge style
    const swing = sin(k * 1.1 + .6);
    return [
      [0, .05, 0, -.015], [0, .036, .05 * swing, -.008], [0, .036, -.05 * swing, -.008],
      [0, -.015, .05 * swing, -.09], [0, -.015, -.05 * swing, -.09],
    ];
  });
  const bent = (u, v, c, b, s) => put(sin(u * .95) * 1.1, v, (1 - cos(u * .95)) * .9, c, b, s);   // curl the strip toward the viewer
  const scoreAt = u => .05 * sin(u * 5) + .025 * sin(u * 13) - .17 * bell(u - frameAt(BROKEN), 70);

  const critic = (i, t) => {
    const kind = R1[i], k = i % FRAMES, cx = frameAt(k), broken = k === BROKEN;
    const scan = (fract(t * .16) * 1.3 - .15) * 2 - 1;
    const glow = u => 1 + 1.2 * bell(u - scan, 90);
    const pulse = .7 + .3 * sin(t * 4);

    if (kind < .3) {                                           // frame border
      const p = R2[i] * 4, side = floor(p), f = (p - side) * 2 - 1;
      const u = cx + (side < 2 ? f * HALF_W : (side === 2 ? -HALF_W : HALF_W));
      const v = MID + (side < 2 ? (side ? HALF_H : -HALF_H) : f * HALF_H);
      return bent(u, v, broken ? CORAL : FILM, (broken ? pulse : .36) * glow(u), broken ? 1.1 : .8);
    }
    if (kind < .4) {                                           // sprocket holes
      const u = (floor(R2[i] * 44) + .5) / 22 - 1 + (R3[i] - .5) * .018;
      return bent(u, MID + (R4[i] < .5 ? 1 : -1) * (HALF_H + .05) + (R3[i] - .5) * .02, FILM, .32 * glow(u), .8);
    }
    if (kind < .78) {                                          // figure
      const limb = floor(R2[i] * 6), [x0, y0, x1, y1] = POSES[k][min(limb, 4)];
      const f = R3[i], a = R3[i] * TAU, r = .021 * sqrt(R4[i]);
      let x = limb === 5 ? r * cos(a) : mix(x0, x1, f) + (R4[i] - .5) * .006;
      let y = limb === 5 ? .074 + r * sin(a) : mix(y0, y1, f) + (R4[i] - .5) * .006;
      if (broken) {                                            // limbs detach and jitter
        x += .045 * sin(limb * 7 + t * 2.3) + (R4[i] - .5) * .03 * sin(t * 5 + i);
        y += .03 * cos(limb * 5 + t * 1.7);
      }
      const u = cx - .1 + .05 * k + x;
      return bent(u, MID + y + .012, broken ? CORAL : FILM, (broken ? .9 : .55) * glow(u), 1);
    }
    const u = R2[i] * 2 - 1, dip = bell(u - frameAt(BROKEN), 70);   // quality curve under the strip
    bent(u, -.3 + scoreAt(u) + (R3[i] - .5) * .006, blend(MINT, CORAL, dip), .62 * glow(u), 1);
  };


  // ---- Scene: Visual Coder, code on the left becomes a render on the right ----
  const SYNTAX = [[.72, .96, .28], [.3, .92, .86], [.92, .94, .96], [1, .72, .32]];
  const ROWS = 15;
  const LINES = Array.from({ length: ROWS }, (_, k) => ({ indent: [0, .07, .14, .14, .21, .14, .07, 0][k % 8] + (k % 5 === 4 ? .07 : 0), len: .18 + .42 * hash(k, 9) }));
  const lineY = k => .62 - k * .088;
  const CODE_X = -.98;
  const coderLime = [.72, .98, .24], coderCyan = [.2, .92, .9];

  const visual = (i, t) => {
    const kind = R1[i];
    if (kind < .32) {                                          // lines of code, typed in a loop
      const k = i % ROWS, line = LINES[k], s = R2[i];
      const token = floor(s * 4 + k * 1.7) % SYNTAX.length;
      const gap = fract(s * 4 + k * 1.7) < .1 ? 0 : 1;         // blank between tokens
      const typed = fract(t * .055) * (ROWS + 5);
      const shown = smooth(0, .4, typed - k - s);
      const x = CODE_X + line.indent + s * line.len + (R3[i] - .5) * .004;
      return put(x, lineY(k) + (R3[i] - .5) * .014, 0, SYNTAX[token], (.08 + .75 * shown) * gap, .95);
    }
    const a = R2[i] * TAU, turn = t * .32, tube = R3[i] * TAU, thick = .055 * sqrt(R4[i]);
    const r = .3 + .13 * cos(3 * a);
    const kx = r * cos(2 * a) + thick * cos(tube), ky = r * sin(2 * a) + thick * sin(tube), kz = .16 * sin(3 * a) + thick * cos(tube + 1);
    const x = kx * cos(turn) + kz * sin(turn) + .58, y = ky, z = -kx * sin(turn) + kz * cos(turn);
    const c = blend(coderLime, coderCyan, .5 + .5 * sin(a * 2 + t * .4));
    if (kind < .86) return put(x, y, z, c, .46 + .55 * R4[i] ** 3, 1 + .4 * R4[i]);

    const s = fract(R3[i] + t * .24), k = i % ROWS;            // stream from the code into the render
    const x0 = CODE_X + LINES[k].indent + LINES[k].len, y0 = lineY(k), mx = mix(x0, x, .5), my = y0 * .3;
    const u = 1 - s;
    put(u * u * x0 + 2 * u * s * mx + s * s * x, u * u * y0 + 2 * u * s * my + s * s * y, s * s * z, blend(SYNTAX[2], c, s), .34 * bell(s - .5, 5) + .05, .85);
  };


  // ---- Scene list: scene + camera (tilt, spin) ----
  const ALL = [
    { draw: opening, tilt: 0,    spin: 1 },
    { draw: game,    tilt: -.9,  spin: .3 },
    { draw: search,  tilt: -.28, spin: .4 },
    { draw: coder,   tilt: -1.0, spin: .55 },
    { draw: critic,  tilt: -.08, spin: .25 },
    { draw: visual,  tilt: -.06, spin: .12 },
  ];
  const SCENES = order.map(k => ALL[k]);
  const LAST = SCENES.length - 1;


  // ---- WebGL ----
  const program = gl.createProgram();
  const shader = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s); gl.attachShader(program, s);
  };
  shader(gl.VERTEX_SHADER, `
    attribute vec3 aPos; attribute vec3 aColor; attribute float aSize;
    uniform mat3 uView; uniform vec3 uFit; uniform vec2 uMouse; uniform float uAspect, uPx;
    varying vec3 vColor;
    void main() {
      vec3 p = uView * aPos;
      float w = 1. / (1. - p.z * .42);
      vec2 q = p.xy * w * uFit.z;
      q.x /= uAspect;
      q += uFit.xy;
      vec2 d = (q - uMouse) * vec2(uAspect, 1.);               // particles shy away from the cursor
      float r = length(d) + .001;
      q += d / r * .07 * exp(-r * r * 22.) / vec2(uAspect, 1.);
      gl_Position = vec4(q, 0., 1.);
      gl_PointSize = aSize * uPx * w;
      vColor = aColor * min(1., .35 + .65 * w * w);
    }`);
  shader(gl.FRAGMENT_SHADER, `
    precision mediump float;
    varying vec3 vColor;
    void main() {
      float a = smoothstep(.5, .08, length(gl_PointCoord - .5));
      gl_FragColor = vec4(vColor * a, a);
    }`);
  gl.linkProgram(program);
  gl.useProgram(program);
  gl.clearColor(0, 0, 0, 0);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE);

  const buffer = new Float32Array(N * 7);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, buffer, gl.DYNAMIC_DRAW);
  const attribute = (name, size, offset) => {
    const at = gl.getAttribLocation(program, name);
    gl.enableVertexAttribArray(at);
    gl.vertexAttribPointer(at, size, gl.FLOAT, false, 28, offset);
  };
  attribute('aPos', 3, 0); attribute('aColor', 3, 12); attribute('aSize', 1, 24);
  const uniform = Object.fromEntries(['uView', 'uFit', 'uMouse', 'uAspect', 'uPx'].map(n => [n, gl.getUniformLocation(program, n)]));

  const resize = () => {
    const dpr = min(devicePixelRatio, 2), w = box.clientWidth, h = box.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform1f(uniform.uAspect, w / h);
    gl.uniform1f(uniform.uPx, 2.1 * dpr * max(.8, min(w, h) / 900));
    gl.uniform3f(uniform.uFit, ...fit(w, h));
  };
  new ResizeObserver(resize).observe(box);


  // ---- Pointer ----
  const mouse = { x: 9, y: 9, sx: 0, sy: 0 };
  addEventListener('pointermove', e => {
    const r = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) / r.width * 2 - 1;
    mouse.y = 1 - (e.clientY - r.top) / r.height * 2;
  }, { passive: true });


  // ---- Frame loop: draw scene A, blend toward scene B during the morph ----
  const keep = new Float32Array(7);
  let active = -1, running = false;

  const fill = (a, b, morph, t) => {
    for (let i = 0; i < N; i++) {
      const j = i * 7;
      a(i, t);
      if (morph === 0) { buffer.set(out, j); continue; }
      keep.set(out);
      b(i, t);
      const w = ease(clamp(morph * 1.5 - R1[i] * .5));
      for (let k = 0; k < 7; k++) buffer[j + k] = keep[k] + (out[k] - keep[k]) * w;
      buffer[j + 2] += sin(w * PI) * (R2[i] - .5) * .9;        // fly through depth on the way over
    }
  };

  const frame = now => {
    if (!running) return;
    const t = now / 1000, p = progress();
    const a = min(floor(p), LAST - 1), morph = smooth(.38, .92, p - a);
    const next = morph > .5 ? a + 1 : a;
    if (next !== active) onActive(active = next);

    fill(SCENES[a].draw, SCENES[a + 1].draw, morph, t);

    const near = abs(mouse.x) < 1 && abs(mouse.y) < 1;
    mouse.sx += ((near ? mouse.x : 0) - mouse.sx) * .05;
    mouse.sy += ((near ? mouse.y : 0) - mouse.sy) * .05;
    const tilt = mix(SCENES[a].tilt, SCENES[a + 1].tilt, morph) - mouse.sy * .16;
    const spin = sin(t * .13) * mix(SCENES[a].spin, SCENES[a + 1].spin, morph) * .45 + mouse.sx * .3;
    const ct = cos(tilt), st = sin(tilt), cs = cos(spin), ss = sin(spin);
    gl.uniformMatrix3fv(uniform.uView, false, [cs, ss * st, -ss * ct, 0, ct, st, ss, -cs * st, cs * ct]);
    gl.uniform2f(uniform.uMouse, mouse.x, mouse.y);

    gl.bufferSubData(gl.ARRAY_BUFFER, 0, buffer);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, N);
    requestAnimationFrame(frame);
  };

  // Only burn frames while on screen
  new IntersectionObserver(([e]) => {
    running = e.isIntersecting;
    if (running) requestAnimationFrame(frame);
  }).observe(box);

  resize();
  return true;
};

