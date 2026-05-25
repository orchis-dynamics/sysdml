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
