/**
 * Insight severity levels for prioritizing recommendations
 */
export type InsightSeverity = 'critical' | 'warning' | 'info' | 'suggestion';

/**
 * Categories for organizing insights
 */
export type InsightCategory =
  | 'policy-health' // Policy configuration issues
  | 'margin-protection' // Margin erosion risks
  | 'volume-tiering' // Volume-based discount optimizations
  | 'customer-segmentation' // Segment-specific recommendations
  | 'simulation-analysis' // Patterns from simulation results
  | 'compliance' // Regulatory and audit concerns
  | 'performance' // Policy evaluation performance
  | 'dx'; // Developer experience improvements

/**
 * Context for when an insight applies
 */
export type InsightContext =
  | 'policy-edit' // When editing policies
  | 'simulation-complete' // After running simulations
  | 'evaluation-result' // After single evaluation
  | 'dashboard-view' // When viewing dashboard
  | 'onboarding' // For new users
  | 'report'; // In generated reports

/**
 * A single insight or recommendation
 */
export interface Insight {
  id: string;
  title: string;
  description: string;
  severity: InsightSeverity;
  category: InsightCategory;
  contexts: InsightContext[];

  /** Markdown-formatted detailed explanation */
  details?: string;

  /** Suggested action to resolve the insight */
  action?: InsightAction;

  /** Links to relevant documentation */
  learnMoreUrl?: string;

  /** Tags for filtering */
  tags?: string[];

  /** Whether this insight is enabled by default */
  enabledByDefault?: boolean;
}

/**
 * Suggested action to resolve an insight
 */
export interface InsightAction {
  type: 'add-rule' | 'modify-rule' | 'remove-rule' | 'adjust-threshold' | 'review' | 'configure';
  label: string;

  /** Machine-readable action data for automation */
  payload?: Record<string, unknown>;
}

/**
 * Result of running an insight check
 */
export interface InsightResult {
  insight: Insight;
  triggered: boolean;

  /** Dynamic data specific to this check result */
  data?: Record<string, unknown>;

  /** Override the insight message with context-specific text */
  message?: string;
}

/**
 * A checklist item for guided setup or review
 */
export interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  category: InsightCategory;

  /** Whether the item is required or optional */
  required: boolean;

  /** Function to check if item is complete */
  isComplete?: (context: CheckContext) => boolean;

  /** Detailed guidance for completing the item */
  guidance?: string;

  /** Estimated time to complete (e.g., "5 minutes") */
  estimatedTime?: string;
}

/**
 * A complete checklist for a specific workflow
 */
export interface Checklist {
  id: string;
  name: string;
  description: string;
  items: ChecklistItem[];

  /** Context where this checklist applies */
  context: InsightContext;

  /** Tags for filtering */
  tags?: string[];
}

/**
 * Context provided to insight checks
 */
export interface CheckContext {
  /** The policy being analyzed */
  policy?: PolicySummary;

  /** Results from simulation runs */
  simulationResults?: SimulationSummary;

  /** Single evaluation result */
  evaluationResult?: EvaluationSummary;

  /** User preferences and settings */
  settings?: UserSettings;
}

/**
 * Summary of a policy for insight analysis
 */
export interface PolicySummary {
  id: string;
  name: string;
  ruleCount: number;
  rules: PolicyRuleSummary[];

  /** Whether policy has margin floor rule */
  hasMarginFloor: boolean;
  marginFloorValue?: number;

  /** Whether policy has max discount cap */
  hasMaxDiscountCap: boolean;
  maxDiscountCapValue?: number;

  /** Whether policy has volume-based rules */
  hasVolumeTiers: boolean;
  volumeTierThresholds?: number[];

  /** Whether policy has segment-based rules */
  hasSegmentRules: boolean;
  segments?: string[];
}

/**
 * Summary of a single policy rule
 */
export interface PolicyRuleSummary {
  name: string;
  priority?: number;
  conditionCount: number;
  eventType: string;
}

/**
 * Summary of simulation results for insight analysis
 */
export interface SimulationSummary {
  totalOrders: number;
  approvalRate: number;

  /** Average discount when approved */
  averageDiscountApproved: number;

  /** Average discount requested (including rejected) */
  averageDiscountRequested: number;

  /** Average margin after approved discounts */
  averageMarginAfterDiscount: number;

  /** Violation breakdown by rule */
  violationsByRule: Record<string, number>;

  /** Orders by customer segment */
  ordersBySegment?: Record<string, number>;

  /** Limiting factor frequency */
  limitingFactors: Record<string, number>;
}

/**
 * Summary of a single evaluation
 */
export interface EvaluationSummary {
  approved: boolean;
  violations: string[];
  appliedRules: string[];
  calculatedMargin: number;
  proposedDiscount: number;
  orderValue: number;
  quantity: number;
  customerSegment?: string;
}

/**
 * User settings that affect insights
 */
export interface UserSettings {
  /** Industry vertical (affects recommendations) */
  industry?: 'b2b-wholesale' | 'b2b-manufacturing' | 'b2b-distribution' | 'general';

  /** Risk tolerance level */
  riskTolerance?: 'conservative' | 'moderate' | 'aggressive';

  /** Target margin percentage */
  targetMargin?: number;

  /** Disabled insight IDs */
  disabledInsights?: string[];
}

/**
 * Insight check function signature
 */
export type InsightCheck = (context: CheckContext) => InsightResult | InsightResult[] | null;

/**
 * Collection of insights that can be loaded
 */
export interface InsightPack {
  id: string;
  name: string;
  description: string;
  version: string;
  insights: Insight[];
  checks: Map<string, InsightCheck>;
}
