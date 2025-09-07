import type { CurvyPlan } from "@/planner/plan";

// Very simple Graphviz (DOT) generator for CurvyPlan
// - serial: linear edges between children
// - parallel: edges from a parallel hub to children
// - command: node with label "command: name" and optional amount
// - data: node with label "data[n]" if it's an array-like, otherwise "data"
// Returns a full DOT graph string.
export function planToGraphviz(plan: CurvyPlan, options?: { graphName?: string }): string {
  const lines: string[] = [];
  const name = options?.graphName ?? "CurvyPlan";
  lines.push(`digraph ${sanitizeId(name)} {`);
  lines.push("  rankdir=LR;");

  let idCounter = 0;
  const nextId = () => `n${idCounter++}`;

  function addNode(id: string, label: string, shape?: string) {
    const shapeAttr = shape ? `, shape=${shape}` : "";
    lines.push(`  ${id} [label=${quote(label)}${shapeAttr}];`);
  }
  function addEdge(from: string, to: string, label?: string) {
    const labelAttr = label ? ` [label=${quote(label)}]` : "";
    lines.push(`  ${from} -> ${to}${labelAttr};`);
  }

  type Ports = { entry: string; exit: string };
  function visit(node: CurvyPlan): Ports {
    if (node.type === "command") {
      const id = nextId();
      const label = node.amount !== undefined ? `command: ${node.name}\\namount: ${node.amount.toString()}` : `command: ${node.name}`;
      addNode(id, label, "box");
      return { entry: id, exit: id };
    }
    if (node.type === "data") {
      const id = nextId();
      // Try to detect array-like data for compact label
      let label = "data";
      try {
        const anyData: any = node.data as any;
        if (Array.isArray(anyData)) {
          label = `data[${anyData.length}]`;
        } else if (anyData && typeof anyData === "object" && Symbol.iterator in anyData) {
          // iterable
          const arr = Array.from(anyData as Iterable<any>);
          label = `data[${arr.length}]`;
        }
      } catch {
        // keep default
      }
      addNode(id, label, "ellipse");
      return { entry: id, exit: id };
    }
    // flow control
    if (node.type === "serial") {
      // Render serial as a cluster (single box) with chained internal items
      const clusterId = `cluster_${nextId()}`;
      lines.push(`  subgraph ${clusterId} {`);
      lines.push(`    label=${quote("serial")} ;`);
      lines.push(`    style=rounded;`);
      lines.push(`    color=gray;`);
      // Create invisible entry and exit nodes to connect from/to outside while keeping a single box look
      const entry = nextId();
      const exit = nextId();
      lines.push(`    ${entry} [label="", shape=point, width=0.01];`);
      lines.push(`    ${exit} [label="", shape=point, width=0.01];`);

      let first: Ports | undefined;
      let prev: Ports | undefined;
      for (const item of node.items) {
        const child = visit(item);
        if (!first) first = child;
        if (prev) addEdge(prev.exit, child.entry);
        prev = child;
      }
      if (first) {
        addEdge(entry, first.entry);
      }
      if (prev) {
        addEdge(prev.exit, exit);
      } else {
        addEdge(entry, exit);
      }
      lines.push("  }");
      return { entry, exit };
    }
    if (node.type === "parallel") {
      const hub = nextId();
      addNode(hub, "parallel", "diamond");

      const childIds: string[] = [];
      for (const item of node.items) {
        const child = visit(item);
        childIds.push(child.entry);
        addEdge(hub, child.entry);
      }
      // Encourage a true fan-out by keeping parallel children on the same rank
      if (childIds.length > 1) {
        lines.push(`  { rank=same; ${childIds.join("; ")}; }`);
      }
      return { entry: hub, exit: hub };
    }
    // Should never happen, but TypeScript exhaustive check guard
    const id = nextId();
    addNode(id, "unknown", "circle");
    return { entry: id, exit: id };
  }

  const root = visit(plan);
  // Keep references for debugging/anchoring
  lines.push(`  // root entry: ${root.entry}, root exit: ${root.exit}`);
  lines.push("}");
  return lines.join("\n");
}

function quote(s: string): string {
  // simple quoting, escape double quotes and backslashes
  return '"' + s.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
}
function sanitizeId(s: string): string {
  return s.replace(/[^A-Za-z0-9_]/g, "_");
}
