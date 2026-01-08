import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  createRecommendationEngine,
  analyzePolicy,
  RecommendationEngine,
  type CheckContext,
  type PolicySummary,
  type SimulationSummary,
} from '../dist/index.js';

describe('RecommendationEngine', () => {
  describe('createRecommendationEngine', () => {
    it('creates an engine with default configuration', () => {
      const engine = createRecommendationEngine();
      assert.ok(engine instanceof RecommendationEngine);
    });

    it('loads default insights', () => {
      const engine = createRecommendationEngine();
      const insights = engine.getInsights();
      assert.ok(insights.length > 0, 'Should have loaded default insights');
    });

    it('loads default checklists', () => {
      const engine = createRecommendationEngine();
      const checklists = engine.getChecklists();
      assert.ok(checklists.length > 0, 'Should have loaded default checklists');
    });
  });

  describe('analyze', () => {
    it('returns empty results for empty context', async () => {
      const engine = createRecommendationEngine();
      const report = await engine.analyze({});

      assert.ok(report.generatedAt instanceof Date);
      assert.strictEqual(typeof report.summary.total, 'number');
    });

    it('detects missing margin floor', async () => {
      const engine = createRecommendationEngine();
      const context: CheckContext = {
        policy: createPolicySummary({
          hasMarginFloor: false,
        }),
      };

      const report = await engine.analyze(context);

      const marginFloorInsight = report.insights.find((r) => r.insight.id === 'policy-health-001');
      assert.ok(marginFloorInsight, 'Should detect missing margin floor');
      assert.strictEqual(marginFloorInsight.insight.severity, 'critical');
    });

    it('detects missing max discount cap', async () => {
      const engine = createRecommendationEngine();
      const context: CheckContext = {
        policy: createPolicySummary({
          hasMaxDiscountCap: false,
        }),
      };

      const report = await engine.analyze(context);

      const maxDiscountInsight = report.insights.find((r) => r.insight.id === 'policy-health-002');
      assert.ok(maxDiscountInsight, 'Should detect missing max discount cap');
    });

    it('detects high approval rate', async () => {
      const engine = createRecommendationEngine();
      const context: CheckContext = {
        simulationResults: createSimulationSummary({
          approvalRate: 0.98,
        }),
      };

      const report = await engine.analyze(context);

      const highApprovalInsight = report.insights.find((r) => r.insight.id === 'margin-001');
      assert.ok(highApprovalInsight, 'Should detect high approval rate');
    });

    it('detects low approval rate', async () => {
      const engine = createRecommendationEngine();
      const context: CheckContext = {
        simulationResults: createSimulationSummary({
          approvalRate: 0.35,
        }),
      };

      const report = await engine.analyze(context);

      const lowApprovalInsight = report.insights.find((r) => r.insight.id === 'margin-002');
      assert.ok(lowApprovalInsight, 'Should detect low approval rate');
    });

    it('detects low simulation coverage', async () => {
      const engine = createRecommendationEngine();
      const context: CheckContext = {
        simulationResults: createSimulationSummary({
          totalOrders: 50,
        }),
      };

      const report = await engine.analyze(context);

      const coverageInsight = report.insights.find((r) => r.insight.id === 'sim-001');
      assert.ok(coverageInsight, 'Should detect low simulation coverage');
    });

    it('sorts results by severity', async () => {
      const engine = createRecommendationEngine();
      const context: CheckContext = {
        policy: createPolicySummary({
          hasMarginFloor: false, // critical
          hasMaxDiscountCap: false, // warning
          ruleCount: 1, // info
        }),
      };

      const report = await engine.analyze(context);

      // Ensure we have enough insights to test sorting
      assert.ok(report.insights.length >= 2, 'Should have at least 2 insights for sorting test');

      const severities = report.insights.map((r) => r.insight.severity);
      const criticalIndex = severities.indexOf('critical');
      const warningIndex = severities.indexOf('warning');

      assert.notStrictEqual(criticalIndex, -1, 'Should have a critical insight');
      assert.notStrictEqual(warningIndex, -1, 'Should have a warning insight');
      assert.ok(criticalIndex < warningIndex, 'Critical should come before warning');
    });
  });

  describe('configuration', () => {
    it('respects disabled insights', async () => {
      const engine = createRecommendationEngine({
        disabledInsights: ['policy-health-001'],
      });

      const context: CheckContext = {
        policy: createPolicySummary({
          hasMarginFloor: false,
        }),
      };

      const report = await engine.analyze(context);

      const marginFloorInsight = report.insights.find((r) => r.insight.id === 'policy-health-001');
      assert.ok(!marginFloorInsight, 'Disabled insight should not appear');
    });

    it('filters by minimum severity', async () => {
      const engine = createRecommendationEngine({
        minSeverity: 'warning',
      });

      const context: CheckContext = {
        policy: createPolicySummary({
          hasMarginFloor: true,
          hasMaxDiscountCap: true,
          ruleCount: 1, // triggers info-level insight
        }),
      };

      const report = await engine.analyze(context);

      const infoInsights = report.insights.filter((r) => r.insight.severity === 'info');
      assert.strictEqual(infoInsights.length, 0, 'Should filter out info insights');
    });

    it('filters by category', async () => {
      const engine = createRecommendationEngine({
        categories: ['policy-health'],
      });

      const context: CheckContext = {
        policy: createPolicySummary({
          hasMarginFloor: false,
        }),
        simulationResults: createSimulationSummary({
          approvalRate: 0.98,
        }),
      };

      const report = await engine.analyze(context);

      const nonPolicyHealth = report.insights.filter((r) => r.insight.category !== 'policy-health');
      assert.strictEqual(nonPolicyHealth.length, 0, 'Should only include policy-health insights');
    });
  });

  describe('checklists', () => {
    it('evaluates policy setup checklist', () => {
      const engine = createRecommendationEngine();
      const context: CheckContext = {
        policy: createPolicySummary({
          hasMarginFloor: true,
          hasMaxDiscountCap: true,
          hasVolumeTiers: false,
        }),
      };

      const progress = engine.evaluateChecklist('policy-setup', context);

      assert.ok(progress, 'Should return checklist progress');
      assert.ok(progress.completedItems.length > 0, 'Should have completed items');
      assert.ok(progress.percentComplete >= 0);
      assert.ok(progress.percentComplete <= 100);
    });

    it('returns null for unknown checklist', () => {
      const engine = createRecommendationEngine();
      const progress = engine.evaluateChecklist('unknown', {});

      assert.strictEqual(progress, null);
    });

    it('includes checklists in analysis report', async () => {
      const engine = createRecommendationEngine();
      const report = await engine.analyze({});

      assert.ok(Array.isArray(report.checklists));
    });
  });

  describe('getInsightsByCategory', () => {
    it('returns insights filtered by category', () => {
      const engine = createRecommendationEngine();

      const policyHealth = engine.getInsightsByCategory('policy-health');
      assert.ok(policyHealth.length > 0);
      assert.ok(policyHealth.every((i) => i.category === 'policy-health'));

      const margin = engine.getInsightsByCategory('margin-protection');
      assert.ok(margin.length > 0);
      assert.ok(margin.every((i) => i.category === 'margin-protection'));
    });
  });
});

describe('analyzePolicy', () => {
  it('provides quick analysis function', async () => {
    const report = await analyzePolicy({
      policy: createPolicySummary({
        hasMarginFloor: false,
      }),
    });

    assert.ok(report.insights.length > 0);
    assert.ok(report.summary.critical > 0);
  });
});

// Helper functions for creating test data
function createPolicySummary(overrides: Partial<PolicySummary> = {}): PolicySummary {
  return {
    id: 'test-policy',
    name: 'Test Policy',
    ruleCount: 3,
    rules: [
      { name: 'margin_floor', priority: 10, conditionCount: 1, eventType: 'violation' },
      { name: 'max_discount', priority: 10, conditionCount: 1, eventType: 'violation' },
      { name: 'volume_tier', priority: 5, conditionCount: 2, eventType: 'violation' },
    ],
    hasMarginFloor: true,
    marginFloorValue: 0.15,
    hasMaxDiscountCap: true,
    maxDiscountCapValue: 0.25,
    hasVolumeTiers: true,
    volumeTierThresholds: [100, 500, 1000],
    hasSegmentRules: false,
    ...overrides,
  };
}

function createSimulationSummary(overrides: Partial<SimulationSummary> = {}): SimulationSummary {
  return {
    totalOrders: 500,
    approvalRate: 0.72,
    averageDiscountApproved: 0.12,
    averageDiscountRequested: 0.18,
    averageMarginAfterDiscount: 0.22,
    violationsByRule: {
      margin_floor: 50,
      max_discount: 30,
      volume_tier: 60,
    },
    limitingFactors: {
      margin_floor: 100,
      max_discount: 80,
      volume_tier: 180,
    },
    ...overrides,
  };
}
