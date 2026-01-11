'use client';

import { useCallback } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MarkerType,
  Position,
  Handle,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// Custom node component for rule nodes
function RuleNode({ data }: { data: { label: string; description: string; status?: string } }) {
  const statusColors = {
    passed: 'border-green-500 bg-green-500/10',
    violated: 'border-red-500 bg-red-500/10',
    default: 'border-white/20 bg-white/5',
  };

  const status = data.status || 'default';
  const colorClass = statusColors[status as keyof typeof statusColors] || statusColors.default;

  return (
    <div className={`rounded-lg border px-4 py-3 ${colorClass}`}>
      <Handle type="target" position={Position.Top} className="!bg-blue-500" />
      <div className="text-sm font-medium text-white">{data.label}</div>
      <div className="mt-1 text-xs text-zinc-400">{data.description}</div>
      <Handle type="source" position={Position.Bottom} className="!bg-blue-500" />
    </div>
  );
}

function InputNode({ data }: { data: { label: string } }) {
  return (
    <div className="rounded-lg border border-blue-500/50 bg-blue-500/10 px-4 py-3">
      <div className="text-sm font-medium text-blue-400">{data.label}</div>
      <Handle type="source" position={Position.Bottom} className="!bg-blue-500" />
    </div>
  );
}

function OutputNode({ data }: { data: { label: string; approved?: boolean } }) {
  const colorClass =
    data.approved === true
      ? 'border-green-500 bg-green-500/10 text-green-400'
      : data.approved === false
        ? 'border-red-500 bg-red-500/10 text-red-400'
        : 'border-white/20 bg-white/5 text-white';

  return (
    <div className={`rounded-lg border px-4 py-3 ${colorClass}`}>
      <Handle type="target" position={Position.Top} className="!bg-blue-500" />
      <div className="text-sm font-medium">{data.label}</div>
    </div>
  );
}

const nodeTypes = {
  rule: RuleNode,
  input: InputNode,
  output: OutputNode,
};

interface RuleFlowProps {
  evaluationResult?: {
    approved: boolean;
    violations: { rule: string }[];
  };
}

export function RuleFlow({ evaluationResult }: RuleFlowProps) {
  const getNodeStatus = useCallback(
    (ruleName: string) => {
      if (!evaluationResult) return 'default';
      const isViolated = evaluationResult.violations.some((v) => v.rule === ruleName);
      return isViolated ? 'violated' : 'passed';
    },
    [evaluationResult]
  );

  const nodes: Node[] = [
    // Input
    {
      id: 'order',
      type: 'input',
      position: { x: 200, y: 0 },
      data: { label: 'Order + Discount Request' },
    },

    // Rule nodes
    {
      id: 'margin_floor',
      type: 'rule',
      position: { x: 0, y: 100 },
      data: {
        label: 'Margin Floor',
        description: 'Margin >= 15%',
        status: getNodeStatus('margin_floor'),
      },
    },
    {
      id: 'max_discount',
      type: 'rule',
      position: { x: 200, y: 100 },
      data: {
        label: 'Max Discount',
        description: 'Discount <= 25%',
        status: getNodeStatus('max_discount'),
      },
    },
    {
      id: 'volume_tier',
      type: 'rule',
      position: { x: 400, y: 100 },
      data: {
        label: 'Volume Tier',
        description: 'Qty-based limit',
        status: getNodeStatus('volume_tier'),
      },
    },

    // Output
    {
      id: 'result',
      type: 'output',
      position: { x: 200, y: 220 },
      data: {
        label: evaluationResult ? (evaluationResult.approved ? 'Approved' : 'Rejected') : 'Pending',
        approved: evaluationResult?.approved,
      },
    },
  ];

  const edges: Edge[] = [
    // Input to rules
    {
      id: 'e-order-margin',
      source: 'order',
      target: 'margin_floor',
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: '#3b82f6' },
    },
    {
      id: 'e-order-max',
      source: 'order',
      target: 'max_discount',
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: '#3b82f6' },
    },
    {
      id: 'e-order-volume',
      source: 'order',
      target: 'volume_tier',
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: '#3b82f6' },
    },

    // Rules to output
    {
      id: 'e-margin-result',
      source: 'margin_floor',
      target: 'result',
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: getNodeStatus('margin_floor') === 'violated' ? '#ef4444' : '#22c55e' },
      animated: evaluationResult !== undefined,
    },
    {
      id: 'e-max-result',
      source: 'max_discount',
      target: 'result',
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: getNodeStatus('max_discount') === 'violated' ? '#ef4444' : '#22c55e' },
      animated: evaluationResult !== undefined,
    },
    {
      id: 'e-volume-result',
      source: 'volume_tier',
      target: 'result',
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: getNodeStatus('volume_tier') === 'violated' ? '#ef4444' : '#22c55e' },
      animated: evaluationResult !== undefined,
    },
  ];

  return (
    <div className="h-[350px] w-full rounded-lg border border-white/10 bg-black/30">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#333" gap={20} />
        <Controls className="!bg-white/5 !border-white/10" showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
