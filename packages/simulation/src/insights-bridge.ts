/**
 * Bridge between simulation results and the @guardrail-sim/insights package.
 *
 * Converts SimulationResults into a SimulationSummary that the simulation
 * analysis insight checks (sim-001 through sim-008) can analyze.
 */

import type { SimulationSummary } from '@guardrail-sim/insights';
import type { SimulationResults } from './types.js';

/**
 * Convert simulation results to a SimulationSummary compatible with @guardrail-sim/insights.
 *
 * Carries through the per-evaluation count, per-persona outcomes and approved/rejected
 * order values so the checks that need more than headline rates can fire.
 */
export function toSimulationSummary(results: SimulationResults): SimulationSummary {
  const { sessions, metrics } = results;

  // Calculate orders by segment
  const ordersBySegment: Record<string, number> = {};
  const approvedOrderValues: number[] = [];
  const rejectedOrderValues: number[] = [];

  for (const session of sessions) {
    // Use the order from the first round as the representative order
    const firstRound = session.rounds[0];
    if (!firstRound) continue;

    const segment = firstRound.order.customer_segment ?? 'unknown';
    ordersBySegment[segment] = (ordersBySegment[segment] ?? 0) + 1;

    // Only genuine rejections. An abandoned session is a buyer walking away, not the
    // policy turning an order down, and counting it as a rejection skews the
    // high-value-rejection insight.
    if (session.outcome === 'accepted') {
      approvedOrderValues.push(firstRound.order.order_value);
    } else if (session.outcome === 'rejected') {
      rejectedOrderValues.push(firstRound.order.order_value);
    }
  }

  return {
    totalOrders: metrics.totalSessions,
    totalEvaluations: metrics.totalEvaluations,
    approvalRate: metrics.approvalRate,
    averageDiscountApproved: metrics.averageDiscountApproved,
    averageDiscountRequested: metrics.averageDiscountRequested,
    averageMarginAfterDiscount: metrics.averageMarginAfterDiscount,
    violationsByRule: { ...metrics.violationsByRule },
    ordersBySegment,
    limitingFactors: { ...metrics.limitingFactors },
    outcomesByPersona: structuredClone(metrics.outcomesByPersona),
    approvedOrderValues,
    rejectedOrderValues,
    edgeCaseCount: metrics.edgeCasesFound.length,
  };
}
