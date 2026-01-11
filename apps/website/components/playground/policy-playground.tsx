'use client';

import { useState, useEffect, useRef } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Play, RotateCcw } from 'lucide-react';
import { CopyButton } from '@/components/copy-button';
import {
  PolicyEngine,
  defaultPolicy,
  calculateMaxDiscount,
  type Order,
  type EvaluationResult,
} from '@guardrail-sim/policy-engine';

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

  // Create engine once and reuse
  const engineRef = useRef<PolicyEngine | null>(null);

  useEffect(() => {
    engineRef.current = new PolicyEngine(defaultPolicy);
  }, []);

  const evaluatePolicy = async () => {
    if (!engineRef.current) return;

    setIsLoading(true);
    try {
      const discountDecimal = proposedDiscount / 100;
      const evalResult = await engineRef.current.evaluate(order, discountDecimal);

      setResult({
        ...evalResult,
        policy_id: defaultPolicy.id,
        policy_name: defaultPolicy.name,
      } as EvaluationResult & { policy_id: string; policy_name: string });
      setActiveTab('evaluate');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetMaxDiscount = () => {
    setIsLoading(true);
    try {
      const { max_discount, limiting_factor } = calculateMaxDiscount(order);

      let details = '';
      if (limiting_factor === 'margin_floor') {
        details = `Limited by margin floor: ${(order.product_margin * 100).toFixed(0)}% margin - 15% floor = ${((order.product_margin - 0.15) * 100).toFixed(0)}% max`;
      } else if (limiting_factor === 'max_discount') {
        details = 'Limited by absolute discount cap of 25%';
      } else {
        details =
          order.quantity >= 100
            ? 'Volume tier (100+ units) allows up to 15%'
            : 'Base tier (< 100 units) limited to 10%';
      }

      setMaxDiscount({
        max_discount,
        max_discount_pct: `${(max_discount * 100).toFixed(1)}%`,
        limiting_factor,
        details,
      });
      setActiveTab('max');
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
    <div className="playground-grid">
      {/* Input Panel */}
      <div className="playground-card">
        <h2 className="playground-card-title">Order Details</h2>

        <div className="playground-form">
          <div className="playground-field">
            <label className="playground-label">Order Value ($)</label>
            <input
              type="number"
              value={order.order_value}
              onChange={(e) => setOrder({ ...order, order_value: Number(e.target.value) })}
              className="playground-input"
            />
          </div>

          <div className="playground-field">
            <label className="playground-label">Quantity (units)</label>
            <input
              type="number"
              value={order.quantity}
              onChange={(e) => setOrder({ ...order, quantity: Number(e.target.value) })}
              className="playground-input"
            />
            <span className="playground-hint">
              {order.quantity >= 100 ? 'Volume tier (up to 15%)' : 'Base tier (up to 10%)'}
            </span>
          </div>

          <div className="playground-field">
            <label className="playground-label">Product Margin (%)</label>
            <input
              type="number"
              value={order.product_margin * 100}
              onChange={(e) => setOrder({ ...order, product_margin: Number(e.target.value) / 100 })}
              className="playground-input"
            />
          </div>

          <div className="playground-field">
            <label className="playground-label">Customer Segment</label>
            <select
              value={order.customer_segment}
              onChange={(e) => setOrder({ ...order, customer_segment: e.target.value })}
              className="playground-select"
            >
              <option value="new">New</option>
              <option value="bronze">Bronze</option>
              <option value="silver">Silver</option>
              <option value="gold">Gold</option>
              <option value="platinum">Platinum</option>
            </select>
          </div>

          <div className="playground-divider" />

          <div className="playground-field">
            <label className="playground-label">Proposed Discount (%)</label>
            <input
              type="number"
              value={proposedDiscount}
              onChange={(e) => setProposedDiscount(Number(e.target.value))}
              className="playground-input"
            />
            <input
              type="range"
              min="0"
              max="40"
              value={proposedDiscount}
              onChange={(e) => setProposedDiscount(Number(e.target.value))}
              className="playground-slider"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="playground-actions">
          <button
            onClick={evaluatePolicy}
            disabled={isLoading}
            className="btn-primary"
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            <Play size={16} />
            Evaluate Policy
          </button>
          <button
            onClick={handleGetMaxDiscount}
            disabled={isLoading}
            className="btn-secondary"
            style={{ flex: 1 }}
          >
            Get Max Discount
          </button>
          <button onClick={reset} className="playground-btn-reset" aria-label="Reset">
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      {/* Results Panel */}
      <div className="playground-card">
        <div className="playground-tabs">
          <button
            onClick={() => setActiveTab('evaluate')}
            className={`playground-tab ${activeTab === 'evaluate' ? 'active' : ''}`}
          >
            Evaluation Result
          </button>
          <button
            onClick={() => setActiveTab('max')}
            className={`playground-tab ${activeTab === 'max' ? 'active' : ''}`}
          >
            Max Discount
          </button>
        </div>

        {activeTab === 'evaluate' && (
          <>
            {result ? (
              <div>
                {/* Approval Status */}
                <div className={`playground-status ${result.approved ? 'approved' : 'rejected'}`}>
                  <span className="playground-status-icon">
                    {result.approved ? <CheckCircle size={24} /> : <XCircle size={24} />}
                  </span>
                  <div className="playground-status-text">
                    <span className="playground-status-title">
                      {result.approved ? 'Discount Approved' : 'Discount Rejected'}
                    </span>
                    <span className="playground-status-subtitle">
                      Margin after discount: {(result.calculated_margin * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Violations */}
                {result.violations.length > 0 && (
                  <div className="playground-result-section">
                    <h3 className="playground-result-label">Violations</h3>
                    {result.violations.map((v, i) => (
                      <div key={i} className="playground-violation">
                        <AlertTriangle size={16} className="playground-violation-icon" />
                        <div className="playground-violation-text">
                          <span className="playground-violation-rule">{v.rule}</span>
                          <span className="playground-violation-message">{v.message}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Applied Rules */}
                <div className="playground-result-section">
                  <h3 className="playground-result-label">Applied Rules</h3>
                  <div className="playground-tags">
                    {result.applied_rules.map((rule) => (
                      <span key={rule} className="playground-tag">
                        {rule}
                      </span>
                    ))}
                  </div>
                </div>

                {/* JSON Output */}
                <div className="playground-result-section">
                  <h3 className="playground-result-label">Raw Response</h3>
                  <div className="playground-code">
                    <CopyButton text={JSON.stringify(result, null, 2)} />
                    <pre>{JSON.stringify(result, null, 2)}</pre>
                  </div>
                </div>
              </div>
            ) : (
              <div className="playground-result-empty">
                Click &quot;Evaluate Policy&quot; to test a discount
              </div>
            )}
          </>
        )}

        {activeTab === 'max' && (
          <>
            {maxDiscount ? (
              <div>
                {/* Max Discount */}
                <div className="playground-max-discount">
                  <p className="playground-max-discount-label">Maximum Allowed Discount</p>
                  <p className="playground-max-discount-value">{maxDiscount.max_discount_pct}</p>
                </div>

                {/* Limiting Factor */}
                <div className="playground-result-section">
                  <h3 className="playground-result-label">Limiting Factor</h3>
                  <div className="playground-factor">
                    <p className="playground-factor-title">{maxDiscount.limiting_factor}</p>
                    <p className="playground-factor-description">{maxDiscount.details}</p>
                  </div>
                </div>

                {/* JSON Output */}
                <div className="playground-result-section">
                  <h3 className="playground-result-label">Raw Response</h3>
                  <div className="playground-code">
                    <CopyButton text={JSON.stringify(maxDiscount, null, 2)} />
                    <pre>{JSON.stringify(maxDiscount, null, 2)}</pre>
                  </div>
                </div>
              </div>
            ) : (
              <div className="playground-result-empty">
                Click &quot;Get Max Discount&quot; to calculate limits
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
