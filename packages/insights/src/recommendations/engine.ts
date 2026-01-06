import type {
  Insight,
  InsightCheck,
  InsightResult,
  InsightPack,
  CheckContext,
  InsightSeverity,
  InsightCategory,
  InsightContext,
  Checklist,
  ChecklistItem,
} from '../types.js';

import { policyHealthInsights, policyHealthChecks } from '../checks/policy-health.js';
import { marginProtectionInsights, marginProtectionChecks } from '../checks/margin-protection.js';
import {
  simulationAnalysisInsights,
  simulationAnalysisChecks,
} from '../checks/simulation-analysis.js';

import { policySetupChecklist } from '../checklists/policy-setup.js';
import { policyReviewChecklist } from '../checklists/policy-review.js';
import { preDeploymentChecklist } from '../checklists/pre-deployment.js';

/**
 * Configuration for the recommendation engine
 */
export interface RecommendationEngineConfig {
  /** Insight IDs to disable */
  disabledInsights?: string[];

  /** Minimum severity to include */
  minSeverity?: InsightSeverity;

  /** Categories to include (all if not specified) */
  categories?: InsightCategory[];

  /** Include only insights for these contexts */
  contexts?: InsightContext[];
}

/**
 * Result of running recommendations
 */
export interface RecommendationReport {
  /** All triggered insights, sorted by severity */
  insights: InsightResult[];

  /** Summary counts by severity */
  summary: {
    critical: number;
    warning: number;
    info: number;
    suggestion: number;
    total: number;
  };

  /** Applicable checklists for the context */
  checklists: ChecklistProgress[];

  /** Timestamp of the report */
  generatedAt: Date;
}

/**
 * Checklist with completion status
 */
export interface ChecklistProgress {
  checklist: Checklist;
  completedItems: string[];
  totalItems: number;
  requiredItems: number;
  completedRequired: number;
  percentComplete: number;
}

const SEVERITY_ORDER: Record<InsightSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
  suggestion: 3,
};

/**
 * RecommendationEngine
 *
 * Loads insights and checklists, runs checks against provided context,
 * and generates actionable recommendations.
 */
export class RecommendationEngine {
  private insights: Map<string, Insight> = new Map();
  private checks: Map<string, InsightCheck> = new Map();
  private checklists: Map<string, Checklist> = new Map();
  private config: RecommendationEngineConfig;

  constructor(config: RecommendationEngineConfig = {}) {
    this.config = config;
    this.loadDefaultInsights();
    this.loadDefaultChecklists();
  }

  /**
   * Load the built-in insights and checks
   */
  private loadDefaultInsights(): void {
    // Load all insight definitions
    const allInsights = [
      ...policyHealthInsights,
      ...marginProtectionInsights,
      ...simulationAnalysisInsights,
    ];

    for (const insight of allInsights) {
      this.insights.set(insight.id, insight);
    }

    // Load all checks
    const allChecks = [
      ...policyHealthChecks.entries(),
      ...marginProtectionChecks.entries(),
      ...simulationAnalysisChecks.entries(),
    ];

    for (const [id, check] of allChecks) {
      this.checks.set(id, check);
    }
  }

  /**
   * Load the built-in checklists
   */
  private loadDefaultChecklists(): void {
    const allChecklists = [policySetupChecklist, policyReviewChecklist, preDeploymentChecklist];

    for (const checklist of allChecklists) {
      this.checklists.set(checklist.id, checklist);
    }
  }

  /**
   * Load a custom insight pack
   */
  loadInsightPack(pack: InsightPack): void {
    for (const insight of pack.insights) {
      this.insights.set(insight.id, insight);
    }

    for (const [id, check] of pack.checks.entries()) {
      this.checks.set(id, check);
    }
  }

  /**
   * Add a custom checklist
   */
  addChecklist(checklist: Checklist): void {
    this.checklists.set(checklist.id, checklist);
  }

  /**
   * Get all available insights
   */
  getInsights(): Insight[] {
    return Array.from(this.insights.values());
  }

  /**
   * Get insights by category
   */
  getInsightsByCategory(category: InsightCategory): Insight[] {
    return this.getInsights().filter((i) => i.category === category);
  }

  /**
   * Get all available checklists
   */
  getChecklists(): Checklist[] {
    return Array.from(this.checklists.values());
  }

  /**
   * Get a checklist by ID
   */
  getChecklist(id: string): Checklist | undefined {
    return this.checklists.get(id);
  }

  /**
   * Run all applicable checks and generate recommendations
   */
  async analyze(context: CheckContext): Promise<RecommendationReport> {
    const results: InsightResult[] = [];

    // Run all checks
    for (const [insightId, check] of this.checks.entries()) {
      const insight = this.insights.get(insightId);
      if (!insight) continue;

      // Skip disabled insights
      if (this.config.disabledInsights?.includes(insightId)) continue;
      if (context.settings?.disabledInsights?.includes(insightId)) continue;

      // Filter by category if specified
      if (this.config.categories && !this.config.categories.includes(insight.category)) {
        continue;
      }

      // Run the check
      try {
        const result = check(context);
        if (result === null) continue;

        if (Array.isArray(result)) {
          results.push(...result.filter((r) => r.triggered));
        } else if (result.triggered) {
          results.push(result);
        }
      } catch (error) {
        // Log error but continue with other checks
        console.error(`Error running check ${insightId}:`, error);
      }
    }

    // Filter by severity
    const filteredResults = this.filterBySeverity(results);

    // Filter by context
    const contextFilteredResults = this.filterByContext(filteredResults);

    // Sort by severity
    const sortedResults = this.sortBySeverity(contextFilteredResults);

    // Generate summary
    const summary = this.generateSummary(sortedResults);

    // Get applicable checklists
    const checklists = this.getApplicableChecklists(context);

    return {
      insights: sortedResults,
      summary,
      checklists,
      generatedAt: new Date(),
    };
  }

  /**
   * Run a specific insight check
   */
  runCheck(insightId: string, context: CheckContext): InsightResult | null {
    const check = this.checks.get(insightId);
    if (!check) return null;

    const result = check(context);
    if (Array.isArray(result)) {
      return result.find((r) => r.triggered) ?? null;
    }
    return result;
  }

  /**
   * Evaluate checklist completion
   */
  evaluateChecklist(checklistId: string, context: CheckContext): ChecklistProgress | null {
    const checklist = this.checklists.get(checklistId);
    if (!checklist) return null;

    const completedItems: string[] = [];

    for (const item of checklist.items) {
      if (item.isComplete && item.isComplete(context)) {
        completedItems.push(item.id);
      }
    }

    const requiredItems = checklist.items.filter((i) => i.required);
    const completedRequired = requiredItems.filter((i) => completedItems.includes(i.id)).length;

    return {
      checklist,
      completedItems,
      totalItems: checklist.items.length,
      requiredItems: requiredItems.length,
      completedRequired,
      percentComplete: Math.round((completedItems.length / checklist.items.length) * 100),
    };
  }

  /**
   * Get checklist item details
   */
  getChecklistItem(checklistId: string, itemId: string): ChecklistItem | undefined {
    const checklist = this.checklists.get(checklistId);
    if (!checklist) return undefined;

    return checklist.items.find((i) => i.id === itemId);
  }

  private filterBySeverity(results: InsightResult[]): InsightResult[] {
    if (!this.config.minSeverity) return results;

    const minOrder = SEVERITY_ORDER[this.config.minSeverity];
    return results.filter((r) => SEVERITY_ORDER[r.insight.severity] <= minOrder);
  }

  private filterByContext(results: InsightResult[]): InsightResult[] {
    if (!this.config.contexts || this.config.contexts.length === 0) {
      return results;
    }

    return results.filter((r) => r.insight.contexts.some((c) => this.config.contexts!.includes(c)));
  }

  private sortBySeverity(results: InsightResult[]): InsightResult[] {
    return [...results].sort(
      (a, b) => SEVERITY_ORDER[a.insight.severity] - SEVERITY_ORDER[b.insight.severity]
    );
  }

  private generateSummary(results: InsightResult[]): RecommendationReport['summary'] {
    return {
      critical: results.filter((r) => r.insight.severity === 'critical').length,
      warning: results.filter((r) => r.insight.severity === 'warning').length,
      info: results.filter((r) => r.insight.severity === 'info').length,
      suggestion: results.filter((r) => r.insight.severity === 'suggestion').length,
      total: results.length,
    };
  }

  private getApplicableChecklists(context: CheckContext): ChecklistProgress[] {
    const results: ChecklistProgress[] = [];

    for (const checklist of this.checklists.values()) {
      // For now, evaluate all checklists that have context
      // In future, could filter by context type
      const progress = this.evaluateChecklist(checklist.id, context);
      if (progress) {
        results.push(progress);
      }
    }

    return results;
  }
}

/**
 * Create a recommendation engine with default configuration
 */
export function createRecommendationEngine(
  config?: RecommendationEngineConfig
): RecommendationEngine {
  return new RecommendationEngine(config);
}

/**
 * Quick analysis function for simple use cases
 */
export async function analyzePolicy(context: CheckContext): Promise<RecommendationReport> {
  const engine = new RecommendationEngine();
  return engine.analyze(context);
}
