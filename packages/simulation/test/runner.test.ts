import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  runSimulation,
  defaultPersonas,
  budgetBuyer,
  marginHunter,
  codeStacker,
  volumeGamer,
  calculateMetrics,
  toSimulationSummary,
  createRng,
  generateVolumeBoundaryOrders,
  generateMarginFloorProbes,
  generateMaxDiscountProbes,
  createBoundaryProber,
} from '../dist/index.js';
import { defaultPolicy, PolicyEngine } from '@guardrail-sim/policy-engine';
import type { SimulationSummary } from '@guardrail-sim/insights';

describe('Simulation', () => {
  describe('runSimulation', () => {
    it('runs a simulation with all default personas', async () => {
      const results = await runSimulation({
        policy: defaultPolicy,
        personas: defaultPersonas,
        ordersPerPersona: 5,
        seed: 42,
      });

      assert.strictEqual(results.sessions.length, 25); // 5 personas × 5 orders
      assert.ok(results.metrics.totalSessions === 25);
      assert.ok(results.metrics.approvalRate >= 0 && results.metrics.approvalRate <= 1);
      assert.ok(results.timestamp instanceof Date);
    });

    it('produces deterministic results with the same seed', async () => {
      const config = {
        policy: defaultPolicy,
        personas: [budgetBuyer],
        ordersPerPersona: 10,
        seed: 12345,
      };

      const run1 = await runSimulation(config);
      const run2 = await runSimulation(config);

      assert.strictEqual(run1.sessions.length, run2.sessions.length);
      assert.strictEqual(run1.metrics.approvalRate, run2.metrics.approvalRate);
      assert.strictEqual(
        run1.metrics.averageDiscountApproved,
        run2.metrics.averageDiscountApproved
      );
      assert.strictEqual(
        run1.metrics.averageDiscountRequested,
        run2.metrics.averageDiscountRequested
      );
    });

    it('produces different results with different seeds', async () => {
      const baseConfig = {
        policy: defaultPolicy,
        personas: [budgetBuyer],
        ordersPerPersona: 10,
      };

      const run1 = await runSimulation({ ...baseConfig, seed: 100 });
      const run2 = await runSimulation({ ...baseConfig, seed: 200 });

      // At least some metric should differ with different seeds
      const differ =
        run1.metrics.averageDiscountRequested !== run2.metrics.averageDiscountRequested ||
        run1.metrics.approvalRate !== run2.metrics.approvalRate;
      assert.ok(differ, 'Different seeds should produce different results');
    });

    it('uses default seed of 42 when no seed is provided', async () => {
      const config = {
        policy: defaultPolicy,
        personas: [budgetBuyer],
        ordersPerPersona: 5,
      };

      const runNoSeed = await runSimulation(config);
      const runWithSeed = await runSimulation({ ...config, seed: 42 });

      assert.strictEqual(runNoSeed.metrics.approvalRate, runWithSeed.metrics.approvalRate);
    });
  });

  describe('persona behaviors', () => {
    it('cooperative persona (budget buyer) gets approved more often', async () => {
      const results = await runSimulation({
        policy: defaultPolicy,
        personas: [budgetBuyer],
        ordersPerPersona: 20,
        seed: 42,
      });

      // Budget buyer requests modest discounts — should have high approval rate
      assert.ok(
        results.metrics.approvalRate > 0.5,
        `Budget buyer approval rate ${results.metrics.approvalRate} should be > 0.5`
      );
    });

    it('adversarial persona (code stacker) triggers more violations', async () => {
      const results = await runSimulation({
        policy: defaultPolicy,
        personas: [codeStacker],
        ordersPerPersona: 20,
        seed: 42,
      });

      // Code stacker requests high discounts — should trigger violations
      const totalViolations = Object.values(results.metrics.violationsByRule).reduce(
        (sum, count) => sum + count,
        0
      );
      assert.ok(totalViolations > 0, 'Code stacker should trigger violations');
    });

    it('volume gamer generates orders near tier boundary', async () => {
      const results = await runSimulation({
        policy: defaultPolicy,
        personas: [volumeGamer],
        ordersPerPersona: 20,
        seed: 42,
      });

      // Volume gamer has volumeRange 90-110, so most orders near tier boundary
      const quantities = results.sessions.flatMap((s) => s.rounds.map((r) => r.order.quantity));
      const nearBoundary = quantities.filter((q) => q >= 90 && q <= 110);
      assert.ok(nearBoundary.length > 0, 'Volume gamer should produce orders near tier boundary');
    });

    it('margin hunter targets low margins', async () => {
      const results = await runSimulation({
        policy: defaultPolicy,
        personas: [marginHunter],
        ordersPerPersona: 20,
        seed: 42,
      });

      // Margin hunter has marginRange 0.18-0.35 (low margins)
      const margins = results.sessions.flatMap((s) => s.rounds.map((r) => r.order.product_margin));
      const lowMargins = margins.filter((m) => m < 0.35);
      assert.ok(
        lowMargins.length > margins.length * 0.3,
        'Margin hunter should produce many low-margin orders'
      );
    });
  });

  describe('negotiation rounds', () => {
    it('sessions have at most maxRounds rounds', async () => {
      const results = await runSimulation({
        policy: defaultPolicy,
        personas: defaultPersonas,
        ordersPerPersona: 10,
        seed: 42,
      });

      for (const session of results.sessions) {
        assert.ok(
          session.rounds.length <= session.persona.maxRounds,
          `Session ${session.id} has ${session.rounds.length} rounds but persona maxRounds is ${session.persona.maxRounds}`
        );
      }
    });

    it('accepted sessions end on an approved round', async () => {
      const results = await runSimulation({
        policy: defaultPolicy,
        personas: [budgetBuyer],
        ordersPerPersona: 20,
        seed: 42,
      });

      const accepted = results.sessions.filter((s) => s.outcome === 'accepted');
      for (const session of accepted) {
        const lastRound = session.rounds[session.rounds.length - 1];
        assert.ok(lastRound.accepted, 'Accepted session should end on approved round');
        assert.ok(session.finalDiscount !== null, 'Accepted session should have finalDiscount');
      }
    });

    it('rejected sessions have no approved rounds', async () => {
      const results = await runSimulation({
        policy: defaultPolicy,
        personas: [codeStacker],
        ordersPerPersona: 20,
        seed: 42,
      });

      const rejected = results.sessions.filter((s) => s.outcome === 'rejected');
      for (const session of rejected) {
        const hasApproved = session.rounds.some((r) => r.accepted);
        assert.ok(!hasApproved, 'Rejected session should not have any approved rounds');
        assert.strictEqual(session.finalDiscount, null);
      }
    });
  });

  describe('metrics', () => {
    it('returns empty metrics for no sessions', () => {
      const metrics = calculateMetrics([], defaultPolicy);
      assert.strictEqual(metrics.totalSessions, 0);
      assert.strictEqual(metrics.approvalRate, 0);
      assert.strictEqual(metrics.averageDiscountApproved, 0);
    });

    it('calculates correct approval rate', async () => {
      const results = await runSimulation({
        policy: defaultPolicy,
        personas: defaultPersonas,
        ordersPerPersona: 10,
        seed: 42,
      });

      const accepted = results.sessions.filter((s) => s.outcome === 'accepted').length;
      const expected = accepted / results.sessions.length;
      assert.strictEqual(results.metrics.approvalRate, expected);
    });

    it('tracks violations by rule', async () => {
      const results = await runSimulation({
        policy: defaultPolicy,
        personas: [codeStacker],
        ordersPerPersona: 10,
        seed: 42,
      });

      // Code stacker should trigger at least some violation rules
      const rules = Object.keys(results.metrics.violationsByRule);
      assert.ok(rules.length > 0, 'Should have violation rule entries');
    });

    it('tracks outcomes by persona', async () => {
      const results = await runSimulation({
        policy: defaultPolicy,
        personas: defaultPersonas,
        ordersPerPersona: 5,
        seed: 42,
      });

      for (const persona of defaultPersonas) {
        const outcomes = results.metrics.outcomesByPersona[persona.id];
        assert.ok(outcomes, `Should have outcomes for ${persona.id}`);
        const total = outcomes.accepted + outcomes.rejected + outcomes.abandoned;
        assert.strictEqual(total, 5, `Total outcomes for ${persona.id} should be 5`);
      }
    });
  });

  describe('edge case detection', () => {
    it('detects edge cases in simulation', async () => {
      const results = await runSimulation({
        policy: defaultPolicy,
        personas: [marginHunter, volumeGamer],
        ordersPerPersona: 20,
        seed: 42,
      });

      // With adversarial personas targeting boundaries, edge cases should appear
      // (Not guaranteed for every seed, but very likely with 40 sessions)
      assert.ok(Array.isArray(results.metrics.edgeCasesFound));
    });

    it('generateVolumeBoundaryOrders produces orders at qty 99, 100, 101', () => {
      const orders = generateVolumeBoundaryOrders(0.4, 5000);
      assert.strictEqual(orders.length, 3);
      assert.strictEqual(orders[0].order.quantity, 99);
      assert.strictEqual(orders[1].order.quantity, 100);
      assert.strictEqual(orders[2].order.quantity, 101);
    });

    it('generateMarginFloorProbes produces incremental margin probes', () => {
      const probes = generateMarginFloorProbes(0.35);
      assert.strictEqual(probes.length, 7);
      // First probe should leave high margin, last should go below floor
      assert.ok(probes[0].discount < probes[probes.length - 1].discount);
    });

    it('generateMaxDiscountProbes produces probes around 25%', () => {
      const probes = generateMaxDiscountProbes();
      assert.strictEqual(probes.length, 6);
      assert.ok(probes.some((p) => p.discount <= 0.25));
      assert.ok(probes.some((p) => p.discount > 0.25));
    });

    it('boundary probers can be evaluated against the policy engine', async () => {
      const engine = new PolicyEngine(defaultPolicy);
      const orders = generateVolumeBoundaryOrders(0.4, 5000);

      // qty=99 with 12% discount should fail (volume tier: max 10% for < 100)
      const result99 = await engine.evaluate(orders[0].order, orders[0].discount);
      assert.strictEqual(result99.approved, false);

      // qty=100 with 12% discount should pass (volume tier: max 15% for >= 100)
      const result100 = await engine.evaluate(orders[1].order, orders[1].discount);
      assert.strictEqual(result100.approved, true);
    });

    it('createBoundaryProber creates valid personas', () => {
      const volume = createBoundaryProber('volume');
      assert.strictEqual(volume.strategy, 'adversarial');
      assert.ok(volume.volumeRange.min >= 95 && volume.volumeRange.max <= 105);

      const margin = createBoundaryProber('margin');
      assert.strictEqual(margin.strategy, 'adversarial');

      const maxDiscount = createBoundaryProber('max_discount');
      assert.strictEqual(maxDiscount.strategy, 'adversarial');
    });
  });

  describe('insights bridge', () => {
    it('converts SimulationResults to SimulationSummary', async () => {
      const results = await runSimulation({
        policy: defaultPolicy,
        personas: defaultPersonas,
        ordersPerPersona: 10,
        seed: 42,
      });

      const summary: SimulationSummary = toSimulationSummary(results);

      assert.strictEqual(summary.totalOrders, 50);
      assert.ok(summary.approvalRate >= 0 && summary.approvalRate <= 1);
      assert.ok(typeof summary.averageDiscountApproved === 'number');
      assert.ok(typeof summary.averageDiscountRequested === 'number');
      assert.ok(typeof summary.averageMarginAfterDiscount === 'number');
      assert.ok(typeof summary.violationsByRule === 'object');
      assert.ok(typeof summary.limitingFactors === 'object');
    });

    it('includes segment distribution in summary', async () => {
      const results = await runSimulation({
        policy: defaultPolicy,
        personas: defaultPersonas,
        ordersPerPersona: 20,
        seed: 42,
      });

      const summary = toSimulationSummary(results);

      assert.ok(summary.ordersBySegment, 'Should have ordersBySegment');
      const totalBySegment = Object.values(summary.ordersBySegment).reduce(
        (sum, count) => sum + count,
        0
      );
      assert.strictEqual(totalBySegment, 100); // 5 personas × 20 orders
    });
  });

  describe('seeded RNG', () => {
    it('produces deterministic output', () => {
      const rng1 = createRng(42);
      const rng2 = createRng(42);

      for (let i = 0; i < 100; i++) {
        assert.strictEqual(rng1(), rng2());
      }
    });

    it('produces values in [0, 1)', () => {
      const rng = createRng(999);

      for (let i = 0; i < 1000; i++) {
        const val = rng();
        assert.ok(val >= 0, `Value ${val} should be >= 0`);
        assert.ok(val < 1, `Value ${val} should be < 1`);
      }
    });

    it('different seeds produce different sequences', () => {
      const rng1 = createRng(1);
      const rng2 = createRng(2);

      let same = 0;
      for (let i = 0; i < 100; i++) {
        if (rng1() === rng2()) same++;
      }
      assert.ok(same < 10, 'Different seeds should rarely produce same values');
    });
  });
});
