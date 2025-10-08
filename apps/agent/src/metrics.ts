/**
 * Metrics Collection Module
 * 
 * Tracks agent performance metrics for monitoring and optimization
 */

export interface ProcessingMetrics {
  total_processed: number;
  cancellations_detected: number;
  deterministic_extractions: number;
  openai_extractions: number;
  edge_cases_handled: Record<string, number>;
  avg_confidence: number;
  avg_processing_time_ms: number;
  policy_compliance_rate: number;
  language_distribution: Record<string, number>;
}

class MetricsCollector {
  private metrics: ProcessingMetrics = {
    total_processed: 0,
    cancellations_detected: 0,
    deterministic_extractions: 0,
    openai_extractions: 0,
    edge_cases_handled: {},
    avg_confidence: 0,
    avg_processing_time_ms: 0,
    policy_compliance_rate: 1.0,
    language_distribution: {}
  };

  private confidenceSum = 0;
  private timeSum = 0;
  private policyComplianceCount = 0;

  record(data: {
    extraction_method: "deterministic" | "openai";
    is_cancellation: boolean;
    edge_case: string;
    confidence: number;
    processing_time_ms: number;
    policy_compliant: boolean;
    language: string;
  }) {
    this.metrics.total_processed++;
    
    if (data.is_cancellation) {
      this.metrics.cancellations_detected++;
    }

    if (data.extraction_method === "deterministic") {
      this.metrics.deterministic_extractions++;
    } else {
      this.metrics.openai_extractions++;
    }

    if (data.edge_case !== "none") {
      this.metrics.edge_cases_handled[data.edge_case] = 
        (this.metrics.edge_cases_handled[data.edge_case] || 0) + 1;
    }

    this.confidenceSum += data.confidence;
    this.metrics.avg_confidence = this.confidenceSum / this.metrics.total_processed;

    this.timeSum += data.processing_time_ms;
    this.metrics.avg_processing_time_ms = this.timeSum / this.metrics.total_processed;

    if (data.policy_compliant) {
      this.policyComplianceCount++;
    }
    this.metrics.policy_compliance_rate = 
      this.policyComplianceCount / this.metrics.total_processed;

    // Track language distribution
    this.metrics.language_distribution[data.language] = 
      (this.metrics.language_distribution[data.language] || 0) + 1;
  }

  getMetrics(): ProcessingMetrics {
    return { ...this.metrics };
  }

  reset() {
    this.metrics = {
      total_processed: 0,
      cancellations_detected: 0,
      deterministic_extractions: 0,
      openai_extractions: 0,
      edge_cases_handled: {},
      avg_confidence: 0,
      avg_processing_time_ms: 0,
      policy_compliance_rate: 1.0,
      language_distribution: {}
    };
    this.confidenceSum = 0;
    this.timeSum = 0;
    this.policyComplianceCount = 0;
  }
}

export const metricsCollector = new MetricsCollector();

