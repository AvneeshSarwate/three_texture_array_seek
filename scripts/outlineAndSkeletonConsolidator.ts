//run from root dir with -  TS_NODE_PROJECT=tsconfig.node.json npx tsx scripts/outlineAndSkeletonConsolidator.ts

import { skeletons } from "../src/skeletons.ts"
import { contours } from "../src/all_video_contours.ts"
import { bez2CatmullSample } from "../src/bez2CatmullSample.ts"
import { resampleSplineEquidistant } from "../src/splineResample.ts"
import * as fs from "fs"

const people = ["aroma", "chloe", "chris", "diana", "idris", "iman", "jah", "jesse", "kat", "kurush", "latasha", "martin", "robert", "rupal", "sara", "segnon", "senay", "shreya", "stoney", "zandie"]

type Point = {
  x: number
  y: number
}

function distance(p1: Point, p2: Point) {
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2)
}

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

const allPeopleData = people.map(person => countoursAndSkeletonForPerson(person))

//write allPeopleData to a json file
fs.writeFileSync('allPeopleData.json', JSON.stringify(allPeopleData, null, 2))
