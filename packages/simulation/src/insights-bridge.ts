/**
 * Bridge between simulation results and the @guardrail-sim/insights package.
 *
 * Converts SimulationResults into a SimulationSummary that the existing
 * 8 simulation analysis insight checks (sim-001 through sim-008) can analyze.
 */

import type { SimulationSummary } from '@guardrail-sim/insights';
import type { SimulationResults } from './types.js';

/**
 * Convert simulation results to a SimulationSummary compatible with @guardrail-sim/insights.
 *
 * This enables the existing insight checks (checkSimulationCoverage, checkSegmentDistribution,
 * checkUnusedRules, checkLimitingFactorVariety) to fire against real simulation data.
 */
export function toSimulationSummary(results: SimulationResults): SimulationSummary {
  const { sessions, metrics } = results;

  // Calculate orders by segment
  const ordersBySegment: Record<string, number> = {};
  for (const session of sessions) {
    // Use the order from the first round as the representative order
    const firstRound = session.rounds[0];
    if (firstRound) {
      const segment = firstRound.order.customer_segment ?? 'unknown';
      ordersBySegment[segment] = (ordersBySegment[segment] ?? 0) + 1;
    }
  }

  return {
    totalOrders: metrics.totalSessions,
    approvalRate: metrics.approvalRate,
    averageDiscountApproved: metrics.averageDiscountApproved,
    averageDiscountRequested: metrics.averageDiscountRequested,
    averageMarginAfterDiscount: metrics.averageMarginAfterDiscount,
    violationsByRule: { ...metrics.violationsByRule },
    ordersBySegment,
    limitingFactors: { ...metrics.limitingFactors },
  };
}
