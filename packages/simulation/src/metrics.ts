/**
 * Metrics calculation for simulation results.
 *
 * Aggregates session data into summary statistics and detects edge cases.
 */

import type { Policy } from '@guardrail-sim/policy-engine';
import type { NegotiationSession, SimulationMetrics, EdgeCase } from './types.js';

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

  // Violation breakdown
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
 * Detect edge cases in simulation sessions
 */
function detectEdgeCases(sessions: NegotiationSession[], _policy: Policy): EdgeCase[] {
  const edgeCases: EdgeCase[] = [];

  for (const session of sessions) {
    for (const round of session.rounds) {
      // Approved at boundary: margin within 2% of floor
      if (round.accepted && round.evaluation.calculated_margin < 0.17) {
        edgeCases.push({
          description: `Discount approved with margin at ${(round.evaluation.calculated_margin * 100).toFixed(1)}%, close to 15% floor`,
          session,
          severity: 'warning',
        });
      }

      // Volume tier boundary: quantity between 95 and 105
      if (round.order.quantity >= 95 && round.order.quantity <= 105) {
        const tierBoundary = round.order.quantity >= 100;
        const discount = round.proposedDiscount;
        if (discount > 0.1 && discount <= 0.15) {
          edgeCases.push({
            description: `Volume tier boundary test: qty=${round.order.quantity} (${tierBoundary ? 'above' : 'below'} threshold), discount=${(discount * 100).toFixed(1)}%`,
            session,
            severity: tierBoundary ? 'info' : 'warning',
          });
        }
      }

      // High discount approved: > 20% discount approved
      if (round.accepted && round.proposedDiscount > 0.2) {
        edgeCases.push({
          description: `High discount of ${(round.proposedDiscount * 100).toFixed(1)}% was approved`,
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
