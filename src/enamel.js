// A synthetic enamel study. The patch and its contour share tooth-local coordinates.
const vertexSource = `
attribute vec3 position;
attribute vec3 normal;
attribute vec3 local;
uniform float yaw;
uniform float pitch;
uniform float zoom;
uniform float shiftX;
uniform float aspect;
varying vec3 surfaceNormal;
varying vec3 surfacePoint;

void main() {
  mat3 rotateY = mat3(cos(yaw), 0., -sin(yaw), 0., 1., 0., sin(yaw), 0., cos(yaw));
  mat3 rotateX = mat3(1., 0., 0., 0., cos(pitch), sin(pitch), 0., -sin(pitch), cos(pitch));
  vec3 point = rotateX * rotateY * position;
  float depth = 9. - point.z;
  gl_Position = vec4((point.x * zoom + shiftX * depth) / aspect, point.y * zoom - .1 * depth, -point.z * .4, depth);
  surfaceNormal = rotateX * rotateY * normal;
  surfacePoint = local;
}`;

const fragmentSource = `
precision mediump float;
varying vec3 surfaceNormal;
varying vec3 surfacePoint;
uniform float tissue;
uniform float selected;
uniform float detection;
uniform float contrast;
uniform float sweep;

void main() {
  vec3 n = normalize(surfaceNormal);
  vec3 key = normalize(vec3(-.5, .6, .85));
  vec3 fill = normalize(vec3(.8, .1, .6));
  float diffuse = max(dot(n, key), 0.);
  float secondary = max(dot(n, fill), 0.);
  float frontal = max(n.z, 0.);
  float highlight = pow(max(dot(n, normalize(key + vec3(0., 0., 1.))), 0.), 65.);
  float rim = pow(1. - frontal, 3.);
  vec3 color;

  if (tissue < .5) {
    float edge = 1. - smoothstep(-.92, -.45, surfacePoint.y);
    vec3 enamel = mix(vec3(.91, .88, .79), vec3(.73, .85, .84), edge * .35);
    float texture = sin(surfacePoint.x * 22. + surfacePoint.y) * .003;
    color = (enamel + texture) * (.34 + .50 * diffuse + .19 * secondary + .08 * frontal);
    color += vec3(.26, .28, .24) * highlight + vec3(.06, .13, .12) * rim;

    if (selected > .5 && surfacePoint.z > .15) {
      vec2 uv = (surfacePoint.xy - vec2(-.10, .26)) / vec2(.16, .105);
      float angle = atan(uv.y, uv.x);
      float distance = length(uv) - 1. - .11 * sin(angle * 3. + .7) - .06 * cos(angle * 5.);
      float inside = 1. - smoothstep(-.10, .10, distance);
      color = mix(color, vec3(.89, .89, .80), inside * .48);
      float outline = 1. - smoothstep(.02, .095, abs(distance));
      float pathProgress = fract(angle / 6.283185 + .5);
      outline *= 1. - smoothstep(detection - .02, detection + .02, pathProgress);
      color = mix(color, vec3(.66, .91, .46), inside * smoothstep(.5, 1., detection) * .5);
      color = mix(color, vec3(.18, .43, .23), outline * smoothstep(0., .1, detection));
    }

    float stripe = exp(-65. * pow(surfacePoint.x - sweep, 2.));
    color += vec3(.03, .055, .025) * stripe * contrast;
    color = mix(color, (color - .38) * 1.12 + .38, contrast);
  } else {
    vec3 gum = mix(vec3(.49, .25, .23), vec3(.73, .43, .38), smoothstep(.4, 2., surfacePoint.y));
    color = gum * (.65 + .43 * diffuse + .15 * secondary) + vec3(.1, .07, .05) * highlight;
  }
  float opacity = tissue > .5 ? 1. - smoothstep(1.2, 1.95, surfacePoint.y) : 1.;
  gl_FragColor = vec4(color * opacity, opacity);
}`;

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader));
  }
  return shader;
}

function makeSurface(gl, sample, columns, rows, tissue, selected) {
  const vertices = [];
  const indices = [];
  for (let row = 0; row <= rows; row++) {
    for (let column = 0; column <= columns; column++) {
      const u = column / columns;
      const v = row / rows;
      const point = sample(u, v);
      const nextU = sample(u + 0.0001, v);
      const nextV = sample(u, v + 0.0001);
      const a = nextU.map((value, i) => value - point[i]);
      const b = nextV.map((value, i) => value - point[i]);
      const normal = [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
      ];
      const magnitude = Math.hypot(...normal) || 1;
      vertices.push(
        ...point.slice(0, 3),
        ...normal.map((value) => value / magnitude),
        ...point.slice(3),
      );
      if (column < columns && row < rows) {
        const start = row * (columns + 1) + column;
        indices.push(
          start,
          start + 1,
          start + columns + 1,
          start + 1,
          start + columns + 2,
          start + columns + 1,
        );
      }
    }
  }
  const vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  const indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint16Array(indices),
    gl.STATIC_DRAW,
  );
  return { vertexBuffer, indexBuffer, count: indices.length, tissue, selected };
}

const signedPower = (value, exponent) =>
  Math.sign(value) * Math.pow(Math.abs(value), exponent);
const clamp = (value) => Math.max(0, Math.min(1, value));
const smooth = (value) => {
  const x = clamp(value);
  return x * x * (3 - 2 * x);
};
const views = [
  { yaw: -0.28, pitch: 0.08, zoom: 3.7, shiftX: 0 },
  { yaw: -0.08, pitch: 0.04, zoom: 5.4, shiftX: -0.25 },
  { yaw: 0.09, pitch: 0.04, zoom: 7, shiftX: -0.47 },
  { yaw: 0.18, pitch: 0.08, zoom: 4.7, shiftX: -0.16 },
  { yaw: -0.05, pitch: 0.03, zoom: 3.6, shiftX: 0 },
  { yaw: 0.3, pitch: 0.1, zoom: 3.4, shiftX: 0 },
];

export function createEnamelRenderer(canvas) {
  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  if (!gl) return null;
  const program = gl.createProgram();
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, vertexSource));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fragmentSource));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS))
    throw new Error("WebGL program link failed");
  gl.useProgram(program);
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  const names = [
    "yaw",
    "pitch",
    "zoom",
    "shiftX",
    "aspect",
    "tissue",
    "selected",
    "detection",
    "contrast",
    "sweep",
  ];
  const uniforms = Object.fromEntries(
    names.map((name) => [name, gl.getUniformLocation(program, name)]),
  );
  const attributes = ["position", "normal", "local"].map((name) =>
    gl.getAttribLocation(program, name),
  );
  const models = [];
  const teeth = [
    [-3.47, 0.6, 0.85, -0.75, -0.43],
    [-2.21, 0.62, 0.9, -0.36, -0.27],
    [-0.8, 0.74, 1.01, -0.03, -0.08],
    [0.7, 0.74, 1.0, 0, 0.06],
    [2.13, 0.61, 0.87, -0.32, 0.24],
    [3.36, 0.58, 0.91, -0.72, 0.42],
  ];
  teeth.forEach(([x, width, height, z, rotation], index) => {
    models.push(
      makeSurface(
        gl,
        (u, v) => {
          const angle = (u - 0.5) * Math.PI * 2;
          const latitude = (v - 0.5) * Math.PI * 0.999;
          const y = signedPower(Math.sin(latitude), 0.7);
          const radius = Math.pow(Math.max(0.00001, Math.cos(latitude)), 0.56);
          const localX =
            width *
            radius *
            (1 - 0.12 * y) *
            signedPower(Math.sin(angle), 0.86);
          let localZ = 0.48 * radius * signedPower(Math.cos(angle), 0.78);
          const localY = y * height + 0.04 * localX * localX;
          localZ +=
            0.018 *
              Math.cos(localX * 7) *
              Math.max(0, Math.cos(angle)) *
              (1 - y * y) -
            0.06 * y * y;
          return [
            x + localX * Math.cos(rotation) + localZ * Math.sin(rotation),
            localY,
            z + localZ * Math.cos(rotation) - localX * Math.sin(rotation),
            localX,
            localY,
            localZ,
          ];
        },
        48,
        30,
        0,
        index === 3 ? 1 : 0,
      ),
    );
  });
  models.push(
    makeSurface(
      gl,
      (u, v) => {
        const x = -4.25 + u * 8.5;
        const nearest = teeth.reduce((a, b) =>
          Math.abs(a[0] - x) < Math.abs(b[0] - x) ? a : b,
        );
        const distance = Math.min(1, Math.abs(x - nearest[0]) / nearest[1]);
        const edge =
          0.6 + 0.26 * (1 - distance * distance) - 0.2 * Math.pow(distance, 5);
        const y = edge + v * (1.95 - edge);
        const z = 0.29 - 0.044 * x * x + 0.1 * Math.sin(v * Math.PI) - 0.05 * v;
        return [x, y, z, x, y, z];
      },
      110,
      16,
      1,
      0,
    ),
  );

  let quality = Math.min(devicePixelRatio, 1.25);
  let logicalWidth = 1;
  let logicalHeight = 1;
  function resize() {
    logicalWidth = Math.max(1, canvas.clientWidth);
    logicalHeight = Math.max(1, canvas.clientHeight);
    const scale = Math.min(quality, 900 / logicalWidth, 700 / logicalHeight);
    const width = Math.max(1, Math.round(logicalWidth * scale));
    const height = Math.max(1, Math.round(logicalHeight * scale));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
  }
  function draw(progress, options = {}) {
    if (gl.isContextLost()) return;
    resize();
    const index = Math.min(4, Math.floor(progress));
    const fraction = smooth(progress - index);
    const start = views[index];
    const end = views[index + 1];
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    for (const name of ["yaw", "pitch", "zoom", "shiftX"]) {
      gl.uniform1f(
        uniforms[name],
        start[name] + (end[name] - start[name]) * fraction,
      );
    }
    const aspect = logicalWidth / logicalHeight;
    // Keep the model inside narrow viewports without stretching its anatomy.
    const fittedZoom =
      (start.zoom + (end.zoom - start.zoom) * fraction) *
      Math.min(1, aspect / 1.15);
    gl.uniform1f(uniforms.zoom, fittedZoom);
    gl.uniform1f(uniforms.aspect, aspect);
    const mask = (options.maskAmount ?? 1) * smooth((progress - 1.35) / 0.65);
    gl.uniform1f(uniforms.detection, mask);
    gl.uniform1f(
      uniforms.contrast,
      options.contrast === false
        ? 0
        : smooth(progress) * (1 - smooth(progress - 1)),
    );
    gl.uniform1f(uniforms.sweep, -2 + 4 * fraction);
    for (const model of models) {
      gl.bindBuffer(gl.ARRAY_BUFFER, model.vertexBuffer);
      attributes.forEach((attribute, i) => {
        gl.enableVertexAttribArray(attribute);
        gl.vertexAttribPointer(attribute, 3, gl.FLOAT, false, 36, i * 12);
      });
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.indexBuffer);
      gl.uniform1f(uniforms.tissue, model.tissue);
      gl.uniform1f(uniforms.selected, model.selected);
      gl.drawElements(gl.TRIANGLES, model.count, gl.UNSIGNED_SHORT, 0);
    }
  }
  return {
    draw,
    lowerQuality() {
      quality = Math.max(0.65, quality * 0.8);
    },
    getResolution() {
      return [canvas.width, canvas.height];
    },
  };
}
