/**
 * Metrics calculation for simulation results.
 *
 * Aggregates session data into summary statistics and detects edge cases.
 */

import type { Policy } from '@guardrail-sim/policy-engine';
import { extractPolicyThresholds, volumeTierLimit } from '@guardrail-sim/policy-engine';
import type { NegotiationSession, SimulationMetrics, EdgeCase } from './types.js';

/** How close to a threshold counts as "at the boundary". */
const MARGIN_BUFFER_BAND = 0.02;
const QUANTITY_BOUNDARY_BAND = 5;

/**
 * Calculate aggregated metrics from simulation sessions.
 *
 * @param sessions - All completed negotiation sessions
 * @param policy - The policy that was tested
 * @returns Aggregated simulation metrics
 */
export function calculateMetrics(
  sessions: NegotiationSession[],
  policy: Policy
): SimulationMetrics {
  const totalSessions = sessions.length;

  if (totalSessions === 0) {
    return emptyMetrics();
  }

  const accepted = sessions.filter((s) => s.outcome === 'accepted');
  const approvalRate = accepted.length / totalSessions;

  // Discount metrics
  const averageDiscountApproved =
    accepted.length > 0
      ? accepted.reduce((sum, s) => sum + (s.finalDiscount ?? 0), 0) / accepted.length
      : 0;

  const allRequestedDiscounts = sessions.flatMap((s) => s.rounds.map((r) => r.proposedDiscount));
  const averageDiscountRequested =
    allRequestedDiscounts.length > 0
      ? allRequestedDiscounts.reduce((sum, d) => sum + d, 0) / allRequestedDiscounts.length
      : 0;

  // Margin metrics
  const approvedMargins = accepted.map(
    (s) => s.rounds[s.rounds.length - 1].evaluation.calculated_margin
  );
  const averageMarginAfterDiscount =
    approvedMargins.length > 0
      ? approvedMargins.reduce((sum, m) => sum + m, 0) / approvedMargins.length
      : 0;

  // Violation breakdown. Counted per ROUND, not per session — a single session can
  // produce several violations across its negotiation rounds. `totalEvaluations` is the
  // matching denominator; dividing these counts by `totalSessions` yields rates above
  // 100% and is always a bug.
  const totalEvaluations = sessions.reduce((sum, s) => sum + s.rounds.length, 0);

  const violationsByRule: Record<string, number> = {};
  for (const session of sessions) {
    for (const round of session.rounds) {
      for (const violation of round.evaluation.violations) {
        violationsByRule[violation.rule] = (violationsByRule[violation.rule] ?? 0) + 1;
      }
    }
  }

  // Outcomes by persona
  const outcomesByPersona: Record<
    string,
    { accepted: number; rejected: number; abandoned: number }
  > = {};
  for (const session of sessions) {
    const id = session.persona.id;
    if (!outcomesByPersona[id]) {
      outcomesByPersona[id] = { accepted: 0, rejected: 0, abandoned: 0 };
    }
    outcomesByPersona[id][session.outcome]++;
  }

  // Limiting factors (which rule limits most often)
  const limitingFactors: Record<string, number> = {};
  for (const session of sessions) {
    for (const round of session.rounds) {
      if (!round.accepted && round.evaluation.violations.length > 0) {
        // The first violation is typically the highest-priority limiting factor
        const limitingRule = round.evaluation.violations[0].rule;
        limitingFactors[limitingRule] = (limitingFactors[limitingRule] ?? 0) + 1;
      }
    }
  }

  // Edge case detection
  const edgeCasesFound = detectEdgeCases(sessions, policy);

  return {
    totalSessions,
    totalEvaluations,
    approvalRate,
    averageDiscountApproved,
    averageDiscountRequested,
    averageMarginAfterDiscount,
    violationsByRule,
    outcomesByPersona,
    limitingFactors,
    edgeCasesFound,
  };
}

/**
 * Detect edge cases in simulation sessions.
 *
 * Thresholds come from the policy under test, so running a custom policy reports
 * boundaries against *that* policy rather than the default policy's numbers.
 */
function detectEdgeCases(sessions: NegotiationSession[], policy: Policy): EdgeCase[] {
  const edgeCases: EdgeCase[] = [];
  const { marginFloor, maxDiscount, volumeTiers } = extractPolicyThresholds(policy);

  // Quantities where the volume tier changes — the interesting places to probe.
  const tierBoundaries = volumeTiers.map((t) => t.minQuantity).filter((q) => q > 0);

  for (const session of sessions) {
    for (const round of session.rounds) {
      // Approved with the margin sitting just above the policy's floor.
      if (
        marginFloor !== undefined &&
        round.accepted &&
        round.evaluation.calculated_margin < marginFloor + MARGIN_BUFFER_BAND
      ) {
        edgeCases.push({
          description: `Discount approved with margin at ${(round.evaluation.calculated_margin * 100).toFixed(1)}%, close to ${(marginFloor * 100).toFixed(0)}% floor`,
          session,
          severity: 'warning',
        });
      }

      // Quantity sitting near a volume tier boundary, at a discount the tier gates.
      for (const boundary of tierBoundaries) {
        const nearBoundary =
          round.order.quantity >= boundary - QUANTITY_BOUNDARY_BAND &&
          round.order.quantity <= boundary + QUANTITY_BOUNDARY_BAND;
        if (!nearBoundary) continue;

        const aboveBoundary = round.order.quantity >= boundary;
        const belowLimit = volumeTierLimit(volumeTiers, boundary - 1);
        const aboveLimit = volumeTierLimit(volumeTiers, boundary);
        const discount = round.proposedDiscount;

        if (
          belowLimit !== undefined &&
          aboveLimit !== undefined &&
          discount > belowLimit &&
          discount <= aboveLimit
        ) {
          edgeCases.push({
            description: `Volume tier boundary test: qty=${round.order.quantity} (${aboveBoundary ? 'above' : 'below'} ${boundary}-unit threshold), discount=${(discount * 100).toFixed(1)}%`,
            session,
            severity: aboveBoundary ? 'info' : 'warning',
          });
        }
      }

      // Approved close to the policy's absolute cap.
      if (
        maxDiscount !== undefined &&
        round.accepted &&
        round.proposedDiscount > maxDiscount * 0.8
      ) {
        edgeCases.push({
          description: `High discount of ${(round.proposedDiscount * 100).toFixed(1)}% was approved against a ${(maxDiscount * 100).toFixed(0)}% cap`,
          session,
          severity: 'warning',
        });
      }
    }
  }

  return edgeCases;
}

function emptyMetrics(): SimulationMetrics {
  return {
    totalSessions: 0,
    totalEvaluations: 0,
    approvalRate: 0,
    averageDiscountApproved: 0,
    averageDiscountRequested: 0,
    averageMarginAfterDiscount: 0,
    violationsByRule: {},
    outcomesByPersona: {},
    limitingFactors: {},
    edgeCasesFound: [],
  };
}
