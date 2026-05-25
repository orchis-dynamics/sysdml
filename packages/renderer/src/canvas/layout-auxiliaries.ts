import type { IRAuxiliary, IRConnection, IRPosition } from "@sysdml/ir";

import { LayoutNode } from "./layout-types";

export function seedAuxiliaryPositions(
    auxiliaries: IRAuxiliary[],
    connections: IRConnection[],
    skeletonNodes: Map<string, LayoutNode>,
): Map<string, IRPosition> {
    const skeletonCenter = computeSkeletonCenter(skeletonNodes);
    const seeds = new Map<string, IRPosition>();

    auxiliaries.forEach((auxiliary) => {
        if (auxiliary.position) {
            seeds.set(auxiliary.id, auxiliary.position);
            return;
        }

        const neighborPositions = collectNeighborPositions(
            auxiliary.id,
            connections,
            skeletonNodes,
        );

        seeds.set(
            auxiliary.id,
            neighborPositions.length > 0
                ? averagePositions(neighborPositions)
                : skeletonCenter,
        );
    });

    return seeds;
}

function collectNeighborPositions(
    auxiliaryId: string,
    connections: IRConnection[],
    skeletonNodes: Map<string, LayoutNode>,
): IRPosition[] {
    const positions: IRPosition[] = [];
    connections.forEach((connection) => {
        const neighborId =
            connection.from === auxiliaryId
                ? connection.to
                : connection.to === auxiliaryId
                  ? connection.from
                  : null;
        if (neighborId === null) return;
        const neighbor = skeletonNodes.get(neighborId);
        if (neighbor) positions.push(nodeCenter(neighbor));
    });
    return positions;
}

function nodeCenter(node: LayoutNode): IRPosition {
    return {
        x: node.position.x + node.size.width / 2,
        y: node.position.y + node.size.height / 2,
    };
}

function averagePositions(positions: IRPosition[]): IRPosition {
    const sum = positions.reduce(
        (accumulator, position) => ({
            x: accumulator.x + position.x,
            y: accumulator.y + position.y,
        }),
        { x: 0, y: 0 },
    );
    return { x: sum.x / positions.length, y: sum.y / positions.length };
}

function computeSkeletonCenter(
    skeletonNodes: Map<string, LayoutNode>,
): IRPosition {
    if (skeletonNodes.size === 0) return { x: 0, y: 0 };
    const centers = [...skeletonNodes.values()].map(nodeCenter);
    return averagePositions(centers);
}

const COINCIDENT_EPSILON = 1e-6;

export function computeRepulsion(
    positions: Map<string, IRPosition>,
    k: number,
): Map<string, IRPosition> {
    const displacement = initializeDisplacement(positions);
    const ids = [...positions.keys()];

    for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
            const idA = ids[i];
            const idB = ids[j];
            const positionA = positions.get(idA)!;
            const positionB = positions.get(idB)!;

            const deltaX = positionA.x - positionB.x;
            const deltaY = positionA.y - positionB.y;
            let distance = Math.hypot(deltaX, deltaY);

            let unitX: number;
            let unitY: number;
            if (distance < COINCIDENT_EPSILON) {
                // Jitter coincident nodes with a deterministic unit vector
                // derived from their ids so results are reproducible.
                const angle = hashAngle(idA + idB);
                unitX = Math.cos(angle);
                unitY = Math.sin(angle);
                distance = COINCIDENT_EPSILON;
            } else {
                unitX = deltaX / distance;
                unitY = deltaY / distance;
            }

            const magnitude = (k * k) / distance;
            const repulsionA = displacement.get(idA)!;
            const repulsionB = displacement.get(idB)!;
            repulsionA.x += unitX * magnitude;
            repulsionA.y += unitY * magnitude;
            repulsionB.x -= unitX * magnitude;
            repulsionB.y -= unitY * magnitude;
        }
    }

    return displacement;
}

function initializeDisplacement(
    positions: Map<string, IRPosition>,
): Map<string, IRPosition> {
    const displacement = new Map<string, IRPosition>();
    positions.forEach((_, id) => displacement.set(id, { x: 0, y: 0 }));
    return displacement;
}

function hashAngle(seed: string): number {
    let hash = 2166136261;
    for (let i = 0; i < seed.length; i++) {
        hash ^= seed.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    // Map to [0, 2π)
    return ((hash >>> 0) / 0xffffffff) * Math.PI * 2;
}
