export {
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
} from './policy-health.js';

export {
  marginProtectionInsights,
  marginProtectionChecks,
  highApprovalRateInsight,
  lowApprovalRateInsight,
  marginFloorFrequentlyHitInsight,
  averageMarginDecliningInsight,
  singleRuleDominatesInsight,
  discountGapInsight,
} from './margin-protection.js';

export {
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
} from './simulation-analysis.js';
