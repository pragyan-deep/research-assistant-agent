/**
 * Summary Analyzer Module
 * 
 * Analyzes content chunks and query to determine optimal summary approach
 */

import type { 
  ContentAnalysis, 
  ContentTheme, 
  ContentStructureAnalysis,
  SummaryRequest,
  SummaryType
} from "../types";
import type { RankedChunk } from "../../content-processor/modules/relevance-scorer";
import { determineOptimalSummaryType, calculateRecommendedLength } from "../utils/summary-templates";

// ========================================
// MAIN ANALYZER FUNCTION
// ========================================

/**
 * Analyze content chunks and query to determine optimal summary approach
 */
export const analyzeSummaryRequirements = async (request: SummaryRequest): Promise<ContentAnalysis> => {
  const startTime = Date.now();
  
  try {
    // Extract key information from request
    const { chunks, query, summaryType } = request;
    const totalWordCount = calculateTotalWordCount(chunks);
    
    // Analyze query intent and complexity
    const queryAnalysis = analyzeQueryIntent(query);
    
    // Analyze content structure and themes
    const contentStructure = analyzeContentStructure(chunks);
    const contentThemes = extractContentThemes(chunks, query);
    
    // Determine optimal summary type (use provided or auto-detect)
    const optimalSummaryType = summaryType || determineOptimalSummaryType(
      query,
      contentStructure.hasSteps,
      contentStructure.hasComparisons,
      contentStructure.hasDefinitions,
      query.length
    );
    
    // Calculate recommended length
    const recommendedLength = calculateRecommendedLength(totalWordCount, optimalSummaryType);
    
    // Detect main topics
    const detectedTopics = detectMainTopics(chunks, query);
    
    // Determine technical complexity
    const technicalComplexity = assessTechnicalComplexity(chunks);
    
    const analysis: ContentAnalysis = {
      summaryType: optimalSummaryType,
      detectedTopics,
      keyThemes: contentThemes,
      contentStructure,
      recommendedLength,
      technicalComplexity,
      queryIntent: queryAnalysis.intent
    };
    
    console.log(`Summary analysis completed in ${Date.now() - startTime}ms`);
    return analysis;
    
  } catch (error) {
    console.error('Error in summary analysis:', error);
    throw new Error(`Summary analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// ========================================
// QUERY ANALYSIS FUNCTIONS
// ========================================

/**
 * Analyze query to determine intent and characteristics
 */
const analyzeQueryIntent = (query: string) => {
  const queryLower = query.toLowerCase();
  const queryWords = query.split(/\s+/).length;
  
  // Determine primary intent
  let intent: ContentAnalysis['queryIntent'] = 'explanation';
  
  if (/what is|define|meaning|definition|explain/.test(queryLower)) {
    intent = 'definition';
  } else if (/how to|how do|steps|tutorial|guide|instructions|process/.test(queryLower)) {
    intent = 'instruction';
  } else if (/vs|versus|compare|difference|better|best|pros|cons/.test(queryLower)) {
    intent = 'comparison';
  } else if (/analyze|analysis|evaluate|assessment|review/.test(queryLower)) {
    intent = 'analysis';
  }
  
  return {
    intent,
    complexity: queryWords > 10 ? 'high' : queryWords > 5 ? 'medium' : 'low',
    isSpecific: /specific|particular|exact|precise/.test(queryLower),
    requiresExamples: /example|sample|instance|case/.test(queryLower)
  };
};

// ========================================
// CONTENT STRUCTURE ANALYSIS
// ========================================

/**
 * Analyze content structure to identify key characteristics
 */
const analyzeContentStructure = (chunks: RankedChunk[]): ContentStructureAnalysis => {
  const allContent = chunks.map(chunk => chunk.chunk.content.toLowerCase()).join(' ');
  
  return {
    hasDefinitions: detectDefinitions(allContent),
    hasSteps: detectSteps(allContent),
    hasExamples: detectExamples(allContent),
    hasComparisons: detectComparisons(allContent),
    hasProsCons: detectProsCons(allContent),
    hasTechnicalDetails: detectTechnicalDetails(allContent)
  };
};

/**
 * Detect if content contains definitions
 */
const detectDefinitions = (content: string): boolean => {
  const definitionPatterns = [
    /is defined as/g,
    /refers to/g,
    /means that/g,
    /is a type of/g,
    /is known as/g,
    /can be described as/g
  ];
  
  return definitionPatterns.some(pattern => pattern.test(content));
};

/**
 * Detect if content contains step-by-step instructions
 */
const detectSteps = (content: string): boolean => {
  const stepPatterns = [
    /step \d+/g,
    /first.*second.*third/g,
    /\d+\.\s/g,
    /next.*then.*finally/g,
    /begin by.*then.*complete/g
  ];
  
  return stepPatterns.some(pattern => pattern.test(content));
};

/**
 * Detect if content contains examples
 */
const detectExamples = (content: string): boolean => {
  const examplePatterns = [
    /for example/g,
    /such as/g,
    /instance/g,
    /like.*and/g,
    /including/g
  ];
  
  return examplePatterns.some(pattern => pattern.test(content));
};

/**
 * Detect if content contains comparisons
 */
const detectComparisons = (content: string): boolean => {
  const comparisonPatterns = [
    /compared to/g,
    /versus/g,
    /while.*however/g,
    /on the other hand/g,
    /in contrast/g,
    /unlike/g
  ];
  
  return comparisonPatterns.some(pattern => pattern.test(content));
};

/**
 * Detect if content contains pros and cons
 */
const detectProsCons = (content: string): boolean => {
  const prosConsPatterns = [
    /advantages.*disadvantages/g,
    /pros.*cons/g,
    /benefits.*drawbacks/g,
    /strengths.*weaknesses/g
  ];
  
  return prosConsPatterns.some(pattern => pattern.test(content));
};

/**
 * Detect if content contains technical details
 */
const detectTechnicalDetails = (content: string): boolean => {
  const technicalPatterns = [
    /\b[A-Z]{2,}\b/g, // Acronyms
    /\d+(\.\d+)?\s*(px|em|rem|%|ms|kb|mb|gb)/g, // Technical units
    /function|method|class|interface|api/g, // Programming terms
    /algorithm|protocol|framework|library/g // Technical concepts
  ];
  
  return technicalPatterns.some(pattern => pattern.test(content));
};

// ========================================
// CONTENT THEME EXTRACTION
// ========================================

/**
 * Extract key themes and topics from content chunks
 */
const extractContentThemes = (chunks: RankedChunk[], query: string): ContentTheme[] => {
  const themes: ContentTheme[] = [];
  const queryTerms = extractKeyTerms(query);
  
  // Analyze each chunk for themes
  chunks.forEach((chunk, index) => {
    const chunkThemes = identifyChunkThemes(chunk, queryTerms, index);
    themes.push(...chunkThemes);
  });
  
  // Merge and rank themes
  const mergedThemes = mergeAndRankThemes(themes);
  
  // Return top themes
  return mergedThemes.slice(0, 5);
};

/**
 * Extract key terms from query
 */
const extractKeyTerms = (query: string): string[] => {
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'how', 'what', 'when', 'where', 'why', 'is', 'are', 'was', 'were']);
  
  return query
    .toLowerCase()
    .split(/\W+/)
    .filter(term => term.length > 2 && !stopWords.has(term))
    .slice(0, 10); // Top 10 terms
};

/**
 * Identify themes within a specific chunk
 */
const identifyChunkThemes = (chunk: RankedChunk, queryTerms: string[], chunkIndex: number): ContentTheme[] => {
  const content = chunk.chunk.content.toLowerCase();
  const themes: ContentTheme[] = [];
  
  // Find themes based on query terms
  queryTerms.forEach(term => {
    if (content.includes(term)) {
      const keyPoints = extractKeyPointsForTerm(content, term);
      
      if (keyPoints.length > 0) {
        themes.push({
          topic: term,
          importance: chunk.relevanceScore * 0.8 + (keyPoints.length * 0.2),
          supportingChunks: [chunkIndex],
          keyPoints
        });
      }
    }
  });
  
  return themes;
};

/**
 * Extract key points related to a specific term
 */
const extractKeyPointsForTerm = (content: string, term: string): string[] => {
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
  const relevantSentences = sentences.filter(sentence => 
    sentence.includes(term) && sentence.length < 200
  );
  
  return relevantSentences.slice(0, 3); // Top 3 relevant points
};

/**
 * Merge similar themes and rank by importance
 */
const mergeAndRankThemes = (themes: ContentTheme[]): ContentTheme[] => {
  const themeMap = new Map<string, ContentTheme>();
  
  themes.forEach(theme => {
    const existingTheme = themeMap.get(theme.topic);
    
    if (existingTheme) {
      // Merge themes
      existingTheme.importance = Math.max(existingTheme.importance, theme.importance);
      existingTheme.supportingChunks.push(...theme.supportingChunks);
      existingTheme.keyPoints.push(...theme.keyPoints);
    } else {
      themeMap.set(theme.topic, { ...theme });
    }
  });
  
  // Convert to array and sort by importance
  return Array.from(themeMap.values())
    .sort((a, b) => b.importance - a.importance);
};

// ========================================
// TOPIC DETECTION
// ========================================

/**
 * Detect main topics across all chunks
 */
const detectMainTopics = (chunks: RankedChunk[], query: string): string[] => {
  const allContent = chunks.map(chunk => chunk.chunk.content).join(' ');
  const queryTerms = extractKeyTerms(query);
  
  // Extract potential topics from content
  const contentTopics = extractTopicsFromContent(allContent);
  
  // Combine query terms and content topics
  const allTopics = [...new Set([...queryTerms, ...contentTopics])];
  
  // Rank topics by frequency and relevance
  const rankedTopics = rankTopicsByRelevance(allTopics, allContent, query);
  
  return rankedTopics.slice(0, 8); // Top 8 topics
};

/**
 * Extract topics from content using simple NLP techniques
 */
const extractTopicsFromContent = (content: string): string[] => {
  const words = content.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
  const wordFreq = new Map<string, number>();
  
  // Count word frequencies
  words.forEach(word => {
    wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
  });
  
  // Filter and sort by frequency
  return Array.from(wordFreq.entries())
    .filter(([word, freq]) => freq >= 3 && word.length >= 4)
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word)
    .slice(0, 15);
};

/**
 * Rank topics by relevance to query and content
 */
const rankTopicsByRelevance = (topics: string[], content: string, query: string): string[] => {
  const queryLower = query.toLowerCase();
  const contentLower = content.toLowerCase();
  
  return topics
    .map(topic => ({
      topic,
      score: calculateTopicRelevance(topic, queryLower, contentLower)
    }))
    .sort((a, b) => b.score - a.score)
    .map(item => item.topic);
};

/**
 * Calculate relevance score for a topic
 */
const calculateTopicRelevance = (topic: string, query: string, content: string): number => {
  const queryMatches = (query.match(new RegExp(topic, 'g')) || []).length;
  const contentMatches = (content.match(new RegExp(topic, 'g')) || []).length;
  
  return (queryMatches * 3) + (contentMatches * 0.1);
};

// ========================================
// TECHNICAL COMPLEXITY ASSESSMENT
// ========================================

/**
 * Assess technical complexity of content
 */
const assessTechnicalComplexity = (chunks: RankedChunk[]): 'low' | 'medium' | 'high' => {
  const allContent = chunks.map(chunk => chunk.chunk.content).join(' ');
  
  let complexityScore = 0;
  
  // Technical indicators
  const indicators = {
    acronyms: (allContent.match(/\b[A-Z]{2,}\b/g) || []).length,
    technicalTerms: (allContent.match(/\b(algorithm|protocol|framework|library|api|interface|method|function|class|module|component)\b/gi) || []).length,
    codeReferences: (allContent.match(/\b(code|syntax|implementation|programming|development)\b/gi) || []).length,
    numbers: (allContent.match(/\d+(\.\d+)?/g) || []).length,
    specialChars: (allContent.match(/[{}[\]()]/g) || []).length
  };
  
  // Calculate complexity score
  complexityScore += indicators.acronyms * 2;
  complexityScore += indicators.technicalTerms * 3;
  complexityScore += indicators.codeReferences * 2;
  complexityScore += indicators.numbers * 0.5;
  complexityScore += indicators.specialChars * 0.2;
  
  // Normalize by content length
  const normalizedScore = complexityScore / (allContent.length / 1000);
  
  if (normalizedScore > 20) return 'high';
  if (normalizedScore > 8) return 'medium';
  return 'low';
};

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Calculate total word count across all chunks
 */
const calculateTotalWordCount = (chunks: RankedChunk[]): number => {
  return chunks.reduce((total, chunk) => {
    return total + (chunk.chunk.content.split(/\s+/).length);
  }, 0);
}; 