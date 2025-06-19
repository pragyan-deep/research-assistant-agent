/**
 * Relevance Scorer Module - Stage 4 of Content Processing Pipeline
 * 
 * Purpose: Score and filter text chunks based on relevance to the original search query
 * Input: Array of text chunks from text chunker
 * Output: Ranked and filtered chunks with relevance scores
 */

import { ChatAnthropic } from "@langchain/anthropic";
import type { TextChunk } from "./text-chunker";

// ========================================
// INTERFACES & TYPES
// ========================================

interface QueryAnalysis {
  type: QueryType;
  keyTerms: string[];
  intent: QueryIntent;
  complexity: QueryComplexity;
}

interface ChunkRelevanceScore {
  chunkIndex: number;
  relevanceScore: number;
  qualityScore: number;
  reasons: string[];
  keyMatches: string[];
}

export interface RankedChunk {
  chunk: TextChunk;
  relevanceScore: number;
  qualityScore: number;
  diversityScore: number;
  positionScore: number;
  finalScore: number;
  reasons: string[];
  keyMatches: string[];
  rank: number;
}

interface RelevanceScoringResult {
  rankedChunks: RankedChunk[];
  filtering: {
    totalChunks: number;
    filteredChunks: number;
    averageRelevance: number;
    filteringStrategy: string;
    processingTime: number;
  };
  queryAnalysis: QueryAnalysis;
}

type QueryType = 'definition' | 'howTo' | 'comparison' | 'technical' | 'conceptual' | 'general';
type QueryIntent = 'learn' | 'solve' | 'compare' | 'implement' | 'understand';
type QueryComplexity = 'simple' | 'moderate' | 'complex';

// ========================================
// CONFIGURATION
// ========================================

const RELEVANCE_CONFIG = {
  // Scoring weights
  weights: {
    relevance: 0.5,    // 50% - semantic relevance to query
    quality: 0.3,      // 30% - information quality and depth
    diversity: 0.1,    // 10% - source diversity bonus
    position: 0.1      // 10% - position in original document
  },
  
  // Filtering thresholds
  thresholds: {
    minimumRelevance: 0.4,     // Minimum relevance score to keep chunk
    minimumQuality: 0.3,       // Minimum quality score to keep chunk
    minimumFinalScore: 0.5     // Minimum final score to keep chunk
  },
  
  // Chunk limits based on query complexity
  chunkLimits: {
    simple: 3,      // Simple queries need fewer chunks
    moderate: 4,    // Moderate queries need more context
    complex: 5      // Complex queries need comprehensive coverage
  }
};

// ========================================
// STEP 1: QUERY ANALYSIS
// ========================================

/**
 * Analyze the search query to understand what type of answer is needed
 * 
 * This helps us:
 * - Understand user intent
 * - Extract key terms and concepts
 * - Determine optimal number of chunks to return
 * - Customize scoring criteria
 */
const analyzeSearchQuery = (query: string): QueryAnalysis => {
  console.log(`🔍 Step 1: Analyzing search query: "${query}"`);
  
  const queryType = determineQueryType(query);
  const keyTerms = extractKeyTermsFromQuery(query);
  const intent = determineUserIntent(query);
  const complexity = assessQueryComplexity(query, keyTerms);
  
  console.log(`✅ Query analysis complete: Type=${queryType}, Intent=${intent}, Complexity=${complexity}`);
  
  return {
    type: queryType,
    keyTerms,
    intent,
    complexity
  };
};

/**
 * Determine the type of query based on patterns and keywords
 */
const determineQueryType = (query: string): QueryType => {
  const lowercaseQuery = query.toLowerCase();
  
  const queryPatterns = {
    definition: /what is|define|meaning of|explain|definition/i,
    howTo: /how to|how do|tutorial|guide|steps|instructions/i,
    comparison: /vs|versus|difference|compare|better|best/i,
    technical: /api|code|programming|syntax|implementation|library|framework/i,
    conceptual: /concept|theory|principle|why|when|where|philosophy/i
  };
  
  for (const [type, pattern] of Object.entries(queryPatterns)) {
    if (pattern.test(lowercaseQuery)) {
      return type as QueryType;
    }
  }
  
  return 'general';
};

/**
 * Extract key terms and concepts from the query
 */
const extractKeyTermsFromQuery = (query: string): string[] => {
  // Remove common stop words and extract meaningful terms
  const stopWords = ['what', 'is', 'how', 'to', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'for', 'with', 'by'];
  
  const words = query
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.includes(word));
  
  // Return unique terms
  return [...new Set(words)];
};

/**
 * Determine user intent from the query
 */
const determineUserIntent = (query: string): QueryIntent => {
  const intentPatterns = {
    learn: /learn|understand|know|explain|what/i,
    solve: /solve|fix|error|problem|issue|debug/i,
    compare: /compare|vs|versus|difference|better|best/i,
    implement: /implement|build|create|make|develop|code/i,
    understand: /why|when|where|concept|theory|principle/i
  };
  
  for (const [intent, pattern] of Object.entries(intentPatterns)) {
    if (pattern.test(query)) {
      return intent as QueryIntent;
    }
  }
  
  return 'learn';
};

/**
 * Assess query complexity to determine optimal chunk count
 */
const assessQueryComplexity = (query: string, keyTerms: string[]): QueryComplexity => {
  const complexityIndicators = {
    simple: query.length < 30 && keyTerms.length <= 2,
    complex: query.length > 80 || keyTerms.length > 5 || /advanced|complex|detailed|comprehensive/i.test(query)
  };
  
  if (complexityIndicators.simple) return 'simple';
  if (complexityIndicators.complex) return 'complex';
  return 'moderate';
};

// ========================================
// STEP 2: CHUNK RELEVANCE SCORING
// ========================================

/**
 * Score all chunks for relevance using Claude's semantic understanding
 * 
 * This is the core of our relevance scoring - we use Claude to understand
 * the semantic relationship between each chunk and the original query
 */
const scoreChunksForRelevance = async (
  chunks: TextChunk[], 
  query: string, 
  queryAnalysis: QueryAnalysis
): Promise<ChunkRelevanceScore[]> => {
  console.log(`🧠 Step 2: Scoring ${chunks.length} chunks for relevance to query`);
  
  if (chunks.length === 0) {
    return [];
  }
  
  // Use batch processing for efficiency
  const scores = await batchScoreChunksWithClaude(chunks, query, queryAnalysis);
  
  console.log(`✅ Relevance scoring complete: ${scores.length} chunks scored`);
  return scores;
};

/**
 * Batch process multiple chunks in a single Claude API call for efficiency
 */
const batchScoreChunksWithClaude = async (
  chunks: TextChunk[], 
  query: string, 
  queryAnalysis: QueryAnalysis
): Promise<ChunkRelevanceScore[]> => {
  const claude = new ChatAnthropic({
    model: "claude-3-5-sonnet-20241022",
    temperature: 0.1 // Low temperature for consistent scoring
  });
  
  const scoringPrompt = createBatchScoringPrompt(chunks, query, queryAnalysis);
  
  try {
    const response = await claude.invoke(scoringPrompt);
    const scores = parseScoringResponse(response.content as string);
    
    return validateAndNormalizeScores(scores, chunks.length);
  } catch (error) {
    console.error('❌ Error in batch scoring:', error);
    return createFallbackScores(chunks);
  }
};

/**
 * Create the prompt for batch scoring chunks
 */
const createBatchScoringPrompt = (
  chunks: TextChunk[], 
  query: string, 
  queryAnalysis: QueryAnalysis
): string => {
  const chunksForScoring = chunks.map((chunk, index) => ({
    index: index + 1,
    preview: chunk.content.substring(0, 400) + (chunk.content.length > 400 ? '...' : ''),
    source: chunk.source.title
  }));
  
  return `You are an expert content relevance analyzer. Rate the relevance of these text chunks to the search query.

SEARCH QUERY: "${query}"
QUERY TYPE: ${queryAnalysis.type}
KEY TERMS: ${queryAnalysis.keyTerms.join(', ')}
USER INTENT: ${queryAnalysis.intent}

CHUNKS TO SCORE:
${chunksForScoring.map(chunk => `
CHUNK ${chunk.index} (from "${chunk.source}"):
"${chunk.preview}"
`).join('\n')}

For each chunk, consider:
1. RELEVANCE: How directly does this chunk answer or relate to the query?
2. QUALITY: How informative, accurate, and well-structured is the content?
3. KEY MATCHES: Which key terms or concepts from the query are present?
4. VALUE: How useful would this be for someone with the identified intent?

Respond with ONLY a valid JSON array (no other text):
[
  {
    "chunkIndex": 1,
    "relevanceScore": 0.85,
    "qualityScore": 0.90,
    "reasons": ["Contains direct definition", "Explains key concepts", "High information density"],
    "keyMatches": ["react", "javascript", "component"]
  },
  {
    "chunkIndex": 2,
    "relevanceScore": 0.65,
    "qualityScore": 0.75,
    "reasons": ["Provides examples", "Good explanation"],
    "keyMatches": ["javascript", "programming"]
  }
]

IMPORTANT: Return exactly ${chunks.length} objects, one for each chunk, with scores between 0.0 and 1.0.`;
};

/**
 * Parse Claude's scoring response into structured data
 */
const parseScoringResponse = (response: string): ChunkRelevanceScore[] => {
  try {
    // Extract JSON from response (in case Claude adds extra text)
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array found in response');
    }
    
    const scores = JSON.parse(jsonMatch[0]) as ChunkRelevanceScore[];
    return scores;
  } catch (error) {
    console.error('❌ Error parsing scoring response:', error);
    throw error;
  }
};

/**
 * Validate and normalize scores to ensure they're within expected ranges
 */
const validateAndNormalizeScores = (
  scores: ChunkRelevanceScore[], 
  expectedCount: number
): ChunkRelevanceScore[] => {
  // Ensure we have the right number of scores
  if (scores.length !== expectedCount) {
    console.warn(`⚠️ Expected ${expectedCount} scores, got ${scores.length}`);
  }
  
  return scores.map(score => ({
    ...score,
    relevanceScore: Math.max(0, Math.min(1, score.relevanceScore || 0)),
    qualityScore: Math.max(0, Math.min(1, score.qualityScore || 0)),
    reasons: Array.isArray(score.reasons) ? score.reasons : [],
    keyMatches: Array.isArray(score.keyMatches) ? score.keyMatches : []
  }));
};

/**
 * Create fallback scores if Claude scoring fails
 */
const createFallbackScores = (chunks: TextChunk[]): ChunkRelevanceScore[] => {
  console.log('⚠️ Using fallback scoring method');
  
  return chunks.map((chunk, index) => ({
    chunkIndex: index + 1,
    relevanceScore: 0.5, // Neutral score
    qualityScore: 0.5,   // Neutral score
    reasons: ['Fallback scoring - Claude API unavailable'],
    keyMatches: []
  }));
};

// ========================================
// STEP 3: SMART FILTERING & RANKING
// ========================================

/**
 * Apply smart filtering and ranking to select the best chunks
 * 
 * This combines multiple factors to create a final ranking:
 * - Relevance score from Claude
 * - Quality assessment
 * - Source diversity
 * - Position in original document
 */
const filterAndRankChunks = (
  chunks: TextChunk[], 
  scores: ChunkRelevanceScore[], 
  queryAnalysis: QueryAnalysis
): RankedChunk[] => {
  console.log(`📊 Step 3: Filtering and ranking ${chunks.length} chunks`);
  
  // Combine chunks with their scores
  const chunksWithScores = combineChunksWithScores(chunks, scores);
  
  // Calculate final scores for each chunk
  const rankedChunks = calculateFinalScoresForChunks(chunksWithScores);
  
  // Apply filtering based on thresholds
  const filteredChunks = applyQualityFiltering(rankedChunks);
  
  // Sort by final score and apply final ranking
  const finalRanking = applySortingAndRanking(filteredChunks);
  
  // Limit to optimal number based on query complexity
  const limitedChunks = applyChunkLimiting(finalRanking, queryAnalysis.complexity);
  
  console.log(`✅ Filtering complete: ${limitedChunks.length} chunks selected from ${chunks.length} original`);
  
  return limitedChunks;
};

/**
 * Combine chunks with their relevance scores
 */
const combineChunksWithScores = (
  chunks: TextChunk[], 
  scores: ChunkRelevanceScore[]
): Array<{ chunk: TextChunk; score: ChunkRelevanceScore }> => {
  return chunks.map((chunk, index) => {
    const score = scores.find(s => s.chunkIndex === index + 1) || {
      chunkIndex: index + 1,
      relevanceScore: 0.3,
      qualityScore: 0.3,
      reasons: ['No score available'],
      keyMatches: []
    };
    
    return { chunk, score };
  });
};

/**
 * Calculate final scores combining multiple factors
 */
const calculateFinalScoresForChunks = (
  chunksWithScores: Array<{ chunk: TextChunk; score: ChunkRelevanceScore }>
): RankedChunk[] => {
  return chunksWithScores.map(({ chunk, score }) => {
    const diversityScore = calculateSourceDiversityScore(chunk, chunksWithScores);
    const positionScore = calculatePositionScore(chunk);
    
    const finalScore = calculateWeightedFinalScore(
      score.relevanceScore,
      score.qualityScore,
      diversityScore,
      positionScore
    );
    
    return {
      chunk,
      relevanceScore: score.relevanceScore,
      qualityScore: score.qualityScore,
      diversityScore,
      positionScore,
      finalScore,
      reasons: score.reasons,
      keyMatches: score.keyMatches,
      rank: 0 // Will be set after sorting
    };
  });
};

/**
 * Calculate diversity score to prefer chunks from different sources
 */
const calculateSourceDiversityScore = (
  chunk: TextChunk,
  allChunks: Array<{ chunk: TextChunk; score: ChunkRelevanceScore }>
): number => {
  const sameSourceCount = allChunks.filter(
    item => item.chunk.source.url === chunk.source.url
  ).length;
  
  // Higher diversity score for chunks from sources with fewer chunks
  return Math.max(0.3, 1.0 - (sameSourceCount - 1) * 0.2);
};

/**
 * Calculate position score favoring chunks from earlier in documents
 */
const calculatePositionScore = (chunk: TextChunk): number => {
  const position = chunk.metadata.position;
  // Earlier chunks get higher scores, but with diminishing returns
  return Math.max(0.3, 1.0 - (position - 1) * 0.1);
};

/**
 * Calculate weighted final score from all factors
 */
const calculateWeightedFinalScore = (
  relevanceScore: number,
  qualityScore: number,
  diversityScore: number,
  positionScore: number
): number => {
  const { weights } = RELEVANCE_CONFIG;
  
  const finalScore = 
    (relevanceScore * weights.relevance) +
    (qualityScore * weights.quality) +
    (diversityScore * weights.diversity) +
    (positionScore * weights.position);
  
  return Math.min(1.0, Math.max(0.0, finalScore));
};

/**
 * Apply quality filtering based on minimum thresholds
 */
const applyQualityFiltering = (rankedChunks: RankedChunk[]): RankedChunk[] => {
  const { thresholds } = RELEVANCE_CONFIG;
  
  return rankedChunks.filter(chunk => 
    chunk.relevanceScore >= thresholds.minimumRelevance &&
    chunk.qualityScore >= thresholds.minimumQuality &&
    chunk.finalScore >= thresholds.minimumFinalScore
  );
};

/**
 * Sort chunks by final score and assign rankings
 */
const applySortingAndRanking = (chunks: RankedChunk[]): RankedChunk[] => {
  return chunks
    .sort((a, b) => b.finalScore - a.finalScore)
    .map((chunk, index) => ({
      ...chunk,
      rank: index + 1
    }));
};

/**
 * Limit chunks based on query complexity
 */
const applyChunkLimiting = (
  rankedChunks: RankedChunk[], 
  complexity: QueryComplexity
): RankedChunk[] => {
  const limit = RELEVANCE_CONFIG.chunkLimits[complexity];
  return rankedChunks.slice(0, limit);
};

// ========================================
// MAIN RELEVANCE SCORING FUNCTION
// ========================================

/**
 * Main function that orchestrates the entire relevance scoring process
 * 
 * Processing Pipeline:
 * 1. Analyze the search query
 * 2. Score chunks for relevance using Claude
 * 3. Filter and rank chunks by multiple factors
 * 4. Return top-ranked chunks with metadata
 */
export const scoreAndFilterChunks = async (
  chunks: TextChunk[], 
  query: string
): Promise<RelevanceScoringResult> => {
  const startTime = Date.now();
  
  console.log(`🎯 Starting relevance scoring for ${chunks.length} chunks`);
  console.log(`📝 Query: "${query}"`);
  
  try {
    // Step 1: Analyze the search query
    const queryAnalysis = analyzeSearchQuery(query);
    
    // Step 2: Score chunks for relevance
    const relevanceScores = await scoreChunksForRelevance(chunks, query, queryAnalysis);
    
    // Step 3: Filter and rank chunks
    const rankedChunks = filterAndRankChunks(chunks, relevanceScores, queryAnalysis);
    
    const processingTime = Date.now() - startTime;
    const averageRelevance = rankedChunks.length > 0 
      ? rankedChunks.reduce((sum, chunk) => sum + chunk.relevanceScore, 0) / rankedChunks.length
      : 0;
    
    console.log(`✅ Relevance scoring completed in ${processingTime}ms`);
    console.log(`📊 Selected ${rankedChunks.length}/${chunks.length} chunks (avg relevance: ${averageRelevance.toFixed(2)})`);
    
    return {
      rankedChunks,
      filtering: {
        totalChunks: chunks.length,
        filteredChunks: rankedChunks.length,
        averageRelevance,
        filteringStrategy: 'semantic_relevance_with_quality_filtering',
        processingTime
      },
      queryAnalysis
    };
    
  } catch (error) {
    console.error('❌ Relevance scoring failed:', error);
    throw new Error(`Relevance scoring failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Export types for use in other modules
export type { 
  RelevanceScoringResult, 
  QueryAnalysis,
  ChunkRelevanceScore 
}; 