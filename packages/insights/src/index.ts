/**
 * @guardrail-sim/insights
 *
 * Policy insights, health checks, and best practice recommendations
 * for B2B pricing governance with guardrail-sim.
 *
 * @example
 * ```typescript
 * import { createRecommendationEngine, analyzePolicy } from '@guardrail-sim/insights';
 *
 * // Quick analysis
 * const report = await analyzePolicy({
 *   policy: myPolicySummary,
 *   simulationResults: myResults,
 * });
 *
 * console.log(`Found ${report.summary.total} insights`);
 * console.log(`Critical: ${report.summary.critical}`);
 *
 * // Or use the engine for more control
 * const engine = createRecommendationEngine({
 *   minSeverity: 'warning',
 *   categories: ['policy-health', 'margin-protection'],
 * });
 *
 * const report = await engine.analyze(context);
 * ```
 */

// Types
export type {
  InsightSeverity,
  InsightCategory,
  InsightContext,
  Insight,
  InsightAction,
  InsightResult,
  ChecklistItem,
  Checklist,
  CheckContext,
  PolicySummary,
  PolicyRuleSummary,
  SimulationSummary,
  EvaluationSummary,
  UserSettings,
  InsightCheck,
  InsightPack,
} from './types.js';

// Recommendation engine
export {
  RecommendationEngine,
  createRecommendationEngine,
  analyzePolicy,
  type RecommendationEngineConfig,
  type RecommendationReport,
  type ChecklistProgress,
} from './recommendations/engine.js';

// Individual insights (for customization)
export {
  // Policy health
  policyHealthInsights,
  policyHealthChecks,
  noMarginFloorInsight,
  noMaxDiscountCapInsight,
  tooFewRulesInsight,
  conflictingRulesInsight,
  noPrioritySetInsight,
  highMarginFloorInsight,
  lowMarginFloorInsight,
  noVolumeConsiderationInsight,
  // Margin protection
  marginProtectionInsights,
  marginProtectionChecks,
  highApprovalRateInsight,
  lowApprovalRateInsight,
  marginFloorFrequentlyHitInsight,
  averageMarginDecliningInsight,
  singleRuleDominatesInsight,
  discountGapInsight,
  nearMissApprovalInsight,
  // Simulation analysis
  simulationAnalysisInsights,
  simulationAnalysisChecks,
  lowSimulationCoverageInsight,
  segmentImbalanceInsight,
  unusedRulesInsight,
  volumeTierUnderutilizedInsight,
  segmentRulesNotTriggeringInsight,
  consistentRejectionPatternInsight,
  highValueOrderRejectionInsight,
  noLimitingFactorVarietyInsight,
} from './checks/index.js';

// Checklists
export {
  policySetupChecklist,
  policyReviewChecklist,
  preDeploymentChecklist,
} from './checklists/index.js';

// Version
export const VERSION = '0.1.0';
