const canvas  = document.getElementById('mesh-preview-canvas') as HTMLCanvasElement;
const objData = document.getElementById('mesh-preview-obj').innerText;
const vert    = document.getElementById('mesh-preview-vert-shader').innerText;
const frag    = document.getElementById('mesh-preview-frag-shader').innerText;
const vertHud = document.getElementById('mesh-preview-vert-shader-hud').innerText;
const fragHud = document.getElementById('mesh-preview-frag-shader-hud').innerText;

declare var mat4;
declare var vec4;

class Mesh {
  vertices: number[][];
  faces:    number[][];
}

let gl: WebGLRenderingContext;
let shaderProgram;
let shaderProgramHud;
let mesh;
let sceneCenter = [0, 0, 0];
let meshVertexBuffer;
let meshIndexBuffer;
let gizmoVertexBuffer;
let gizmoIndexBuffer;
let modelMatUniform;
let viewMatUniform;
let projMatUniform;
let colorUniformHud;
let modelMatUniformHud;
let viewMatUniformHud;
let projMatUniformHud;
let positionAttributeLocation;
let positionAttributeLocationHud;
let lMouseBtnDown = false;
let rMouseBtnDown = false;
let cameraArmLen = 25;
let cameraTarget = [0, 0, 0];
let cameraUp     = [0, 1, 0];
let cameraRight  = [1, 0, 0];
let cameraPos    = [0, 0, cameraArmLen];
let deltaYaw   = 0;
let deltaPitch = 0;
let oldMouseX = 0;
let oldMouseY = 0;
let bGizmo     = false;
let bWireframe = false;

const EPS = 0.0001;
const GIZMO_LINE_LEN = 10;
const CAMERA_MOVEMENT_SPEED = 0.0075;
const CAMERA_MIN_ARM_LEN = 5;
const CAMERA_MAX_ARM_LEN = 50;

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
  const lines = objData.split('\n');
  const vertices = [];
  const faces    = [];

  for (const line of lines) {
    const [type, ...rest] = line.trim().split(' ');
    switch (type) {
      case 'v':
      const [x, y, z] = rest.map(n => parseFloat(n));
      vertices.push([x, y, z]);
      break;
      case 'f':
      const [a, b, c] = rest.map(n => parseInt(n) - 1);
      faces.push([a, b, c])
      break;
    }
  }

  mesh = {
    vertices,
    faces
  };
}

function computeCenter() {
  mesh.vertices.forEach((vertex) => {
    sceneCenter[0] += vertex[0];
    sceneCenter[1] += vertex[1];
    sceneCenter[2] += vertex[2];
  });
  sceneCenter[0] /= mesh.vertices.length;
  sceneCenter[1] /= mesh.vertices.length;
  sceneCenter[2] /= mesh.vertices.length;
}

function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
   -a[0] * b[2] + a[2] * b[0],
    a[0] * b[1] - a[1] * b[0]
  ];
}

function normalize(a) {
  const magnitude = Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
  return [
    a[0] / magnitude,
    a[1] / magnitude,
    a[2] / magnitude
  ];
}

function initBuffers() {
  const vertices = [];
  const indices  = [];

  mesh.vertices.forEach((vertex) => {
    vertices.push(vertex[0]);
    vertices.push(vertex[1]);
    vertices.push(vertex[2]);
  });
  mesh.faces.forEach((face) => {
    indices.push(face[0]);
    indices.push(face[1]);
    indices.push(face[2]);
  });
  
  meshVertexBuffer = gl.createBuffer();
  meshIndexBuffer  = gl.createBuffer();
  
  gl.bindBuffer(gl.ARRAY_BUFFER, meshVertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, meshIndexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW)
  
  positionAttributeLocation = gl.getAttribLocation(shaderProgram, "position");

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
  
  positionAttributeLocationHud = gl.getAttribLocation(shaderProgramHud, "position");
}

function updateCamera() {
  const cameraDir = normalize([
    cameraPos[0] - cameraTarget[0],
    cameraPos[1] - cameraTarget[1],
    cameraPos[2] - cameraTarget[2]
  ]);

  const rotYawMat   = mat4.create();
  const rotPitchMat = mat4.create();
  const rotMat      = mat4.create();

  mat4.fromRotation(rotYawMat, deltaYaw, cameraUp);
  mat4.fromRotation(rotPitchMat, deltaPitch, cameraRight);
  mat4.multiply(rotMat, rotYawMat, rotPitchMat);

  const newCameraDir = vec4.create();
  vec4.transformMat4(newCameraDir, [...cameraDir, 0], rotMat);
  
  cameraPos = [
    cameraTarget[0] + newCameraDir[0] * cameraArmLen,
    cameraTarget[1] + newCameraDir[1] * cameraArmLen,
    cameraTarget[2] + newCameraDir[2] * cameraArmLen
  ];

  deltaYaw   = 0;
  deltaPitch = 0;
}

function updateUniforms() {
  const modelMat = mat4.create();
  const viewMat  = mat4.create();
  const projMat  = mat4.create();

  mat4.identity(modelMat);
  mat4.translate(modelMat, modelMat, sceneCenter.map((c) => -c));
  mat4.lookAt(viewMat, cameraPos, cameraTarget, cameraUp);
  mat4.perspective(projMat, 45, canvas.width / canvas.height, 0.1, 100);
  modelMatUniform = gl.getUniformLocation(shaderProgram, "modelMat");
  viewMatUniform  = gl.getUniformLocation(shaderProgram, "viewMat");
  projMatUniform  = gl.getUniformLocation(shaderProgram, "projMat");

  gl.useProgram(shaderProgram);
  gl.uniformMatrix4fv(modelMatUniform, false, modelMat);
  gl.uniformMatrix4fv(viewMatUniform, false, viewMat);
  gl.uniformMatrix4fv(projMatUniform, false, projMat);

  mat4.identity(modelMat);
  colorUniformHud    = gl.getUniformLocation(shaderProgramHud, "color");
  modelMatUniformHud = gl.getUniformLocation(shaderProgramHud, "modelMat");
  viewMatUniformHud  = gl.getUniformLocation(shaderProgramHud, "viewMat");
  projMatUniformHud = gl.getUniformLocation(shaderProgramHud, "projMat");

  gl.useProgram(shaderProgramHud);
  gl.uniformMatrix4fv(modelMatUniformHud, false, modelMat);
  gl.uniformMatrix4fv(viewMatUniformHud, false, viewMat);
  gl.uniformMatrix4fv(projMatUniformHud, false, projMat);
}

function drawGizmo() {
  gl.useProgram(shaderProgramHud);
  gl.disable(gl.DEPTH_TEST);
  gl.lineWidth(3);

  gl.bindBuffer(gl.ARRAY_BUFFER, gizmoVertexBuffer);
  gl.enableVertexAttribArray(positionAttributeLocationHud);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gizmoIndexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1]), gl.STATIC_DRAW);
  gl.uniform4fv(colorUniformHud, [1, 0, 0, 1]);
  gl.vertexAttribPointer(positionAttributeLocationHud, 3, gl.FLOAT, false, 0, 0);
  gl.drawElements(gl.LINES, 2, gl.UNSIGNED_SHORT, 0);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gizmoIndexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 2]), gl.STATIC_DRAW)
  gl.uniform4fv(colorUniformHud, [0, 1, 0, 1]);
  gl.vertexAttribPointer(positionAttributeLocationHud, 3, gl.FLOAT, false, 0, 0);
  gl.drawElements(gl.LINES, 2, gl.UNSIGNED_SHORT, 0);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gizmoIndexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 3]), gl.STATIC_DRAW);
  gl.uniform4fv(colorUniformHud, [0, 0, 1, 1]);
  gl.vertexAttribPointer(positionAttributeLocationHud, 3, gl.FLOAT, false, 0, 0);
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

  gl.useProgram(shaderProgram);
  gl.bindBuffer(gl.ARRAY_BUFFER, meshVertexBuffer);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, meshIndexBuffer);
  gl.enableVertexAttribArray(positionAttributeLocation);
  gl.vertexAttribPointer(positionAttributeLocation, 3, gl.FLOAT, false, 0, 0);

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
computeCenter();
initBuffers();
draw();
