type Point = {
    x: number;
    y: number;
};

export function bez2Catmull2(bezierCurves: number[][]): Point[] {
    const catmullRomPoints: Point[] = [];

    for (const bezier of bezierCurves) {
        if (bezier.length !== 8) {
            throw new Error("Each Bézier curve must have exactly 8 values (x1, y1, x2, y2, x3, y3, x4, y4).");
        }

        // Extract Bézier curve control points
        const P0: Point = { x: bezier[0], y: bezier[1] };
        const P1: Point = { x: bezier[2], y: bezier[3] };
        const P2: Point = { x: bezier[4], y: bezier[5] };
        const P3: Point = { x: bezier[6], y: bezier[7] };

        // Compute the Catmull–Rom control points
        const C1: Point = P0;
        const C2: Point = {
            x: (6 * P1.x - P0.x) / 5,
            y: (6 * P1.y - P0.y) / 5
        };
        const C3: Point = {
            x: (6 * P2.x - P3.x) / 5,
            y: (6 * P2.y - P3.y) / 5
        };
        const C4: Point = P3;

        // Add the points to the Catmull–Rom points list
        catmullRomPoints.push(C1, C2, C3, C4);
    }

    return catmullRomPoints;
}
