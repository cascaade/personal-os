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

export interface ProjectResolver {
    getProject(commitment: Commitment): Commitment | undefined;
}

const RELEVANT_ROLES = new Set(["task", "project"]);

export function buildCommitmentTree(
    commitments: readonly Commitment[],
    resolver: ProjectResolver
): CommitmentTree {
    // Drop anything that isn't a task or project up front — this is what keeps
    // chains short and stops calendar entries from ever entering the tree.
    const relevant = commitments.filter((c) => RELEVANT_ROLES.has(c.role ?? ""));
    const relevantByPath = new Map(relevant.map((c) => [c.file.path, c]));

    const nodeByPath = new Map<string, CommitmentTreeNode>();
    const state = new Map<string, "done">();
    const allRoots: CommitmentTreeNode[] = [];

    const getNode = (c: Commitment): CommitmentTreeNode => {
        let node = nodeByPath.get(c.file.path);
        if (!node) {
            node = { commitment: c, children: [], error: false };
            nodeByPath.set(c.file.path, node);
        }
        return node;
    };

    // Single resolver call per commitment (previously this was called twice).
    const getParent = (c: Commitment): Commitment | undefined => {
        if (!c.projectPath) return undefined;
        const resolved = resolver.getProject(c);
        if (!resolved) return undefined;
        const parent = relevantByPath.get(resolved.file.path);
        if (!parent || parent.role === "task") return undefined;
        return parent;
    };

    for (const start of relevant) {
        if (state.get(start.file.path) === "done") continue;

        // `chain` stands in for the call stack in the old recursive version.
        const chain: Commitment[] = [];
        const chainSet = new Set<string>();
        let cur: Commitment | undefined = start;
        let terminal: CommitmentTreeNode;

        while (true) {
            const path = cur.file.path;

            if (state.get(path) === "done") {
                terminal = getNode(cur);
                break;
            }

            if (chainSet.has(path)) {
                const looper = chain[chain.length - 1];
                if (looper) {
                    const looperNode = getNode(looper);
                    looperNode.error = true;
                    state.set(looper.file.path, "done");
                    allRoots.push(looperNode);
                    chain.pop();
                    terminal = looperNode;
                } else {
                    // chain is empty — cur itself is the looper (cycle of length 1,
                    // i.e. a project referencing itself as its own project).
                    const node = getNode(cur);
                    node.error = true;
                    state.set(node.commitment.file.path, "done");
                    allRoots.push(node);
                    terminal = node;
                }
                break;
            }

            chain.push(cur);
            chainSet.add(path);

            const parent = getParent(cur);
            if (!parent) {
                const node = getNode(cur);
                state.set(path, "done");
                allRoots.push(node);
                chain.pop();
                terminal = node;
                break;
            }

            cur = parent;
        }

        for (let i = chain.length - 1; i >= 0; i--) {
            const item = chain[i];
            if (!item) continue;

            const node = getNode(item);
            terminal.children.push(node);
            state.set(item.file.path, "done");
            terminal = node;
        }
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

// Also iterative now, for the same reason — a very deep tree shouldn't be
// able to blow the stack just by sorting it.
export function sortTree(roots: CommitmentTreeNode[], newestFirst: boolean): CommitmentTreeNode[] {
    const sortedRoots = [...roots].sort((a, b) => compareByDue(a.commitment, b.commitment, newestFirst));

    const stack: CommitmentTreeNode[] = [...sortedRoots];
    while (stack.length > 0) {
        const node = stack.pop()!;
        node.children.sort((a, b) => compareByDue(a.commitment, b.commitment, newestFirst));
        for (const child of node.children) stack.push(child);
    }

    return sortedRoots;
}
