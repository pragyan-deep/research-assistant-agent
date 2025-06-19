/**
 * Summarizer Tool Types and Interfaces
 * 
 * Comprehensive type definitions for the summarizer tool modules
 */

import type { RankedChunk } from "../../content-processor/modules/relevance-scorer";

// ========================================
// CORE TYPES
// ========================================

export type SummaryType = 'executive' | 'detailed' | 'bullet-points' | 'how-to' | 'comparison' | 'definition';
export type SummaryTone = 'professional' | 'comprehensive' | 'instructional' | 'analytical' | 'explanatory' | 'casual';
export type ContentStructure = 'overview' | 'key-findings' | 'implications' | 'introduction' | 'main-content' | 'examples' | 'conclusion' | 'prerequisites' | 'steps' | 'tips' | 'troubleshooting';

// ========================================
// INPUT INTERFACES
// ========================================

export interface SummaryRequest {
  chunks: RankedChunk[];
  query: string;
  summaryType?: SummaryType;
  options?: SummaryOptions;
}

export interface SummaryOptions {
  maxLength?: number;
  tone?: SummaryTone;
  includeExamples?: boolean;
  includeSources?: boolean;
  technicalLevel?: 'beginner' | 'intermediate' | 'advanced';
  format?: 'paragraph' | 'bullet' | 'numbered';
}

// ========================================
// CONTENT ANALYSIS INTERFACES
// ========================================

export interface ContentAnalysis {
  summaryType: SummaryType;
  detectedTopics: string[];
  keyThemes: ContentTheme[];
  contentStructure: ContentStructureAnalysis;
  recommendedLength: number;
  technicalComplexity: 'low' | 'medium' | 'high';
  queryIntent: 'definition' | 'explanation' | 'instruction' | 'comparison' | 'analysis';
}

export interface ContentTheme {
  topic: string;
  importance: number; // 0-1 scale
  supportingChunks: number[]; // chunk indices
  keyPoints: string[];
}

export interface ContentStructureAnalysis {
  hasDefinitions: boolean;
  hasSteps: boolean;
  hasExamples: boolean;
  hasComparisons: boolean;
  hasProsCons: boolean;
  hasTechnicalDetails: boolean;
}

// ========================================
// CONTENT SYNTHESIS INTERFACES
// ========================================

export interface SynthesizedContent {
  mainPoints: ContentPoint[];
  supportingDetails: SupportingDetail[];
  examples: Example[];
  definitions: Definition[];
  steps: Step[];
  comparisons: Comparison[];
  sources: SourceReference[];
  metadata: SynthesisMetadata;
}

export interface ContentPoint {
  point: string;
  importance: number;
  supportingChunks: number[];
  category: 'primary' | 'secondary' | 'supporting';
  evidence: string[];
}

export interface SupportingDetail {
  detail: string;
  relatedPoint: string;
  sourceChunk: number;
  type: 'explanation' | 'elaboration' | 'context' | 'clarification';
}

export interface Example {
  description: string;
  context: string;
  sourceChunk: number;
  relevance: number;
  type: 'code' | 'scenario' | 'case-study' | 'illustration';
}

export interface Definition {
  term: string;
  definition: string;
  context: string;
  sourceChunk: number;
  importance: number;
}

export interface Step {
  stepNumber: number;
  instruction: string;
  details: string[];
  prerequisites: string[];
  tips: string[];
  sourceChunk: number;
}

export interface Comparison {
  aspect: string;
  items: ComparisonItem[];
  conclusion: string;
  sourceChunks: number[];
}

export interface ComparisonItem {
  name: string;
  pros: string[];
  cons: string[];
  details: string[];
}

export interface SourceReference {
  url: string;
  title: string;
  chunkId: string;
  relevanceScore: number;
  usedForPoints: string[];
}

export interface SynthesisMetadata {
  totalChunks: number;
  synthesisTime: number;
  conflictsResolved: number;
  duplicatesRemoved: number;
  mainTopicsCovered: number;
}

// ========================================
// SUMMARY GENERATION INTERFACES
// ========================================

export interface SummaryTemplate {
  structure: ContentStructure[];
  maxLength: number;
  tone: SummaryTone;
  format: 'paragraph' | 'bullet' | 'numbered' | 'mixed';
  includeIntroduction: boolean;
  includeConclusion: boolean;
  sectionHeaders: boolean;
}

export interface GeneratedSummary {
  content: string;
  structure: SummarySection[];
  metadata: SummaryMetadata;
  formatting: SummaryFormatting;
}

export interface SummarySection {
  type: ContentStructure;
  title: string;
  content: string;
  wordCount: number;
  sources: string[];
}

export interface SummaryMetadata {
  summaryType: SummaryType;
  wordCount: number;
  readingLevel: string;
  technicalLevel: 'beginner' | 'intermediate' | 'advanced';
  completeness: number; // 0-1 scale
  generationTime: number;
  sourcesUsed: number;
}

export interface SummaryFormatting {
  hasHeaders: boolean;
  hasBulletPoints: boolean;
  hasNumberedLists: boolean;
  hasCodeBlocks: boolean;
  hasQuotes: boolean;
}

// ========================================
// QUALITY VALIDATION INTERFACES
// ========================================

export interface QualityValidation {
  completeness: CompletenessCheck;
  accuracy: AccuracyCheck;
  coherence: CoherenceCheck;
  attribution: AttributionCheck;
  overall: QualityScore;
}

export interface CompletenessCheck {
  score: number; // 0-1 scale
  missingTopics: string[];
  keyPointsCovered: number;
  totalKeyPoints: number;
  recommendations: string[];
}

export interface AccuracyCheck {
  score: number; // 0-1 scale
  potentialInaccuracies: string[];
  factualClaims: number;
  verifiedClaims: number;
  sourceAlignment: number; // 0-1 scale
}

export interface CoherenceCheck {
  score: number; // 0-1 scale
  logicalFlow: number; // 0-1 scale
  clarity: number; // 0-1 scale
  readability: number; // 0-1 scale
  structureQuality: number; // 0-1 scale
}

export interface AttributionCheck {
  score: number; // 0-1 scale
  sourcesAttributed: number;
  totalSources: number;
  claimsWithSources: number;
  totalClaims: number;
}

export interface QualityScore {
  overall: number; // 0-1 scale
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
  confidence: number; // 0-1 scale
}

// ========================================
// FINAL RESULT INTERFACE
// ========================================

export interface SummaryResult {
  summary: string;
  summaryType: SummaryType;
  sections: SummarySection[];
  sources: SourceReference[];
  analysis: ContentAnalysis;
  synthesis: SynthesisMetadata;
  quality: QualityValidation;
  metadata: {
    processingTime: number;
    originalChunks: number;
    finalWordCount: number;
    compressionRatio: number;
    timestamp: string;
  };
}

// ========================================
// ERROR INTERFACES
// ========================================

export interface SummaryError {
  stage: 'analysis' | 'synthesis' | 'generation' | 'validation';
  type: 'insufficient-content' | 'processing-error' | 'validation-failed' | 'api-error';
  message: string;
  details?: any;
}

// ========================================
// UTILITY TYPES
// ========================================

export type SummaryStage = 'analysis' | 'synthesis' | 'generation' | 'validation' | 'complete';

export interface ProcessingProgress {
  stage: SummaryStage;
  progress: number; // 0-100
  message: string;
  timeElapsed: number;
} 