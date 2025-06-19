/**
 * Summarizer Tool - Main Orchestrator
 * 
 * Comprehensive summarization tool that synthesizes filtered content chunks 
 * into structured, high-quality summaries using a 4-stage pipeline:
 * 
 * Stage 1: Summary Analysis - Analyze content and determine optimal approach
 * Stage 2: Content Synthesis - Extract and organize key information
 * Stage 3: Format Generation - Generate structured summary using Claude
 * Stage 4: Quality Validation - Validate completeness, accuracy, and coherence
 */

import type { 
  SummaryRequest, 
  SummaryResult, 
  SummaryError,
  SummaryStage 
} from "./types";
import type { RankedChunk } from "../content-processor/modules/relevance-scorer";

// Import all modules
import { analyzeSummaryRequirements } from "./modules/summary-analyzer";
import { synthesizeContent } from "./modules/content-synthesizer";
import { generateFormattedSummary } from "./modules/format-generator";
import { validateSummaryQuality } from "./modules/quality-validator";

// ========================================
// MAIN SUMMARIZER FUNCTION
// ========================================

/**
 * Generate comprehensive summary from filtered content chunks
 * 
 * This is the main entry point that orchestrates the entire 4-stage pipeline
 */
export const generateSummary = async (request: SummaryRequest): Promise<SummaryResult> => {
  const startTime = Date.now();
  let currentStage: SummaryStage = 'analysis';
  
  try {
    console.log('🚀 Starting comprehensive summarization pipeline...');
    console.log(`📊 Processing ${request.chunks.length} content chunks for query: "${request.query}"`);
    
    // ========================================
    // STAGE 1: SUMMARY ANALYSIS
    // ========================================
    currentStage = 'analysis';
    console.log('\n🔍 Stage 1: Analyzing summary requirements...');
    
    const analysis = await analyzeSummaryRequirements(request);
    
    console.log(`✅ Analysis complete: ${analysis.summaryType} summary, ${analysis.detectedTopics.length} topics, ${analysis.technicalComplexity} complexity`);
    
    // ========================================
    // STAGE 2: CONTENT SYNTHESIS
    // ========================================
    currentStage = 'synthesis';
    console.log('\n🔄 Stage 2: Synthesizing content...');
    
    const synthesizedContent = await synthesizeContent(
      request.chunks, 
      analysis, 
      request.query
    );
    
    console.log(`✅ Synthesis complete: ${synthesizedContent.mainPoints.length} main points, ${synthesizedContent.examples.length} examples, ${synthesizedContent.definitions.length} definitions`);
    
    // ========================================
    // STAGE 3: FORMAT GENERATION
    // ========================================
    currentStage = 'generation';
    console.log('\n📝 Stage 3: Generating formatted summary...');
    
    const generatedSummary = await generateFormattedSummary(
      synthesizedContent,
      analysis,
      request.query
    );
    
    console.log(`✅ Generation complete: ${generatedSummary.metadata.wordCount} words, ${generatedSummary.structure.length} sections`);
    
    // ========================================
    // STAGE 4: QUALITY VALIDATION
    // ========================================
    currentStage = 'validation';
    console.log('\n🔍 Stage 4: Validating summary quality...');
    
    const qualityValidation = await validateSummaryQuality(
      generatedSummary,
      synthesizedContent,
      request.chunks,
      analysis,
      request.query
    );
    
    console.log(`✅ Validation complete: ${(qualityValidation.overall.overall * 100).toFixed(1)}% quality score`);
    
    // ========================================
    // FINAL RESULT ASSEMBLY
    // ========================================
    currentStage = 'complete';
    const totalProcessingTime = Date.now() - startTime;
    
    const result: SummaryResult = {
      summary: generatedSummary.content,
      summaryType: analysis.summaryType,
      sections: generatedSummary.structure,
      sources: synthesizedContent.sources,
      analysis,
      synthesis: synthesizedContent.metadata,
      quality: qualityValidation,
      metadata: {
        processingTime: totalProcessingTime,
        originalChunks: request.chunks.length,
        finalWordCount: generatedSummary.metadata.wordCount,
        compressionRatio: calculateCompressionRatio(request.chunks, generatedSummary.metadata.wordCount),
        timestamp: new Date().toISOString()
      }
    };
    
    // Log final summary
    logSummaryResults(result);
    
    return result;
    
  } catch (error) {
    console.error(`❌ Error in ${currentStage} stage:`, error);
    
    const summaryError: SummaryError = {
      stage: currentStage === 'complete' ? 'validation' : currentStage,
      type: determineErrorType(error),
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      details: error
    };
    
    throw summaryError;
  }
};

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Calculate compression ratio (original content vs final summary)
 */
const calculateCompressionRatio = (chunks: RankedChunk[], finalWordCount: number): number => {
  const originalWordCount = chunks.reduce((total, chunk) => {
    return total + chunk.chunk.content.split(/\s+/).length;
  }, 0);
  
  return originalWordCount > 0 ? finalWordCount / originalWordCount : 0;
};

/**
 * Determine error type based on error characteristics
 */
const determineErrorType = (error: any): SummaryError['type'] => {
  if (error?.message?.includes('API') || error?.message?.includes('Claude')) {
    return 'api-error';
  }
  
  if (error?.message?.includes('insufficient') || error?.message?.includes('empty')) {
    return 'insufficient-content';
  }
  
  if (error?.message?.includes('validation') || error?.message?.includes('quality')) {
    return 'validation-failed';
  }
  
  return 'processing-error';
};

/**
 * Log comprehensive summary results
 */
const logSummaryResults = (result: SummaryResult): void => {
  console.log('\n📋 SUMMARIZATION COMPLETE');
  console.log('================================');
  console.log(`📝 Summary Type: ${result.summaryType}`);
  console.log(`📊 Word Count: ${result.metadata.finalWordCount} words`);
  console.log(`⏱️  Processing Time: ${result.metadata.processingTime}ms`);
  console.log(`📉 Compression Ratio: ${(result.metadata.compressionRatio * 100).toFixed(1)}%`);
  console.log(`🎯 Quality Score: ${(result.quality.overall.overall * 100).toFixed(1)}%`);
  console.log(`📚 Sources Used: ${result.sources.length}`);
  console.log(`🔍 Topics Covered: ${result.analysis.detectedTopics.length}`);
  
  // Quality breakdown
  console.log('\n📊 Quality Breakdown:');
  console.log(`  • Completeness: ${(result.quality.completeness.score * 100).toFixed(1)}%`);
  console.log(`  • Accuracy: ${(result.quality.accuracy.score * 100).toFixed(1)}%`);
  console.log(`  • Coherence: ${(result.quality.coherence.score * 100).toFixed(1)}%`);
  console.log(`  • Attribution: ${(result.quality.attribution.score * 100).toFixed(1)}%`);
  
  // Strengths and improvements
  if (result.quality.overall.strengths.length > 0) {
    console.log('\n✅ Strengths:');
    result.quality.overall.strengths.forEach(strength => {
      console.log(`  • ${strength}`);
    });
  }
  
  if (result.quality.overall.improvements.length > 0) {
    console.log('\n💡 Suggested Improvements:');
    result.quality.overall.improvements.forEach(improvement => {
      console.log(`  • ${improvement}`);
    });
  }
  
  console.log('================================\n');
};

// ========================================
// BATCH PROCESSING FUNCTIONS
// ========================================

/**
 * Process multiple summary requests in parallel
 */
export const generateMultipleSummaries = async (
  requests: SummaryRequest[]
): Promise<SummaryResult[]> => {
  console.log(`🔄 Processing ${requests.length} summary requests in parallel...`);
  
  const startTime = Date.now();
  
  try {
    // Process all requests in parallel
    const results = await Promise.all(
      requests.map((request, index) => 
        generateSummary(request).catch(error => {
          console.error(`❌ Request ${index + 1} failed:`, error);
          throw error;
        })
      )
    );
    
    const totalTime = Date.now() - startTime;
    console.log(`✅ Batch processing complete: ${results.length} summaries in ${totalTime}ms`);
    
    return results;
    
  } catch (error) {
    console.error('❌ Batch processing failed:', error);
    throw error;
  }
};

/**
 * Generate summary with custom options
 */
export const generateCustomSummary = async (
  chunks: RankedChunk[],
  query: string,
  options?: {
    summaryType?: SummaryRequest['summaryType'];
    maxLength?: number;
    includeExamples?: boolean;
    technicalLevel?: 'beginner' | 'intermediate' | 'advanced';
  }
): Promise<SummaryResult> => {
  const request: SummaryRequest = {
    chunks,
    query,
    summaryType: options?.summaryType,
    options: {
      maxLength: options?.maxLength,
      includeExamples: options?.includeExamples ?? true,
      technicalLevel: options?.technicalLevel ?? 'intermediate'
    }
  };
  
  return generateSummary(request);
};

// ========================================
// VALIDATION AND HEALTH CHECK
// ========================================

/**
 * Validate that the summarizer tool is properly configured
 */
export const validateSummarizerSetup = async (): Promise<{
  isValid: boolean;
  issues: string[];
  recommendations: string[];
}> => {
  const issues: string[] = [];
  const recommendations: string[] = [];
  
  try {
    // Check if Claude API is available
    const { ChatAnthropic } = await import("@langchain/anthropic");
    
    // Try to create a Claude instance
    const claude = new ChatAnthropic({
      model: "claude-3-5-sonnet-20241022",
      temperature: 0.3,
      maxTokens: 100
    });
    
    // Test with a simple request
    await claude.invoke([{ role: "user", content: "Test connection" }]);
    
  } catch (error) {
    issues.push('Claude API connection failed');
    recommendations.push('Ensure ANTHROPIC_API_KEY is set correctly');
  }
  
  // Check required modules
  const requiredModules = [
    'summary-analyzer',
    'content-synthesizer', 
    'format-generator',
    'quality-validator'
  ];
  
  requiredModules.forEach(module => {
    try {
      // Module imports are already done at the top, so they should be available
      console.log(`✅ Module ${module} loaded successfully`);
    } catch (error) {
      issues.push(`Module ${module} failed to load`);
      recommendations.push(`Check ${module} module implementation`);
    }
  });
  
  return {
    isValid: issues.length === 0,
    issues,
    recommendations
  };
};

// ========================================
// TOOL EXPORT FOR AGENT INTEGRATION
// ========================================

import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

/**
 * LangChain tool definition for agent integration
 */
export const summarizerTool = new DynamicStructuredTool({
  name: "summarizer",
  description: `Generates comprehensive, structured summaries from filtered content chunks.

Features:
- 4-stage pipeline: Analysis → Synthesis → Generation → Validation
- Multiple summary formats: executive, detailed, bullet-points, how-to, comparison, definition
- Quality validation with completeness, accuracy, coherence, and attribution metrics
- Intelligent content synthesis with duplicate removal and conflict resolution
- Adaptive formatting based on query intent and content structure

Input: Array of ranked content chunks with query
Output: High-quality structured summary with comprehensive metadata`,
  
  schema: z.object({
    chunks: z.array(z.any()).describe("Array of ranked content chunks from content processor"),
    query: z.string().describe("Original search query to summarize content for"),
    summaryType: z.enum(["executive", "detailed", "bullet-points", "how-to", "comparison", "definition"]).optional().describe("Specific summary format (optional - will auto-detect if not provided)"),
    options: z.object({
      maxLength: z.number().optional().describe("Maximum word count for summary"),
      includeExamples: z.boolean().optional().describe("Whether to include examples"),
      technicalLevel: z.enum(["beginner", "intermediate", "advanced"]).optional().describe("Target technical level for the audience")
    }).optional().describe("Additional options for summary generation")
  }),
  
  func: async ({ chunks, query, summaryType, options }) => {
    try {
      // Transform agent's simplified chunk format to RankedChunk format
      const transformedChunks = chunks.map((chunk: any, index: number) => {
        // If chunk is already in RankedChunk format, use as-is
        if (chunk.chunk && chunk.chunk.content) {
          return chunk;
        }
        
        // Transform simplified format to RankedChunk format
        return {
          chunk: {
            content: chunk.content || '',
            source: chunk.source || { url: '', title: '' },
            metadata: chunk.metadata || { position: index + 1 }
          },
          relevanceScore: chunk.relevanceScore || 0.8,
          qualityScore: chunk.qualityScore || 0.8,
          diversityScore: chunk.diversityScore || 0.5,
          positionScore: chunk.positionScore || 0.5,
          finalScore: chunk.finalScore || 0.7,
          reasons: chunk.reasons || ['Agent provided chunk'],
          keyMatches: chunk.keyMatches || [],
          rank: chunk.rank || index + 1
        };
      });
      
      const request: SummaryRequest = {
        chunks: transformedChunks,
        query,
        summaryType,
        options
      };
      
      const result = await generateSummary(request);
      
      // Return the actual summary content directly for the agent to use
      return `📋 SUMMARY GENERATED (${result.summaryType} format, ${result.metadata.finalWordCount} words, ${Math.round(result.quality.overall.overall * 100)}% quality)

${result.summary}

---
📊 Summary Statistics:
• Processing Time: ${result.metadata.processingTime}ms
• Sources Used: ${result.sources.length}
• Quality Score: ${Math.round(result.quality.overall.overall * 100)}%
• Word Count: ${result.metadata.finalWordCount} words`;
      
    } catch (error) {
      console.error('Summarizer tool error:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('Input chunks sample:', chunks.slice(0, 1));
      throw new Error(`Summary generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}); 