"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import dagre from "dagre";

// ---------------------------------------------------------------------------
// Dependency Graph Component
//
// Uses dagre for automatic graph layout and renders an SVG-based directed
// graph of features. Nodes are colored by status and edges represent
// dependency relationships. Styled with the Omakase liquid glass design
// system for glass surfaces and soft color accents.
// ---------------------------------------------------------------------------

interface GraphFeature {
  id: string;
  name: string;
  status: "pending" | "in_progress" | "passing" | "failing";
  dependencies: string[];
}

const MOCK_GRAPH_FEATURES: GraphFeature[] = [
  { id: "f1", name: "User Auth", status: "passing", dependencies: [] },
  { id: "f2", name: "Database Schema", status: "passing", dependencies: [] },
  { id: "f3", name: "Product Listing", status: "passing", dependencies: ["f2"] },
  { id: "f4", name: "Shopping Cart", status: "in_progress", dependencies: ["f1", "f3"] },
  { id: "f5", name: "Checkout Flow", status: "pending", dependencies: ["f4", "f6"] },
  { id: "f6", name: "Payment Integration", status: "pending", dependencies: ["f1", "f2"] },
  { id: "f7", name: "Order History", status: "pending", dependencies: ["f5", "f1"] },
  { id: "f8", name: "Search & Filters", status: "in_progress", dependencies: ["f3"] },
  { id: "f9", name: "Email Notifications", status: "failing", dependencies: ["f1"] },
  { id: "f10", name: "Admin Dashboard", status: "pending", dependencies: ["f1", "f2", "f3", "f7"] },
];

/** Maps feature status to fill color using Omakase status tokens */
function statusColor(status: GraphFeature["status"]): string {
  const colors: Record<GraphFeature["status"], string> = {
    pending: "#fbbf24",     // oma-pending
    in_progress: "#38bdf8", // oma-progress
    passing: "#4ade80",     // oma-done
    failing: "#f87171",     // oma-fail
  };
  return colors[status];
}

/** Maps feature status to a readable label */
function statusLabel(status: GraphFeature["status"]): string {
  const labels: Record<GraphFeature["status"], string> = {
    pending: "Pending",
    in_progress: "In Progress",
    passing: "Passing",
    failing: "Failing",
  };
  return labels[status];
}

interface LayoutNode {
  id: string;
  name: string;
  status: GraphFeature["status"];
  x: number;
  y: number;
  width: number;
  height: number;
}

interface LayoutEdge {
  from: string;
  to: string;
  points: Array<{ x: number; y: number }>;
}

/**
 * Computes the dagre layout for the feature dependency graph.
 * Returns positioned nodes and routed edges.
 */
function computeLayout(features: GraphFeature[]): {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  width: number;
  height: number;
} {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "TB", nodesep: 60, ranksep: 80, marginx: 40, marginy: 40 });
  g.setDefaultEdgeLabel(() => ({}));

  const nodeWidth = 160;
  const nodeHeight = 60;

  for (const feature of features) {
    g.setNode(feature.id, { width: nodeWidth, height: nodeHeight });
  }

  for (const feature of features) {
    for (const dep of feature.dependencies) {
      // Edge goes from dependency -> dependent (dep must complete first)
      g.setEdge(dep, feature.id);
    }
  }

  dagre.layout(g);

  const nodes: LayoutNode[] = features.map((feature) => {
    const node = g.node(feature.id);
    return {
      id: feature.id,
      name: feature.name,
      status: feature.status,
      x: node.x,
      y: node.y,
      width: nodeWidth,
      height: nodeHeight,
    };
  });

  const edges: LayoutEdge[] = g.edges().map((e) => {
    const edge = g.edge(e);
    return {
      from: e.v,
      to: e.w,
      points: edge.points as Array<{ x: number; y: number }>,
    };
  });

  const graphInfo = g.graph();
  const width = (graphInfo.width ?? 800) + 80;
  const height = (graphInfo.height ?? 600) + 80;

  return { nodes, edges, width, height };
}

/** Converts an array of points into an SVG path d-string for a smooth curve */
function pointsToPath(points: Array<{ x: number; y: number }>): string {
  if (points.length < 2) return "";

  const parts: string[] = [`M ${points[0].x} ${points[0].y}`];

  if (points.length === 2) {
    parts.push(`L ${points[1].x} ${points[1].y}`);
  } else {
    // Use quadratic bezier curves through intermediate points
    for (let i = 1; i < points.length - 1; i++) {
      const curr = points[i];
      const next = points[i + 1];
      const midX = (curr.x + next.x) / 2;
      const midY = (curr.y + next.y) / 2;
      parts.push(`Q ${curr.x} ${curr.y} ${midX} ${midY}`);
    }
    const last = points[points.length - 1];
    parts.push(`L ${last.x} ${last.y}`);
  }

  return parts.join(" ");
}

export function DependencyGraph() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<ReturnType<typeof computeLayout> | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  useEffect(() => {
    setLayout(computeLayout(MOCK_GRAPH_FEATURES));
  }, []);

  const handleNodeHover = useCallback((id: string | null) => {
    setHoveredNode(id);
  }, []);

  if (!layout) {
    return (
      <div className="flex h-96 items-center justify-center">
        <span className="text-sm font-medium text-oma-text-subtle">
          Computing layout...
        </span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="glass overflow-auto rounded-oma-lg p-4">
      {/* Legend */}
      <div className="mb-3 flex items-center gap-4 px-2">
        {(["pending", "in_progress", "passing", "failing"] as const).map((status) => (
          <div key={status} className="flex items-center gap-1.5">
            <div
              className="h-3 w-3 rounded-oma-full"
              style={{ backgroundColor: statusColor(status) }}
            />
            <span className="text-[11px] font-medium text-oma-text-muted">
              {statusLabel(status)}
            </span>
          </div>
        ))}
      </div>

      {/* SVG graph */}
      <svg
        width={layout.width}
        height={layout.height}
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        className="block"
      >
        {/* Arrow marker definition */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="10"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
          </marker>
        </defs>

        {/* Edges */}
        {layout.edges.map((edge, i) => {
          const isHighlighted =
            hoveredNode !== null &&
            (edge.from === hoveredNode || edge.to === hoveredNode);

          return (
            <path
              key={`edge-${i}`}
              d={pointsToPath(edge.points)}
              fill="none"
              stroke={isHighlighted ? "#f472b6" : "rgba(255,255,255,0.15)"}
              strokeWidth={isHighlighted ? 2.5 : 1.5}
              markerEnd="url(#arrowhead)"
              opacity={hoveredNode === null || isHighlighted ? 1 : 0.2}
              className="transition-opacity duration-150"
            />
          );
        })}

        {/* Nodes */}
        {layout.nodes.map((node) => {
          const isHovered = hoveredNode === node.id;
          const rx = 12; // rounded-oma corners

          return (
            <g
              key={node.id}
              onMouseEnter={() => handleNodeHover(node.id)}
              onMouseLeave={() => handleNodeHover(null)}
              className="cursor-pointer"
              opacity={
                hoveredNode === null || isHovered
                  ? 1
                  : layout.edges.some(
                      (e) =>
                        (e.from === hoveredNode && e.to === node.id) ||
                        (e.to === hoveredNode && e.from === node.id),
                    )
                  ? 1
                  : 0.35
              }
            >
              {/* Subtle soft shadow */}
              <rect
                x={node.x - node.width / 2 + 2}
                y={node.y - node.height / 2 + 2}
                width={node.width}
                height={node.height}
                rx={rx}
                fill="rgba(0,0,0,0.15)"
              />
              {/* Node body */}
              <rect
                x={node.x - node.width / 2}
                y={node.y - node.height / 2}
                width={node.width}
                height={node.height}
                rx={rx}
                fill={statusColor(node.status)}
                stroke="rgba(255,255,255,0.1)"
                strokeWidth={1}
              />
              {/* Node label */}
              <text
                x={node.x}
                y={node.y + 1}
                textAnchor="middle"
                dominantBaseline="central"
                className="text-xs font-bold"
                fill="#ffffff"
                style={{ textShadow: "0 1px 3px rgba(0,0,0,0.4)" }}
              >
                {node.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
