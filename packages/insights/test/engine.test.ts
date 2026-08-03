import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  createRecommendationEngine,
  analyzePolicy,
  RecommendationEngine,
  marginProtectionChecks,
  marginProtectionInsights,
  policyHealthChecks,
  policyHealthInsights,
  simulationAnalysisChecks,
  simulationAnalysisInsights,
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

describe('regression: each insight is emitted at most once', () => {
  it('does not emit margin-001 twice when approval rate is very high', async () => {
    const engine = createRecommendationEngine();
    const report = await engine.analyze({
      simulationResults: createSimulationSummary({ approvalRate: 0.98 }),
    });

    // checkApprovalRate used to be registered under BOTH margin-001 and margin-002
    // and returned an array covering both, so the engine pushed each finding twice.
    const highApproval = report.insights.filter((r) => r.insight.id === 'margin-001');
    assert.strictEqual(highApproval.length, 1);
    assert.strictEqual(report.insights.filter((r) => r.insight.id === 'margin-002').length, 0);
  });

  it('does not emit margin-002 twice when approval rate is very low', async () => {
    const engine = createRecommendationEngine();
    const report = await engine.analyze({
      simulationResults: createSimulationSummary({ approvalRate: 0.2 }),
    });

    assert.strictEqual(report.insights.filter((r) => r.insight.id === 'margin-002').length, 1);
  });

  it('does not emit policy-health-006 twice for a high margin floor', async () => {
    const engine = createRecommendationEngine();
    const report = await engine.analyze({
      policy: createPolicySummary({ marginFloorValue: 0.4 }),
    });

    assert.strictEqual(
      report.insights.filter((r) => r.insight.id === 'policy-health-006').length,
      1
    );
  });

  it('reports a summary total matching the number of distinct findings', async () => {
    const engine = createRecommendationEngine();
    const report = await engine.analyze({
      simulationResults: createSimulationSummary({ approvalRate: 0.98 }),
    });

    const ids = report.insights.map((r) => r.insight.id);
    assert.strictEqual(new Set(ids).size, ids.length, `duplicate ids: ${ids.join(', ')}`);
    assert.strictEqual(report.summary.total, report.insights.length);
  });
});

describe('regression: rates never exceed 100%', () => {
  it('divides per-evaluation violation counts by the evaluation count', async () => {
    const engine = createRecommendationEngine();
    // 69 margin_floor violations across 50 orders is legitimate: buyers negotiate over
    // several rounds. Dividing by totalOrders reported "138.0% of evaluations".
    const report = await engine.analyze({
      simulationResults: createSimulationSummary({
        totalOrders: 50,
        totalEvaluations: 120,
        violationsByRule: { margin_floor: 69 },
      }),
    });

    const result = report.insights.find((r) => r.insight.id === 'margin-003');
    assert.notStrictEqual(result, undefined, 'margin-003 should fire at 69/120');
    const frequency = (result.data as { frequency: number }).frequency;
    assert.ok(frequency <= 1, `frequency ${frequency} must not exceed 1`);
    assert.ok(Math.abs(frequency - 69 / 120) < 1e-9);
  });

  it('falls back to totalOrders when a producer omits totalEvaluations', async () => {
    const engine = createRecommendationEngine();
    const report = await engine.analyze({
      simulationResults: createSimulationSummary({
        totalOrders: 100,
        violationsByRule: { margin_floor: 40 },
      }),
    });

    const result = report.insights.find((r) => r.insight.id === 'margin-003');
    assert.notStrictEqual(result, undefined);
    assert.ok(Math.abs((result.data as { frequency: number }).frequency - 0.4) < 1e-9);
  });
});

describe('regression: every declared simulation insight is reachable', () => {
  it('registers a check for all 8 sim-* insights', () => {
    // sim-004 through sim-007 were exported as insights but never registered,
    // so four of the eight could never fire. Compare the declared insights against
    // the registration map directly — runCheck returns null for BOTH an unregistered
    // id and a registered-but-untriggered check, so it cannot tell them apart.
    const declared = simulationAnalysisInsights.map((i) => i.id).sort();
    const registered = [...simulationAnalysisChecks.keys()].sort();

    assert.deepStrictEqual(registered, declared);
  });

  it('registers exactly one check per insight id across every pack', () => {
    const packs = [policyHealthChecks, marginProtectionChecks, simulationAnalysisChecks];
    const insights = [
      ...policyHealthInsights,
      ...marginProtectionInsights,
      ...simulationAnalysisInsights,
    ];

    for (const pack of packs) {
      for (const [id, check] of pack.entries()) {
        // A check registered under two ids emits its findings once per id.
        const idsSharingCheck = [...pack.entries()].filter(([, c]) => c === check).map(([i]) => i);
        assert.deepStrictEqual(
          idsSharingCheck,
          [id],
          `check for ${id} is also registered as ${idsSharingCheck.filter((i) => i !== id).join(', ')}`
        );
      }
    }

    // And every registered id must correspond to a declared insight.
    const declaredIds = new Set(insights.map((i) => i.id));
    for (const pack of packs) {
      for (const id of pack.keys()) {
        assert.ok(declaredIds.has(id), `${id} is registered but not declared`);
      }
    }
  });

  it('fires sim-007 when large orders are rejected disproportionately', async () => {
    const engine = createRecommendationEngine();
    const report = await engine.analyze({
      simulationResults: createSimulationSummary({
        approvedOrderValues: [500, 800, 1200, 900, 1500, 2000],
        rejectedOrderValues: [50000, 42000, 38000, 61000, 55000, 47000],
      }),
    });

    assert.ok(report.insights.some((r) => r.insight.id === 'sim-007'));
  });
});

describe('regression: checklists report real progress', () => {
  it('scores policy-review above zero once a policy and simulation exist', () => {
    const engine = createRecommendationEngine();
    const progress = engine.evaluateChecklist('policy-review', {
      policy: createPolicySummary({ hasSegmentRules: true }),
      simulationResults: createSimulationSummary({ totalOrders: 500 }),
    });

    assert.notStrictEqual(progress, undefined);
    // Previously always 0: not one item defined isComplete.
    assert.ok(progress.percentComplete > 0, 'policy-review should report real progress');
    assert.ok(progress.verifiableItems > 0);
    assert.ok(progress.manualItems.length > 0, 'manual items should be surfaced, not scored');
    assert.strictEqual(progress.verifiableItems + progress.manualItems.length, progress.totalItems);
  });

  it('scores pre-deployment above zero once a simulation has run', () => {
    const engine = createRecommendationEngine();
    const progress = engine.evaluateChecklist('pre-deployment', {
      policy: createPolicySummary(),
      simulationResults: createSimulationSummary({ totalOrders: 500, edgeCaseCount: 12 }),
    });

    assert.notStrictEqual(progress, undefined);
    assert.strictEqual(
      (progress?.percentComplete ?? 0) > 0,
      true,
      'pre-deployment should report real progress'
    );
  });

  it('never exceeds 100% and excludes manual items from the denominator', () => {
    const engine = createRecommendationEngine();
    for (const id of ['policy-setup', 'policy-review', 'pre-deployment']) {
      const progress = engine.evaluateChecklist(id, {
        policy: createPolicySummary({ hasSegmentRules: true }),
        simulationResults: createSimulationSummary({ totalOrders: 500, edgeCaseCount: 3 }),
      });
      assert.notStrictEqual(progress, undefined, `${id} should exist`);
      assert.ok(progress.percentComplete <= 100, `${id} reported ${progress.percentComplete}%`);
      assert.ok(progress.percentComplete >= 0);
    }
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
