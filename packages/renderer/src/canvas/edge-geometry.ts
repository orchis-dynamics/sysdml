export type Point = { x: number; y: number };

export type Box = {
    position: Point;
    size: { width: number; height: number };
};

export function flowElbowCorner(source: Point, target: Point): Point | null {
    return source.y === target.y ? null : { x: target.x, y: source.y };
}

const CONNECTION_BULGE = 60;

// Walks from p0 toward p1 and returns the point where the segment first enters
// the axis-aligned box. Assumes p1 is inside (or on) the box; if p0 is also
// inside, returns p0 unchanged.
export function clipToBox(p0: Point, p1: Point, box: Box): Point {
    const minX = box.position.x;
    const maxX = box.position.x + box.size.width;
    const minY = box.position.y;
    const maxY = box.position.y + box.size.height;
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;

    const tEnterX = dx === 0 ? -Infinity : ((dx > 0 ? minX : maxX) - p0.x) / dx;
    const tEnterY = dy === 0 ? -Infinity : ((dy > 0 ? minY : maxY) - p0.y) / dy;
    const tEnter = Math.max(tEnterX, tEnterY);
    const t = Math.min(1, Math.max(0, tEnter));
    return { x: p0.x + t * dx, y: p0.y + t * dy };
}

export function connectionControlPoint(source: Point, target: Point): Point {
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const bulgeScale = CONNECTION_BULGE / (Math.hypot(dx, dy) || 1);
    return {
        x: (source.x + target.x) / 2 + dy * bulgeScale,
        y: (source.y + target.y) / 2 - dx * bulgeScale,
    };
}
