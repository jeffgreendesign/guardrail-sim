'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Play, RotateCcw } from 'lucide-react';

interface Order {
  order_value: number;
  quantity: number;
  product_margin: number;
  customer_segment: string;
}

interface Violation {
  rule: string;
  message: string;
  limit?: number;
}

interface EvaluationResult {
  approved: boolean;
  violations: Violation[];
  applied_rules: string[];
  calculated_margin: number;
  policy_id: string;
  policy_name: string;
}

interface MaxDiscountResult {
  max_discount: number;
  max_discount_pct: string;
  limiting_factor: string;
  details: string;
}

const DEFAULT_ORDER: Order = {
  order_value: 5000,
  quantity: 100,
  product_margin: 0.4,
  customer_segment: 'gold',
};

export function PolicyPlayground() {
  const [order, setOrder] = useState<Order>(DEFAULT_ORDER);
  const [proposedDiscount, setProposedDiscount] = useState(12);
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [maxDiscount, setMaxDiscount] = useState<MaxDiscountResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'evaluate' | 'max'>('evaluate');

  const evaluatePolicy = async () => {
    setIsLoading(true);
    try {
      // Simulate the policy engine evaluation (client-side for demo)
      // In production, this would call the actual MCP server
      const discountDecimal = proposedDiscount / 100;
      const calculatedMargin = order.product_margin - discountDecimal;

      const violations: Violation[] = [];
      const appliedRules = ['margin_floor', 'max_discount', 'volume_tier'];

      // Check margin floor
      if (calculatedMargin < 0.15) {
        violations.push({
          rule: 'margin_floor',
          message: 'Discount would reduce margin below 15% floor',
          limit: 0.15,
        });
      }

      // Check max discount
      if (discountDecimal > 0.25) {
        violations.push({
          rule: 'max_discount',
          message: 'Discount exceeds maximum allowed 25%',
          limit: 0.25,
        });
      }

      // Check volume tier
      const volumeLimit = order.quantity >= 100 ? 0.15 : 0.1;
      if (discountDecimal > volumeLimit) {
        violations.push({
          rule: 'volume_tier',
          message:
            order.quantity >= 100
              ? 'Volume tier (100+ units) limited to 15% discount'
              : 'Base tier (< 100 units) limited to 10% discount',
          limit: volumeLimit,
        });
      }

      setResult({
        approved: violations.length === 0,
        violations,
        applied_rules: appliedRules,
        calculated_margin: calculatedMargin,
        policy_id: 'default',
        policy_name: 'Default Pricing Policy',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateMaxDiscount = async () => {
    setIsLoading(true);
    try {
      const marginBasedMax = order.product_margin - 0.15;
      const volumeBasedMax = order.quantity >= 100 ? 0.15 : 0.1;
      const maxDiscountCap = 0.25;

      const constraints = [
        { name: 'margin_floor', value: marginBasedMax },
        { name: 'max_discount_cap', value: maxDiscountCap },
        { name: 'volume_tier', value: volumeBasedMax },
      ];

      const minConstraint = constraints.reduce((min, c) => (c.value < min.value ? c : min));
      const maxDiscountValue = Math.max(0, Math.min(...constraints.map((c) => c.value)));

      let details = '';
      if (minConstraint.name === 'margin_floor') {
        details = `Limited by margin floor: ${(order.product_margin * 100).toFixed(0)}% margin - 15% floor = ${(marginBasedMax * 100).toFixed(0)}% max`;
      } else if (minConstraint.name === 'max_discount_cap') {
        details = 'Limited by absolute discount cap of 25%';
      } else {
        details =
          order.quantity >= 100
            ? 'Volume tier (100+ units) allows up to 15%'
            : 'Base tier (< 100 units) limited to 10%';
      }

      setMaxDiscount({
        max_discount: maxDiscountValue,
        max_discount_pct: `${(maxDiscountValue * 100).toFixed(1)}%`,
        limiting_factor: minConstraint.name,
        details,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setOrder(DEFAULT_ORDER);
    setProposedDiscount(12);
    setResult(null);
    setMaxDiscount(null);
  };

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {/* Input Panel */}
      <div className="glass-card p-6">
        <h2 className="mb-6 text-xl font-semibold">Order Details</h2>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-zinc-400">Order Value ($)</label>
            <input
              type="number"
              value={order.order_value}
              onChange={(e) => setOrder({ ...order, order_value: Number(e.target.value) })}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-zinc-400">Quantity (units)</label>
            <input
              type="number"
              value={order.quantity}
              onChange={(e) => setOrder({ ...order, quantity: Number(e.target.value) })}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 focus:border-accent focus:outline-none"
            />
            <p className="mt-1 text-xs text-zinc-500">
              {order.quantity >= 100 ? 'Volume tier (up to 15%)' : 'Base tier (up to 10%)'}
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm text-zinc-400">Product Margin (%)</label>
            <input
              type="number"
              value={order.product_margin * 100}
              onChange={(e) => setOrder({ ...order, product_margin: Number(e.target.value) / 100 })}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-zinc-400">Customer Segment</label>
            <select
              value={order.customer_segment}
              onChange={(e) => setOrder({ ...order, customer_segment: e.target.value })}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 focus:border-accent focus:outline-none"
            >
              <option value="new">New</option>
              <option value="bronze">Bronze</option>
              <option value="silver">Silver</option>
              <option value="gold">Gold</option>
              <option value="platinum">Platinum</option>
            </select>
          </div>

          <hr className="border-white/10" />

          <div>
            <label className="mb-1 block text-sm text-zinc-400">Proposed Discount (%)</label>
            <input
              type="number"
              value={proposedDiscount}
              onChange={(e) => setProposedDiscount(Number(e.target.value))}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 focus:border-accent focus:outline-none"
            />
            <input
              type="range"
              min="0"
              max="40"
              value={proposedDiscount}
              onChange={(e) => setProposedDiscount(Number(e.target.value))}
              className="mt-2 w-full accent-accent"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={evaluatePolicy}
            disabled={isLoading}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 font-semibold text-black transition-all hover:bg-accent/90 disabled:opacity-50"
          >
            <Play className="h-4 w-4" />
            Evaluate Policy
          </button>
          <button
            onClick={calculateMaxDiscount}
            disabled={isLoading}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/20 px-4 py-2 font-semibold transition-all hover:border-white/40"
          >
            Get Max Discount
          </button>
          <button
            onClick={reset}
            className="rounded-lg border border-white/10 p-2 transition-all hover:border-white/30"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Results Panel */}
      <div className="glass-card p-6">
        <div className="mb-6 flex gap-4 border-b border-white/10 pb-4">
          <button
            onClick={() => setActiveTab('evaluate')}
            className={`text-sm font-medium ${activeTab === 'evaluate' ? 'text-accent' : 'text-zinc-400'}`}
          >
            Evaluation Result
          </button>
          <button
            onClick={() => setActiveTab('max')}
            className={`text-sm font-medium ${activeTab === 'max' ? 'text-accent' : 'text-zinc-400'}`}
          >
            Max Discount
          </button>
        </div>

        {activeTab === 'evaluate' && (
          <>
            {result ? (
              <div className="space-y-4">
                {/* Approval Status */}
                <div
                  className={`flex items-center gap-3 rounded-lg p-4 ${result.approved ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}
                >
                  {result.approved ? (
                    <CheckCircle className="h-6 w-6" />
                  ) : (
                    <XCircle className="h-6 w-6" />
                  )}
                  <div>
                    <p className="font-semibold">
                      {result.approved ? 'Discount Approved' : 'Discount Rejected'}
                    </p>
                    <p className="text-sm opacity-80">
                      Margin after discount: {(result.calculated_margin * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>

                {/* Violations */}
                {result.violations.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-zinc-400">Violations</h3>
                    {result.violations.map((v, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 rounded-lg bg-red-500/5 p-3 text-sm"
                      >
                        <AlertTriangle className="mt-0.5 h-4 w-4 text-red-400" />
                        <div>
                          <p className="font-medium text-red-400">{v.rule}</p>
                          <p className="text-zinc-400">{v.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Applied Rules */}
                <div>
                  <h3 className="mb-2 text-sm font-medium text-zinc-400">Applied Rules</h3>
                  <div className="flex flex-wrap gap-2">
                    {result.applied_rules.map((rule) => (
                      <span
                        key={rule}
                        className="rounded-full bg-white/5 px-3 py-1 text-xs text-zinc-300"
                      >
                        {rule}
                      </span>
                    ))}
                  </div>
                </div>

                {/* JSON Output */}
                <div>
                  <h3 className="mb-2 text-sm font-medium text-zinc-400">Raw Response</h3>
                  <pre className="overflow-x-auto rounded-lg bg-black/30 p-3 text-xs text-zinc-300">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="flex h-48 items-center justify-center text-zinc-500">
                Click &quot;Evaluate Policy&quot; to test a discount
              </div>
            )}
          </>
        )}

        {activeTab === 'max' && (
          <>
            {maxDiscount ? (
              <div className="space-y-4">
                {/* Max Discount */}
                <div className="rounded-lg bg-accent/10 p-4">
                  <p className="text-sm text-zinc-400">Maximum Allowed Discount</p>
                  <p className="text-3xl font-bold text-accent">{maxDiscount.max_discount_pct}</p>
                </div>

                {/* Limiting Factor */}
                <div>
                  <h3 className="mb-2 text-sm font-medium text-zinc-400">Limiting Factor</h3>
                  <div className="rounded-lg bg-white/5 p-3">
                    <p className="font-medium">{maxDiscount.limiting_factor}</p>
                    <p className="text-sm text-zinc-400">{maxDiscount.details}</p>
                  </div>
                </div>

                {/* JSON Output */}
                <div>
                  <h3 className="mb-2 text-sm font-medium text-zinc-400">Raw Response</h3>
                  <pre className="overflow-x-auto rounded-lg bg-black/30 p-3 text-xs text-zinc-300">
                    {JSON.stringify(maxDiscount, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="flex h-48 items-center justify-center text-zinc-500">
                Click &quot;Get Max Discount&quot; to calculate limits
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
