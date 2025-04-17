#!/usr/bin/env node

import { readFileSync, existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { createCanvas } from 'canvas';
import ffmpeg from 'fluent-ffmpeg';

// Usage: node render.js input.json output.mp4 WIDTH HEIGHT FPS

const [ jsonPath, outVideo, w, h, fps = 60 ] = process.argv.slice(2);

if (!jsonPath || !outVideo || !w || !h) {
  console.error('Usage: node render.js input.json output.mp4 WIDTH HEIGHT [FPS]');
  process.exit(1);
}

// 1. Load JSON
const raw = readFileSync(jsonPath, 'utf8');
const data = JSON.parse(raw);
const connections = data.connections;
const videoKey    = Object.keys(data.data)[0];
const frames      = data.data[videoKey];
const frameNames  = Object.keys(frames).sort();

// 2. Prepare frame directory
const framesDir = join(process.cwd(), 'frames');
if (!existsSync(framesDir)) mkdirSync(framesDir);

// 3. Render each frame
frameNames.forEach((fname, idx) => {
  const canvas = createCanvas(+w, +h);
  const ctx    = canvas.getContext('2d');

  // Optional: fill background
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, +w, +h);

  // Draw each detected person
  frames[fname].forEach(pose => {
    // Draw skeleton connections
    Object.entries(connections).forEach(([start, end]) => {
      const A = pose.landmarks.find(l => l.name === start);
      const B = pose.landmarks.find(l => l.name === end);
      if (A && B) {
        ctx.strokeStyle = 'lime';
        ctx.lineWidth   = 2;
        ctx.beginPath();
        ctx.moveTo(A.x * w, A.y * h);
        ctx.lineTo(B.x * w, B.y * h);
        ctx.stroke();
      }
    });
    // Draw landmark points
    pose.landmarks.forEach(lm => {
      ctx.fillStyle = 'red';
      ctx.beginPath();
      ctx.arc(lm.x * w, lm.y * h, 3, 0, 2 * Math.PI);
      ctx.fill();
    });
  });

  // Save PNG
  const outPath = join(framesDir, `frame_${String(idx).padStart(4,'0')}.png`);
  const buffer  = canvas.toBuffer('image/png');
  writeFileSync(outPath, buffer);
});

// After generating all frames into `framesDir` and defining `outVideo` and `fps`:
ffmpeg()
  // 1. Point at the zero-padded PNG sequence
  .addInput(join(framesDir, 'frame_%04d.png'))
  
  // 2. Force the image2 demuxer, set input frame rate, and start at 0
  .inputFormat('image2')
  .inputOptions([
    `-framerate ${fps}`,      // e.g. 30 fps :contentReference[oaicite:7]{index=7}
    '-start_number 0'         // first file is frame_0000.png :contentReference[oaicite:8]{index=8}
  ])
  
  // 3. Choose codec and output pixel format
  .videoCodec('libx264')      // H.264 encoding :contentReference[oaicite:9]{index=9}
  .outputOptions('-pix_fmt', 'yuv420p') // Broad compatibility 
  
  // 4. Write to disk
  .save(outVideo)
  .on('end', () => console.log(`Video saved to ${outVideo}`))
  .on('error', err => console.error('FFmpeg error:', err));

// 5. Delete frames directory
// rmSync(framesDir, { recursive: true, force: true });
