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
  };

  // Quad geometry and shader material
  const geometry = new THREE.PlaneGeometry(1.5, 1.5);
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
      varying vec2 vUv;
      void main() {
        vec4 color = texture(textureArray, vec3(vUv, frame));
        gl_FragColor = color;
      }
    `,
  });

  quad = new THREE.Mesh(geometry, material);
  scene.add(quad);

  // Load textures
  const loader = new KTX2Loader()
    .setTranscoderPath("node_modules/three/examples/jsm/libs/basis/")
    .detectSupport(renderer);

  console.log(loader);


  loader.load('texture_array.ktx2', (texureArray) => {
    console.log("texureArray", texureArray);
    uniforms.textureArray.value = texureArray;
  });

  // Slider
  const slider = document.querySelector<HTMLInputElement>("#frame-slider")!;
  slider.addEventListener("input", (event) => {
    uniforms.frame.value = parseInt(
      (event.target as HTMLInputElement).value,
      10
    );
    console.log("frame", uniforms.frame.value);
  });

  // Render loop
  const animate = () => {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
    // console.log('render')
  };

  animate();
};

window.onload = init;
