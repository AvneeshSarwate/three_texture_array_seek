import { catmullRomSpline } from "./catmullRom";

type Point = { x: number; y: number };

/**
 * Resamples a Catmull-Rom spline to have N approximately equidistant points
 */
export function resampleSplineEquidistant(points: Point[], numPoints: number, gapThreshold: number = 40): Point[] {
    // First, calculate approximate total arc length
    const arcLength = calculateSplineArcLength(points);
    
    // Generate equidistant parameter values
    const segmentLength = arcLength / (numPoints - 1);
    const sampledPoints: Point[] = [];
    
    // First point is always included
    sampledPoints.push({ x: points[0].x, y: points[0].y });
    
    // Find points at equal arc-length intervals
    for (let i = 1; i < numPoints - 1; i++) {
        const targetDistance = i * segmentLength;
        const point = findPointAtDistance(points, targetDistance);
        sampledPoints.push(point);
    }
    
    // Last point is always included
    sampledPoints.push({ 
        x: points[points.length - 1].x, 
        y: points[points.length - 1].y 
    });

    // //if any point is more than gapThreshold away from both the previous and next point, replace it with the average of the previous and next point
    // for (let i = 1; i < sampledPoints.length - 1; i++) {
    //     const bigGap = distance(sampledPoints[i], sampledPoints[i - 1]) > gapThreshold && distance(sampledPoints[i], sampledPoints[i + 1]) > gapThreshold
    //     const pointHasNaN = isNaN(sampledPoints[i].x) || isNaN(sampledPoints[i].y)
    //     if (bigGap || pointHasNaN) {
    //         console.log("replacing point", i)
    //         sampledPoints[i] = { x: (sampledPoints[i - 1].x + sampledPoints[i + 1].x) / 2, y: (sampledPoints[i - 1].y + sampledPoints[i + 1].y) / 2 };
    //     }
    // }
    
    return sampledPoints;
}

/**
 * Calculates the approximate arc length of the spline
 */
function calculateSplineArcLength(points: Point[], numSamples = 1000): number {
    let totalLength = 0;
    const step = 1 / numSamples;
    
    let prevPoint = catmullRomSpline(points, 0);
    for (let t = step; t <= 1; t += step) {
        const currentPoint = catmullRomSpline(points, t);
        totalLength += distance(prevPoint, currentPoint);
        prevPoint = currentPoint;
    }
    
    return totalLength;
}

/**
 * Finds a point on the spline at a specific arc length distance from the start
 */
function findPointAtDistance(points: Point[], targetDistance: number): Point {
    // Binary search to find parameter value that gives us the desired distance
    let left = 0;
    let right = 1;
    const epsilon = 1e-6;
    
    while (right - left > epsilon) {
        const mid = (left + right) / 2;
        const distance = calculateDistanceAlongSpline(points, mid);
        
        if (Math.abs(distance - targetDistance) < epsilon) {
            return catmullRomSpline(points, mid);
        }
        
        if (distance < targetDistance) {
            left = mid;
        } else {
            right = mid;
        }
    }
    
    return catmullRomSpline(points, (left + right) / 2);
}

/**
 * Calculates the distance along the spline from start to parameter t
 */
function calculateDistanceAlongSpline(points: Point[], t: number, numSamples = 100): number {
    let totalDistance = 0;
    const step = t / numSamples;
    
    let prevPoint = catmullRomSpline(points, 0);
    for (let curr = step; curr <= t; curr += step) {
        const currentPoint = catmullRomSpline(points, curr);
        totalDistance += distance(prevPoint, currentPoint);
        prevPoint = currentPoint;
    }
    
    return totalDistance;
}

/**
 * Calculates Euclidean distance between two points
 */
function distance(p1: Point, p2: Point): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
}

// Example usage:
// function convertAndResample(bezierCurves1: number[][], bezierCurves2: number[][], numPoints: number): [Point[], Point[]] {
//     // First convert both Bézier curves to Catmull-Rom points
//     const catmullPoints1 = bezierToCatmullRom(bezierCurves1);
//     const catmullPoints2 = bezierToCatmullRom(bezierCurves2);
    
//     // Then resample both to have the same number of approximately equidistant points
//     const resampled1 = resampleSplineEquidistant(catmullPoints1, numPoints);
//     const resampled2 = resampleSplineEquidistant(catmullPoints2, numPoints);
    
//     return [resampled1, resampled2];
// }