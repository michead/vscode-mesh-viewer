const canvas  = document.getElementById('mesh-preview-canvas') as HTMLCanvasElement;
const objData = document.getElementById('mesh-preview-obj').innerText;
const vert    = document.getElementById('mesh-preview-vert-shader').innerText;
const frag    = document.getElementById('mesh-preview-frag-shader').innerText;
const vertHud = document.getElementById('mesh-preview-vert-shader-hud').innerText;
const fragHud = document.getElementById('mesh-preview-frag-shader-hud').innerText;

function degToRad(angle:number) {
  return angle * Math.PI / 180;
}

class Mat4 {
  private elements: number[];
  
  constructor(elements: number[] = [1, 0, 0, 0,
                                    0, 1, 0, 0,
                                    0, 0, 1, 0,
                                    0, 0, 0, 1]) {
    this.elements = elements;
  }

  get _00() {
    return this.elements[0];
  }

  get _01() {
    return this.elements[1];
  }

  get _02() {
    return this.elements[2];
  }

  get _03() {
    return this.elements[3];
  }

  get _10() {
    return this.elements[4];
  }

  get _11() {
    return this.elements[5];
  }

  get _12() {
    return this.elements[6];
  }

  get _13() {
    return this.elements[7];
  }

  get _20() {
    return this.elements[8];
  }

  get _21() {
    return this.elements[9];
  }

  get _22() {
    return this.elements[10];
  }

  get _23() {
    return this.elements[11];
  }

  get _30() {
    return this.elements[12];
  }

  get _31() {
    return this.elements[13];
  }

  get _32() {
    return this.elements[14];
  }

  get _33() {
    return this.elements[15];
  }
  
  mulMat(b: Mat4): Mat4 {
    const a = this;
    return new Mat4([
      a._00 * b._00 + a._01 * b._10 + a._02 * b._20 + a._03 * b._30,
      a._00 * b._01 + a._01 * b._11 + a._02 * b._21 + a._03 * b._31,
      a._00 * b._02 + a._01 * b._12 + a._02 * b._22 + a._03 * b._32,
      a._00 * b._03 + a._01 * b._13 + a._02 * b._23 + a._03 * b._33,

      a._10 * b._00 + a._11 * b._10 + a._12 * b._20 + a._13 * b._30,
      a._10 * b._01 + a._11 * b._11 + a._12 * b._21 + a._13 * b._31,
      a._10 * b._02 + a._11 * b._12 + a._12 * b._22 + a._13 * b._32,
      a._10 * b._03 + a._11 * b._13 + a._12 * b._23 + a._13 * b._33,

      a._20 * b._00 + a._21 * b._10 + a._22 * b._20 + a._23 * b._30,
      a._20 * b._01 + a._21 * b._11 + a._22 * b._21 + a._23 * b._31,
      a._20 * b._02 + a._21 * b._12 + a._22 * b._22 + a._23 * b._32,
      a._20 * b._03 + a._21 * b._13 + a._22 * b._23 + a._23 * b._33,

      a._30 * b._00 + a._31 * b._10 + a._32 * b._20 + a._33 * b._30,
      a._30 * b._01 + a._31 * b._11 + a._32 * b._21 + a._33 * b._31,
      a._30 * b._02 + a._31 * b._12 + a._32 * b._22 + a._33 * b._32,
      a._30 * b._03 + a._31 * b._13 + a._32 * b._23 + a._33 * b._33
    ]);
  }

  static identity(): Mat4 {
    return new Mat4();
  }

  static translate(vec: Vec3): Mat4 {
    return new Mat4([
      1,         0,     0, 0,
      0,         1,     0, 0,
      0,         0,     1, 0,
      vec.x, vec.y, vec.z, 1
    ]);
  }

  static rotAroundAxis(axis: Vec3, angle: number): Mat4 {
    const _00 = Math.cos(angle) + axis.x * axis.x * (1 - Math.cos(angle));
    const _01 = axis.x * axis.y * (1 - Math.cos(angle)) - axis.z * Math.sin(angle);
    const _02 = axis.x * axis.z * (1 - Math.cos(angle)) + axis.y * Math.sin(angle);
    const _10 = axis.y * axis.x * (1 - Math.cos(angle)) + axis.z * Math.sin(angle);
    const _11 = Math.cos(angle) + axis.y * axis.y * (1 - Math.cos(angle));
    const _12 = axis.y * axis.z * (1 - Math.cos(angle)) - axis.x * Math.sin(angle);
    const _20 = axis.z * axis.x * (1 - Math.cos(angle)) - axis.y * Math.sin(angle);
    const _21 = axis.z * axis.y * (1 - Math.cos(angle)) + axis.x * Math.sin(angle);
    const _22 = Math.cos(angle) + axis.z * axis.z * (1 - Math.cos(angle));
    return new Mat4([
      _00, _01, _02, 0,
      _10, _11, _12, 0,
      _20, _21, _22, 0,
        0,   0,   0, 1
    ]);
  }

  static lookAt(eye: Vec3, target: Vec3, up: Vec3): Mat4 {
    const zAxis = eye.sub(target).normalized();
    const xAxis = up.cross(zAxis).normalized();
    const yAxis = zAxis.cross(xAxis);
    return new Mat4([
      xAxis.x,                  yAxis.x,                  zAxis.x,                  0,
      xAxis.y,                  yAxis.y,                  zAxis.y,                  0,
      xAxis.z,                  yAxis.z,                  zAxis.z,                  0,
      xAxis.dot(eye.negated()), yAxis.dot(eye.negated()), zAxis.dot(eye.negated()), 1
    ]);
  }

  static perspective(fov: number, ratio: number, n: number, f: number): Mat4 {
    const hHeight = Math.tan(degToRad(fov) / 2) * n;
    const hWidth  = ratio * hHeight;
    const l = -hWidth;
    const r = hWidth;
    const b = -hHeight;
    const t = hHeight;
    return new Mat4([
      2 / (r - l),           0,            0, -(r + l) / (r - l),
                0, 2 / (t - b),            0, -(t + b) / (t - b),
                0,           0, -2 / (f - n), -(f + n) / (f - n),
                0,           0,            0,                  1
    ]);
  }

  negated(): Mat4 {
    return new Mat4(this.elements.map((e) => -e));
  }

  toArray(): number[] {
    return this.elements;
  }
}

class Vec3 {
  private elements: number[];

  constructor(elements: number[] = [0, 0, 0]) {
    this.elements = elements;
  }

  get x() {
    return this.elements[0];
  }

  get y() {
    return this.elements[1];
  }

  get z() {
    return this.elements[2];
  }

  add(b: Vec3): Vec3 {
    return new Vec3([
      this.x + b.x,
      this.y + b.y,
      this.z + b.z
    ]);
  }

  sub(b: Vec3): Vec3 {
    return this.add(b.negated());
  }

  mulScalar(b: number): Vec3 {
    return new Vec3([
      this.x * b,
      this.y * b,
      this.z * b
    ]);
  }

  dot(b: Vec3): number {
    return this.x * b.x + this.y * b.y + this.z * b.z;
  }

  cross(b: Vec3): Vec3 {
    const a = this;
    return new Vec3([
      a.y * b.z - a.z * b.y,
     -a.x * b.z + a.z * b.x,
      a.x * b.y - a.y * b.x
    ]);
  }

  transformVec(b: Mat4): Vec3 {
    return new Vec4(this, 0).transform(b).xyz;
  }

  transformPos(b: Mat4): Vec3 {
    const res = new Vec4(this, 1).transform(b);
    return res.xyz.mulScalar(1 / res.w);
  }

  lengthSqrd(): number {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }

  length(): number {
    return Math.sqrt(this.lengthSqrd());
  }

  normalized(): Vec3 {
    return new Vec3([
      this.x / this.length(),
      this.y / this.length(),
      this.z / this.length()
    ]);
  }

  negated(): Vec3 {
    return new Vec3(this.elements.map((e) => -e));
  }

  toArray(): number[] {
    return this.elements;
  }
}

class Vec4 {
  private elements: number[];

  constructor(elements: number[] | Vec3 = [0, 0, 0, 0], w: number = 0) {
    if (Array.isArray(elements)) {
      this.elements = elements;
    } else {
      this.elements = [...elements.toArray(), w];
    }
  }

  get x() {
    return this.elements[0];
  }

  get y() {
    return this.elements[1];
  }

  get z() {
    return this.elements[2];
  }

  get w() {
    return this.elements[3];
  }

  get xyz() {
    return new Vec3(this.elements.slice(0, 3));
  }

  add(b: Vec4): Vec4 {
    const a = this;
    return new Vec4([
      a.x + b.x,
      a.y + b.y,
      a.z + b.z,
      a.w + b.w
    ]);
  }

  sub(b: Vec4): Vec4 {
    return this.add(b.negated());
  }

  mulScalar(b: number): Vec4 {
    return new Vec4([
      this.x * b,
      this.y * b,
      this.z * b,
      this.w * b
    ]);
  }

  transform(b: Mat4): Vec4 {
    return new Vec4([
      b._00 * this.x + b._01 * this.y + b._02 * this.z + b._03 * this.z,
      b._10 * this.x + b._11 * this.y + b._12 * this.z + b._13 * this.w,
      b._20 * this.x + b._21 * this.y + b._22 * this.z + b._23 * this.w,
      b._30 * this.x + b._31 * this.y + b._32 * this.z + b._33 * this.w,
    ]);
  }

  dot(b: Vec4): number {
    return this.x * b.x + this.y * b.y + this.z * b.z + this.w * b.w;
  }

  lengthSqrd(): number {
    return this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w;
  }

  length(): number {
    return Math.sqrt(this.lengthSqrd());
  }

  normalized(): Vec4 {
    return new Vec4([
      this.x / this.length(),
      this.y / this.length(),
      this.z / this.length(),
      this.w / this.length()
    ]);
  }
  negated(): Vec4 {
    return new Vec4(this.elements.map((e) => -e));
  }

  toArray(): number[] {
    return this.elements;
  }
}

class Material {
  ka: Vec3 = new Vec3();
  kd: Vec3 = new Vec3([0.64, 0.64, 0.64])
  ks: Vec3 = new Vec3([0.00005, 0.00005, 0.00005]);
}

class Mesh {
  vertices: Vec3[];
  faces:    Vec3[];
  material: Material;
  get center() {
    let center = new Vec3();
    this.vertices.forEach((vertex) => {
      center = center.add(vertex);
    });
    return center.mulScalar(1 / this.vertices.length); 
  }
}

let gl: WebGLRenderingContext;
let shaderProgram: WebGLProgram;
let shaderProgramHud: WebGLProgram;
let mesh: Mesh;
let meshVertexBuffer: WebGLBuffer;
let meshIndexBuffer: WebGLBuffer;
let gizmoVertexBuffer: WebGLBuffer;
let gizmoIndexBuffer: WebGLBuffer;
let lMouseBtnDown = false;
let rMouseBtnDown = false;
let cameraArmLen = 25;
let cameraPos    = new Vec3([0, 0, cameraArmLen]);
let deltaYaw   = 0;
let deltaPitch = 0;
let oldMouseX = 0;
let oldMouseY = 0;
let bGizmo     = false;
let bWireframe = false;

const EPSILON = 0.0001;
const GIZMO_LINE_LEN = 10;
const CAMERA_MOVEMENT_SPEED = 0.0075;
const CAMERA_MIN_ARM_LEN = 5;
const CAMERA_MAX_ARM_LEN = 50;
const CAMERA_UP     = new Vec3([0, 1, 0]);
const CAMERA_RIGHT  = new Vec3([1, 0, 0]);
const CAMERA_TARGET = new Vec3();
const CAMERA_LIGHT_OFFSET = new Vec3([-5, 2, 3]);

function resizeCanvasCallback(evt: Event) {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}

function clearMouseInputCallback(evt: MouseEvent) {
  switch (evt.which) {
    case 1:
      lMouseBtnDown = false;
      break;
    case 3:
      rMouseBtnDown = false;
      break;
  }
  deltaYaw   = 0;
  deltaPitch = 0;
}

document.body.addEventListener('keypress', (evt: KeyboardEvent) => {
  switch (evt.keyCode) {
    case 71:  // g
    case 103: // G
      bGizmo = !bGizmo;
      break;
    case 87:  // w
    case 119: // W
      bWireframe = !bWireframe;
      break;
  }
});

document.body.addEventListener('mousedown', (evt: MouseEvent) => {
  switch (evt.which) {
    case 1:
      if (!rMouseBtnDown) {
        lMouseBtnDown = true;
      }
      break;
    case 3:
      if (!lMouseBtnDown) {
        rMouseBtnDown = true;
      }
      break;
  }
});

document.body.addEventListener('mouseup', clearMouseInputCallback);
document.body.addEventListener('mouseLeave', clearMouseInputCallback);

document.body.addEventListener('wheel', (evt: WheelEvent) => {
  cameraArmLen -= evt.wheelDelta * 0.001;
  cameraArmLen = Math.max(Math.min(cameraArmLen, CAMERA_MAX_ARM_LEN), CAMERA_MIN_ARM_LEN);
  evt.preventDefault();
});

window.addEventListener('load', resizeCanvasCallback);
window.addEventListener('resize', resizeCanvasCallback);

document.body.addEventListener('mousemove', (evt: MouseEvent) => {
  if (lMouseBtnDown) {
    deltaYaw   = -(evt.clientX - oldMouseX) * CAMERA_MOVEMENT_SPEED;
    deltaPitch = -(evt.clientY - oldMouseY) * CAMERA_MOVEMENT_SPEED;
  }
  
  oldMouseX = evt.clientX;
  oldMouseY = evt.clientY;
});

function initGL(): void {
  gl = canvas.getContext('webgl', { antialias: true });
  gl.clearColor(0, 0, 0, 1);
}

function initShaders(): void {
  const vertShader = gl.createShader(gl.VERTEX_SHADER);
  const fragShader = gl.createShader(gl.FRAGMENT_SHADER);

  gl.shaderSource(vertShader, vert);
  gl.shaderSource(fragShader, frag);

  [vertShader, fragShader].forEach(shader => {
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(`Error encountered while compiling shader: ${gl.getShaderInfoLog(shader)}`);
    }
  });

  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertShader);
  gl.attachShader(shaderProgram, fragShader);
  gl.linkProgram(shaderProgram);
  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    throw new Error(`Error encountered while linking shaders: ${gl.getProgramInfoLog(shaderProgram)}`);
  }

  const vertShaderHud = gl.createShader(gl.VERTEX_SHADER);
  const fragShaderHud = gl.createShader(gl.FRAGMENT_SHADER);

  gl.shaderSource(vertShaderHud, vertHud);
  gl.shaderSource(fragShaderHud, fragHud);

  [vertShaderHud, fragShaderHud].forEach(shader => {
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(`Error encountered while compiling shader: ${gl.getShaderInfoLog(shader)}`);
    }
  });

  shaderProgramHud = gl.createProgram();
  gl.attachShader(shaderProgramHud, vertShaderHud);
  gl.attachShader(shaderProgramHud, fragShaderHud);
  gl.linkProgram(shaderProgramHud);
  if (!gl.getProgramParameter(shaderProgramHud, gl.LINK_STATUS)) {
    throw new Error(`Error encountered while linking shaders: ${gl.getProgramInfoLog(shaderProgramHud)}`);
  }
}

function parseMesh(): void {
  mesh = new Mesh();

  const lines = objData.split('\n');
  const vertices = [];
  const faces    = [];

  for (const line of lines) {
    const [type, ...rest] = line.trim().split(' ');
    switch (type) {
      case 'v':
      const [x, y, z] = rest.map(n => parseFloat(n));
      vertices.push(new Vec3([x, y, z]));
      break;
      case 'f':
      const [a, b, c] = rest.map(n => parseInt(n) - 1);
      faces.push(new Vec3([a, b, c]))
      break;
    }
  }

  mesh.vertices = vertices;
  mesh.faces    = faces;
  mesh.material = new Material() // TODO: Should be parsed instead
}

function initBuffers() {
  const vertices = [];
  const indices  = [];

  mesh.vertices.forEach((vertex) => {
    vertices.push(vertex.x);
    vertices.push(vertex.y);
    vertices.push(vertex.z);
  });
  mesh.faces.forEach((face) => {
    indices.push(face.x);
    indices.push(face.y);
    indices.push(face.z);
  });
  
  meshVertexBuffer = gl.createBuffer();
  meshIndexBuffer  = gl.createBuffer();
  
  gl.bindBuffer(gl.ARRAY_BUFFER, meshVertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, meshIndexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW)

  gizmoVertexBuffer = gl.createBuffer();
  gizmoIndexBuffer  = gl.createBuffer();

  const gizmoVerts = [
    0,              0,              0,
    GIZMO_LINE_LEN, 0,              0,
    0,              GIZMO_LINE_LEN, 0,
    0,              0,              GIZMO_LINE_LEN
  ];

  gl.bindBuffer(gl.ARRAY_BUFFER, gizmoVertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(gizmoVerts), gl.STATIC_DRAW);
}

function updateCamera() {
  const rotYawMat   = Mat4.rotAroundAxis(CAMERA_UP, deltaYaw);
  const rotPitchMat = Mat4.rotAroundAxis(CAMERA_RIGHT, deltaPitch);
  const rotMat      = rotYawMat.mulMat(rotPitchMat);

  const cameraDir = cameraPos.sub(CAMERA_TARGET).normalized().transformVec(rotMat);
  cameraPos = CAMERA_TARGET.add(cameraDir.mulScalar(cameraArmLen));

  deltaYaw   = 0;
  deltaPitch = 0;
}

function updateUniforms() {
  const modelMat = Mat4.translate(CAMERA_TARGET.sub(mesh.center)).toArray();
  const viewMat  = Mat4.lookAt(cameraPos, CAMERA_TARGET, CAMERA_UP).toArray();
  const projMat  = Mat4.perspective(45, canvas.width / canvas.height, 1, 100).toArray();
  const identity = Mat4.identity().toArray();

  const lightPosUniform = gl.getUniformLocation(shaderProgram, "lightPos");
  const modelMatUniform = gl.getUniformLocation(shaderProgram, "modelMat");
  const viewMatUniform  = gl.getUniformLocation(shaderProgram, "viewMat");
  const projMatUniform  = gl.getUniformLocation(shaderProgram, "projMat");

  gl.useProgram(shaderProgram);
  gl.uniform3fv(lightPosUniform, cameraPos.add(CAMERA_LIGHT_OFFSET).toArray());
  gl.uniformMatrix4fv(modelMatUniform, false, modelMat);
  gl.uniformMatrix4fv(viewMatUniform, false, viewMat);
  gl.uniformMatrix4fv(projMatUniform, false, projMat);

  const modelMatUniformHud = gl.getUniformLocation(shaderProgramHud, "modelMat");
  const viewMatUniformHud  = gl.getUniformLocation(shaderProgramHud, "viewMat");
  const projMatUniformHud  = gl.getUniformLocation(shaderProgramHud, "projMat");

  gl.useProgram(shaderProgramHud);
  gl.uniformMatrix4fv(modelMatUniformHud, false, identity);
  gl.uniformMatrix4fv(viewMatUniformHud, false, viewMat);
  gl.uniformMatrix4fv(projMatUniformHud, false, projMat);
}

function drawGizmo() {
  gl.useProgram(shaderProgramHud);
  gl.disable(gl.DEPTH_TEST);
  gl.lineWidth(3);

    
  const posAttrLocHud = gl.getAttribLocation(shaderProgramHud, "position");

  gl.bindBuffer(gl.ARRAY_BUFFER, gizmoVertexBuffer);
  gl.enableVertexAttribArray(posAttrLocHud);

  const colorUniformHud = gl.getUniformLocation(shaderProgramHud, "color");

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gizmoIndexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1]), gl.STATIC_DRAW);
  gl.uniform4fv(colorUniformHud, [1, 0, 0, 1]);
  gl.vertexAttribPointer(posAttrLocHud, 3, gl.FLOAT, false, 0, 0);
  gl.drawElements(gl.LINES, 2, gl.UNSIGNED_SHORT, 0);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gizmoIndexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 2]), gl.STATIC_DRAW)
  gl.uniform4fv(colorUniformHud, [0, 1, 0, 1]);
  gl.vertexAttribPointer(posAttrLocHud, 3, gl.FLOAT, false, 0, 0);
  gl.drawElements(gl.LINES, 2, gl.UNSIGNED_SHORT, 0);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gizmoIndexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 3]), gl.STATIC_DRAW);
  gl.uniform4fv(colorUniformHud, [0, 0, 1, 1]);
  gl.vertexAttribPointer(posAttrLocHud, 3, gl.FLOAT, false, 0, 0);
  gl.drawElements(gl.LINES, 2, gl.UNSIGNED_SHORT, 0);
}

function draw() {
  requestAnimationFrame(draw);
 
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);
  gl.lineWidth(1);
  
  updateCamera();
  updateUniforms();

  const posAttrLoc = gl.getAttribLocation(shaderProgram, "position");

  gl.useProgram(shaderProgram);
  gl.bindBuffer(gl.ARRAY_BUFFER, meshVertexBuffer);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, meshIndexBuffer);
  gl.enableVertexAttribArray(posAttrLoc);
  gl.vertexAttribPointer(posAttrLoc, 3, gl.FLOAT, false, 0, 0);

  if (bWireframe) {
    for (let i = 0; i < mesh.faces.length; i++) {
      gl.drawElements(gl.LINE_LOOP, 3, gl.UNSIGNED_SHORT, 3 * i);
    }
  } else {
    gl.drawElements(gl.TRIANGLES, mesh.faces.length * 3, gl.UNSIGNED_SHORT, 0);
  }
  
  if (bGizmo) {
    drawGizmo();
  }
}

initGL();
initShaders();
parseMesh();
initBuffers();
draw();
