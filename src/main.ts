import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";

let scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer;
let quad: THREE.Mesh, uniforms: { [key: string]: { value: any } };



// const gl = document.querySelector<HTMLCanvasElement>("#three-canvas")!.getContext('webgl2');
// if (gl) {
//     console.log("max texture array layers", gl.getParameter(gl.MAX_ARRAY_TEXTURE_LAYERS)); // Check value
//     console.log("max texture size", gl.getParameter(gl.MAX_TEXTURE_SIZE)); // Compare with max size
// } else {
//     console.error('WebGL2 is not supported.');
// }



const init = async () => {
  const canvas = document.querySelector<HTMLCanvasElement>("#three-canvas")!;

  // Renderer
  renderer = new THREE.WebGLRenderer({ canvas });
  renderer.setSize(window.innerWidth, window.innerHeight);

  // Scene
  scene = new THREE.Scene();

  // Camera
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.z = 2;

  // Controls
  const controls = new OrbitControls(camera, renderer.domElement);

  // Uniforms
  uniforms = {
    frame: { value: 0 },
    textureArray: { value: null },
    makeBlackThresh: { value: 2.7 },
  };

  // Quad geometry and shader material
  const size = 1.25
  const geometry = new THREE.PlaneGeometry(size, size);
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2DArray textureArray;
      uniform float frame;
      uniform float makeBlackThresh;
      varying vec2 vUv;
      void main() {
        vec2 yFlip = vec2(vUv.x, 1.0 - vUv.y);
        vec4 color = texture(textureArray, vec3(yFlip, frame));
        bool makeBlack = color.a == 0.0 || color.r + color.g + color.b > makeBlackThresh;
        gl_FragColor = makeBlack ? vec4(0,0,0,0) : color;
      }
    `,
  });
  material.transparent = true;

  // quad = new THREE.Mesh(geometry, material);
  // scene.add(quad);
  //10 quads arranged left to right
  const materials: THREE.ShaderMaterial[] = []
  const uniformsArr: { [key: string]: { value: any } }[] = []
  for (let i = 0; i < 10; i++) {
    const matClone = material.clone()
    materials.push(matClone)
    uniformsArr.push({
      frame: { value: 0 },
      textureArray: { value: null },
      makeBlackThresh: { value: 2.7 },
    })
    matClone.uniforms = uniformsArr[i]
    const quad = new THREE.Mesh(geometry, matClone);
    quad.position.x = i * 0.4 - 1.75;
    scene.add(quad);
  }

  // Load textures
  const loader = new KTX2Loader()
    .setTranscoderPath("node_modules/three/examples/jsm/libs/basis/")
    .detectSupport(renderer);

  console.log(loader);


  loader.load('tydance_540_texture_array.ktx2', (texureArray) => {
    console.log("texureArray", "megs", texureArray.mipmaps!![0].data.length / 1000000, "format", texureArray.format);
    uniforms.textureArray.value = texureArray;
    for (let i = 0; i < 10; i++) {
      uniformsArr[i].textureArray.value = texureArray;
    }
  });

  class CircularBuffer {
    private buffer: any[] = [];
    private size: number;
    constructor(size: number) {
      this.size = size;
    }
    add(item: any) {
      this.buffer.push(item);
      if (this.buffer.length > this.size) {
        this.buffer.shift();
      }
    }
    getNBack(n: number) {
      return this.buffer[this.buffer.length - n - 1];
    }
  }

  const circularBuffer = new CircularBuffer(600)
  let frameSliderVal = 0
  // Slider
  const slider = document.querySelector<HTMLInputElement>("#frame-slider")!;
  slider.addEventListener("input", (event) => {
    uniforms.frame.value = parseInt(
      (event.target as HTMLInputElement).value,
      10
    );
    console.log("frame", uniforms.frame.value);
    frameSliderVal = uniforms.frame.value
  });

  const makeBlackThreshSlider = document.querySelector<HTMLInputElement>("#make-black-thresh-slider")!;
  makeBlackThreshSlider.addEventListener("input", (event) => {
    uniforms.makeBlackThresh.value = parseFloat((event.target as HTMLInputElement).value);
  });

  // Render loop
  let frame = 0
  const animate = () => {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
    frame++
    circularBuffer.add(frameSliderVal)
    for (let i = 0; i < 10; i++) {
      uniformsArr[i].frame.value = circularBuffer.getNBack(i * 20);
    }
    // console.log('render')
  };

  animate();
};

window.onload = init;
