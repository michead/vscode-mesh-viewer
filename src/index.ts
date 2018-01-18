const canvas  = document.getElementById('mesh-preview-canvas') as HTMLCanvasElement;
const objData = document.getElementById('mesh-preview-obj').innerText;
const mtlData = document.getElementById('mesh-preview-mtl').innerText;
const vert    = document.getElementById('mesh-preview-vert-shader').innerText;
const frag    = document.getElementById('mesh-preview-frag-shader').innerText;
const vertHud = document.getElementById('mesh-preview-vert-shader-hud').innerText;
const fragHud = document.getElementById('mesh-preview-frag-shader-hud').innerText;

function degToRad(angle: number) {
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

  transposed(): Mat4 {
    return new Mat4([
      this._00, this._10, this._20, this._30,
      this._01, this._11, this._21, this._31,
      this._02, this._12, this._22, this._32,
      this._03, this._13, this._23, this._33
    ]);
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

  divScalar(b: number): Vec3 {
    return this.mulScalar(1 / b);
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
    return res.xyz.divScalar(res.w);
  }

  lengthSqrd(): number {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }

  length(): number {
    return Math.sqrt(this.lengthSqrd());
  }

  dist(b: Vec3): number {
    return this.sub(b).length();
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

type Materials = {
  [m: string]: Material;
};

class Material {
  ka: Vec3 = new Vec3();
  kd: Vec3 = new Vec3([0.64, 0.64, 0.64]);
  ks: Vec3 = new Vec3([0.00005, 0.00005, 0.00005]);
  ns: number = 10;
}

type MeshGroup = {
  faces: Vec3[];
  material: string,
  indexBuffer: WebGLBuffer;
};

type MeshObject = {
  [g: string]: MeshGroup;
};

class Mesh {
  vertices: Vec3[];
  faces: Vec3[];
  center: Vec3;
  radius: number;
  normals: Vec3[];
  objects: { [o: string]: MeshObject };
}

let gl: WebGLRenderingContext;
let shaderProgram: WebGLProgram;
let shaderProgramHud: WebGLProgram;
let mesh: Mesh;
let meshVertexBuffer: WebGLBuffer;
let gizmoVertexBuffer: WebGLBuffer;
let gizmoIndexBuffer: WebGLBuffer;
let lMouseBtnDown = false;
let rMouseBtnDown = false;
let cameraPos;
let cameraUp        = new Vec3([0, 1, 0]);
let cameraRight     = new Vec3([1, 0, 0]);
let cameraArmLen    = 25;
let cameraMinArmLen = 2;
let cameraMaxArmLen = 90;
let lightPos: Vec3;
let deltaYaw   = 0;
let deltaPitch = 0;
let oldMouseX = 0;
let oldMouseY = 0;
let bWireframe   = false;
let bDrawGizmo   = false;
let bDrawNormals = false;
let gizmoLineLen  = 10;
let normalLineLen = 1;

const materials: Materials = {};

const CAMERA_MOVEMENT_SPEED = 0.008;
const CAMERA_TARGET = new Vec3();
const GIZMO_VERTICES = [
             0,            0,            0,
  gizmoLineLen,            0,            0,
             0, gizmoLineLen,            0,
             0,            0, gizmoLineLen
];

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
      bDrawGizmo = !bDrawGizmo;
      break;
    case 78:  // n
    case 110: // N
      bDrawNormals = !bDrawNormals;
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
document.body.addEventListener('mouseleave', clearMouseInputCallback);

document.body.addEventListener('wheel', (evt: WheelEvent) => {
  cameraArmLen -= evt.wheelDelta * 0.001;
  cameraArmLen = Math.max(Math.min(cameraArmLen, cameraMaxArmLen), cameraMinArmLen);
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

function initContext(): void {
  gl = canvas.getContext('webgl', { antialias: true });
  gl.clearColor(0, 0, 0, 1);
}

function initShaders(): void {
  const vertShader = gl.createShader(gl.VERTEX_SHADER);
  const fragShader = gl.createShader(gl.FRAGMENT_SHADER);

  gl.shaderSource(vertShader, vert);
  gl.shaderSource(fragShader, frag);

  [vertShader, fragShader].forEach((shader) => {
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

  [vertShaderHud, fragShaderHud].forEach((shader) => {
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

function parseMaterials(): void {
  const materialObj = JSON.parse(mtlData);
  for (const m in materialObj) {
    if (materialObj.hasOwnProperty(m)) {
      const mtl = materialObj[m];
      const material = new Material();
      for (const prop in mtl) {
        if (mtl.hasOwnProperty(prop)) {
          switch (prop) {
            case 'Ka':
            case 'Kd':
            case 'Ks':
              material[prop.toLowerCase()] = new Vec3(mtl[prop].map((n) => parseFloat(n)));
              break;
            case 'Ns':
              material[prop.toLowerCase()] = parseFloat(mtl[prop]);
              break;
            default:
              break;
          }
          materials[m] = material;
        }
      }
    }
  }
}

function parseMesh(): void {
  mesh = new Mesh();

  const lines    = objData.split('\n');
  const vertices = [];
  const faces    = [];
  const objects  = {};
  let lastObject = '__default__';
  let lastGroup  = '__default__';
  objects[lastObject] = {};
  objects[lastObject][lastGroup] = {};
  objects[lastObject][lastGroup].faces = [];
  objects[lastObject][lastGroup].material = '__default__';

  for (const line of lines) {
    const [type, ...rest] = line.trim().split(/\s+/);
    switch (type) {
      case 'v':
        const [x, y, z] = rest.map((n) => parseFloat(n));
        vertices.push(new Vec3([x, y, z]));
        break;
      case 'f':
        const indices = rest.map((n) => {
          return n.indexOf('/') < 0
            ? parseInt(n) - 1
            : parseInt(n.substr(0, n.indexOf('/'))) - 1;
        });
        for (let i = 1; i < indices.length - 1; i++) {
          const triangle = new Vec3([
            indices[0],
            indices[i],
            indices[i + 1]
          ]);
          faces.push(triangle);
          objects[lastObject][lastGroup].faces.push(triangle);
        }
        break;
      case 'usemtl':
        objects[lastObject][lastGroup].material = rest[0];
        break;
      case 'o':
        lastObject = rest[0];
        lastGroup = '__default__';
        if (!objects[lastObject]) {
          objects[lastObject] = {};
        }
        if (!objects[lastObject][lastGroup]) {
          objects[lastObject][lastGroup] = {};
        }
        if (!objects[lastObject][lastGroup].faces) {
          objects[lastObject][lastGroup].faces = [];
        }
        if (!objects[lastObject][lastGroup].material) {
          objects[lastObject][lastGroup].material = '__default__';
        }
        break;
      case 'g':
        lastGroup = rest[0];
        if (!objects[lastObject][lastGroup]) {
          objects[lastObject][lastGroup] = {};
        }
        if (!objects[lastObject][lastGroup].faces) {
          objects[lastObject][lastGroup].faces = [];
        }
        if (!objects[lastObject][lastGroup].material) {
          objects[lastObject][lastGroup].material = '__default__';
        }
        break;
      default:
        break;
    }
  }

  mesh.vertices = vertices;
  mesh.objects  = objects;
  mesh.faces = faces;

  mesh.center = ((): Vec3 => {
    let center = new Vec3();
    mesh.vertices.forEach((vertex) => {
      center = center.add(vertex);
    });
    return center.divScalar(mesh.vertices.length);
  })();
  mesh.radius = ((): number => {
    let radius = Number.MIN_VALUE;
    for (const v of mesh.vertices) {
      const dist = v.dist(mesh.center);
      if (dist > radius) {
        radius = dist;
      }
    }
    return radius;
  })();
  mesh.normals = ((): Vec3[] => {
    const normals = new Array(mesh.vertices.length).fill(void 0).map(() => new Vec3()) as Vec3[];
    for (const face of mesh.faces) {
      const a = mesh.vertices[face.y].sub(mesh.vertices[face.x]);
      const b = mesh.vertices[face.y].sub(mesh.vertices[face.z]);
      const faceNormal = b.cross(a).normalized();
      normals[face.x] = normals[face.x].add(faceNormal);
      normals[face.y] = normals[face.y].add(faceNormal);
      normals[face.z] = normals[face.z].add(faceNormal);
    }
    return normals.map((n) => n.normalized());
  })();

  gizmoLineLen    = mesh.radius;
  normalLineLen   = mesh.radius / 10;
  cameraArmLen    = mesh.radius * 2;
  cameraMinArmLen = Math.max(mesh.radius, 2);
  cameraMaxArmLen = Math.max(cameraMinArmLen * 10, 500);
  cameraPos       = new Vec3([0, 0, cameraArmLen]);
  lightPos        = cameraPos;
}

function initBuffers() {
  const attributes = [];
  const normals = mesh.normals;

  for (const o in mesh.objects) {
    if (mesh.objects.hasOwnProperty(o)) {
      for (const g in mesh.objects[o]) {
        if (mesh.objects[o].hasOwnProperty(g)) {
          const group = mesh.objects[o][g];
          const indices = [];

          group.faces.forEach((face) => {
            indices.push(face.x);
            indices.push(face.y);
            indices.push(face.z);
          });

          group.indexBuffer  = gl.createBuffer();

          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, group.indexBuffer);
          gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
        }
      }
    }
  }

  mesh.vertices.forEach((vertex, i) => {
    attributes.push(vertex.x);
    attributes.push(vertex.y);
    attributes.push(vertex.z);

    attributes.push(normals[i].x);
    attributes.push(normals[i].y);
    attributes.push(normals[i].z);
  });

  meshVertexBuffer = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, meshVertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(attributes), gl.STATIC_DRAW);

  gizmoVertexBuffer = gl.createBuffer();
  gizmoIndexBuffer  = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, gizmoVertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(GIZMO_VERTICES), gl.STATIC_DRAW);
}

function updateCamera() {
  const rotYawMat   = Mat4.rotAroundAxis(cameraUp, deltaYaw);
  const rotPitchMat = Mat4.rotAroundAxis(cameraRight, deltaPitch);
  const rotMat      = rotYawMat.mulMat(rotPitchMat);

  const cameraDir = cameraPos.sub(CAMERA_TARGET).normalized().transformVec(rotMat);
  cameraPos = CAMERA_TARGET.add(cameraDir.mulScalar(cameraArmLen));
  lightPos  = cameraPos;

  cameraRight = cameraDir.negated().cross(cameraUp).normalized();
  cameraUp    = cameraRight.cross(cameraDir.negated()).normalized();

  deltaYaw   = 0;
  deltaPitch = 0;
}

function bindMaterial(materialName) {
  const kaUniform = gl.getUniformLocation(shaderProgram, 'ka');
  const kdUniform = gl.getUniformLocation(shaderProgram, 'kd');
  const ksUniform = gl.getUniformLocation(shaderProgram, 'ks');
  const nsUniform = gl.getUniformLocation(shaderProgram, 'ns');

  gl.useProgram(shaderProgram);

  gl.uniform3fv(kaUniform, materials[materialName].ka.toArray());
  gl.uniform3fv(kdUniform, materials[materialName].kd.toArray());
  gl.uniform3fv(ksUniform, materials[materialName].ks.toArray());
  gl.uniform1f(nsUniform, materials[materialName].ns);
}

function updateUniforms() {
  const modelMat = Mat4.translate(CAMERA_TARGET.sub(mesh.center));
  const viewMat  = Mat4.lookAt(cameraPos, CAMERA_TARGET, cameraUp);
  const projMat  = Mat4.perspective(45, canvas.width / canvas.height, 1, 1000);
  const identity = Mat4.identity();

  const lightPosUniform  = gl.getUniformLocation(shaderProgram, 'lightPos');
  const modelMatUniform  = gl.getUniformLocation(shaderProgram, 'modelMat');
  const viewMatUniform   = gl.getUniformLocation(shaderProgram, 'viewMat');
  const projMatUniform   = gl.getUniformLocation(shaderProgram, 'projMat');

  gl.useProgram(shaderProgram);

  gl.uniform3fv(lightPosUniform, lightPos.toArray());
  gl.uniformMatrix4fv(modelMatUniform, false, modelMat.toArray());
  gl.uniformMatrix4fv(viewMatUniform, false, viewMat.toArray());
  gl.uniformMatrix4fv(projMatUniform, false, projMat.toArray());

  const modelMatUniformHud = gl.getUniformLocation(shaderProgramHud, 'modelMat');
  const viewMatUniformHud  = gl.getUniformLocation(shaderProgramHud, 'viewMat');
  const projMatUniformHud  = gl.getUniformLocation(shaderProgramHud, 'projMat');

  gl.useProgram(shaderProgramHud);
  gl.uniformMatrix4fv(modelMatUniformHud, false, identity.toArray());
  gl.uniformMatrix4fv(viewMatUniformHud, false, viewMat.toArray());
  gl.uniformMatrix4fv(projMatUniformHud, false, projMat.toArray());
}

function drawNormals() {
  gl.useProgram(shaderProgramHud);
  gl.lineWidth(1);

  const posAttrLocHud = gl.getAttribLocation(shaderProgramHud, 'position');
  const colorUniformHud = gl.getUniformLocation(shaderProgramHud, 'color');
  const translationMatrix = Mat4.translate(CAMERA_TARGET.sub(mesh.center)).toArray();
  gl.uniform4fv(colorUniformHud, [0, 0, 1, 1]);
  gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgramHud, 'modelMat'), false, translationMatrix);

  const vertexBuffer = gl.createBuffer();
  const translationVec = CAMERA_TARGET.sub(mesh.center);

  mesh.vertices.forEach((v, i) => {
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      ...v.toArray(),
      ...v.add(mesh.normals[i].mulScalar(normalLineLen)).toArray()
    ]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(posAttrLocHud, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(posAttrLocHud);
    gl.drawArrays(gl.LINES, 0, 2);
  });
}

function drawGizmo() {
  gl.useProgram(shaderProgramHud);
  gl.disable(gl.DEPTH_TEST);
  gl.lineWidth(3);

  const posAttrLocHud   = gl.getAttribLocation(shaderProgramHud, 'position');
  const colorUniformHud = gl.getUniformLocation(shaderProgramHud, 'color');

  gl.bindBuffer(gl.ARRAY_BUFFER, gizmoVertexBuffer);
  gl.enableVertexAttribArray(posAttrLocHud);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gizmoIndexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1]), gl.STATIC_DRAW);
  gl.uniform4fv(colorUniformHud, [1, 0, 0, 1]);
  gl.vertexAttribPointer(posAttrLocHud, 3, gl.FLOAT, false, 0, 0);
  gl.drawElements(gl.LINES, 2, gl.UNSIGNED_SHORT, 0);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gizmoIndexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 2]), gl.STATIC_DRAW);
  gl.uniform4fv(colorUniformHud, [0, 1, 0, 1]);
  gl.vertexAttribPointer(posAttrLocHud, 3, gl.FLOAT, false, 0, 0);
  gl.drawElements(gl.LINES, 2, gl.UNSIGNED_SHORT, 0);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gizmoIndexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 3]), gl.STATIC_DRAW);
  gl.uniform4fv(colorUniformHud, [0, 0, 1, 1]);
  gl.vertexAttribPointer(posAttrLocHud, 3, gl.FLOAT, false, 0, 0);
  gl.drawElements(gl.LINES, 2, gl.UNSIGNED_SHORT, 0);
}

function drawWireframe() {
  gl.useProgram(shaderProgramHud);

  const modelMat = Mat4.translate(CAMERA_TARGET.sub(mesh.center)).toArray();
  gl.uniform4fv(gl.getUniformLocation(shaderProgramHud, 'color'), [0.8, 0.8, 0.8, 1]);
  gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgramHud, 'modelMat'), false, modelMat);

  for (let i = 0; i < mesh.faces.length; i++) {
    gl.drawElements(gl.LINE_LOOP, 3, gl.UNSIGNED_SHORT, 3 * i);
  }
}

function draw() {
  requestAnimationFrame(draw);

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);
  gl.lineWidth(1);

  updateCamera();
  updateUniforms();

  const posAttrLoc    = gl.getAttribLocation(shaderProgram, 'position');
  const normalAttrLoc = gl.getAttribLocation(shaderProgram, 'normal');

  gl.enableVertexAttribArray(posAttrLoc);
  gl.enableVertexAttribArray(normalAttrLoc);

  gl.useProgram(shaderProgram);
  gl.bindBuffer(gl.ARRAY_BUFFER, meshVertexBuffer);
  gl.vertexAttribPointer(posAttrLoc, 3, gl.FLOAT, false, 24, 0);
  gl.vertexAttribPointer(normalAttrLoc, 3, gl.FLOAT, false, 24, 12);

  if (bWireframe) {
    drawWireframe();
  } else {
    for (const o in mesh.objects) {
      if (mesh.objects.hasOwnProperty(o)) {
        for (const g in mesh.objects[o]) {
          if (mesh.objects[o].hasOwnProperty(g)) {
            const group = mesh.objects[o][g];
            bindMaterial(group.material);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, group.indexBuffer);
            gl.drawElements(gl.TRIANGLES, group.faces.length * 3, gl.UNSIGNED_SHORT, 0);
          }
        }
      }
    }
  }

  if (bDrawNormals) {
    drawNormals();
  }

  if (bDrawGizmo) {
    drawGizmo();
  }
}

initContext();
initShaders();
parseMaterials();
parseMesh();
initBuffers();
draw();
