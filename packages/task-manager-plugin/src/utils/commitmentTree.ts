// src/utils/commitmentTree.ts
import { Commitment } from "@personal-os/obsidian/dist/services/CommitmentsProvider";

export interface ProgressInfo {
    done: number;
    total: number;
}

export interface EffectiveFields {
    progress: ProgressInfo;      // rolled up from all descendant tasks; for a leaf, itself counts as 1
    priority?: string;           // own value if set, else inferred
    start?: Date;                // own value if set, else inferred
    due?: Date;                  // own value if set, else inferred
}

export interface CommitmentTreeNode {
    commitment: Commitment;
    children: CommitmentTreeNode[];
    error: boolean;
    effective: EffectiveFields;
}

export interface CommitmentTree {
    roots: CommitmentTreeNode[];
    childlessRoots: CommitmentTreeNode[];
}

export interface ProjectResolver {
    getProject(commitment: Commitment): Commitment | undefined;
}

const RELEVANT_ROLES = new Set(["task", "project"]);
const PRIORITY_ORDER = ["lowest", "low", "medium", "high", "highest"];

function priorityRank(p?: string): number {
    return p ? PRIORITY_ORDER.indexOf(p) : -1;
}

const EMPTY_EFFECTIVE: EffectiveFields = { progress: { done: 0, total: 0 } };

export function buildCommitmentTree(
    commitments: readonly Commitment[],
    resolver: ProjectResolver
): CommitmentTree {
    const relevant = commitments.filter((c) => RELEVANT_ROLES.has(c.role ?? ""));
    const relevantByPath = new Map(relevant.map((c) => [c.file.path, c]));

    const nodeByPath = new Map<string, CommitmentTreeNode>();
    const state = new Map<string, "done">();
    const allRoots: CommitmentTreeNode[] = [];

    const getNode = (c: Commitment): CommitmentTreeNode => {
        let node = nodeByPath.get(c.file.path);
        if (!node) {
            node = { commitment: c, children: [], error: false, effective: EMPTY_EFFECTIVE };
            nodeByPath.set(c.file.path, node);
        }
        return node;
    };

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

        const chain: Commitment[] = [];
        const chainSet = new Set<string>();
        let cur: Commitment | undefined = start;
        let terminal: CommitmentTreeNode;

        while (true) {
            const path = cur!.file.path;

            if (state.get(path) === "done") {
                terminal = getNode(cur!);
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
                    const node = getNode(cur);
                    node.error = true;
                    state.set(node.commitment.file.path, "done");
                    allRoots.push(node);
                    terminal = node;
                }
                break;
            }

            chain.push(cur!);
            chainSet.add(path);

            const parent = getParent(cur);
            if (!parent) {
                const node = getNode(cur!);
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

    // Bottom-up pass: fills in `effective` for every node, project rollups
    // included. Iterative post-order — same reason as the climb above, a
    // deep tree shouldn't be able to blow the call stack.
    attachEffectiveFields(allRoots);

    const roots: CommitmentTreeNode[] = [];
    const childlessRoots: CommitmentTreeNode[] = [];
    for (const node of allRoots) {
        (node.children.length > 0 ? roots : childlessRoots).push(node);
    }

    return { roots, childlessRoots };
}

function attachEffectiveFields(topNodes: CommitmentTreeNode[]) {
    for (const top of topNodes) {
        const stack: { node: CommitmentTreeNode; visited: boolean }[] = [{ node: top, visited: false }];

        while (stack.length > 0) {
            const frame = stack[stack.length - 1]!;

            if (!frame.visited) {
                frame.visited = true;
                for (const child of frame.node.children) {
                    stack.push({ node: child, visited: false });
                }
            } else {
                stack.pop();
                frame.node.effective = computeEffective(frame.node);
            }
        }
    }
}

function computeEffective(node: CommitmentTreeNode): EffectiveFields {
    const c = node.commitment;

    // Leaf (a task, or a project with no children): nothing to roll up from,
    // so "effective" is just its own fields. Its own completion counts as
    // one unit toward whatever parent aggregates it.
    if (node.children.length === 0) {
        return {
            progress: { done: c.status === "done" ? 1 : 0, total: 1 },
            priority: c.priority,
            start: c.start,
            due: c.due,
        };
    }

    let doneSum = 0;
    let totalSum = 0;
    let earliestStart: Date | undefined;
    let latestDue: Date | undefined;
    let bestPriorityRank = -1;
    let bestPriority: string | undefined;

    for (const child of node.children) {
        const eff = child.effective;

        doneSum += eff.progress.done;
        totalSum += eff.progress.total;

        if (eff.start && (!earliestStart || eff.start.getTime() < earliestStart.getTime())) {
            earliestStart = eff.start;
        }
        if (eff.due && (!latestDue || eff.due.getTime() > latestDue.getTime())) {
            latestDue = eff.due;
        }

        const rank = priorityRank(eff.priority);
        if (rank > bestPriorityRank) {
            bestPriorityRank = rank;
            bestPriority = eff.priority;
        }
    }

    return {
        progress: { done: doneSum, total: totalSum },
        priority: c.priority ?? bestPriority, // own value wins — that's the override
        start: c.start ?? earliestStart,
        due: c.due ?? latestDue,
    };
}

function compareByEffectiveDue(a: CommitmentTreeNode, b: CommitmentTreeNode, newestFirst: boolean): number {
    const aTime = a.effective.due?.getTime();
    const bTime = b.effective.due?.getTime();
    if (aTime == null && bTime == null) return 0;
    if (aTime == null) return 1;
    if (bTime == null) return -1;
    return newestFirst ? bTime - aTime : aTime - bTime;
}

export function sortTree(roots: CommitmentTreeNode[], newestFirst: boolean): CommitmentTreeNode[] {
    const sortedRoots = [...roots].sort((a, b) => compareByEffectiveDue(a, b, newestFirst));

    const stack: CommitmentTreeNode[] = [...sortedRoots];
    while (stack.length > 0) {
        const node = stack.pop()!;
        node.children.sort((a, b) => compareByEffectiveDue(a, b, newestFirst));
        for (const child of node.children) stack.push(child);
    }

    return sortedRoots;
}
