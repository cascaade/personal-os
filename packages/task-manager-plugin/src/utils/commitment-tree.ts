// src/utils/commitmentTree.ts
import { Commitment } from "@personal-os/obsidian/dist/services/CommitmentsProvider";

export interface ProgressInfo {
    inProgress: number;
    done: number;
    total: number;
}

export interface EffectiveFields {
    progress: ProgressInfo;
    priority?: string;
    start?: Date;
    due?: Date;
    status?: string; // own value if set, else inferred from children
}

export interface CommitmentTree {
    roots: CommitmentTreeNode[];
    commCount: number;
}

export interface CommitmentTreeNode {
    commitment: Commitment;
    children: CommitmentTreeNode[];
    error: boolean;
    overdue: boolean;
    effective: EffectiveFields;
}

export interface ProjectResolver {
    getProject(commitment: Commitment): Commitment | undefined;
}

const RELEVANT_ROLES = new Set(["task", "project"]);
const PRIORITY_ORDER = ["lowest", "low", "medium", "high", "highest"];
const NOT_OVERDUE_STATUSES = new Set(["done", "suspended"]);

function priorityRank(p?: string): number {
    return p ? PRIORITY_ORDER.indexOf(p) : -1;
}

const EMPTY_EFFECTIVE: EffectiveFields = { progress: { inProgress: 0, done: 0, total: 0 } };

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
            node = { commitment: c, children: [], error: false, overdue: false, effective: EMPTY_EFFECTIVE };
            nodeByPath.set(c.file.path, node);
        }

        return node;
    };

    const getParent = (c: Commitment): Commitment | undefined => {
        if (!c.projectPath) return undefined;

        const resolved = resolver.getProject(c);
        if (!resolved) return undefined;

        return resolved;
    };

    for (const ep of relevant) {
        if (state.get(ep.file.path) === "done") continue;

        const chain: Commitment[] = [];
        const chainSet = new Set<string>();
        let cur: Commitment | undefined = ep;
        let terminal: CommitmentTreeNode;

        while (true) {
            const path = cur.file.path;

            if (state.get(path) === "done") {
                terminal = getNode(cur);
                break;
            }

            // if loops (parent is already a descendant)
            if (chainSet.has(path)) {
                const looper = chain.at(-1);
                if (!looper) throw new Error("Loop detected with empty chain");

                const looperNode = getNode(looper);

                looperNode.error = true;
                state.set(looper.file.path, "done");
                allRoots.push(looperNode);
                chain.pop();
                terminal = looperNode;
                break;
            }
            // if (chainSet.has(path)) {
            //     const looper = chain[chain.length - 1];
            //     if (looper) {
            //         const looperNode = getNode(looper);
            //         looperNode.error = true;
            //         state.set(looper.file.path, "done");
            //         allRoots.push(looperNode);
            //         chain.pop();
            //         terminal = looperNode;
            //     } else {
            //         console.warn("Error caught: no `looper`");
            //
            //         const node = getNode(cur);
            //         node.error = true;
            //         state.set(node.commitment.file.path, "done");
            //         allRoots.push(node);
            //         terminal = node;
            //     }
            //     break;
            // }

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

    attachEffectiveFields(allRoots);

    const roots: CommitmentTreeNode[] = [];
    for (const node of allRoots) {
        roots.push(node);
    }

    return { roots, commCount: relevant.filter((c) => c.role !== "project").length };
}

function attachEffectiveFields(topNodes: CommitmentTreeNode[]) {
    const now = Date.now();

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
                console.log("computing " + frame.node.commitment.file.path);

                stack.pop();
                const eff = computeEffective(frame.node);

                console.log(eff);

                frame.node.effective = eff;
                frame.node.overdue =
                    eff.due != null &&
                    eff.due.getTime() < now &&
                    !NOT_OVERDUE_STATUSES.has(eff.status ?? "");
            }
        }
    }
}

function computeEffective(node: CommitmentTreeNode): EffectiveFields {
    const c = node.commitment;

    if (node.children.length === 0) {
        const isDone = c.status === "done";
        const total = c.status === "suspended" ? 0 :
            c.role === "project"
                ? (isDone ? 1 : 0)
                : 1;

        return {
            progress: { inProgress: c.status === "in-progress" ? 1 : 0, done: isDone ? 1 : 0, total: total },
            priority: c.priority,
            start: c.start,
            due: c.due,
            status: c.status,
        };
    }

    let inProgressSum = 0;
    let doneSum = 0;
    let totalSum = 0;
    let earliestStart: Date | undefined;
    let latestDue: Date | undefined;
    let bestPriorityRank = -1;
    let bestPriority: string | undefined;

    console.warn(node.commitment.file.path);

    for (const child of node.children) {
        const eff = child.effective;

        console.log(child.commitment.file.path, eff.progress.total);

        inProgressSum += eff.progress.inProgress;
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

    let inferredStatus: string;
    if (totalSum > 0 && doneSum === totalSum) inferredStatus = "done";
    else if (doneSum > 0 || inProgressSum > 0) inferredStatus = "in-progress";
    else inferredStatus = "not-started";

    return {
        progress: { inProgress: inProgressSum, done: doneSum, total: totalSum },
        priority: c.priority ?? bestPriority,
        start: c.start ?? earliestStart,
        due: c.due ?? latestDue,
        status: c.status ?? inferredStatus,
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
        for (const child of node.children) stack.push(child); // add children to stack so that their children get sorted; recursion without recursion lol
    }

    return sortedRoots;
}

// upcoming: not-yet-past, OR overdue (still outstanding work).
// past: actually in the past AND resolved (done/suspended) — i.e. history.
// A node with no descendants matching stays hidden, but its ancestor chain
// is preserved so context (which project it's under) doesn't get orphaned.
export function filterTreeForView(
    nodes: CommitmentTreeNode[],
    viewMode: "upcoming" | "past" | "goals"
): { roots: CommitmentTreeNode[]; count: number } {
    const now = Date.now();
    const today = Math.floor(now / (1000 * 60 * 60 * 24));

    const matches = (node: CommitmentTreeNode): boolean => {
        if (node.commitment.role === "project") return false;

        const due = node.effective.due?.getTime();
        const dueDay = Math.floor((due ?? 0) / (1000 * 60 * 60 * 24));

        if (viewMode === "upcoming") {
            return due == null || dueDay >= today || node.overdue;
        }
        return due != null && dueDay < today && !node.overdue;
    };

    //~~ filter list ~~//

    type StackItem = { node: CommitmentTreeNode; parentId: number };
    const ROOT = -1;

    let commCount = 0;

    // 1. Iterative traversal, assigning each node a numeric id.
    //    Push children in reverse so they pop in original order.
    const stack: StackItem[] = [];
    for (let i = nodes.length - 1; i >= 0; i--) {
        stack.push({ node: nodes[i]!, parentId: ROOT });
    }

    const order: { node: CommitmentTreeNode; id: number; parentId: number }[] = [];
    let nextId = 0;

    while (stack.length > 0) {
        const { node, parentId } = stack.pop()!;
        const id = nextId++;
        order.push({ node, id, parentId });
        for (let i = node.children.length - 1; i >= 0; i--) {
            stack.push({ node: node.children[i]!, parentId: id });
        }
    }

    // 2. Walk backwards so every child is handled before its parent.
    const childrenById = new Map<number, CommitmentTreeNode[]>();

    for (let i = order.length - 1; i >= 0; i--) {
        const { node, id, parentId } = order[i]!;
        const filteredChildren = (childrenById.get(id) ?? []).reverse();

        if (viewMode === "goals") {
            if ((node.commitment.role === "project" && filteredChildren.length === 0) || filteredChildren.length > 0) {
                const filteredNode: CommitmentTreeNode = { ...node, children: filteredChildren };
                const siblings = childrenById.get(parentId) ?? [];
                siblings.push(filteredNode);
                childrenById.set(parentId, siblings);
            }

            continue;
        }

        if (matches(node) || filteredChildren.length > 0) {
            const filteredNode: CommitmentTreeNode = { ...node, children: filteredChildren };
            const siblings = childrenById.get(parentId) ?? [];

            if (filteredChildren.length === 0) commCount++;

            siblings.push(filteredNode);
            childrenById.set(parentId, siblings);
        }
    }

    return {
        roots: ( childrenById.get(ROOT) ?? [] ).reverse(),
        count: commCount,
    };
}
