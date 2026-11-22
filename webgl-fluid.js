/*
MIT License

Copyright (c) 2017 Pavel Dobryakov
Adapted by Thomas Kabalin

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

"use strict";

// Simulation section

const DEFAULT_CONFIG = {
  SIM_RESOLUTION: 128,
  DYE_RESOLUTION: 768,
  CAPTURE_RESOLUTION: 512,
  DENSITY_DISSIPATION: 0.72,
  VELOCITY_DISSIPATION: 0.55,
  PRESSURE: 0.25,
  PRESSURE_ITERATIONS: 16,
  CURL: 18,
  SPLAT_RADIUS: 0.22,
  SPLAT_FORCE: 6200,
  SHADING: true,
  COLORFUL: true,
  COLOR_UPDATE_SPEED: 10,
  PAUSED: false,
  BACK_COLOR: { r: 255, g: 255, b: 255 },
  TRANSPARENT: false,
  BLOOM: false,
  BLOOM_ITERATIONS: 6,
  BLOOM_RESOLUTION: 256,
  BLOOM_INTENSITY: 0.8,
  BLOOM_THRESHOLD: 0.6,
  BLOOM_SOFT_KNEE: 0.7,
  SUNRAYS: true,
  SUNRAYS_RESOLUTION: 128,
  SUNRAYS_WEIGHT: 1.0,
  RANDOM_COLORS: true,
  SPLAT_HUE: 0,
};

function isMobileDevice() {
  return (
    /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent || ""
    ) ||
    (window.matchMedia &&
      window.matchMedia("(pointer: coarse)").matches &&
      window.innerWidth <= 1024)
  );
}

function scaleByPixelRatio(input) {
  const maxDpr = isMobileDevice() ? 1.5 : 2;
  const pixelRatio = Math.min(window.devicePixelRatio || 1, maxDpr);
  return Math.floor(input * pixelRatio);
}

const canvas =
  document.getElementById("fluid") || document.getElementsByTagName("canvas")[0];

function resizeCanvas() {
  if (!canvas) return false;
  let width = scaleByPixelRatio(canvas.clientWidth || window.innerWidth || 1);
  let height = scaleByPixelRatio(
    canvas.clientHeight || window.innerHeight || 1
  );
  width = Math.max(2, width);
  height = Math.max(2, height);
  if (canvas.width != width || canvas.height != height) {
    canvas.width = width;
    canvas.height = height;
    return true;
  }
  return false;
}

function testRenderTextureFormat(gl, internalFormat, format, type) {
  let texture = null;
  let fbo = null;
  try {
    texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      internalFormat,
      4,
      4,
      0,
      format,
      type,
      null
    );

    fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      texture,
      0
    );

    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    return status === gl.FRAMEBUFFER_COMPLETE;
  } catch {
    return false;
  } finally {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
    if (fbo) gl.deleteFramebuffer(fbo);
    if (texture) gl.deleteTexture(texture);
  }
}

function resolveSupportedFormat(gl, internalFormat, format, type, isWebGL2) {
  if (!testRenderTextureFormat(gl, internalFormat, format, type)) {
    if (isWebGL2) {
      switch (internalFormat) {
        case gl.R16F:
          return resolveSupportedFormat(gl, gl.RG16F, gl.RG, type, true);
        case gl.RG16F:
          return resolveSupportedFormat(gl, gl.RGBA16F, gl.RGBA, type, true);
        default:
          return null;
      }
    }
    return null;
  }
  return { internalFormat, format };
}

function inspectGLContext(gl, isWebGL2) {
  if (!gl) return null;
  let halfFloatTexType;
  let supportLinearFiltering = false;
  let formatRGBA;
  let formatRG;
  let formatR;

  if (isWebGL2) {
    // Request BOTH float and half-float color buffer extensions (critical for iOS Safari & Android Adreno/Mali GPUs)
    gl.getExtension("EXT_color_buffer_float");
    gl.getExtension("EXT_color_buffer_half_float");
    supportLinearFiltering = Boolean(
      gl.getExtension("OES_texture_float_linear") ||
        gl.getExtension("OES_texture_half_float_linear")
    );
    halfFloatTexType = gl.HALF_FLOAT;
    formatRGBA = resolveSupportedFormat(
      gl,
      gl.RGBA16F,
      gl.RGBA,
      halfFloatTexType,
      true
    );
    formatRG = resolveSupportedFormat(
      gl,
      gl.RG16F,
      gl.RG,
      halfFloatTexType,
      true
    );
    formatR = resolveSupportedFormat(
      gl,
      gl.R16F,
      gl.RED,
      halfFloatTexType,
      true
    );
  } else {
    const halfFloat = gl.getExtension("OES_texture_half_float");
    if (!halfFloat) return null;
    gl.getExtension("EXT_color_buffer_half_float");
    gl.getExtension("WEBGL_color_buffer_float");
    supportLinearFiltering = Boolean(
      gl.getExtension("OES_texture_half_float_linear")
    );
    halfFloatTexType = halfFloat.HALF_FLOAT_OES;
    formatRGBA = resolveSupportedFormat(
      gl,
      gl.RGBA,
      gl.RGBA,
      halfFloatTexType,
      false
    );
    formatRG = formatRGBA;
    formatR = formatRGBA;
  }

  if (!formatRGBA || !formatRG || !formatR) return null;

  return {
    isWebGL2,
    formatRGBA,
    formatRG,
    formatR,
    halfFloatTexType,
    supportLinearFiltering,
  };
}

function probeBestWebGLBackend() {
  const params = {
    alpha: true,
    depth: false,
    stencil: false,
    antialias: false,
    preserveDrawingBuffer: false,
    powerPreference: "high-performance",
  };

  for (const mode of ["webgl2", "webgl"]) {
    try {
      const probe = document.createElement("canvas");
      probe.width = 4;
      probe.height = 4;
      const gl =
        mode === "webgl2"
          ? probe.getContext("webgl2", params)
          : probe.getContext("webgl", params) ||
            probe.getContext("experimental-webgl", params);
      const ext = inspectGLContext(gl, mode === "webgl2");
      if (ext) {
        try {
          gl.getExtension("WEBGL_lose_context")?.loseContext();
        } catch {}
        return mode;
      }
      if (gl) {
        try {
          gl.getExtension("WEBGL_lose_context")?.loseContext();
        } catch {}
      }
    } catch {}
  }
  return "canvas2d";
}

// Silky 60fps Canvas 2D multi-color fluid wave fallback if a device/webview denies WebGL half-float FBOs
function runCanvas2DFallback(targetCanvas) {
  const ctx = targetCanvas.getContext("2d", { alpha: false });
  if (!ctx) return;

  const labEl = document.getElementById("lab");
  let visible = true;
  let frames = 0;
  let splats = 0;
  const plumes = [];
  const palette = [
    [16, 214, 186],
    [66, 133, 244],
    [155, 114, 255],
    [244, 72, 162],
    [255, 126, 78],
    [24, 198, 134],
    [104, 92, 255],
  ];
  let hueCursor = 0;

  function resize2D() {
    resizeCanvas();
  }

  function addPlume(nx, ny, vx, vy, radiusScale = 1) {
    const col = palette[hueCursor++ % palette.length];
    const base = Math.min(targetCanvas.width, targetCanvas.height);
    plumes.push({
      x: nx * targetCanvas.width,
      y: ny * targetCanvas.height,
      vx: vx * base * 0.008,
      vy: vy * base * 0.008,
      r: base * (0.14 + Math.random() * 0.14) * radiusScale,
      alpha: 0.44,
      life: 0,
      maxLife: 135 + Math.random() * 65,
      col,
      swirl: (Math.random() - 0.5) * 0.045,
    });
    if (plumes.length > 48) plumes.splice(0, plumes.length - 48);
    splats++;
  }

  function burstOpening() {
    const seeds = [
      [0.18, 0.22, 1.4, 0.7],
      [0.82, 0.24, -1.3, 0.8],
      [0.24, 0.78, 1.2, -0.9],
      [0.78, 0.74, -1.2, -0.8],
      [0.5, 0.16, 0.4, 1.2],
      [0.5, 0.84, -0.5, -1.1],
      [0.12, 0.52, 1.5, -0.2],
      [0.88, 0.48, -1.5, 0.3],
    ];
    seeds.forEach(([x, y, vx, vy], idx) => {
      setTimeout(() => addPlume(x, y, vx, vy, 1.15), idx * 95);
    });
  }

  resize2D();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);
  burstOpening();

  const onPoint = (clientX, clientY, scale = 0.85) => {
    const rect = targetCanvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const nx = (clientX - rect.left) / rect.width;
    const ny = (clientY - rect.top) / rect.height;
    addPlume(
      nx,
      ny,
      (Math.random() - 0.5) * 2.2,
      (Math.random() - 0.5) * 2.2,
      scale
    );
  };

  targetCanvas.addEventListener(
    "mousemove",
    (e) => onPoint(e.clientX, e.clientY, 0.7),
    { passive: true }
  );
  targetCanvas.addEventListener(
    "touchstart",
    (e) => {
      for (const t of e.targetTouches) onPoint(t.clientX, t.clientY, 1.05);
    },
    { passive: true }
  );
  targetCanvas.addEventListener(
    "touchmove",
    (e) => {
      for (const t of e.targetTouches) onPoint(t.clientX, t.clientY, 0.8);
    },
    { passive: true }
  );

  if (labEl && "IntersectionObserver" in window) {
    new IntersectionObserver(
      (entries) => {
        visible = Boolean(entries[0]?.isIntersecting);
      },
      { threshold: 0.01 }
    ).observe(labEl);
  }

  let ambientTimer = 0;
  let lastNow = performance.now();

  function tick(now) {
    requestAnimationFrame(tick);
    if (!visible || document.hidden) {
      lastNow = now;
      return;
    }
    const dt = Math.min(0.05, Math.max(0.008, (now - lastNow) / 1000));
    lastNow = now;
    if (resizeCanvas()) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);
    }

    ambientTimer += dt;
    if (ambientTimer >= 1.6) {
      ambientTimer = 0;
      const angle = Math.random() * Math.PI * 2;
      addPlume(
        0.15 + Math.random() * 0.7,
        0.15 + Math.random() * 0.7,
        Math.cos(angle) * 1.4,
        Math.sin(angle) * 1.4,
        1.0
      );
    }

    ctx.fillStyle = "rgba(255,255,255,0.045)";
    ctx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);

    for (let i = plumes.length - 1; i >= 0; i--) {
      const p = plumes[i];
      p.life += 1;
      const progress = p.life / p.maxLife;
      if (progress >= 1) {
        plumes.splice(i, 1);
        continue;
      }
      const cos = Math.cos(p.swirl);
      const sin = Math.sin(p.swirl);
      const nvx = p.vx * cos - p.vy * sin;
      const nvy = p.vx * sin + p.vy * cos;
      p.vx = nvx * 0.988;
      p.vy = nvy * 0.988;
      p.x += p.vx;
      p.y += p.vy;
      p.r *= 1.003;

      const fade = Math.sin(progress * Math.PI) * p.alpha;
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      grad.addColorStop(
        0,
        `rgba(${p.col[0]},${p.col[1]},${p.col[2]},${fade.toFixed(3)})`
      );
      grad.addColorStop(
        0.55,
        `rgba(${p.col[0]},${p.col[1]},${p.col[2]},${(fade * 0.42).toFixed(3)})`
      );
      grad.addColorStop(1, `rgba(${p.col[0]},${p.col[1]},${p.col[2]},0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    frames++;
    window.__fluidEngine = {
      mode: "canvas2d",
      frames,
      splats,
      active: true,
      triggerBurst: burstOpening,
    };
  }

  requestAnimationFrame(tick);
}

if (canvas) {
  resizeCanvas();
  const initialConfig = Object.assign({}, DEFAULT_CONFIG, {
    BACK_COLOR: Object.assign({}, DEFAULT_CONFIG.BACK_COLOR),
  });
  const backend = probeBestWebGLBackend();
  if (backend === "canvas2d") {
    runCanvas2DFallback(canvas);
  } else {
    try {
      runSimulation(initialConfig, backend);
    } catch (err) {
      console.warn("[fluid] WebGL init error, falling back to Canvas2D:", err);
      runCanvas2DFallback(canvas);
    }
  }
}

function runSimulation(config, preferredBackend) {
  function pointerPrototype() {
    this.id = -1;
    this.texcoordX = 0;
    this.texcoordY = 0;
    this.prevTexcoordX = 0;
    this.prevTexcoordY = 0;
    this.deltaX = 0;
    this.deltaY = 0;
    this.down = false;
    this.moved = false;
    this.color = [30, 0, 300];
  }

  let pointers = [];
  let splatStack = [];
  pointers.push(new pointerPrototype());

  const contextResult = getWebGLContext(canvas, preferredBackend);
  if (!contextResult) {
    throw new Error("WebGL half-float context unavailable");
  }
  const { gl, ext } = contextResult;
  const mobile = isMobile();
  let isSoftwareGPU = false;
  try {
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    const rendererStr = String(
      (dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : "") ||
        gl.getParameter(gl.RENDERER) ||
        ""
    );
    isSoftwareGPU =
      /SwiftShader|llvmpipe|Software|Basic Render|Mesa OffScreen|ANGLE.*SwiftShader/i.test(
        rendererStr
      );
  } catch {}

  if (mobile) {
    config.SIM_RESOLUTION = 96;
    config.DYE_RESOLUTION = 512;
    config.PRESSURE_ITERATIONS = 14;
    config.SPLAT_RADIUS = 0.25;
    config.SUNRAYS_RESOLUTION = 128;
    // Keep sunrays off if native R16F or linear filtering is absent on mobile GPUs
    if (!ext.supportLinearFiltering || !ext.isWebGL2) {
      config.SUNRAYS = false;
    }
  }
  if (isSoftwareGPU) {
    config.SIM_RESOLUTION = 64;
    config.DYE_RESOLUTION = 384;
    config.PRESSURE_ITERATIONS = 10;
    config.SUNRAYS = false;
  }
  if (!ext.supportLinearFiltering) {
    config.DYE_RESOLUTION = 512;
    config.SHADING = false;
    config.BLOOM = false;
    config.SUNRAYS = false;
  }

  function getWebGLContext(canvas, backend) {
    const params = {
      alpha: true,
      depth: false,
      stencil: false,
      antialias: false,
      preserveDrawingBuffer: false,
      powerPreference: "high-performance",
    };

    let gl = null;
    let isWebGL2 = false;
    if (backend === "webgl2") {
      gl = canvas.getContext("webgl2", params);
      isWebGL2 = !!gl;
    }
    if (!gl) {
      gl =
        canvas.getContext("webgl", params) ||
        canvas.getContext("experimental-webgl", params);
      isWebGL2 = false;
    }
    if (!gl) return null;

    const ext = inspectGLContext(gl, isWebGL2);
    if (!ext) return null;

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    return { gl, ext };
  }

  function isMobile() {
    return isMobileDevice();
  }

  function captureScreenshot() {
    let res = getResolution(config.CAPTURE_RESOLUTION);
    let target = createFBO(
      res.width,
      res.height,
      ext.formatRGBA.internalFormat,
      ext.formatRGBA.format,
      ext.halfFloatTexType,
      gl.NEAREST
    );
    render(target);

    let texture = framebufferToTexture(target);
    texture = normalizeTexture(texture, target.width, target.height);

    let captureCanvas = textureToCanvas(texture, target.width, target.height);
    let datauri = captureCanvas.toDataURL();
    downloadURI("fluid.png", datauri);
    URL.revokeObjectURL(datauri);
  }

  function framebufferToTexture(target) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
    let length = target.width * target.height * 4;
    let texture = new Float32Array(length);
    gl.readPixels(
      0,
      0,
      target.width,
      target.height,
      gl.RGBA,
      gl.FLOAT,
      texture
    );
    return texture;
  }

  function normalizeTexture(texture, width, height) {
    let result = new Uint8Array(texture.length);
    let id = 0;
    for (let i = height - 1; i >= 0; i--) {
      for (let j = 0; j < width; j++) {
        let nid = i * width * 4 + j * 4;
        result[nid + 0] = clamp01(texture[id + 0]) * 255;
        result[nid + 1] = clamp01(texture[id + 1]) * 255;
        result[nid + 2] = clamp01(texture[id + 2]) * 255;
        result[nid + 3] = clamp01(texture[id + 3]) * 255;
        id += 4;
      }
    }
    return result;
  }

  function clamp01(input) {
    return Math.min(Math.max(input, 0), 1);
  }

  function textureToCanvas(texture, width, height) {
    let captureCanvas = document.createElement("canvas");
    let ctx = captureCanvas.getContext("2d");
    captureCanvas.width = width;
    captureCanvas.height = height;

    let imageData = ctx.createImageData(width, height);
    imageData.data.set(texture);
    ctx.putImageData(imageData, 0, 0);

    return captureCanvas;
  }

  function downloadURI(filename, uri) {
    let link = document.createElement("a");
    link.download = filename;
    link.href = uri;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  class Material {
    constructor(vertexShader, fragmentShaderSource) {
      this.vertexShader = vertexShader;
      this.fragmentShaderSource = fragmentShaderSource;
      this.programs = [];
      this.activeProgram = null;
      this.uniforms = [];
    }

    setKeywords(keywords) {
      let hash = 0;
      for (let i = 0; i < keywords.length; i++) hash += hashCode(keywords[i]);

      let program = this.programs[hash];
      if (program == null) {
        let fragmentShader = compileShader(
          gl.FRAGMENT_SHADER,
          this.fragmentShaderSource,
          keywords
        );
        program = createProgram(this.vertexShader, fragmentShader);
        this.programs[hash] = program;
      }

      if (program == this.activeProgram) return;

      this.uniforms = getUniforms(program);
      this.activeProgram = program;
    }

    bind() {
      gl.useProgram(this.activeProgram);
    }
  }

  class Program {
    constructor(vertexShader, fragmentShader) {
      this.uniforms = {};
      this.program = createProgram(vertexShader, fragmentShader);
      this.uniforms = getUniforms(this.program);
    }

    bind() {
      gl.useProgram(this.program);
    }
  }

  function createProgram(vertexShader, fragmentShader) {
    let program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      console.trace(gl.getProgramInfoLog(program));

    return program;
  }

  function getUniforms(program) {
    let uniforms = [];
    let uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < uniformCount; i++) {
      let uniformName = gl.getActiveUniform(program, i).name;
      uniforms[uniformName] = gl.getUniformLocation(program, uniformName);
    }
    return uniforms;
  }

  function compileShader(type, source, keywords) {
    source = addKeywords(source, keywords);

    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
      console.trace(gl.getShaderInfoLog(shader));

    return shader;
  }

  function addKeywords(source, keywords) {
    if (keywords == null) return source;
    let keywordsString = "";
    keywords.forEach((keyword) => {
      keywordsString += "#define " + keyword + "\n";
    });
    return keywordsString + source;
  }

  const baseVertexShader = compileShader(
    gl.VERTEX_SHADER,
    `
    precision highp float;

    attribute vec2 aPosition;
    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform vec2 texelSize;

    void main () {
        vUv = aPosition * 0.5 + 0.5;
        vL = vUv - vec2(texelSize.x, 0.0);
        vR = vUv + vec2(texelSize.x, 0.0);
        vT = vUv + vec2(0.0, texelSize.y);
        vB = vUv - vec2(0.0, texelSize.y);
        gl_Position = vec4(aPosition, 0.0, 1.0);
    }
`
  );

  const blurVertexShader = compileShader(
    gl.VERTEX_SHADER,
    `
    precision highp float;

    attribute vec2 aPosition;
    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    uniform vec2 texelSize;

    void main () {
        vUv = aPosition * 0.5 + 0.5;
        float offset = 1.33333333;
        vL = vUv - texelSize * offset;
        vR = vUv + texelSize * offset;
        gl_Position = vec4(aPosition, 0.0, 1.0);
    }
`
  );

  const blurShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
    precision mediump float;
    precision mediump sampler2D;

    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    uniform sampler2D uTexture;

    void main () {
        vec4 sum = texture2D(uTexture, vUv) * 0.29411764;
        sum += texture2D(uTexture, vL) * 0.35294117;
        sum += texture2D(uTexture, vR) * 0.35294117;
        gl_FragColor = sum;
    }
`
  );

  const copyShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
    precision mediump float;
    precision mediump sampler2D;

    varying highp vec2 vUv;
    uniform sampler2D uTexture;

    void main () {
        gl_FragColor = texture2D(uTexture, vUv);
    }
`
  );

  const clearShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
    precision mediump float;
    precision mediump sampler2D;

    varying highp vec2 vUv;
    uniform sampler2D uTexture;
    uniform float value;

    void main () {
        gl_FragColor = value * texture2D(uTexture, vUv);
    }
`
  );

  const colorShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
    precision mediump float;

    uniform vec4 color;

    void main () {
        gl_FragColor = color;
    }
`
  );

  const checkerboardShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
    precision highp float;
    precision highp sampler2D;

    varying vec2 vUv;
    uniform sampler2D uTexture;
    uniform float aspectRatio;

    #define SCALE 25.0

    void main () {
        vec2 uv = floor(vUv * SCALE * vec2(aspectRatio, 1.0));
        float v = mod(uv.x + uv.y, 2.0);
        v = v * 0.1 + 0.8;
        gl_FragColor = vec4(vec3(v), 1.0);
    }
`
  );

  const displayShaderSource = `
    precision highp float;
    precision highp sampler2D;

    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform sampler2D uTexture;
    uniform sampler2D uBloom;
    uniform sampler2D uSunrays;
    uniform sampler2D uDithering;
    uniform vec2 ditherScale;
    uniform vec2 texelSize;

    vec3 linearToGamma (vec3 color) {
        color = max(color, vec3(0));
        return max(1.055 * pow(color, vec3(0.416666667)) - 0.055, vec3(0));
    }

    void main () {
        vec3 c = texture2D(uTexture, vUv).rgb;

    #ifdef SHADING
        vec3 lc = texture2D(uTexture, vL).rgb;
        vec3 rc = texture2D(uTexture, vR).rgb;
        vec3 tc = texture2D(uTexture, vT).rgb;
        vec3 bc = texture2D(uTexture, vB).rgb;

        float dx = length(rc) - length(lc);
        float dy = length(tc) - length(bc);

        vec3 n = normalize(vec3(dx, dy, length(texelSize)));
        vec3 l = vec3(0.0, 0.0, 1.0);

        float diffuse = clamp(dot(n, l) + 0.7, 0.7, 1.0);
        c *= diffuse;
    #endif

    #ifdef BLOOM
        vec3 bloom = texture2D(uBloom, vUv).rgb;
    #endif

    #ifdef SUNRAYS
        float sunrays = texture2D(uSunrays, vUv).r;
        c *= sunrays;
    #ifdef BLOOM
        bloom *= sunrays;
    #endif
    #endif

    #ifdef BLOOM
        float noise = texture2D(uDithering, vUv * ditherScale).r;
        noise = noise * 2.0 - 1.0;
        bloom += noise / 255.0;
        bloom = linearToGamma(bloom);
        c += bloom;
    #endif

        float a = max(c.r, max(c.g, c.b));
        gl_FragColor = vec4(c, a);
    }
`;

  const bloomPrefilterShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
    precision mediump float;
    precision mediump sampler2D;

    varying vec2 vUv;
    uniform sampler2D uTexture;
    uniform vec3 curve;
    uniform float threshold;

    void main () {
        vec3 c = texture2D(uTexture, vUv).rgb;
        float br = max(c.r, max(c.g, c.b));
        float rq = clamp(br - curve.x, 0.0, curve.y);
        rq = curve.z * rq * rq;
        c *= max(rq, br - threshold) / max(br, 0.0001);
        gl_FragColor = vec4(c, 0.0);
    }
`
  );

  const bloomBlurShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
    precision mediump float;
    precision mediump sampler2D;

    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform sampler2D uTexture;

    void main () {
        vec4 sum = vec4(0.0);
        sum += texture2D(uTexture, vL);
        sum += texture2D(uTexture, vR);
        sum += texture2D(uTexture, vT);
        sum += texture2D(uTexture, vB);
        sum *= 0.25;
        gl_FragColor = sum;
    }
`
  );

  const bloomFinalShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
    precision mediump float;
    precision mediump sampler2D;

    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform sampler2D uTexture;
    uniform float intensity;

    void main () {
        vec4 sum = vec4(0.0);
        sum += texture2D(uTexture, vL);
        sum += texture2D(uTexture, vR);
        sum += texture2D(uTexture, vT);
        sum += texture2D(uTexture, vB);
        sum *= 0.25;
        gl_FragColor = sum * intensity;
    }
`
  );

  const sunraysMaskShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
    precision highp float;
    precision highp sampler2D;

    varying vec2 vUv;
    uniform sampler2D uTexture;

    void main () {
        vec4 c = texture2D(uTexture, vUv);
        float br = max(c.r, max(c.g, c.b));
        c.a = 1.0 - min(max(br * 20.0, 0.0), 0.8);
        gl_FragColor = c;
    }
`
  );

  const sunraysShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
    precision highp float;
    precision highp sampler2D;

    varying vec2 vUv;
    uniform sampler2D uTexture;
    uniform float weight;

    #define ITERATIONS 16

    void main () {
        float Density = 0.3;
        float Decay = 0.95;
        float Exposure = 0.7;

        vec2 coord = vUv;
        vec2 dir = vUv - 0.5;

        dir *= 1.0 / float(ITERATIONS) * Density;
        float illuminationDecay = 1.0;

        float color = texture2D(uTexture, vUv).a;

        for (int i = 0; i < ITERATIONS; i++)
        {
            coord -= dir;
            float col = texture2D(uTexture, coord).a;
            color += col * illuminationDecay * weight;
            illuminationDecay *= Decay;
        }

        gl_FragColor = vec4(color * Exposure, 0.0, 0.0, 1.0);
    }
`
  );

  const splatShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
    precision highp float;
    precision highp sampler2D;

    varying vec2 vUv;
    uniform sampler2D uTarget;
    uniform float aspectRatio;
    uniform vec3 color;
    uniform vec2 point;
    uniform float radius;

    void main () {
        vec2 p = vUv - point.xy;
        p.x *= aspectRatio;
        vec3 splat = exp(-dot(p, p) / radius) * color;
        vec3 base = texture2D(uTarget, vUv).xyz;
        gl_FragColor = vec4(base + splat, 1.0);
    }
`
  );

  const advectionShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
    precision highp float;
    precision highp sampler2D;

    varying vec2 vUv;
    uniform sampler2D uVelocity;
    uniform sampler2D uSource;
    uniform vec2 texelSize;
    uniform vec2 dyeTexelSize;
    uniform float dt;
    uniform float dissipation;

    vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
        vec2 st = uv / tsize - 0.5;

        vec2 iuv = floor(st);
        vec2 fuv = fract(st);

        vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
        vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
        vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
        vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);

        return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
    }

    void main () {
    #ifdef MANUAL_FILTERING
        vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;
        vec4 result = bilerp(uSource, coord, dyeTexelSize);
    #else
        vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
        vec4 result = texture2D(uSource, coord);
    #endif
        float decay = 1.0 + dissipation * dt;
        gl_FragColor = result / decay;
    }`,
    ext.supportLinearFiltering ? null : ["MANUAL_FILTERING"]
  );

  const divergenceShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
    precision mediump float;
    precision mediump sampler2D;

    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uVelocity;

    void main () {
        float L = texture2D(uVelocity, vL).x;
        float R = texture2D(uVelocity, vR).x;
        float T = texture2D(uVelocity, vT).y;
        float B = texture2D(uVelocity, vB).y;

        vec2 C = texture2D(uVelocity, vUv).xy;
        if (vL.x < 0.0) { L = -C.x; }
        if (vR.x > 1.0) { R = -C.x; }
        if (vT.y > 1.0) { T = -C.y; }
        if (vB.y < 0.0) { B = -C.y; }

        float div = 0.5 * (R - L + T - B);
        gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
    }
`
  );

  const curlShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
    precision mediump float;
    precision mediump sampler2D;

    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uVelocity;

    void main () {
        float L = texture2D(uVelocity, vL).y;
        float R = texture2D(uVelocity, vR).y;
        float T = texture2D(uVelocity, vT).x;
        float B = texture2D(uVelocity, vB).x;
        float vorticity = R - L - T + B;
        gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
    }
`
  );

  const vorticityShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
    precision highp float;
    precision highp sampler2D;

    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform sampler2D uVelocity;
    uniform sampler2D uCurl;
    uniform float curl;
    uniform float dt;

    void main () {
        float L = texture2D(uCurl, vL).x;
        float R = texture2D(uCurl, vR).x;
        float T = texture2D(uCurl, vT).x;
        float B = texture2D(uCurl, vB).x;
        float C = texture2D(uCurl, vUv).x;

        vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
        force /= length(force) + 0.0001;
        force *= curl * C;
        force.y *= -1.0;

        vec2 velocity = texture2D(uVelocity, vUv).xy;
        velocity += force * dt;
        velocity = min(max(velocity, -1000.0), 1000.0);
        gl_FragColor = vec4(velocity, 0.0, 1.0);
    }
`
  );

  const pressureShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
    precision mediump float;
    precision mediump sampler2D;

    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uPressure;
    uniform sampler2D uDivergence;

    void main () {
        float L = texture2D(uPressure, vL).x;
        float R = texture2D(uPressure, vR).x;
        float T = texture2D(uPressure, vT).x;
        float B = texture2D(uPressure, vB).x;
        float C = texture2D(uPressure, vUv).x;
        float divergence = texture2D(uDivergence, vUv).x;
        float pressure = (L + R + B + T - divergence) * 0.25;
        gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
    }
`
  );

  const gradientSubtractShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
    precision mediump float;
    precision mediump sampler2D;

    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uPressure;
    uniform sampler2D uVelocity;

    void main () {
        float L = texture2D(uPressure, vL).x;
        float R = texture2D(uPressure, vR).x;
        float T = texture2D(uPressure, vT).x;
        float B = texture2D(uPressure, vB).x;
        vec2 velocity = texture2D(uVelocity, vUv).xy;
        velocity.xy -= vec2(R - L, T - B);
        gl_FragColor = vec4(velocity, 0.0, 1.0);
    }
`
  );

  const blit = (() => {
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]),
      gl.STATIC_DRAW
    );
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array([0, 1, 2, 0, 2, 3]),
      gl.STATIC_DRAW
    );
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    return (target, clear = false) => {
      if (target == null) {
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      } else {
        gl.viewport(0, 0, target.width, target.height);
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
      }
      if (clear) {
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
      }
      // CHECK_FRAMEBUFFER_STATUS();
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    };
  })();

  function CHECK_FRAMEBUFFER_STATUS() {
    let status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status != gl.FRAMEBUFFER_COMPLETE)
      console.trace("Framebuffer error: " + status);
  }

  let dye;
  let velocity;
  let divergence;
  let curl;
  let pressure;
  let bloom;
  let bloomFramebuffers = [];
  let sunrays;
  let sunraysTemp;

  let ditheringTexture = createTextureAsync("LDR_LLL1_0.png");

  const blurProgram = new Program(blurVertexShader, blurShader);
  const copyProgram = new Program(baseVertexShader, copyShader);
  const clearProgram = new Program(baseVertexShader, clearShader);
  const colorProgram = new Program(baseVertexShader, colorShader);
  const checkerboardProgram = new Program(baseVertexShader, checkerboardShader);
  const bloomPrefilterProgram = new Program(
    baseVertexShader,
    bloomPrefilterShader
  );
  const bloomBlurProgram = new Program(baseVertexShader, bloomBlurShader);
  const bloomFinalProgram = new Program(baseVertexShader, bloomFinalShader);
  const sunraysMaskProgram = new Program(baseVertexShader, sunraysMaskShader);
  const sunraysProgram = new Program(baseVertexShader, sunraysShader);
  const splatProgram = new Program(baseVertexShader, splatShader);
  const advectionProgram = new Program(baseVertexShader, advectionShader);
  const divergenceProgram = new Program(baseVertexShader, divergenceShader);
  const curlProgram = new Program(baseVertexShader, curlShader);
  const vorticityProgram = new Program(baseVertexShader, vorticityShader);
  const pressureProgram = new Program(baseVertexShader, pressureShader);
  const gradienSubtractProgram = new Program(
    baseVertexShader,
    gradientSubtractShader
  );

  const displayMaterial = new Material(baseVertexShader, displayShaderSource);

  function initFramebuffers() {
    let simRes = getResolution(config.SIM_RESOLUTION);
    let dyeRes = getResolution(config.DYE_RESOLUTION);

    const texType = ext.halfFloatTexType;
    const rgba = ext.formatRGBA;
    const rg = ext.formatRG;
    const r = ext.formatR;
    const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

    gl.disable(gl.BLEND);

    if (dye == null)
      dye = createDoubleFBO(
        dyeRes.width,
        dyeRes.height,
        rgba.internalFormat,
        rgba.format,
        texType,
        filtering
      );
    else
      dye = resizeDoubleFBO(
        dye,
        dyeRes.width,
        dyeRes.height,
        rgba.internalFormat,
        rgba.format,
        texType,
        filtering
      );

    if (velocity == null)
      velocity = createDoubleFBO(
        simRes.width,
        simRes.height,
        rg.internalFormat,
        rg.format,
        texType,
        filtering
      );
    else
      velocity = resizeDoubleFBO(
        velocity,
        simRes.width,
        simRes.height,
        rg.internalFormat,
        rg.format,
        texType,
        filtering
      );

    divergence = createFBO(
      simRes.width,
      simRes.height,
      r.internalFormat,
      r.format,
      texType,
      gl.NEAREST
    );
    curl = createFBO(
      simRes.width,
      simRes.height,
      r.internalFormat,
      r.format,
      texType,
      gl.NEAREST
    );
    pressure = createDoubleFBO(
      simRes.width,
      simRes.height,
      r.internalFormat,
      r.format,
      texType,
      gl.NEAREST
    );

    initBloomFramebuffers();
    initSunraysFramebuffers();
  }

  function initBloomFramebuffers() {
    let res = getResolution(config.BLOOM_RESOLUTION);

    const texType = ext.halfFloatTexType;
    const rgba = ext.formatRGBA;
    const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

    bloom = createFBO(
      res.width,
      res.height,
      rgba.internalFormat,
      rgba.format,
      texType,
      filtering
    );

    bloomFramebuffers.length = 0;
    for (let i = 0; i < config.BLOOM_ITERATIONS; i++) {
      let width = res.width >> (i + 1);
      let height = res.height >> (i + 1);

      if (width < 2 || height < 2) break;

      let fbo = createFBO(
        width,
        height,
        rgba.internalFormat,
        rgba.format,
        texType,
        filtering
      );
      bloomFramebuffers.push(fbo);
    }
  }

  function initSunraysFramebuffers() {
    let res = getResolution(config.SUNRAYS_RESOLUTION);

    const texType = ext.halfFloatTexType;
    const r = ext.formatR;
    const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

    sunrays = createFBO(
      res.width,
      res.height,
      r.internalFormat,
      r.format,
      texType,
      filtering
    );
    sunraysTemp = createFBO(
      res.width,
      res.height,
      r.internalFormat,
      r.format,
      texType,
      filtering
    );
  }

  function clampTextureSize(value) {
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 4096;
    if (!Number.isFinite(value)) return 1;
    return Math.max(1, Math.min(maxTextureSize, Math.round(value)));
  }

  function createFBO(w, h, internalFormat, format, type, param) {
    w = clampTextureSize(w);
    h = clampTextureSize(h);
    gl.activeTexture(gl.TEXTURE0);
    let texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      internalFormat,
      w,
      h,
      0,
      format,
      type,
      null
    );

    let fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      texture,
      0
    );
    gl.viewport(0, 0, w, h);
    gl.clear(gl.COLOR_BUFFER_BIT);

    let texelSizeX = 1.0 / w;
    let texelSizeY = 1.0 / h;

    return {
      texture,
      fbo,
      width: w,
      height: h,
      texelSizeX,
      texelSizeY,
      attach(id) {
        gl.activeTexture(gl.TEXTURE0 + id);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        return id;
      },
    };
  }

  function createDoubleFBO(w, h, internalFormat, format, type, param) {
    let fbo1 = createFBO(w, h, internalFormat, format, type, param);
    let fbo2 = createFBO(w, h, internalFormat, format, type, param);

    return {
      width: w,
      height: h,
      texelSizeX: fbo1.texelSizeX,
      texelSizeY: fbo1.texelSizeY,
      get read() {
        return fbo1;
      },
      set read(value) {
        fbo1 = value;
      },
      get write() {
        return fbo2;
      },
      set write(value) {
        fbo2 = value;
      },
      swap() {
        let temp = fbo1;
        fbo1 = fbo2;
        fbo2 = temp;
      },
    };
  }

  function resizeFBO(target, w, h, internalFormat, format, type, param) {
    let newFBO = createFBO(w, h, internalFormat, format, type, param);
    copyProgram.bind();
    gl.uniform1i(copyProgram.uniforms.uTexture, target.attach(0));
    blit(newFBO);
    return newFBO;
  }

  function resizeDoubleFBO(target, w, h, internalFormat, format, type, param) {
    if (target.width == w && target.height == h) return target;
    target.read = resizeFBO(
      target.read,
      w,
      h,
      internalFormat,
      format,
      type,
      param
    );
    target.write = createFBO(w, h, internalFormat, format, type, param);
    target.width = w;
    target.height = h;
    target.texelSizeX = 1.0 / w;
    target.texelSizeY = 1.0 / h;
    return target;
  }

  function createTextureAsync(url) {
    let texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGB,
      1,
      1,
      0,
      gl.RGB,
      gl.UNSIGNED_BYTE,
      new Uint8Array([255, 255, 255])
    );

    let obj = {
      texture,
      width: 1,
      height: 1,
      attach(id) {
        gl.activeTexture(gl.TEXTURE0 + id);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        return id;
      },
    };

    let image = new Image();
    image.onload = () => {
      obj.width = image.width;
      obj.height = image.height;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
    };
    image.src = url;

    return obj;
  }

  function updateKeywords() {
    let displayKeywords = [];
    if (config.SHADING) displayKeywords.push("SHADING");
    if (config.BLOOM) displayKeywords.push("BLOOM");
    if (config.SUNRAYS) displayKeywords.push("SUNRAYS");
    displayMaterial.setKeywords(displayKeywords);
  }

  const labSection = document.getElementById("lab");
  let isLabVisible = true;
  let contextLost = false;
  let renderedFrames = 0;
  let totalSplats = 0;
  let ambientTimer = 0;
  let ambientPhase = 0;
  let lastInteractionAt = 0;
  let colorCycleIdx = 0;
  const vividHues = [0.47, 0.58, 0.74, 0.89, 0.04, 0.36, 0.64, 0.96, 0.14];

  function generateVibrantColor(hueOverride) {
    const hue =
      typeof hueOverride === "number"
        ? hueOverride
        : config.RANDOM_COLORS
        ? (vividHues[colorCycleIdx++ % vividHues.length] +
            (Math.random() - 0.5) * 0.06 +
            1) %
          1
        : config.SPLAT_HUE;
    const c = HSVtoRGB(hue, 0.95, 1.0);
    c.r *= 0.20;
    c.g *= 0.20;
    c.b *= 0.20;
    return c;
  }

  function emitDirectionalWave(x, y, dx, dy, intensity = 6.5, hueOverride) {
    const color = generateVibrantColor(hueOverride);
    color.r *= intensity;
    color.g *= intensity;
    color.b *= intensity;
    splat(x, y, dx, dy, color);
    totalSplats++;
  }

  function emitOpeningChoreography() {
    // Frame 0 immediate lush multi-color bloom around viewport edges & diagonals
    const immediateSeeds = [
      [0.14, 0.82, 540, -340, 0.47],
      [0.86, 0.78, -520, -300, 0.74],
      [0.18, 0.20, 520, 340, 0.89],
      [0.82, 0.22, -520, 320, 0.58],
      [0.50, 0.88, 280, -480, 0.04],
      [0.50, 0.14, -260, 480, 0.36],
      [0.08, 0.50, 620, 90, 0.64],
      [0.92, 0.50, -620, -90, 0.96],
    ];
    immediateSeeds.forEach(([x, y, dx, dy, hue]) =>
      emitDirectionalWave(x, y, dx, dy, 6.2, hue)
    );
    // Pre-advect a few micro-steps so colors already curl like liquid silk on Frame 1
    for (let i = 0; i < 6; i++) {
      step(0.016);
    }

    // Smooth staggered ribbon sweeps across the first ~1s so colors open like liquid silk
    const staggeredWaves = [
      { delay: 220, x: 0.24, y: 0.72, dx: 480, dy: -220, hue: 0.56 },
      { delay: 260, x: 0.76, y: 0.30, dx: -480, dy: 240, hue: 0.86 },
      { delay: 540, x: 0.72, y: 0.74, dx: -420, dy: -280, hue: 0.46 },
      { delay: 580, x: 0.28, y: 0.26, dx: 440, dy: 280, hue: 0.06 },
      { delay: 900, x: 0.50, y: 0.66, dx: 360, dy: 180, hue: 0.72 },
      { delay: 940, x: 0.50, y: 0.34, dx: -360, dy: -180, hue: 0.38 },
    ];
    staggeredWaves.forEach((w) => {
      setTimeout(() => {
        if (!contextLost && isLabVisible && !document.hidden) {
          emitDirectionalWave(w.x, w.y, w.dx, w.dy, 5.8, w.hue);
        }
      }, w.delay);
    });
  }

  function emitAmbientWave() {
    ambientPhase = (ambientPhase + 1) % 6;
    const patterns = [
      [0.12, 0.76, 460, -240],
      [0.88, 0.26, -460, 260],
      [0.84, 0.78, -420, -280],
      [0.16, 0.24, 440, 280],
      [0.52, 0.86, 260, -420],
      [0.48, 0.14, -260, 420],
    ];
    const [x, y, dx, dy] = patterns[ambientPhase];
    const jitterX = (Math.random() - 0.5) * 0.1;
    const jitterY = (Math.random() - 0.5) * 0.1;
    emitDirectionalWave(
      Math.max(0.06, Math.min(0.94, x + jitterX)),
      Math.max(0.06, Math.min(0.94, y + jitterY)),
      dx,
      dy,
      5.4
    );
  }

  if (labSection && "IntersectionObserver" in window) {
    new IntersectionObserver(
      (entries) => {
        const nowVisible = Boolean(entries[0]?.isIntersecting);
        const returning = !isLabVisible && nowVisible;
        isLabVisible = nowVisible;
        if (returning && !contextLost) {
          lastUpdateTime = Date.now();
          emitAmbientWave();
        }
      },
      { threshold: 0.01 }
    ).observe(labSection);
  }

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      lastUpdateTime = Date.now();
      if (isLabVisible && !contextLost) emitAmbientWave();
    }
  });

  canvas.addEventListener(
    "webglcontextlost",
    (e) => {
      e.preventDefault();
      contextLost = true;
    },
    false
  );
  canvas.addEventListener(
    "webglcontextrestored",
    () => {
      contextLost = false;
      updateKeywords();
      initFramebuffers();
      emitOpeningChoreography();
    },
    false
  );

  const engineDiag = {
    mode: ext.isWebGL2 ? "webgl2" : "webgl1",
    frames: 0,
    splats: 0,
    active: true,
    triggerBurst: emitOpeningChoreography,
  };
  window.__fluidEngine = engineDiag;

  updateKeywords();
  initFramebuffers();
  emitOpeningChoreography();

  let lastUpdateTime = Date.now();
  let colorUpdateTimer = 0.0;
  let slowFrameStreak = 0;
  let qualityDownshifted = isSoftwareGPU;
  update();

  function update() {
    requestAnimationFrame(update);
    if (contextLost || document.hidden || !isLabVisible) {
      lastUpdateTime = Date.now();
      return;
    }

    const frameStart = performance.now();
    const dt = calcDeltaTime();
    if (resizeCanvas()) {
      initFramebuffers();
      emitAmbientWave();
    }
    updateColors(dt);
    applyInputs();

    // Keep smooth colorful waves drifting gracefully on mobile & desktop when idle
    ambientTimer += dt;
    const idleFor = Date.now() - lastInteractionAt;
    const ambientInterval = mobile ? 2.1 : 2.6;
    if (ambientTimer >= ambientInterval && idleFor > 1400) {
      ambientTimer = 0;
      emitAmbientWave();
    }

    if (!config.PAUSED) step(dt);
    render(null);
    renderedFrames++;
    engineDiag.frames = renderedFrames;
    engineDiag.splats = totalSplats;

    // Auto-smooth governor: if a low-power GPU/laptop stalls (>50ms/frame), gracefully drop heavy post-FX
    if (!qualityDownshifted && renderedFrames > 2) {
      const frameMs = performance.now() - frameStart;
      if (frameMs > 50) {
        slowFrameStreak++;
        if (slowFrameStreak >= 2) {
          qualityDownshifted = true;
          config.SUNRAYS = false;
          config.DYE_RESOLUTION = Math.min(config.DYE_RESOLUTION, 512);
          config.SIM_RESOLUTION = Math.min(config.SIM_RESOLUTION, 96);
          config.PRESSURE_ITERATIONS = Math.min(config.PRESSURE_ITERATIONS, 12);
          updateKeywords();
          initFramebuffers();
        }
      } else {
        slowFrameStreak = 0;
      }
    }
  }

  function calcDeltaTime() {
    let now = Date.now();
    let dt = (now - lastUpdateTime) / 1000;
    dt = Math.min(dt, 0.016666);
    lastUpdateTime = now;
    return dt;
  }

  function updateColors(dt) {
    if (!config.COLORFUL) return;

    colorUpdateTimer += dt * config.COLOR_UPDATE_SPEED;
    if (colorUpdateTimer >= 1) {
      colorUpdateTimer = wrap(colorUpdateTimer, 0, 1);
      pointers.forEach((p) => {
        p.color = generateColor();
      });
    }
  }

  function applyInputs() {
    if (splatStack.length > 0) multipleSplats(splatStack.pop());

    pointers.forEach((p) => {
      if (p.moved) {
        p.moved = false;
        splatPointer(p);
      }
    });
  }

  function step(dt) {
    gl.disable(gl.BLEND);

    curlProgram.bind();
    gl.uniform2f(
      curlProgram.uniforms.texelSize,
      velocity.texelSizeX,
      velocity.texelSizeY
    );
    gl.uniform1i(curlProgram.uniforms.uVelocity, velocity.read.attach(0));
    blit(curl);

    vorticityProgram.bind();
    gl.uniform2f(
      vorticityProgram.uniforms.texelSize,
      velocity.texelSizeX,
      velocity.texelSizeY
    );
    gl.uniform1i(vorticityProgram.uniforms.uVelocity, velocity.read.attach(0));
    gl.uniform1i(vorticityProgram.uniforms.uCurl, curl.attach(1));
    gl.uniform1f(vorticityProgram.uniforms.curl, config.CURL);
    gl.uniform1f(vorticityProgram.uniforms.dt, dt);
    blit(velocity.write);
    velocity.swap();

    divergenceProgram.bind();
    gl.uniform2f(
      divergenceProgram.uniforms.texelSize,
      velocity.texelSizeX,
      velocity.texelSizeY
    );
    gl.uniform1i(divergenceProgram.uniforms.uVelocity, velocity.read.attach(0));
    blit(divergence);

    clearProgram.bind();
    gl.uniform1i(clearProgram.uniforms.uTexture, pressure.read.attach(0));
    gl.uniform1f(clearProgram.uniforms.value, config.PRESSURE);
    blit(pressure.write);
    pressure.swap();

    pressureProgram.bind();
    gl.uniform2f(
      pressureProgram.uniforms.texelSize,
      velocity.texelSizeX,
      velocity.texelSizeY
    );
    gl.uniform1i(pressureProgram.uniforms.uDivergence, divergence.attach(0));
    for (let i = 0; i < config.PRESSURE_ITERATIONS; i++) {
      gl.uniform1i(pressureProgram.uniforms.uPressure, pressure.read.attach(1));
      blit(pressure.write);
      pressure.swap();
    }

    gradienSubtractProgram.bind();
    gl.uniform2f(
      gradienSubtractProgram.uniforms.texelSize,
      velocity.texelSizeX,
      velocity.texelSizeY
    );
    gl.uniform1i(
      gradienSubtractProgram.uniforms.uPressure,
      pressure.read.attach(0)
    );
    gl.uniform1i(
      gradienSubtractProgram.uniforms.uVelocity,
      velocity.read.attach(1)
    );
    blit(velocity.write);
    velocity.swap();

    advectionProgram.bind();
    gl.uniform2f(
      advectionProgram.uniforms.texelSize,
      velocity.texelSizeX,
      velocity.texelSizeY
    );
    if (!ext.supportLinearFiltering)
      gl.uniform2f(
        advectionProgram.uniforms.dyeTexelSize,
        velocity.texelSizeX,
        velocity.texelSizeY
      );
    let velocityId = velocity.read.attach(0);
    gl.uniform1i(advectionProgram.uniforms.uVelocity, velocityId);
    gl.uniform1i(advectionProgram.uniforms.uSource, velocityId);
    gl.uniform1f(advectionProgram.uniforms.dt, dt);
    gl.uniform1f(
      advectionProgram.uniforms.dissipation,
      config.VELOCITY_DISSIPATION
    );
    blit(velocity.write);
    velocity.swap();

    if (!ext.supportLinearFiltering)
      gl.uniform2f(
        advectionProgram.uniforms.dyeTexelSize,
        dye.texelSizeX,
        dye.texelSizeY
      );
    gl.uniform1i(advectionProgram.uniforms.uVelocity, velocity.read.attach(0));
    gl.uniform1i(advectionProgram.uniforms.uSource, dye.read.attach(1));
    gl.uniform1f(
      advectionProgram.uniforms.dissipation,
      config.DENSITY_DISSIPATION
    );
    blit(dye.write);
    dye.swap();
  }

  function render(target) {
    if (config.BLOOM) applyBloom(dye.read, bloom);
    if (config.SUNRAYS) {
      applySunrays(dye.read, dye.write, sunrays);
      blur(sunrays, sunraysTemp, 1);
    }

    if (target == null || !config.TRANSPARENT) {
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.enable(gl.BLEND);
    } else {
      gl.disable(gl.BLEND);
    }

    if (!config.TRANSPARENT)
      drawColor(target, normalizeColor(config.BACK_COLOR));
    if (target == null && config.TRANSPARENT) drawCheckerboard(target);
    drawDisplay(target);
  }

  function drawColor(target, color) {
    colorProgram.bind();
    gl.uniform4f(colorProgram.uniforms.color, color.r, color.g, color.b, 1);
    blit(target);
  }

  function drawCheckerboard(target) {
    checkerboardProgram.bind();
    gl.uniform1f(
      checkerboardProgram.uniforms.aspectRatio,
      canvas.width / canvas.height
    );
    blit(target);
  }

  function drawDisplay(target) {
    let width = target == null ? gl.drawingBufferWidth : target.width;
    let height = target == null ? gl.drawingBufferHeight : target.height;

    displayMaterial.bind();
    if (config.SHADING)
      gl.uniform2f(
        displayMaterial.uniforms.texelSize,
        1.0 / width,
        1.0 / height
      );
    gl.uniform1i(displayMaterial.uniforms.uTexture, dye.read.attach(0));
    if (config.BLOOM) {
      gl.uniform1i(displayMaterial.uniforms.uBloom, bloom.attach(1));
      gl.uniform1i(
        displayMaterial.uniforms.uDithering,
        ditheringTexture.attach(2)
      );
      let scale = getTextureScale(ditheringTexture, width, height);
      gl.uniform2f(displayMaterial.uniforms.ditherScale, scale.x, scale.y);
    }
    if (config.SUNRAYS)
      gl.uniform1i(displayMaterial.uniforms.uSunrays, sunrays.attach(3));
    blit(target);
  }

  function applyBloom(source, destination) {
    if (bloomFramebuffers.length < 2) return;

    let last = destination;

    gl.disable(gl.BLEND);
    bloomPrefilterProgram.bind();
    let knee = config.BLOOM_THRESHOLD * config.BLOOM_SOFT_KNEE + 0.0001;
    let curve0 = config.BLOOM_THRESHOLD - knee;
    let curve1 = knee * 2;
    let curve2 = 0.25 / knee;
    gl.uniform3f(bloomPrefilterProgram.uniforms.curve, curve0, curve1, curve2);
    gl.uniform1f(
      bloomPrefilterProgram.uniforms.threshold,
      config.BLOOM_THRESHOLD
    );
    gl.uniform1i(bloomPrefilterProgram.uniforms.uTexture, source.attach(0));
    blit(last);

    bloomBlurProgram.bind();
    for (let i = 0; i < bloomFramebuffers.length; i++) {
      let dest = bloomFramebuffers[i];
      gl.uniform2f(
        bloomBlurProgram.uniforms.texelSize,
        last.texelSizeX,
        last.texelSizeY
      );
      gl.uniform1i(bloomBlurProgram.uniforms.uTexture, last.attach(0));
      blit(dest);
      last = dest;
    }

    gl.blendFunc(gl.ONE, gl.ONE);
    gl.enable(gl.BLEND);

    for (let i = bloomFramebuffers.length - 2; i >= 0; i--) {
      let baseTex = bloomFramebuffers[i];
      gl.uniform2f(
        bloomBlurProgram.uniforms.texelSize,
        last.texelSizeX,
        last.texelSizeY
      );
      gl.uniform1i(bloomBlurProgram.uniforms.uTexture, last.attach(0));
      gl.viewport(0, 0, baseTex.width, baseTex.height);
      blit(baseTex);
      last = baseTex;
    }

    gl.disable(gl.BLEND);
    bloomFinalProgram.bind();
    gl.uniform2f(
      bloomFinalProgram.uniforms.texelSize,
      last.texelSizeX,
      last.texelSizeY
    );
    gl.uniform1i(bloomFinalProgram.uniforms.uTexture, last.attach(0));
    gl.uniform1f(bloomFinalProgram.uniforms.intensity, config.BLOOM_INTENSITY);
    blit(destination);
  }

  function applySunrays(source, mask, destination) {
    gl.disable(gl.BLEND);
    sunraysMaskProgram.bind();
    gl.uniform1i(sunraysMaskProgram.uniforms.uTexture, source.attach(0));
    blit(mask);

    sunraysProgram.bind();
    gl.uniform1f(sunraysProgram.uniforms.weight, config.SUNRAYS_WEIGHT);
    gl.uniform1i(sunraysProgram.uniforms.uTexture, mask.attach(0));
    blit(destination);
  }

  function blur(target, temp, iterations) {
    blurProgram.bind();
    for (let i = 0; i < iterations; i++) {
      gl.uniform2f(blurProgram.uniforms.texelSize, target.texelSizeX, 0.0);
      gl.uniform1i(blurProgram.uniforms.uTexture, target.attach(0));
      blit(temp);

      gl.uniform2f(blurProgram.uniforms.texelSize, 0.0, target.texelSizeY);
      gl.uniform1i(blurProgram.uniforms.uTexture, temp.attach(0));
      blit(target);
    }
  }

  function splatPointer(pointer) {
    let dx = pointer.deltaX * config.SPLAT_FORCE;
    let dy = pointer.deltaY * config.SPLAT_FORCE;
    splat(pointer.texcoordX, pointer.texcoordY, dx, dy, pointer.color);
  }

  function multipleSplats(amount) {
    for (let i = 0; i < amount; i++) {
      const color = generateColor();
      color.r *= 10.0;
      color.g *= 10.0;
      color.b *= 10.0;
      const x = Math.random();
      const y = Math.random();
      const dx = 1000 * (Math.random() - 0.5);
      const dy = 1000 * (Math.random() - 0.5);
      splat(x, y, dx, dy, color);
    }
  }

  function splat(x, y, dx, dy, color) {
    splatProgram.bind();
    gl.uniform1i(splatProgram.uniforms.uTarget, velocity.read.attach(0));
    gl.uniform1f(
      splatProgram.uniforms.aspectRatio,
      canvas.width / canvas.height
    );
    gl.uniform2f(splatProgram.uniforms.point, x, y);
    gl.uniform3f(splatProgram.uniforms.color, dx, dy, 0.0);
    gl.uniform1f(
      splatProgram.uniforms.radius,
      correctRadius(config.SPLAT_RADIUS / 100.0)
    );
    blit(velocity.write);
    velocity.swap();

    gl.uniform1i(splatProgram.uniforms.uTarget, dye.read.attach(0));
    gl.uniform3f(splatProgram.uniforms.color, color.r, color.g, color.b);
    blit(dye.write);
    dye.swap();
  }

  function correctRadius(radius) {
    let aspectRatio = canvas.width / canvas.height;
    if (aspectRatio > 1) {
      radius *= aspectRatio;
    } else if (aspectRatio > 0) {
      // Boost vertical splat visibility on portrait mobile screens
      radius *= Math.min(1.5, 1.0 / Math.max(aspectRatio, 0.55));
    }
    return radius;
  }

  // Mouse Movements
  canvas.addEventListener("mousemove", (e) => {
    lastInteractionAt = Date.now();
    let pointer = pointers[0];
    let posX = scaleByPixelRatio(e.offsetX);
    let posY = scaleByPixelRatio(e.offsetY);

    if (!pointer.down) {
      updatePointerDownData(pointer, -1, posX, posY);
    }
    updatePointerMoveData(pointer, posX, posY);
  });

  window.addEventListener("mouseup", () => {
    updatePointerUpData(pointers[0]);
  });

  canvas.addEventListener(
    "touchstart",
    (e) => {
      lastInteractionAt = Date.now();
      const touches = e.targetTouches;
      while (touches.length >= pointers.length)
        pointers.push(new pointerPrototype());
      const rect = canvas.getBoundingClientRect();
      for (let i = 0; i < touches.length; i++) {
        let posX = scaleByPixelRatio(touches[i].clientX - rect.left);
        let posY = scaleByPixelRatio(touches[i].clientY - rect.top);
        updatePointerDownData(pointers[i + 1], touches[i].identifier, posX, posY);
        // Immediately bloom a smooth color swirl right where the user taps on mobile
        const angle = Math.random() * Math.PI * 2;
        emitDirectionalWave(
          pointers[i + 1].texcoordX,
          pointers[i + 1].texcoordY,
          Math.cos(angle) * 460,
          Math.sin(angle) * 460,
          5.8
        );
      }
    },
    { passive: true }
  );

  canvas.addEventListener(
    "touchmove",
    (e) => {
      lastInteractionAt = Date.now();
      const touches = e.targetTouches;
      const rect = canvas.getBoundingClientRect();
      for (let i = 0; i < touches.length; i++) {
        let pointer = pointers[i + 1];
        if (!pointer || !pointer.down) continue;
        let posX = scaleByPixelRatio(touches[i].clientX - rect.left);
        let posY = scaleByPixelRatio(touches[i].clientY - rect.top);
        updatePointerMoveData(pointer, posX, posY);
      }
    },
    { passive: true }
  );

  window.addEventListener("touchend", (e) => {
    const touches = e.changedTouches;
    for (let i = 0; i < touches.length; i++) {
      let pointer = pointers.find((p) => p.id == touches[i].identifier);
      if (pointer == null) continue;
      updatePointerUpData(pointer);
    }
  });

  window.addEventListener("touchcancel", () => {
    for (let i = 1; i < pointers.length; i++) {
      updatePointerUpData(pointers[i]);
    }
  });

  window.addEventListener("keydown", (e) => {
    if (e.code === "KeyP") config.PAUSED = !config.PAUSED;
    if (e.key === " ") splatStack.push(parseInt(Math.random() * 20) + 5);
  });

  function updatePointerDownData(pointer, id, posX, posY) {
    pointer.id = id;
    pointer.down = true;
    pointer.moved = false;
    pointer.texcoordX = posX / canvas.width;
    pointer.texcoordY = 1.0 - posY / canvas.height;
    pointer.prevTexcoordX = pointer.texcoordX;
    pointer.prevTexcoordY = pointer.texcoordY;
    pointer.deltaX = 0;
    pointer.deltaY = 0;
    pointer.color = generateColor();
  }

  function updatePointerMoveData(pointer, posX, posY) {
    pointer.prevTexcoordX = pointer.texcoordX;
    pointer.prevTexcoordY = pointer.texcoordY;
    pointer.texcoordX = posX / canvas.width;
    pointer.texcoordY = 1.0 - posY / canvas.height;
    pointer.deltaX = correctDeltaX(pointer.texcoordX - pointer.prevTexcoordX);
    pointer.deltaY = correctDeltaY(pointer.texcoordY - pointer.prevTexcoordY);
    pointer.moved =
      Math.abs(pointer.deltaX) > 0 || Math.abs(pointer.deltaY) > 0;
  }

  function updatePointerUpData(pointer) {
    pointer.down = false;
  }

  function correctDeltaX(delta) {
    let aspectRatio = canvas.width / canvas.height;
    if (aspectRatio < 1) delta *= aspectRatio;
    return delta;
  }

  function correctDeltaY(delta) {
    let aspectRatio = canvas.width / canvas.height;
    if (aspectRatio > 1) delta /= aspectRatio;
    return delta;
  }

  // Updated to allow curated rich rainbow colors or single hue
  function generateColor() {
    return generateVibrantColor();
  }

  function HSVtoRGB(h, s, v) {
    let r, g, b, i, f, p, q, t;
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);

    switch (i % 6) {
      case 0:
        (r = v), (g = t), (b = p);
        break;
      case 1:
        (r = q), (g = v), (b = p);
        break;
      case 2:
        (r = p), (g = v), (b = t);
        break;
      case 3:
        (r = p), (g = q), (b = v);
        break;
      case 4:
        (r = t), (g = p), (b = v);
        break;
      case 5:
        (r = v), (g = p), (b = q);
        break;
    }

    return {
      r,
      g,
      b,
    };
  }

  function normalizeColor(input) {
    let output = {
      r: input.r / 255,
      g: input.g / 255,
      b: input.b / 255,
    };
    return output;
  }

  function wrap(value, min, max) {
    let range = max - min;
    if (range == 0) return min;
    return ((value - min) % range) + min;
  }

  function getResolution(resolution) {
    let bufferWidth = Math.max(1, gl.drawingBufferWidth || canvas.width || 1);
    let bufferHeight = Math.max(1, gl.drawingBufferHeight || canvas.height || 1);
    let aspectRatio = bufferWidth / bufferHeight;
    if (!Number.isFinite(aspectRatio) || aspectRatio <= 0) aspectRatio = 1;
    if (aspectRatio < 1) aspectRatio = 1.0 / aspectRatio;

    let min = clampTextureSize(resolution);
    let max = clampTextureSize(resolution * aspectRatio);

    if (bufferWidth > bufferHeight)
      return { width: max, height: min };
    else return { width: min, height: max };
  }

  function getTextureScale(texture, width, height) {
    return {
      x: width / texture.width,
      y: height / texture.height,
    };
  }

  function hashCode(s) {
    if (s.length == 0) return 0;
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      hash = (hash << 5) - hash + s.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    return hash;
  }
}
