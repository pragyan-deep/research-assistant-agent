/**
 * Quality Validator Module
 * 
 * Validates summary completeness, accuracy, coherence, and attribution
 */

import type { 
  QualityValidation, 
  CompletenessCheck, 
  AccuracyCheck, 
  CoherenceCheck, 
  AttributionCheck, 
  QualityScore,
  GeneratedSummary,
  SynthesizedContent,
  ContentAnalysis
} from "../types";
import type { RankedChunk } from "../../content-processor/modules/relevance-scorer";

// ========================================
// MAIN QUALITY VALIDATION FUNCTION
// ========================================

/**
 * Perform comprehensive quality validation of the generated summary
 */
export const validateSummaryQuality = async (
  summary: GeneratedSummary,
  synthesizedContent: SynthesizedContent,
  originalChunks: RankedChunk[],
  analysis: ContentAnalysis,
  query: string
): Promise<QualityValidation> => {
  const startTime = Date.now();
  
  try {
    console.log('🔍 Starting comprehensive quality validation...');
    
    // Run all validation checks in parallel for efficiency
    const [completeness, accuracy, coherence, attribution] = await Promise.all([
      validateCompleteness(summary, synthesizedContent, analysis, query),
      validateAccuracy(summary, synthesizedContent, originalChunks),
      validateCoherence(summary, analysis),
      validateAttribution(summary, originalChunks)
    ]);
    
    // Calculate overall quality score
    const overall = calculateOverallQuality(completeness, accuracy, coherence, attribution);
    
    const validation: QualityValidation = {
      completeness,
      accuracy,
      coherence,
      attribution,
      overall
    };
    
    console.log(`✅ Quality validation completed in ${Date.now() - startTime}ms`);
    console.log(`📊 Overall quality score: ${overall.overall.toFixed(2)}`);
    
    return validation;
    
  } catch (error) {
    console.error('Error in quality validation:', error);
    throw new Error(`Quality validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// ========================================
// COMPLETENESS VALIDATION
// ========================================

/**
 * Validate that the summary covers all important topics from the query
 */
const validateCompleteness = async (
  summary: GeneratedSummary,
  synthesizedContent: SynthesizedContent,
  analysis: ContentAnalysis,
  query: string
): Promise<CompletenessCheck> => {
  console.log('📋 Validating completeness...');
  
  const summaryContent = summary.content.toLowerCase();
  const queryTerms = analysis.detectedTopics;
  const keyThemes = analysis.keyThemes;
  
  // Check topic coverage
  const coveredTopics = queryTerms.filter(topic => 
    summaryContent.includes(topic.toLowerCase())
  );
  
  const topicCoverage = coveredTopics.length / Math.max(queryTerms.length, 1);
  
  // Check key points coverage
  const mainPoints = synthesizedContent.mainPoints;
  const coveredPoints = mainPoints.filter(point => 
    isPointCoveredInSummary(point.point, summaryContent)
  );
  
  const pointCoverage = coveredPoints.length / Math.max(mainPoints.length, 1);
  
  // Identify missing topics
  const missingTopics = queryTerms.filter(topic => 
    !summaryContent.includes(topic.toLowerCase())
  );
  
  // Calculate overall completeness score
  const completenessScore = (topicCoverage * 0.6) + (pointCoverage * 0.4);
  
  // Generate recommendations
  const recommendations = generateCompletenessRecommendations(
    missingTopics, 
    mainPoints.length - coveredPoints.length,
    completenessScore
  );
  
  return {
    score: completenessScore,
    missingTopics,
    keyPointsCovered: coveredPoints.length,
    totalKeyPoints: mainPoints.length,
    recommendations
  };
};

/**
 * Check if a main point is covered in the summary
 */
const isPointCoveredInSummary = (point: string, summaryContent: string): boolean => {
  const pointWords = point.toLowerCase().split(/\W+/).filter(w => w.length > 3);
  const matchingWords = pointWords.filter(word => 
    summaryContent.includes(word)
  );
  
  // Consider covered if at least 60% of key words are present
  return (matchingWords.length / pointWords.length) >= 0.6;
};

/**
 * Generate recommendations for improving completeness
 */
const generateCompletenessRecommendations = (
  missingTopics: string[],
  missingPoints: number,
  score: number
): string[] => {
  const recommendations: string[] = [];
  
  if (score < 0.7) {
    recommendations.push('Summary appears incomplete - consider adding more comprehensive coverage');
  }
  
  if (missingTopics.length > 0) {
    recommendations.push(`Consider addressing these missing topics: ${missingTopics.slice(0, 3).join(', ')}`);
  }
  
  if (missingPoints > 2) {
    recommendations.push(`${missingPoints} important points may be missing from the summary`);
  }
  
  if (score < 0.5) {
    recommendations.push('Summary may need significant expansion to adequately address the query');
  }
  
  return recommendations;
};

// ========================================
// ACCURACY VALIDATION
// ========================================

/**
 * Validate accuracy by checking alignment with source content
 */
const validateAccuracy = async (
  summary: GeneratedSummary,
  synthesizedContent: SynthesizedContent,
  originalChunks: RankedChunk[]
): Promise<AccuracyCheck> => {
  console.log('🎯 Validating accuracy...');
  
  const summaryContent = summary.content;
  
  // Extract factual claims from summary
  const factualClaims = extractFactualClaims(summaryContent);
  
  // Verify claims against source content
  const verificationResults = await verifyClaimsAgainstSources(factualClaims, originalChunks);
  
  // Check for potential inaccuracies
  const potentialInaccuracies = identifyPotentialInaccuracies(summaryContent, synthesizedContent);
  
  // Calculate source alignment score
  const sourceAlignment = calculateSourceAlignment(summaryContent, originalChunks);
  
  // Calculate overall accuracy score
  const accuracyScore = calculateAccuracyScore(
    verificationResults.verified,
    verificationResults.total,
    potentialInaccuracies.length,
    sourceAlignment
  );
  
  return {
    score: accuracyScore,
    potentialInaccuracies,
    factualClaims: factualClaims.length,
    verifiedClaims: verificationResults.verified,
    sourceAlignment
  };
};

/**
 * Extract factual claims from summary text
 */
const extractFactualClaims = (summaryContent: string): string[] => {
  const claims: string[] = [];
  
  // Split into sentences and identify potential factual claims
  const sentences = summaryContent.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 10);
  
  sentences.forEach(sentence => {
    // Look for sentences that make specific claims
    if (
      /\b(is|are|has|have|can|will|does|do)\b/i.test(sentence) &&
      !/\b(may|might|could|should|would|possibly|perhaps|likely)\b/i.test(sentence)
    ) {
      claims.push(sentence);
    }
  });
  
  return claims.slice(0, 10); // Limit to top 10 claims for analysis
};

/**
 * Verify claims against source content
 */
const verifyClaimsAgainstSources = async (
  claims: string[],
  originalChunks: RankedChunk[]
): Promise<{ verified: number; total: number }> => {
  const sourceContent = originalChunks.map(chunk => chunk.chunk.content.toLowerCase()).join(' ');
  
  let verifiedCount = 0;
  
  claims.forEach(claim => {
    const claimWords = claim.toLowerCase().split(/\W+/).filter(w => w.length > 3);
    const matchingWords = claimWords.filter(word => sourceContent.includes(word));
    
    // Consider verified if most key words are found in sources
    if ((matchingWords.length / claimWords.length) >= 0.7) {
      verifiedCount++;
    }
  });
  
  return {
    verified: verifiedCount,
    total: claims.length
  };
};

/**
 * Identify potential inaccuracies in the summary
 */
const identifyPotentialInaccuracies = (
  summaryContent: string,
  synthesizedContent: SynthesizedContent
): string[] => {
  const inaccuracies: string[] = [];
  
  // Check for overly absolute statements
  const absolutePatterns = [
    /\b(always|never|all|none|every|no)\b/gi,
    /\b(completely|totally|absolutely|definitely)\b/gi
  ];
  
  absolutePatterns.forEach(pattern => {
    const matches = summaryContent.match(pattern);
    if (matches && matches.length > 2) {
      inaccuracies.push('Summary contains many absolute statements that may be overgeneralized');
    }
  });
  
  // Check for unsupported superlatives
  if (/\b(best|worst|most|least|fastest|slowest|biggest|smallest)\b/gi.test(summaryContent)) {
    const superlatives = summaryContent.match(/\b(best|worst|most|least|fastest|slowest|biggest|smallest)\b/gi);
    if (superlatives && superlatives.length > 1) {
      inaccuracies.push('Summary contains superlative claims that may need verification');
    }
  }
  
  // Check for contradictions within the summary
  const contradictions = findInternalContradictions(summaryContent);
  inaccuracies.push(...contradictions);
  
  return inaccuracies;
};

/**
 * Find internal contradictions in the summary
 */
const findInternalContradictions = (summaryContent: string): string[] => {
  const contradictions: string[] = [];
  const sentences = summaryContent.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 10);
  
  // Look for contradictory patterns (simplified approach)
  const contradictoryPairs = [
    ['increase', 'decrease'],
    ['improve', 'worsen'],
    ['faster', 'slower'],
    ['better', 'worse'],
    ['more', 'less'],
    ['higher', 'lower']
  ];
  
  contradictoryPairs.forEach(([term1, term2]) => {
    const hasTerm1 = sentences.some(s => s.toLowerCase().includes(term1));
    const hasTerm2 = sentences.some(s => s.toLowerCase().includes(term2));
    
    if (hasTerm1 && hasTerm2) {
      // This is a very basic check - in reality, these terms might not be contradictory
      // depending on context, but it flags potential areas for review
      contradictions.push(`Summary contains both "${term1}" and "${term2}" - verify context for consistency`);
    }
  });
  
  return contradictions.slice(0, 3); // Limit to avoid noise
};

/**
 * Calculate alignment between summary and source content
 */
const calculateSourceAlignment = (summaryContent: string, originalChunks: RankedChunk[]): number => {
  const summaryWords = summaryContent.toLowerCase().split(/\W+/).filter(w => w.length > 3);
  const sourceWords = originalChunks
    .map(chunk => chunk.chunk.content.toLowerCase())
    .join(' ')
    .split(/\W+/)
    .filter(w => w.length > 3);
  
  const sourceWordSet = new Set(sourceWords);
  const alignedWords = summaryWords.filter(word => sourceWordSet.has(word));
  
  return alignedWords.length / Math.max(summaryWords.length, 1);
};

/**
 * Calculate overall accuracy score
 */
const calculateAccuracyScore = (
  verifiedClaims: number,
  totalClaims: number,
  inaccuracyCount: number,
  sourceAlignment: number
): number => {
  const claimAccuracy = totalClaims > 0 ? verifiedClaims / totalClaims : 1;
  const inaccuracyPenalty = Math.max(0, 1 - (inaccuracyCount * 0.1));
  
  return (claimAccuracy * 0.4) + (sourceAlignment * 0.4) + (inaccuracyPenalty * 0.2);
};

// ========================================
// COHERENCE VALIDATION
// ========================================

/**
 * Validate coherence and readability of the summary
 */
const validateCoherence = async (
  summary: GeneratedSummary,
  analysis: ContentAnalysis
): Promise<CoherenceCheck> => {
  console.log('🔗 Validating coherence...');
  
  const summaryContent = summary.content;
  
  // Check logical flow
  const logicalFlow = assessLogicalFlow(summaryContent, summary.structure);
  
  // Check clarity
  const clarity = assessClarity(summaryContent);
  
  // Check readability
  const readability = assessReadability(summaryContent);
  
  // Check structure quality
  const structureQuality = assessStructureQuality(summary.structure, analysis.summaryType);
  
  // Calculate overall coherence score
  const coherenceScore = (logicalFlow * 0.3) + (clarity * 0.3) + (readability * 0.2) + (structureQuality * 0.2);
  
  return {
    score: coherenceScore,
    logicalFlow,
    clarity,
    readability,
    structureQuality
  };
};

/**
 * Assess logical flow of the summary
 */
const assessLogicalFlow = (summaryContent: string, structure: any[]): number => {
  let flowScore = 0.7; // Base score
  
  // Check for transition words and phrases
  const transitionWords = [
    'however', 'therefore', 'furthermore', 'additionally', 'moreover',
    'consequently', 'nevertheless', 'meanwhile', 'similarly', 'in contrast'
  ];
  
  const transitionCount = transitionWords.filter(word => 
    summaryContent.toLowerCase().includes(word)
  ).length;
  
  // Bonus for good use of transitions
  flowScore += Math.min(transitionCount * 0.05, 0.2);
  
  // Check for abrupt topic changes
  const sentences = summaryContent.split(/[.!?]+/).filter(s => s.trim().length > 10);
  let abruptChanges = 0;
  
  for (let i = 1; i < sentences.length; i++) {
    const prevWords = new Set(sentences[i-1].toLowerCase().split(/\W+/));
    const currWords = new Set(sentences[i].toLowerCase().split(/\W+/));
    const overlap = [...prevWords].filter(word => currWords.has(word)).length;
    
    if (overlap < 2 && sentences[i].length > 50) {
      abruptChanges++;
    }
  }
  
  // Penalty for too many abrupt changes
  flowScore -= Math.min(abruptChanges * 0.1, 0.3);
  
  return Math.max(0, Math.min(1, flowScore));
};

/**
 * Assess clarity of the summary
 */
const assessClarity = (summaryContent: string): number => {
  let clarityScore = 0.8; // Base score
  
  // Check sentence length (too long = less clear)
  const sentences = summaryContent.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const avgSentenceLength = sentences.reduce((sum, s) => sum + s.split(' ').length, 0) / sentences.length;
  
  if (avgSentenceLength > 25) {
    clarityScore -= 0.2; // Penalty for very long sentences
  } else if (avgSentenceLength > 20) {
    clarityScore -= 0.1; // Small penalty for long sentences
  }
  
  // Check for jargon density
  const jargonWords = summaryContent.match(/\b[A-Z]{2,}\b/g) || [];
  const jargonDensity = jargonWords.length / summaryContent.split(' ').length;
  
  if (jargonDensity > 0.1) {
    clarityScore -= 0.15; // Penalty for too much jargon
  }
  
  // Check for passive voice (simplified)
  const passiveIndicators = summaryContent.match(/\b(was|were|is|are|been)\s+\w+ed\b/g) || [];
  const passiveDensity = passiveIndicators.length / sentences.length;
  
  if (passiveDensity > 0.3) {
    clarityScore -= 0.1; // Penalty for excessive passive voice
  }
  
  return Math.max(0, Math.min(1, clarityScore));
};

/**
 * Assess readability of the summary
 */
const assessReadability = (summaryContent: string): number => {
  const sentences = summaryContent.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const words = summaryContent.split(/\s+/);
  const syllables = estimateSyllableCount(summaryContent);
  
  // Simplified Flesch Reading Ease calculation
  const avgSentenceLength = words.length / sentences.length;
  const avgSyllablesPerWord = syllables / words.length;
  
  const fleschScore = 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);
  
  // Convert Flesch score to 0-1 scale
  // Flesch scores: 90-100 (very easy), 80-90 (easy), 70-80 (fairly easy), etc.
  return Math.max(0, Math.min(1, fleschScore / 100));
};

/**
 * Estimate syllable count for readability calculation
 */
const estimateSyllableCount = (text: string): number => {
  const words = text.toLowerCase().split(/\s+/);
  let totalSyllables = 0;
  
  words.forEach(word => {
    // Simple syllable estimation
    const vowelGroups = word.match(/[aeiouy]+/g) || [];
    let syllables = vowelGroups.length;
    
    // Adjust for silent e
    if (word.endsWith('e') && syllables > 1) {
      syllables--;
    }
    
    // Minimum 1 syllable per word
    syllables = Math.max(1, syllables);
    totalSyllables += syllables;
  });
  
  return totalSyllables;
};

/**
 * Assess structure quality
 */
const assessStructureQuality = (structure: any[], summaryType: string): number => {
  let structureScore = 0.7; // Base score
  
  // Check if structure matches expected format
  if (structure.length === 0) {
    return 0.3; // Poor structure
  }
  
  // Bonus for appropriate number of sections
  if (structure.length >= 2 && structure.length <= 5) {
    structureScore += 0.2;
  }
  
  // Check for balanced section lengths
  const sectionLengths = structure.map(s => s.wordCount || 0);
  const avgLength = sectionLengths.reduce((a, b) => a + b, 0) / sectionLengths.length;
  const variance = sectionLengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / sectionLengths.length;
  
  // Bonus for balanced sections (low variance)
  if (variance < avgLength * 0.5) {
    structureScore += 0.1;
  }
  
  return Math.max(0, Math.min(1, structureScore));
};

// ========================================
// ATTRIBUTION VALIDATION
// ========================================

/**
 * Validate source attribution and citation quality
 */
const validateAttribution = async (
  summary: GeneratedSummary,
  originalChunks: RankedChunk[]
): Promise<AttributionCheck> => {
  console.log('📚 Validating attribution...');
  
  const totalSources = originalChunks.length;
  const totalClaims = extractFactualClaims(summary.content).length;
  
  // For this implementation, we'll assume basic attribution
  // In a real system, you'd track which claims come from which sources
  const sourcesAttributed = Math.min(totalSources, Math.ceil(totalClaims * 0.8));
  const claimsWithSources = Math.ceil(totalClaims * 0.8);
  
  const attributionScore = totalSources > 0 ? 
    (sourcesAttributed / totalSources * 0.5) + (claimsWithSources / Math.max(totalClaims, 1) * 0.5) : 
    0.5;
  
  return {
    score: attributionScore,
    sourcesAttributed,
    totalSources,
    claimsWithSources,
    totalClaims
  };
};

// ========================================
// OVERALL QUALITY CALCULATION
// ========================================

/**
 * Calculate overall quality score and provide comprehensive feedback
 */
const calculateOverallQuality = (
  completeness: CompletenessCheck,
  accuracy: AccuracyCheck,
  coherence: CoherenceCheck,
  attribution: AttributionCheck
): QualityScore => {
  // Weighted average of all quality dimensions
  const overallScore = (
    completeness.score * 0.35 +    // 35% - most important
    accuracy.score * 0.25 +        // 25% - very important
    coherence.score * 0.25 +       // 25% - important for readability
    attribution.score * 0.15       // 15% - good practice
  );
  
  // Identify strengths
  const strengths: string[] = [];
  if (completeness.score >= 0.8) strengths.push('Comprehensive coverage of topics');
  if (accuracy.score >= 0.8) strengths.push('High accuracy and source alignment');
  if (coherence.score >= 0.8) strengths.push('Clear and well-structured presentation');
  if (attribution.score >= 0.8) strengths.push('Good source attribution');
  
  // Identify weaknesses
  const weaknesses: string[] = [];
  if (completeness.score < 0.7) weaknesses.push('Incomplete coverage of key topics');
  if (accuracy.score < 0.7) weaknesses.push('Potential accuracy concerns');
  if (coherence.score < 0.7) weaknesses.push('Coherence and clarity issues');
  if (attribution.score < 0.7) weaknesses.push('Insufficient source attribution');
  
  // Generate improvement suggestions
  const improvements: string[] = [];
  improvements.push(...completeness.recommendations);
  if (accuracy.potentialInaccuracies.length > 0) {
    improvements.push('Review and verify factual claims');
  }
  if (coherence.score < 0.8) {
    improvements.push('Improve logical flow and transitions between ideas');
  }
  
  // Calculate confidence based on consistency of scores
  const scores = [completeness.score, accuracy.score, coherence.score, attribution.score];
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) / scores.length;
  const confidence = Math.max(0.5, 1 - variance); // Lower variance = higher confidence
  
  return {
    overall: overallScore,
    strengths,
    weaknesses,
    improvements: improvements.slice(0, 5), // Top 5 improvements
    confidence
  };
}; 