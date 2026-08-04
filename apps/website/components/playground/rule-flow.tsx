'use client';

import { useCallback, useMemo, type ReactNode } from 'react';
import {
  classifyPolicyRuleNames,
  defaultPolicy,
  extractPolicyThresholds,
  type Policy,
} from '@guardrail-sim/policy-engine';
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
  /** The policy to describe. Defaults to the playground's policy. */
  policy?: Policy;
}

export function RuleFlow({ evaluationResult, policy = defaultPolicy }: RuleFlowProps): ReactNode {
  // Read the thresholds off the policy rather than restating them, so the diagram can
  // never show limits that differ from what evaluation actually enforces.
  const { marginFloor, maxDiscount, volumeTiers } = useMemo(
    () => extractPolicyThresholds(policy),
    [policy]
  );

  // A policy can name its rules anything; classify by the fact each rule reads (the
  // same routing extractPolicyThresholds uses) rather than assuming a custom policy's
  // margin rule is literally named "margin_floor". Without this, a renamed rule's
  // violations never matched the node lookup and that node stayed "passed" when rejected.
  const ruleNames = useMemo(() => classifyPolicyRuleNames(policy), [policy]);

  const pct = (v: number): string => `${(v * 100).toFixed(0)}%`;
  const steppedTier = volumeTiers.find((t) => t.minQuantity > 0);
  const baseTier = volumeTiers.find((t) => t.minQuantity === 0);

  const getNodeStatus = useCallback(
    (dimension: keyof typeof ruleNames) => {
      if (!evaluationResult) return 'default';
      const names = ruleNames[dimension];
      const isViolated = evaluationResult.violations.some((v) => names.includes(v.rule));
      return isViolated ? 'violated' : 'passed';
    },
    [evaluationResult, ruleNames]
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
        description:
          marginFloor !== undefined ? `Margin >= ${pct(marginFloor)}` : 'Minimum margin enforced',
        status: getNodeStatus('marginFloor'),
      },
    },
    {
      id: 'max_discount',
      type: 'rule',
      position: { x: 200, y: 100 },
      data: {
        label: 'Max Discount',
        description:
          maxDiscount !== undefined ? `Discount <= ${pct(maxDiscount)}` : 'Absolute discount cap',
        status: getNodeStatus('maxDiscount'),
      },
    },
    {
      id: 'volume_tier',
      type: 'rule',
      position: { x: 400, y: 100 },
      data: {
        label: 'Volume Tier',
        description:
          steppedTier && baseTier
            ? `${pct(baseTier.maxDiscount)}, ${pct(steppedTier.maxDiscount)} at ${steppedTier.minQuantity}+`
            : 'Qty-based limit',
        status: getNodeStatus('volumeTier'),
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
      style: { stroke: getNodeStatus('marginFloor') === 'violated' ? '#ef4444' : '#22c55e' },
      animated: evaluationResult !== undefined,
    },
    {
      id: 'e-max-result',
      source: 'max_discount',
      target: 'result',
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: getNodeStatus('maxDiscount') === 'violated' ? '#ef4444' : '#22c55e' },
      animated: evaluationResult !== undefined,
    },
    {
      id: 'e-volume-result',
      source: 'volume_tier',
      target: 'result',
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: getNodeStatus('volumeTier') === 'violated' ? '#ef4444' : '#22c55e' },
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
