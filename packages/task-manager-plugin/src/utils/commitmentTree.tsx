// src/utils/commitmentTree.ts
import { Commitment } from "@personal-os/obsidian/dist/services/CommitmentsProvider";

export interface CommitmentTreeNode {
    commitment: Commitment;
    children: CommitmentTreeNode[];
    error: boolean;
}

export interface CommitmentTree {
    roots: CommitmentTreeNode[];
    childlessRoots: CommitmentTreeNode[];
}

type NodeState = "in-progress" | "done";

// Only what we need from CommitmentsProvider — keeps this testable without a real ctx.
export interface ProjectResolver {
    getProject(commitment: Commitment): Commitment | undefined;
}

export function buildCommitmentTree(
    commitments: readonly Commitment[],
    resolver: ProjectResolver
): CommitmentTree {
    const nodeByPath = new Map<string, CommitmentTreeNode>();
    const state = new Map<string, NodeState>();
    const allRoots: CommitmentTreeNode[] = [];

    const getNode = (c: Commitment): CommitmentTreeNode => {
        let node = nodeByPath.get(c.file.path);
        if (!node) {
            node = { commitment: c, children: [], error: false };
            nodeByPath.set(c.file.path, node);
        }
        return node;
    };

    // No project link, link doesn't resolve, or resolved project's role is "task" -> no parent.
    const hasNoParent = (c: Commitment): boolean => {
        if (!c.projectPath) return true;
        const parent = resolver.getProject(c);
        return !parent || parent.role === "task";
    };

    const resolve = (c: Commitment): CommitmentTreeNode => {
        const path = c.file.path;
        const node = getNode(c);

        if (state.get(path) === "done") return node;

        if (hasNoParent(c)) {
            state.set(path, "done");
            allRoots.push(node);
            return node;
        }

        const parent = resolver.getProject(c)!;

        if (state.get(parent.file.path) === "in-progress") {
            node.error = true;
            state.set(path, "done");
            allRoots.push(node);
            return node;
        }

        state.set(path, "in-progress");
        const parentNode = resolve(parent);
        parentNode.children.push(node);
        state.set(path, "done");
        return node;
    };

    for (const c of commitments) {
        if (state.get(c.file.path) !== "done") resolve(c);
    }

    const roots: CommitmentTreeNode[] = [];
    const childlessRoots: CommitmentTreeNode[] = [];
    for (const node of allRoots) {
        (node.children.length > 0 ? roots : childlessRoots).push(node);
    }

    return { roots, childlessRoots };
}

function compareByDue(a: Commitment, b: Commitment, newestFirst: boolean): number {
    const aTime = a.due?.getTime();
    const bTime = b.due?.getTime();
    if (aTime == null && bTime == null) return 0;
    if (aTime == null) return 1;
    if (bTime == null) return -1;
    return newestFirst ? bTime - aTime : aTime - bTime;
}

export function sortTree(nodes: CommitmentTreeNode[], newestFirst: boolean): CommitmentTreeNode[] {
    const sorted = [...nodes].sort((a, b) => compareByDue(a.commitment, b.commitment, newestFirst));
    for (const node of sorted) node.children = sortTree(node.children, newestFirst);
    return sorted;
}
