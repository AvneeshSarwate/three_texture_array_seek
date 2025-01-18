//disable all unused variable warnings
/* eslint-disable @typescript-eslint/no-unused-vars */

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import p5 from "p5";
import { contours } from "./all_video_contours";
import { bez2CatmullSample } from "./bez2CatmullSample";
import { resampleSplineEquidistant } from "./splineResample";
import { skeletons } from "./skeletons";
import { Line2, LineGeometry, LineMaterial } from "three/examples/jsm/Addons.js";


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


//todo - find out how shreya data got misformatted on export

type Point = {
  x: number
  y: number
}

function distance(p1: Point, p2: Point) {
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2)
}

// const canvas = document.querySelector<HTMLCanvasElement>("#three-canvas")!;

// const splineFrames = contours.diana.frames.map(frame => bezierToCatmullRomExact(frame))
// const people = ["aroma", "chloe", "chris", "diana", "idris", "iman", "jah", "jesse", "kat", "kurush", "latasha", "martin", "robert", "rupal", "sara", "segnon", "senay", "shreya", "stoney", "zandie"]
const people = ["chloe"]

//if control pt 1 is more than threshold distance from anchor pt 1, 
//and control pt 2 is more than threshold distance from anchor pt 2,
//then replace control pts 1 and 2 with the avg of the anchor pts
function smoothBezierCurve(curve: number[], threshold: number) {
  const [x1, y1, x2, y2, x3, y3, x4, y4] = curve
  const anchor1 = {x: x1, y: y1}
  const anchor2 = {x: x4, y: y4}
  const control1 = {x: x2, y: y2}
  const control2 = {x: x3, y: y3}
  const dist1 = distance(anchor1, control1)
  const dist2 = distance(anchor2, control2)
  if(dist1 > threshold && dist2 > threshold) {
    const avg = {x: (anchor1.x + anchor2.x) / 2, y: (anchor1.y + anchor2.y) / 2}
    return [x1, y1, avg.x, avg.y, avg.x, avg.y, x4, y4]
  }
  return curve
}

const countoursAndSkeletonForPerson = (person: string) => {
  const bezierCurves = contours[person].frames.map(frame => {
    return frame.map(curve => smoothBezierCurve(curve, 20))
  })
  const splineFrames0 = bezierCurves.map(frame => bez2CatmullSample(frame))
  const maxPoints = Math.max(...splineFrames0.map(frame => frame.length))
  const splineFrames = splineFrames0.map(frame => resampleSplineEquidistant(frame, maxPoints))
  // const splineFrames = splineFrames0
  const numFrames = Object.keys(skeletons.data[person]).length
  const onePersonSkeletons = Array(numFrames).fill(null).map((_, i) => skeletons.data[person][(i + 1).toString().padStart(6, '0')+'.png'])
  return {splineFrames, onePersonSkeletons, bezierCurves, numFrames}
}

const countoursAndSkeletonForPersonTHREE = (person: string) => {
  const bezierCurves = contours[person].frames.map(frame => {
    return frame.map(curve => smoothBezierCurve(curve, 20))
  })
  const splineFrames0 = bezierCurves.map(frame => bez2CatmullSample(frame, 4))
  const maxPoints = Math.max(...splineFrames0.map(frame => frame.length))
  const splineFrames = splineFrames0.map(frame => resampleSplineEquidistant(frame, maxPoints)).map(frame => frame.map(pt => new THREE.Vector2(pt.x, pt.y)))
  // const splineFrames = splineFrames0
  const numFrames = Object.keys(skeletons.data[person]).length
  const onePersonSkeletons = Array(numFrames).fill(null).map((_, i) => skeletons.data[person][(i + 1).toString().padStart(6, '0')+'.png'])
  return {splineFrames, onePersonSkeletons, bezierCurves, numFrames}
}

const init3 = async () => {

  

  let {splineFrames, onePersonSkeletons, bezierCurves, numFrames} = countoursAndSkeletonForPerson('chloe')

  const createDropdown = () => {
    const dropdown = document.createElement('select');
    dropdown.id = 'person-dropdown';
    people.forEach(person => {
      const option = document.createElement('option');
      option.value = person;
      option.text = person;
      dropdown.appendChild(option);
    });
    document.body.appendChild(dropdown);

    dropdown.addEventListener('change', (event) => {
      const selectedPerson = (event.target as HTMLSelectElement).value;
      const { splineFrames: newSplineFrames, onePersonSkeletons: newOnePersonSkeletons, bezierCurves: newBezierCurves, numFrames: newNumFrames } = countoursAndSkeletonForPerson(selectedPerson);
      splineFrames = newSplineFrames;
      onePersonSkeletons = newOnePersonSkeletons;
      bezierCurves = newBezierCurves;
      numFrames = newNumFrames;
    });
  };

  createDropdown();

  const lerpPoints = (p1: Point[], p2: Point[], t: number) => {
    return p1.map((point, i) => ({
      x: p1[i].x * (1 - t) + p2[i].x * t,
      y: p1[i].y * (1 - t) + p2[i].y * t,
    }))
  }

  let stepIndex = 0
  const sketch = (p: p5) => {
    p.setup = () => {
      p.createCanvas(960, 540)
     }
    p.draw = () => {
      // p.clear()
      p.fill(0, 0, 0, 255)
      p.rect(0, 0, 960, 540)
      p.noFill()
      p.stroke(255)
      p.strokeWeight(2)
      const fps = 20
      const stepper = 0.2
      stepIndex += stepper
      const frameFrac = ((Date.now() / 1000) * fps) % splineFrames.length
      const frameFloor = Math.floor(stepIndex) % splineFrames.length
      const frameCeil = Math.ceil(frameFrac) % splineFrames.length
      

      // const frame = bezierCurves[frameFloor]
      // frame.forEach(curve => {
      //   const [x1, y1, x2, y2, x3, y3, x4, y4] = curve
      //   p.bezier(x1, y1, x2, y2, x3, y3, x4, y4)
      // })

      //todo - need to rotationally reorient frames before lerping looks good
      // const lerpedFrame = lerpPoints(splineFrames[frameFloor], splineFrames[frameCeil], frameFrac % 1)
      // const framePts = lerpedFrame;

      const framePts = splineFrames[frameFloor]
      p.beginShape()
      framePts.forEach((point, i) => {
        p.curveVertex(point.x, point.y)
        // p.vertex(point.x, point.y)
        // if(i > 0) {
        //   p.line(point.x, point.y, framePts[i - 1].x, framePts[i - 1].y)
        // }
      })
      p.endShape()


      const skeletonsInFrame = onePersonSkeletons[frameFloor]
      if(skeletonsInFrame) {
        const skeleton = skeletonsInFrame[0]
        skeleton.landmarks.forEach(landmark => {
          p.fill(255, 0, 0)
          p.ellipse(landmark.x * 512, landmark.y * 512, 10, 10)
        })
      }
    }
  }

  const p5i = new p5(sketch);
  const draw = () => {
    p5i.draw()
    requestAnimationFrame(draw)
  }
  draw()
}

const init4 = async () => {
  const canvas = document.querySelector<HTMLCanvasElement>("#three-canvas")!;

  const peopleData = people.map(person => countoursAndSkeletonForPersonTHREE(person))

  // Renderer
  renderer = new THREE.WebGLRenderer({ canvas });
  renderer.setSize(window.innerWidth, window.innerHeight);

  // Scene
  scene = new THREE.Scene();

  const orthoCam = new THREE.OrthographicCamera(0, window.innerWidth, 0, window.innerHeight)
  orthoCam.position.z = 2
  scene.add(orthoCam)

  // Controls
  const controls = new OrbitControls(orthoCam, renderer.domElement);

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

  //4x5 grid positions
  const rows = 4
  const cols = 5
  const blockWidth = window.innerWidth / cols 
  const blockHeight = window.innerHeight / rows

  const positions = Array.from({length: rows * cols}, (_, i) => ({
    x: (i % cols) * blockWidth,
    y: Math.floor(i / cols) * blockHeight,
  }))

  const numQuads = rows * cols
  const materials: THREE.ShaderMaterial[] = []
  const meshes: THREE.Mesh[] = []
  const uniformsArr: { [key: string]: { value: any } }[] = []
  const lines: Line2[] = []
  const groups: THREE.Group[] = []

  //todo add Line2 for outlines here

  for (let i = 0; i < numQuads; i++) {
    if(!people[i]) continue
    const matClone = material.clone()
    materials.push(matClone)
    uniformsArr.push({
      frame: { value: 0 },
      textureArray: { value: null },
      makeBlackThresh: { value: 3 },
    })
    matClone.uniforms = uniformsArr[i]
    const quad = new THREE.Mesh(geometry, matClone);
    quad.position.x = blockWidth / 2
    quad.position.y = blockHeight / 2
    quad.scale.set(blockWidth, blockHeight * -1, 1)
    meshes.push(quad)
    // scene.add(quad)

    const lineGeometry = new LineGeometry()
    const lineMaterial = new LineMaterial( {
      color: 0xffffff,
      linewidth: 5, // in world units with size attenuation, pixels otherwise
      // vertexColors: true,
      dashed: false,
      alphaToCoverage: true,
      // worldUnits: true,
    });
    lineGeometry.setFromPoints(peopleData[i].splineFrames[0])
    const line = new Line2(lineGeometry, lineMaterial)
    line.computeLineDistances();
    line.scale.set(blockWidth / 512, blockHeight / 512, 1)
    line.translateZ(0.001)
    lines.push(line)
    // scene.add(line)

    const group = new THREE.Group()
    group.position.x = positions[i].x 
    group.position.y = positions[i].y 
    group.add(quad)
    group.add(line)
    groups.push(group)
    scene.add(group)
  }

  // Load textures
  const loader = new KTX2Loader()
    .setTranscoderPath("node_modules/three/examples/jsm/libs/basis/")
    .detectSupport(renderer);

  console.log(loader);

  const textures = people.map(person => `${person}_texture_array.ktx2`)
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
        (err) => {
          console.log("error loading texture", textureName)
          reject(new Error(`Error loading texture: ${textureName} ${err}`))
        }
      );
    });
  });
  const textureArrays = await Promise.all(loadTexturePromises)  

  const baseFps = 15
  type QuadParam = {
    texName: string
    frameCount: number
    fps: number
  }
  const quadParams: QuadParam[] = []

  //assign textures to quads
  for (let i = 0; i < numQuads; i++) {
    if(!people[i]) continue
    uniformsArr[i].textureArray.value = textureArrays[i]
    quadParams.push({
      texName: textures[i],
      frameCount: textureLengthMap[textures[i]],
      fps: baseFps,
    })
  }

  let lastTime = performance.now()
  let accumTime = 0

  const animate = () => {
    const newTime = performance.now()
    const deltaTime = newTime - lastTime
    lastTime = newTime
    accumTime += deltaTime / 1000

    requestAnimationFrame(animate);
    renderer.render(scene, orthoCam);

    uniformsArr.forEach((uniform, i) => {
      const frame = Math.floor(accumTime * quadParams[i].fps) % quadParams[i].frameCount
      uniform.frame.value = frame
      lines[i].geometry.setFromPoints(peopleData[i].splineFrames[frame])
    })
  }

  animate()
}


window.onload = init4;

