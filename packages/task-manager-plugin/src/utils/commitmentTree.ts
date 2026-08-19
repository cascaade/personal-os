// src/utils/commitmentTree.ts
import { Commitment } from "@personal-os/obsidian/dist/services/CommitmentsProvider";

export interface ProgressInfo {
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

export interface CommitmentTreeNode {
    commitment: Commitment;
    children: CommitmentTreeNode[];
    error: boolean;
    overdue: boolean;
    effective: EffectiveFields;
}

export interface CommitmentTree {
    roots: CommitmentTreeNode[];          // tasks + projects that have children
    childlessProjects: CommitmentTreeNode[]; // projects with zero children — separate table
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
            node = { commitment: c, children: [], error: false, overdue: false, effective: EMPTY_EFFECTIVE };
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

    attachEffectiveFields(allRoots);

    const roots: CommitmentTreeNode[] = [];
    const childlessProjects: CommitmentTreeNode[] = [];
    for (const node of allRoots) {
        if (node.commitment.role === "project" && node.children.length === 0) {
            childlessProjects.push(node);
        } else {
            roots.push(node); // bare tasks (always childless) land here, at top level
        }
    }

    return { roots, childlessProjects };
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
                stack.pop();
                const eff = computeEffective(frame.node);
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
        return {
            progress: { done: c.status === "done" ? 1 : 0, total: 1 },
            priority: c.priority,
            start: c.start,
            due: c.due,
            status: c.status,
        };
    }

    let doneSum = 0;
    let totalSum = 0;
    let earliestStart: Date | undefined;
    let latestDue: Date | undefined;
    let bestPriorityRank = -1;
    let bestPriority: string | undefined;
    let anyInProgress = false;

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

        if (eff.status === "in-progress") anyInProgress = true;
    }

    let inferredStatus: string;
    if (totalSum > 0 && doneSum === totalSum) inferredStatus = "done";
    else if (doneSum > 0 || anyInProgress) inferredStatus = "in-progress";
    else inferredStatus = "not-started";

    return {
        progress: { done: doneSum, total: totalSum },
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
        for (const child of node.children) stack.push(child);
    }

    return sortedRoots;
}

// upcoming: not-yet-past, OR overdue (still outstanding work).
// past: actually in the past AND resolved (done/suspended) — i.e. history.
// A node with no descendants matching stays hidden, but its ancestor chain
// is preserved so context (which project it's under) doesn't get orphaned.
export function filterTreeForView(
    nodes: CommitmentTreeNode[],
    viewMode: "upcoming" | "past"
): CommitmentTreeNode[] {
    const now = Date.now();

    const matches = (node: CommitmentTreeNode): boolean => {
        const due = node.effective.due?.getTime();
        if (viewMode === "upcoming") {
            return due == null || due >= now || node.overdue;
        }
        return due != null && due < now && !node.overdue;
    };

    const filterList = (list: CommitmentTreeNode[]): CommitmentTreeNode[] => {
        const result: CommitmentTreeNode[] = [];
        for (const node of list) {
            const filteredChildren = filterList(node.children);
            if (matches(node) || filteredChildren.length > 0) {
                result.push({ ...node, children: filteredChildren });
            }
        }
        return result;
    };

    return filterList(nodes);
}
