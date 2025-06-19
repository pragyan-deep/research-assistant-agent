/**
 * Content Synthesizer Module
 * 
 * Combines and synthesizes multiple content chunks into structured, coherent content
 */

import type { 
  SynthesizedContent, 
  ContentPoint, 
  SupportingDetail, 
  Example, 
  Definition, 
  Step, 
  Comparison, 
  SourceReference,
  SynthesisMetadata,
  ContentAnalysis
} from "../types";
import type { RankedChunk } from "../../content-processor/modules/relevance-scorer";

// ========================================
// MAIN SYNTHESIZER FUNCTION
// ========================================

/**
 * Synthesize content chunks into structured, coherent content
 */
export const synthesizeContent = async (
  chunks: RankedChunk[], 
  analysis: ContentAnalysis,
  query: string
): Promise<SynthesizedContent> => {
  const startTime = Date.now();
  
  try {
    console.log(`🔄 Starting content synthesis for ${chunks.length} chunks`);
    
    // Extract main points from chunks
    const mainPoints = extractMainPoints(chunks, analysis, query);
    
    // Extract supporting details
    const supportingDetails = extractSupportingDetails(chunks, mainPoints);
    
    // Extract examples
    const examples = extractExamples(chunks, analysis);
    
    // Extract definitions
    const definitions = extractDefinitions(chunks, analysis);
    
    // Extract steps (if applicable)
    const steps = extractSteps(chunks, analysis);
    
    // Extract comparisons (if applicable)
    const comparisons = extractComparisons(chunks, analysis);
    
    // Create source references
    const sources = createSourceReferences(chunks, mainPoints);
    
    // Remove duplicates and conflicts
    const cleanedContent = removeDuplicatesAndConflicts({
      mainPoints,
      supportingDetails,
      examples,
      definitions,
      steps,
      comparisons,
      sources,
      metadata: createSynthesisMetadata(chunks, startTime)
    });
    
    console.log(`✅ Content synthesis completed in ${Date.now() - startTime}ms`);
    return cleanedContent;
    
  } catch (error) {
    console.error('Error in content synthesis:', error);
    throw new Error(`Content synthesis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// ========================================
// MAIN POINTS EXTRACTION
// ========================================

/**
 * Extract main points from chunks based on analysis and query
 */
const extractMainPoints = (
  chunks: RankedChunk[], 
  analysis: ContentAnalysis,
  query: string
): ContentPoint[] => {
  const points: ContentPoint[] = [];
  const queryTerms = analysis.detectedTopics.slice(0, 5); // Top 5 topics
  
  chunks.forEach((chunk, index) => {
    const chunkPoints = extractPointsFromChunk(chunk, queryTerms, index);
    points.push(...chunkPoints);
  });
  
  // Merge similar points and rank by importance
  const mergedPoints = mergeAndRankPoints(points);
  
  // Categorize points
  const categorizedPoints = categorizePoints(mergedPoints, analysis);
  
  return categorizedPoints.slice(0, 8); // Top 8 points
};

/**
 * Extract points from a single chunk
 */
const extractPointsFromChunk = (
  chunk: RankedChunk, 
  queryTerms: string[], 
  chunkIndex: number
): ContentPoint[] => {
  const content = chunk.chunk.content;
  const sentences = splitIntoSentences(content);
  const points: ContentPoint[] = [];
  
  sentences.forEach(sentence => {
    const relevantTerms = queryTerms.filter(term => 
      sentence.toLowerCase().includes(term.toLowerCase())
    );
    
    if (relevantTerms.length > 0 && sentence.length > 50 && sentence.length < 300) {
      const importance = calculatePointImportance(sentence, relevantTerms, chunk.relevanceScore);
      
      if (importance > 0.3) {
        points.push({
          point: cleanSentence(sentence),
          importance,
          supportingChunks: [chunkIndex],
          category: 'primary',
          evidence: [sentence]
        });
      }
    }
  });
  
  return points;
};

/**
 * Split content into sentences
 */
const splitIntoSentences = (content: string): string[] => {
  return content
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 20);
};

/**
 * Calculate importance score for a point
 */
const calculatePointImportance = (
  sentence: string, 
  relevantTerms: string[], 
  chunkRelevance: number
): number => {
  const termDensity = relevantTerms.length / sentence.split(' ').length;
  const lengthScore = Math.min(sentence.length / 200, 1); // Prefer medium-length sentences
  const positionScore = sentence.toLowerCase().includes('important') ? 1.2 : 1;
  
  return (termDensity * 0.4 + lengthScore * 0.3 + chunkRelevance * 0.3) * positionScore;
};

/**
 * Clean and format sentence
 */
const cleanSentence = (sentence: string): string => {
  return sentence
    .replace(/\s+/g, ' ')
    .replace(/^\W+|\W+$/g, '')
    .trim();
};

/**
 * Merge similar points and rank by importance
 */
const mergeAndRankPoints = (points: ContentPoint[]): ContentPoint[] => {
  const merged: ContentPoint[] = [];
  
  points.forEach(point => {
    const similar = findSimilarPoint(point, merged);
    
    if (similar) {
      // Merge with existing point
      similar.importance = Math.max(similar.importance, point.importance);
      similar.supportingChunks.push(...point.supportingChunks);
      similar.evidence.push(...point.evidence);
    } else {
      merged.push({ ...point });
    }
  });
  
  return merged.sort((a, b) => b.importance - a.importance);
};

/**
 * Find similar point in existing array
 */
const findSimilarPoint = (point: ContentPoint, existingPoints: ContentPoint[]): ContentPoint | null => {
  return existingPoints.find(existing => 
    calculateTextSimilarity(point.point, existing.point) > 0.7
  ) || null;
};

/**
 * Calculate text similarity between two strings
 */
const calculateTextSimilarity = (text1: string, text2: string): number => {
  const words1 = new Set(text1.toLowerCase().split(/\W+/));
  const words2 = new Set(text2.toLowerCase().split(/\W+/));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
};

/**
 * Categorize points by importance and type
 */
const categorizePoints = (points: ContentPoint[], analysis: ContentAnalysis): ContentPoint[] => {
  return points.map((point, index) => {
    let category: ContentPoint['category'] = 'supporting';
    
    if (index < 3) category = 'primary';
    else if (index < 6) category = 'secondary';
    
    // Adjust category based on content analysis
    if (analysis.queryIntent === 'definition' && point.point.toLowerCase().includes('define')) {
      category = 'primary';
    }
    
    return { ...point, category };
  });
};

// ========================================
// SUPPORTING DETAILS EXTRACTION
// ========================================

/**
 * Extract supporting details for main points
 */
const extractSupportingDetails = (
  chunks: RankedChunk[], 
  mainPoints: ContentPoint[]
): SupportingDetail[] => {
  const details: SupportingDetail[] = [];
  
  mainPoints.forEach(point => {
    const relatedDetails = findRelatedDetails(point, chunks);
    details.push(...relatedDetails);
  });
  
  return details.slice(0, 15); // Limit to top 15 details
};

/**
 * Find details related to a main point
 */
const findRelatedDetails = (point: ContentPoint, chunks: RankedChunk[]): SupportingDetail[] => {
  const details: SupportingDetail[] = [];
  const pointKeywords = extractKeywords(point.point);
  
  chunks.forEach((chunk, index) => {
    if (point.supportingChunks.includes(index)) {
      const chunkDetails = extractDetailsFromChunk(chunk, pointKeywords, point.point);
      details.push(...chunkDetails);
    }
  });
  
  return details;
};

/**
 * Extract keywords from a point
 */
const extractKeywords = (text: string): string[] => {
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
  
  return text
    .toLowerCase()
    .split(/\W+/)
    .filter(word => word.length > 3 && !stopWords.has(word))
    .slice(0, 5);
};

/**
 * Extract details from a chunk related to keywords
 */
const extractDetailsFromChunk = (
  chunk: RankedChunk, 
  keywords: string[], 
  relatedPoint: string
): SupportingDetail[] => {
  const content = chunk.chunk.content;
  const sentences = splitIntoSentences(content);
  const details: SupportingDetail[] = [];
  
  sentences.forEach(sentence => {
    const matchingKeywords = keywords.filter(keyword => 
      sentence.toLowerCase().includes(keyword)
    );
    
    if (matchingKeywords.length > 0 && sentence.length > 30 && sentence.length < 250) {
      const detailType = determineDetailType(sentence);
      
      details.push({
        detail: cleanSentence(sentence),
        relatedPoint,
        sourceChunk: chunk.rank,
        type: detailType
      });
    }
  });
  
  return details.slice(0, 3); // Top 3 details per chunk
};

/**
 * Determine the type of supporting detail
 */
const determineDetailType = (sentence: string): SupportingDetail['type'] => {
  const lowerSentence = sentence.toLowerCase();
  
  if (/because|since|due to|reason/.test(lowerSentence)) return 'explanation';
  if (/furthermore|additionally|also|moreover/.test(lowerSentence)) return 'elaboration';
  if (/context|background|history/.test(lowerSentence)) return 'context';
  if (/clarify|specifically|namely/.test(lowerSentence)) return 'clarification';
  
  return 'explanation';
};

// ========================================
// EXAMPLES EXTRACTION
// ========================================

/**
 * Extract examples from chunks
 */
const extractExamples = (chunks: RankedChunk[], analysis: ContentAnalysis): Example[] => {
  if (!analysis.contentStructure.hasExamples) return [];
  
  const examples: Example[] = [];
  
  chunks.forEach((chunk, index) => {
    const chunkExamples = extractExamplesFromChunk(chunk, index);
    examples.push(...chunkExamples);
  });
  
  return examples.slice(0, 5); // Top 5 examples
};

/**
 * Extract examples from a single chunk
 */
const extractExamplesFromChunk = (chunk: RankedChunk, chunkIndex: number): Example[] => {
  const content = chunk.chunk.content;
  const examples: Example[] = [];
  
  const examplePatterns = [
    /for example[,:]?\s*([^.!?]*[.!?])/gi,
    /such as[,:]?\s*([^.!?]*[.!?])/gi,
    /instance[,:]?\s*([^.!?]*[.!?])/gi,
    /like[,:]?\s*([^.!?]*[.!?])/gi
  ];
  
  examplePatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const exampleText = match[1]?.trim();
      if (exampleText && exampleText.length > 20) {
        examples.push({
          description: cleanSentence(exampleText),
          context: extractExampleContext(content, match.index),
          sourceChunk: chunkIndex,
          relevance: chunk.relevanceScore,
          type: determineExampleType(exampleText)
        });
      }
    }
  });
  
  return examples;
};

/**
 * Extract context around an example
 */
const extractExampleContext = (content: string, exampleIndex: number): string => {
  const contextStart = Math.max(0, exampleIndex - 100);
  const contextEnd = Math.min(content.length, exampleIndex + 100);
  
  return content.slice(contextStart, contextEnd).trim();
};

/**
 * Determine the type of example
 */
const determineExampleType = (exampleText: string): Example['type'] => {
  const lowerText = exampleText.toLowerCase();
  
  if (/code|function|method|class|syntax/.test(lowerText)) return 'code';
  if (/scenario|situation|case/.test(lowerText)) return 'scenario';
  if (/study|research|analysis/.test(lowerText)) return 'case-study';
  
  return 'illustration';
};

// ========================================
// DEFINITIONS EXTRACTION
// ========================================

/**
 * Extract definitions from chunks
 */
const extractDefinitions = (chunks: RankedChunk[], analysis: ContentAnalysis): Definition[] => {
  if (!analysis.contentStructure.hasDefinitions) return [];
  
  const definitions: Definition[] = [];
  
  chunks.forEach((chunk, index) => {
    const chunkDefinitions = extractDefinitionsFromChunk(chunk, index);
    definitions.push(...chunkDefinitions);
  });
  
  return definitions.slice(0, 8); // Top 8 definitions
};

/**
 * Extract definitions from a single chunk
 */
const extractDefinitionsFromChunk = (chunk: RankedChunk, chunkIndex: number): Definition[] => {
  const content = chunk.chunk.content;
  const definitions: Definition[] = [];
  
  const definitionPatterns = [
    /(\w+)\s+is\s+defined\s+as\s+([^.!?]*[.!?])/gi,
    /(\w+)\s+refers\s+to\s+([^.!?]*[.!?])/gi,
    /(\w+)\s+means\s+([^.!?]*[.!?])/gi,
    /(\w+)\s+is\s+a\s+type\s+of\s+([^.!?]*[.!?])/gi
  ];
  
  definitionPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const term = match[1]?.trim();
      const definition = match[2]?.trim();
      
      if (term && definition && definition.length > 10) {
        definitions.push({
          term: cleanSentence(term),
          definition: cleanSentence(definition),
          context: extractDefinitionContext(content, match.index),
          sourceChunk: chunkIndex,
          importance: chunk.relevanceScore
        });
      }
    }
  });
  
  return definitions;
};

/**
 * Extract context around a definition
 */
const extractDefinitionContext = (content: string, definitionIndex: number): string => {
  const contextStart = Math.max(0, definitionIndex - 50);
  const contextEnd = Math.min(content.length, definitionIndex + 150);
  
  return content.slice(contextStart, contextEnd).trim();
};

// ========================================
// STEPS EXTRACTION
// ========================================

/**
 * Extract steps from chunks (for how-to content)
 */
const extractSteps = (chunks: RankedChunk[], analysis: ContentAnalysis): Step[] => {
  if (!analysis.contentStructure.hasSteps) return [];
  
  const steps: Step[] = [];
  
  chunks.forEach((chunk, index) => {
    const chunkSteps = extractStepsFromChunk(chunk, index);
    steps.push(...chunkSteps);
  });
  
  return steps.sort((a, b) => a.stepNumber - b.stepNumber);
};

/**
 * Extract steps from a single chunk
 */
const extractStepsFromChunk = (chunk: RankedChunk, chunkIndex: number): Step[] => {
  const content = chunk.chunk.content;
  const steps: Step[] = [];
  
  // Look for numbered steps
  const stepPattern = /(\d+)\.\s*([^.!?]*[.!?])/g;
  let match;
  
  while ((match = stepPattern.exec(content)) !== null) {
    const stepNumber = parseInt(match[1]);
    const instruction = match[2]?.trim();
    
    if (instruction && instruction.length > 10) {
      steps.push({
        stepNumber,
        instruction: cleanSentence(instruction),
        details: [],
        prerequisites: [],
        tips: [],
        sourceChunk: chunkIndex
      });
    }
  }
  
  return steps;
};

// ========================================
// COMPARISONS EXTRACTION
// ========================================

/**
 * Extract comparisons from chunks
 */
const extractComparisons = (chunks: RankedChunk[], analysis: ContentAnalysis): Comparison[] => {
  if (!analysis.contentStructure.hasComparisons) return [];
  
  // For now, return empty array - comparison extraction is complex
  // and would require more sophisticated NLP
  return [];
};

// ========================================
// SOURCE REFERENCES
// ========================================

/**
 * Create source references from chunks
 */
const createSourceReferences = (chunks: RankedChunk[], mainPoints: ContentPoint[]): SourceReference[] => {
  return chunks.map(chunk => ({
    url: chunk.chunk.source.url || 'Unknown',
    title: chunk.chunk.source.title || 'Unknown',
    chunkId: chunk.chunk.id,
    relevanceScore: chunk.relevanceScore,
    usedForPoints: mainPoints
      .filter(point => point.supportingChunks.includes(chunk.rank))
      .map(point => point.point.substring(0, 50) + '...')
  }));
};

// ========================================
// DUPLICATE REMOVAL AND CONFLICT RESOLUTION
// ========================================

/**
 * Remove duplicates and resolve conflicts in synthesized content
 */
const removeDuplicatesAndConflicts = (content: SynthesizedContent): SynthesizedContent => {
  const startTime = Date.now();
  
  // Remove duplicate main points
  const uniquePoints = removeDuplicatePoints(content.mainPoints);
  
  // Remove duplicate supporting details
  const uniqueDetails = removeDuplicateDetails(content.supportingDetails);
  
  // Remove duplicate examples
  const uniqueExamples = removeDuplicateExamples(content.examples);
  
  // Remove duplicate definitions
  const uniqueDefinitions = removeDuplicateDefinitions(content.definitions);
  
  // Update metadata
  const updatedMetadata = {
    ...content.metadata,
    duplicatesRemoved: (content.mainPoints.length - uniquePoints.length) +
                      (content.supportingDetails.length - uniqueDetails.length) +
                      (content.examples.length - uniqueExamples.length) +
                      (content.definitions.length - uniqueDefinitions.length)
  };
  
  console.log(`🧹 Removed ${updatedMetadata.duplicatesRemoved} duplicates in ${Date.now() - startTime}ms`);
  
  return {
    ...content,
    mainPoints: uniquePoints,
    supportingDetails: uniqueDetails,
    examples: uniqueExamples,
    definitions: uniqueDefinitions,
    metadata: updatedMetadata
  };
};

/**
 * Remove duplicate points
 */
const removeDuplicatePoints = (points: ContentPoint[]): ContentPoint[] => {
  const unique: ContentPoint[] = [];
  
  points.forEach(point => {
    const isDuplicate = unique.some(existing => 
      calculateTextSimilarity(point.point, existing.point) > 0.8
    );
    
    if (!isDuplicate) {
      unique.push(point);
    }
  });
  
  return unique;
};

/**
 * Remove duplicate details
 */
const removeDuplicateDetails = (details: SupportingDetail[]): SupportingDetail[] => {
  const unique: SupportingDetail[] = [];
  
  details.forEach(detail => {
    const isDuplicate = unique.some(existing => 
      calculateTextSimilarity(detail.detail, existing.detail) > 0.8
    );
    
    if (!isDuplicate) {
      unique.push(detail);
    }
  });
  
  return unique;
};

/**
 * Remove duplicate examples
 */
const removeDuplicateExamples = (examples: Example[]): Example[] => {
  const unique: Example[] = [];
  
  examples.forEach(example => {
    const isDuplicate = unique.some(existing => 
      calculateTextSimilarity(example.description, existing.description) > 0.8
    );
    
    if (!isDuplicate) {
      unique.push(example);
    }
  });
  
  return unique;
};

/**
 * Remove duplicate definitions
 */
const removeDuplicateDefinitions = (definitions: Definition[]): Definition[] => {
  const unique: Definition[] = [];
  
  definitions.forEach(definition => {
    const isDuplicate = unique.some(existing => 
      existing.term.toLowerCase() === definition.term.toLowerCase()
    );
    
    if (!isDuplicate) {
      unique.push(definition);
    }
  });
  
  return unique;
};

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Create synthesis metadata
 */
const createSynthesisMetadata = (chunks: RankedChunk[], startTime: number): SynthesisMetadata => {
  return {
    totalChunks: chunks.length,
    synthesisTime: Date.now() - startTime,
    conflictsResolved: 0, // Would be calculated during conflict resolution
    duplicatesRemoved: 0, // Will be updated during duplicate removal
    mainTopicsCovered: chunks.length
  };
}; 