import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";

let scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer;
let quad: THREE.Mesh, uniforms: { [key: string]: { value: any } };

const init = () => {
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

  const texturePaths = [
    "path/to/frame_0.ktx2",
    "path/to/frame_1.ktx2",
    "path/to/frame_2.ktx2",
  ];

  Promise.all(texturePaths.map((path) => loader.loadAsync(path))).then(
    (textures) => {
      // Create a CompressedArrayTexture
      const width = textures[0].image.width;
      const height = textures[0].image.height;
      const depth = textures.length;

      // Construct the mipmaps array
      const mipmaps: THREE.CompressedTextureMipmap[] = textures.map(
        (tex) => ({
          data: tex.mipmaps!![0].data,
          width: tex.mipmaps!![0].width,
          height: tex.mipmaps!![0].height,
        })
      );

      // Create the CompressedArrayTexture
      const compressedArrayTexture = new THREE.CompressedArrayTexture(
        mipmaps,
        width,
        height,
        depth,
        THREE.RGBA_S3TC_DXT5_Format // Ensure this matches your texture format
      );

      compressedArrayTexture.format = textures[0].format;
      compressedArrayTexture.minFilter = THREE.LinearFilter;
      compressedArrayTexture.magFilter = THREE.LinearFilter;
      compressedArrayTexture.needsUpdate = true;

      uniforms.textureArray.value = compressedArrayTexture;
    }
  );

  // Slider
  const slider = document.querySelector<HTMLInputElement>("#frame-slider")!;
  slider.addEventListener("input", (event) => {
    uniforms.frame.value = parseInt(
      (event.target as HTMLInputElement).value,
      10
    );
  });

  // Render loop
  const animate = () => {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
  };

  animate();
};

window.onload = init;
