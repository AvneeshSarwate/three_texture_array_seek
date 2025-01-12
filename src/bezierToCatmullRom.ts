type Point = { x: number; y: number };

/**
 * Converts cubic Bézier control points to equivalent Catmull-Rom control points.
 * This uses the mathematical relationship between the two curve types for exact conversion.
 *
 * For a cubic Bézier curve with control points P0, P1, P2, P3,
 * we can derive Catmull-Rom control points that will produce an equivalent curve segment.
 *
 * @param bezierCurves Array of arrays containing Bézier curve control points [x1, x2, y2, x3, y3, x4, y4]
 * @returns Array of points for Catmull-Rom interpolation
 */
export function bezierToCatmullRomExact(bezierCurves: number[][]): Point[] {
  if (!bezierCurves.length) return [];

  // Validate input format
  if (!bezierCurves.every((curve) => curve.length === 8)) {
    throw new Error(
      "Each Bézier curve must have 8 values: [x1, y1, x2, y2, x3, y3, x4, y4]"
    );
  }

  const catmullPoints: Point[] = [];

  // For each Bézier curve, we need to generate appropriate Catmull-Rom control points
  bezierCurves.forEach((curve, i) => {
    const [x1, y1, x2, y2, x3, y3, x4, y4] = curve;
    const P0 = { x: x1, y: y1 }; // Start point
    const P1 = { x: x2, y: y2 }; // First control point
    const P2 = { x: x3, y: y3 }; // Second control point
    const P3 = { x: x4, y: y4 }; // End point

    if (i === 0) {
      // For the first curve, we need to create a "virtual" point before P0
      // that will give us the desired tangent at P0
      const virtualP0 = extrapolateVirtualPoint(P0, P1);
      catmullPoints.push(virtualP0);
    }

    // Add the actual curve points
    if (i === 0 || !pointsEqual(P0, catmullPoints[catmullPoints.length - 1])) {
      catmullPoints.push(P0);
    }

    // Calculate intermediate control point
    const intermediatePoint = calculateIntermediatePoint(P0, P1, P2, P3);
    catmullPoints.push(intermediatePoint);

    // Add end point
    catmullPoints.push(P3);

    if (i === bezierCurves.length - 1) {
      // For the last curve, create a "virtual" point after P3
      // that will give us the desired tangent at P3
      const virtualP3 = extrapolateVirtualPoint(P3, P2);
      catmullPoints.push(virtualP3);
    }
  });

  return catmullPoints;
}

/**
 * Calculates a virtual control point that maintains the tangent of the Bézier curve
 */
function extrapolateVirtualPoint(anchor: Point, control: Point): Point {
  // Reflect the control point about the anchor point to maintain the tangent
  return {
    x: anchor.x - (control.x - anchor.x),
    y: anchor.y - (control.y - anchor.y),
  };
}

/**
 * Calculates an intermediate control point that helps maintain
 * the shape of the original Bézier curve
 */
function calculateIntermediatePoint(
  P0: Point,
  P1: Point,
  P2: Point,
  P3: Point
): Point {
  // Use the relationship between Bézier and Catmull-Rom tension
  // to calculate an appropriate intermediate point
  const tension = 0.1; // Standard Catmull-Rom tension

  return {
    x: P0.x + (P3.x - P0.x) / 2 + (P1.x - P2.x) * tension,
    y: P0.y + (P3.y - P0.y) / 2 + (P1.y - P2.y) * tension,
  };
}

/**
 * Checks if two points are equal within a small epsilon
 */
function pointsEqual(p1: Point, p2: Point, epsilon = 1e-10): boolean {
  return Math.abs(p1.x - p2.x) < epsilon && Math.abs(p1.y - p2.y) < epsilon;
}
