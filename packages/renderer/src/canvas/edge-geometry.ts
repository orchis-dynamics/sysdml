export type Point = { x: number; y: number };

export type Box = {
    position: Point;
    size: { width: number; height: number };
};

export function flowElbowCorner(source: Point, target: Point): Point | null {
    return source.y === target.y ? null : { x: target.x, y: source.y };
}
