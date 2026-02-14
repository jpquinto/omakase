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
    <div ref={containerRef} className="glass overflow-hidden rounded-oma-lg p-5">
      {/* Legend */}
      <div className="mb-4 flex items-center gap-5 px-1">
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
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        className="block w-full"
        style={{ maxHeight: "70vh" }}
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
            <polygon points="0 0, 10 3.5, 0 7" fill="rgba(255,255,255,0.25)" />
          </marker>
          <filter id="node-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" />
          </filter>
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
              stroke={isHighlighted ? "rgba(244,114,182,0.6)" : "rgba(255,255,255,0.08)"}
              strokeWidth={isHighlighted ? 2 : 1}
              markerEnd="url(#arrowhead)"
              opacity={hoveredNode === null || isHighlighted ? 1 : 0.2}
              className="transition-opacity duration-150"
            />
          );
        })}

        {/* Nodes */}
        {layout.nodes.map((node) => {
          const isHovered = hoveredNode === node.id;

          return (
            <g
              key={node.id}
              onMouseEnter={() => handleNodeHover(node.id)}
              onMouseLeave={() => handleNodeHover(null)}
              className="cursor-pointer"
              style={{
                opacity: hoveredNode === null || isHovered
                  ? 1
                  : layout.edges.some(
                      (e) =>
                        (e.from === hoveredNode && e.to === node.id) ||
                        (e.to === hoveredNode && e.from === node.id),
                    )
                  ? 1
                  : 0.35,
                transition: "opacity 150ms ease",
              }}
            >
              {/* Glow behind node on hover */}
              {isHovered && (
                <rect
                  x={node.x - node.width / 2 - 4}
                  y={node.y - node.height / 2 - 4}
                  width={node.width + 8}
                  height={node.height + 8}
                  rx={16}
                  fill={statusColor(node.status)}
                  opacity={0.15}
                  filter="url(#node-glow)"
                />
              )}
              {/* Node body — dark glass surface */}
              <rect
                x={node.x - node.width / 2}
                y={node.y - node.height / 2}
                width={node.width}
                height={node.height}
                rx={12}
                fill="rgba(15, 15, 20, 0.7)"
                stroke={isHovered ? statusColor(node.status) : "rgba(255,255,255,0.08)"}
                strokeWidth={isHovered ? 1.5 : 1}
              />
              {/* Left accent bar */}
              <rect
                x={node.x - node.width / 2}
                y={node.y - node.height / 2}
                width={4}
                height={node.height}
                rx={2}
                fill={statusColor(node.status)}
                opacity={0.8}
              />
              {/* Status dot */}
              <circle
                cx={node.x - node.width / 2 + 18}
                cy={node.y}
                r={3.5}
                fill={statusColor(node.status)}
              />
              {/* Node label */}
              <text
                x={node.x - node.width / 2 + 30}
                y={node.y + 1}
                textAnchor="start"
                dominantBaseline="central"
                className="text-xs font-medium"
                fill="rgba(255,255,255,0.85)"
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
