type Point = { x: number; y: number };

/**
 * Converts an array of connected cubic Bézier curves into points for a Catmull-Rom spline.
 * @param bezierCurves Array of arrays containing Bézier curve control points [x1, x2, y2, x3, y3, x4, y4]
 * @param numPointsPerCurve Number of points to sample per Bézier curve for conversion
 * @returns Array of points suitable for Catmull-Rom spline interpolation
 */
export function bez2CatmullSample(bezierCurves: number[][], numPointsPerCurve: number = 10): Point[] {
    if (!bezierCurves.length) return [];
    
    // Validate input format
    if (!bezierCurves.every(curve => curve.length === 8)) {
        throw new Error("Each Bézier curve must have 8 values: [x1, y1, x2, y2, x3, y3, x4, y4]");
    }

    // Convert Bézier curves to points by sampling along each curve
    const sampledPoints: Point[] = [];
    
    bezierCurves.forEach((curve, curveIndex) => {
        const [x1, y1, x2, y2, x3, y3, x4, y4] = curve;
        
        // First point of first curve or if curves aren't connected
        if (curveIndex === 0) {
            sampledPoints.push({ x: x1, y: y1 }); // y1 is implicit in the format
        }
        
        // Sample points along the curve
        for (let i = 1; i <= numPointsPerCurve; i++) {
            const t = i / numPointsPerCurve;
            const point = sampleBezierPoint(
                { x: x1, y: y1 }, // P1
                { x: x2, y: y2 }, // P2
                { x: x3, y: y3 }, // P3
                { x: x4, y: y4 }  // P4
                , t);
            sampledPoints.push(point);
        }
    });

    return sampledPoints;
}

/**
 * Samples a point along a cubic Bézier curve at parameter t
 */
function sampleBezierPoint(p1: Point, p2: Point, p3: Point, p4: Point, t: number): Point {
    const oneMinusT = 1 - t;
    const oneMinusT2 = oneMinusT * oneMinusT;
    const oneMinusT3 = oneMinusT2 * oneMinusT;
    const t2 = t * t;
    const t3 = t2 * t;

    return {
        x: oneMinusT3 * p1.x +
           3 * oneMinusT2 * t * p2.x +
           3 * oneMinusT * t2 * p3.x +
           t3 * p4.x,
        y: oneMinusT3 * p1.y +
           3 * oneMinusT2 * t * p2.y +
           3 * oneMinusT * t2 * p3.y +
           t3 * p4.y
    };
}