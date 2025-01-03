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
    makeBlackThresh: { value: 3 },
  };

  // Quad geometry and shader material
  const size = 2
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
  material.side = THREE.DoubleSide;

  const numQuads = 15
  function linearPos() {
    const positions = []
    for (let i = 0; i < numQuads; i++) {
      const pos = {
        x: i * 0.4 - 2.75,
        y: 0,
      }
      positions.push(pos)
    }
    return positions
  }

  function circlePos(time: number, radius: number) {
    const positions = []
    for (let i = 0; i < numQuads; i++) {
      const pos = {
        x: radius * Math.cos(i * 2 * Math.PI / numQuads + time),
        y: radius * Math.sin(i * 2 * Math.PI / numQuads + time)
      }
      positions.push(pos)
    }
    return positions
  }

  function lerpPositionArrays(pos1: {x: number, y: number}[], pos2: {x: number, y: number}[], lerp: number) {
    const positions = []
    for (let i = 0; i < pos1.length; i++) {
      const pos = {
        x: lerp * pos1[i].x + (1 - lerp) * pos2[i].x,
        y: lerp * pos1[i].y + (1 - lerp) * pos2[i].y,
      }
      positions.push(pos)
    }
    return positions
  }




  const materials: THREE.ShaderMaterial[] = []
  const meshes: THREE.Mesh[] = []
  const uniformsArr: { [key: string]: { value: any } }[] = []
  for (let i = 0; i < numQuads; i++) {
    const matClone = material.clone()
    materials.push(matClone)
    uniformsArr.push({
      frame: { value: 0 },
      textureArray: { value: null },
      makeBlackThresh: { value: 3 },
    })
    matClone.uniforms = uniformsArr[i]
    const quad = new THREE.Mesh(geometry, matClone);
    quad.position.x = i * 0.4 - 2.75;
    quad.position.z = i * 0.001
    meshes.push(quad)
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
    for (let i = 0; i < numQuads; i++) {
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
    frameSliderVal = parseInt((event.target as HTMLInputElement).value, 10);
  });

  let positionLerp = 0
  const positionLerpSlider = document.querySelector<HTMLInputElement>("#position-lerp-slider")!;
  positionLerpSlider.addEventListener("input", (event) => {
    positionLerp = parseFloat((event.target as HTMLInputElement).value);
  });

  let circleSpeed = 1
  const circleSpeedSlider = document.querySelector<HTMLInputElement>("#circle-speed-slider")!;
  circleSpeedSlider.addEventListener("input", (event) => {
    circleSpeed = parseFloat((event.target as HTMLInputElement).value);
  });

  const lookbackSlider = document.querySelector<HTMLInputElement>("#lookback-slider")!;
  lookbackSlider.addEventListener("input", (event) => {
    lookback = parseInt((event.target as HTMLInputElement).value);
  });

  // Render loop
  let frame = 0
  let lookback = 20
  let accumTime = 0
  let lastTime = 0
  const animate = () => {
    const newTime = performance.now()
    const deltaTime = newTime - lastTime
    lastTime = newTime
    accumTime += deltaTime / 1000 * circleSpeed

    requestAnimationFrame(animate);
    renderer.render(scene, camera);
    frame++
    circularBuffer.add(frameSliderVal)
    uniformsArr.forEach((uniform, i) => {
      uniform.frame.value = circularBuffer.getNBack(i * lookback)
    })
    const pos1 = linearPos()
    const pos2 = circlePos(accumTime, 1.5)
    const pos = lerpPositionArrays(pos2, pos1, positionLerp)
    meshes.forEach((mesh, i) => {
      mesh.position.copy({x: pos[i].x, y: pos[i].y, z: i * 0.001})
    })

    // console.log('render')
  };

  animate();
};




const init2 = async () => {
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

  //write function for calculating camera viewing bounds based on fov, aspect ratio, and camera position
  function getCameraViewingBounds(
    fov: number,
    aspectRatio: number,
    cameraPosition: THREE.Vector3
): { left: number; right: number; top: number; bottom: number; width: number; height: number } {
    // Convert vertical FOV from degrees to radians
    const verticalFOVRadians = (fov * Math.PI) / 180;

    // Calculate the height of the view at z = 0 (near plane assumed to be at z = 1)
    const heightAtZ0 = 2 * Math.tan(verticalFOVRadians / 2); // height for z = 0
    const widthAtZ0 = heightAtZ0 * aspectRatio; // width for z = 0

    // Calculate bounds with 0,0 at the center of the frame
    const left = -widthAtZ0 + cameraPosition.x;
    const right = widthAtZ0 + cameraPosition.x;
    const top = heightAtZ0 + cameraPosition.y;
    const bottom = -heightAtZ0 + cameraPosition.y;

    return {
        left,
        right,
        top,
        bottom,
        width: widthAtZ0 * 2,
        height: heightAtZ0 * 2,
    };
}

  // Controls
  const controls = new OrbitControls(camera, renderer.domElement);

  // Uniforms
  uniforms = {
    frame: { value: 0 },
    textureArray: { value: null },
    makeBlackThresh: { value: 3 },
  };

  // Quad geometry and shader material
  const size = 1
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
  material.side = THREE.DoubleSide;

  const numQuads = 40
  function linearPos() {
    const positions = []
    for (let i = 0; i < numQuads; i++) {
      const pos = {
        x: i * 0.4 - 2.75,
        y: 0,
      }
      positions.push(pos)
    }
    return positions
  }

  function circlePos(time: number, radius: number) {
    const positions = []
    for (let i = 0; i < numQuads; i++) {
      const pos = {
        x: radius * Math.cos(i * 2 * Math.PI / numQuads + time),
        y: radius * Math.sin(i * 2 * Math.PI / numQuads + time)
      }
      positions.push(pos)
    }
    return positions
  }

  function lerpPositionArrays(pos1: {x: number, y: number}[], pos2: {x: number, y: number}[], lerp: number) {
    const positions = []
    for (let i = 0; i < pos1.length; i++) {
      const pos = {
        x: lerp * pos1[i].x + (1 - lerp) * pos2[i].x,
        y: lerp * pos1[i].y + (1 - lerp) * pos2[i].y,
      }
      positions.push(pos)
    }
    return positions
  }




  const materials: THREE.ShaderMaterial[] = []
  const meshes: THREE.Mesh[] = []
  const uniformsArr: { [key: string]: { value: any } }[] = []
  const cameraBounds = getCameraViewingBounds(camera.fov, camera.aspect, camera.position)
  const basePositions: {x: number, y: number}[] = []
  console.log("camera bounds", cameraBounds)
  for (let i = 0; i < numQuads; i++) {
    const matClone = material.clone()
    materials.push(matClone)
    uniformsArr.push({
      frame: { value: 0 },
      textureArray: { value: null },
      makeBlackThresh: { value: 3 },
    })
    matClone.uniforms = uniformsArr[i]
    const quad = new THREE.Mesh(geometry, matClone);
    quad.position.x = cameraBounds.left + cameraBounds.width * Math.random()
    quad.position.y = cameraBounds.bottom + cameraBounds.height * Math.random()
    basePositions.push({x: quad.position.x, y: quad.position.y})
    meshes.push(quad)
    scene.add(quad);
  }

  // Load textures
  const loader = new KTX2Loader()
    .setTranscoderPath("node_modules/three/examples/jsm/libs/basis/")
    .detectSupport(renderer);

  console.log(loader);

  const textures = ["aroma_540_texture_array.ktx2",
  "chris_540_texture_array.ktx2",
  "hugo_540_texture_array.ktx2",
  "isaac_540_texture_array.ktx2",
  "kat_540_texture_array.ktx2",
  "kurush_540_texture_array.ktx2",
  "latasha_540_texture_array.ktx2",
  "natalie_540_texture_array.ktx2",
  "ryan_540_texture_array.ktx2",
  "shreya_540_texture_array.ktx2",
  "stoney_540_texture_array.ktx2",]

  // loader.load('tydance_540_texture_array.ktx2', (texureArray) => {
  //   console.log("texureArray", "megs", texureArray.mipmaps!![0].data.length / 1000000, "format", texureArray.format);
  //   uniforms.textureArray.value = texureArray;
  //   for (let i = 0; i < numQuads; i++) {
  //     uniformsArr[i].textureArray.value = texureArray;
  //   }
  // });

  const textureLengthMap: Record<string, number> = {}

  const loadTexturePromises = textures.map(textureName => {
    return new Promise<THREE.CompressedArrayTexture>((resolve, reject) => {
      loader.load(
        textureName,
        (textureArray) => {
          const texArr = textureArray as THREE.CompressedArrayTexture
          textureLengthMap[textureName] = texArr.source.data.depth
          console.log(`${textureName}:`, "frames", texArr.mipmaps!!.length, "megs", texArr.mipmaps!![0].data.length / 1000000, "format", texArr.format);
          resolve(texArr);
        },
        undefined,
        reject
      );
    });
  });

  const textureArrays = await Promise.all(loadTexturePromises)
  const baseFps = 40
  type QuadParam = {
    texName: string
    frameCount: number
    fps: number
  }
  const quadParams: QuadParam[] = []

  //randomly assign textures to quads
  const randomIndices = Array.from({ length: numQuads }, (_, i) => i).map(i => Math.floor(Math.random()*textureArrays.length));
  for (let i = 0; i < numQuads; i++) {
    uniformsArr[i].textureArray.value = textureArrays[randomIndices[i]]
    quadParams.push({
      texName: textures[randomIndices[i]],
      frameCount: textureLengthMap[textures[randomIndices[i]]],
      fps: baseFps,
    })
  }

  //randomly vary the fps of each quad
  for (let i = 0; i < numQuads; i++) {
    quadParams[i].fps = baseFps/2 + (Math.random()**2.5) * baseFps * 2.5
  }

  

  

  // Render loop
  let frame = 0
  let accumTime = 0
  let lastTime = 0

  function modInNegativeRange(num: number, min: number, max: number) {
    return ((num % (max - min)) + (max - min)) % (max - min) + min
  }

  function scrollBasePositionsVertically(time: number, scrollSpeed: number) {
    //scroll the base positions vertically up so that they wrap around 
    
    const ymin = cameraBounds.bottom - size/2
    const ymax = cameraBounds.top + size/2

    const newPos = basePositions.map(pos => ({
      x: pos.x,
      y: modInNegativeRange(pos.y + time * scrollSpeed, ymin, ymax),
    }))

    //reassign z depth so lowest elements have closest depth in range 0 to 0.001
    const zDepth = newPos.map((pos, i) => ({
      x: pos.x,
      y: pos.y,
      z: (pos.y - ymin) / (ymax - ymin) * -0.001,
    }))
    return zDepth
  }

  const animate = () => {
    const newTime = performance.now()
    const deltaTime = newTime - lastTime
    lastTime = newTime
    accumTime += deltaTime / 1000

    requestAnimationFrame(animate);
    renderer.render(scene, camera);
    frame++

    uniformsArr.forEach((uniform, i) => {
      uniform.frame.value = Math.floor(accumTime * quadParams[i].fps) % quadParams[i].frameCount
    })
    // console.log('render', accumTime, uniformsArr[0].frame.value)

    const newPos = scrollBasePositionsVertically(accumTime, 0.5)
    meshes.forEach((mesh, i) => {
      mesh.position.copy(newPos[i])
    })
  };

  animate();
};


window.onload = init2;
