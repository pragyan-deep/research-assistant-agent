/**
 * Format Generator Module
 * 
 * Generates structured summaries in different formats using Claude AI
 */

import { ChatAnthropic } from "@langchain/anthropic";
import type { 
  GeneratedSummary, 
  SummarySection, 
  SummaryMetadata, 
  SummaryFormatting,
  SynthesizedContent, 
  ContentAnalysis,
  SummaryType,
  SummaryTemplate
} from "../types";
import { 
  getSummaryTemplate, 
  getClaudePromptTemplate,
  getFormattingTemplate,
  getToneTemplate 
} from "../utils/summary-templates";

// ========================================
// MAIN FORMAT GENERATOR FUNCTION
// ========================================

/**
 * Generate formatted summary using Claude AI
 */
export const generateFormattedSummary = async (
  synthesizedContent: SynthesizedContent,
  analysis: ContentAnalysis,
  query: string
): Promise<GeneratedSummary> => {
  const startTime = Date.now();
  
  try {
    console.log(`📝 Starting summary generation for type: ${analysis.summaryType}`);
    
    // Get template configuration
    const template = getSummaryTemplate(analysis.summaryType);
    
    // Generate summary using Claude
    const summaryContent = await generateSummaryWithClaude(
      synthesizedContent, 
      analysis, 
      query, 
      template
    );
    
    // Parse and structure the generated summary
    const structuredSummary = parseAndStructureSummary(summaryContent, template, analysis.summaryType);
    
    // Create metadata
    const metadata = createSummaryMetadata(summaryContent, analysis, startTime);
    
    // Create formatting information
    const formatting = createFormattingInfo(summaryContent, template);
    
    const result: GeneratedSummary = {
      content: summaryContent,
      structure: structuredSummary,
      metadata,
      formatting
    };
    
    console.log(`✅ Summary generation completed in ${Date.now() - startTime}ms`);
    return result;
    
  } catch (error) {
    console.error('Error in format generation:', error);
    throw new Error(`Format generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// ========================================
// CLAUDE SUMMARY GENERATION
// ========================================

/**
 * Generate summary using Claude AI with sophisticated prompting
 */
const generateSummaryWithClaude = async (
  synthesizedContent: SynthesizedContent,
  analysis: ContentAnalysis,
  query: string,
  template: SummaryTemplate
): Promise<string> => {
  console.log(`🤖 Generating ${analysis.summaryType} summary with Claude...`);
  
  try {
    // Initialize Claude with optimized settings
    const claude = new ChatAnthropic({
      model: "claude-3-5-sonnet-20241022",
      temperature: 0.3, // Low temperature for consistent, factual summaries
      maxTokens: 1500   // OPTIMIZATION: Reduced token limit for faster responses
    });
    
    // Create comprehensive prompt
    const prompt = createClaudePrompt(synthesizedContent, analysis, query, template);
    
    // Generate summary
    const response = await claude.invoke([{ role: "user", content: prompt }]);
    const summaryContent = response.content.toString().trim();
    
    console.log(`✅ Claude generated ${summaryContent.split(' ').length} word summary`);
    return summaryContent;
    
  } catch (error) {
    console.error('Error calling Claude API:', error);
    throw new Error(`Claude API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Create comprehensive prompt for Claude
 */
const createClaudePrompt = (
  synthesizedContent: SynthesizedContent,
  analysis: ContentAnalysis,
  query: string,
  template: SummaryTemplate
): string => {
  const basePrompt = getClaudePromptTemplate(analysis.summaryType);
  const toneConfig = getToneTemplate(template.tone);
  
  // Build content context
  const contentContext = buildContentContext(synthesizedContent);
  
  // Build formatting instructions
  const formattingInstructions = buildFormattingInstructions(template);
  
  return `
You are a professional content summarizer. Your task is to create a ${analysis.summaryType} summary based on the provided content.

## ORIGINAL QUERY
"${query}"

## CONTENT TO SUMMARIZE
${contentContext}

## SUMMARY REQUIREMENTS
${basePrompt}

## FORMATTING INSTRUCTIONS
${formattingInstructions}

## TONE AND STYLE
- Vocabulary: ${toneConfig.vocabulary}
- Sentence length: ${toneConfig.sentenceLength}
- Technical terms: ${toneConfig.technicalTerms}
- Examples: ${toneConfig.examples}
- Use personal pronouns: ${toneConfig.personalPronouns}

## ADDITIONAL CONTEXT
- Query intent: ${analysis.queryIntent}
- Technical complexity: ${analysis.technicalComplexity}
- Target length: ${template.maxLength} words
- Include examples: ${template.includeIntroduction}
- Include conclusion: ${template.includeConclusion}

Please create a well-structured, informative summary that directly addresses the original query.
  `.trim();
};

/**
 * Build content context from synthesized content
 */
const buildContentContext = (synthesizedContent: SynthesizedContent): string => {
  let context = '';
  
  // Add main points
  if (synthesizedContent.mainPoints.length > 0) {
    context += '### MAIN POINTS\n';
    synthesizedContent.mainPoints.forEach((point, index) => {
      context += `${index + 1}. ${point.point} (Importance: ${point.importance.toFixed(2)})\n`;
    });
    context += '\n';
  }
  
  // Add definitions
  if (synthesizedContent.definitions.length > 0) {
    context += '### DEFINITIONS\n';
    synthesizedContent.definitions.forEach(def => {
      context += `- ${def.term}: ${def.definition}\n`;
    });
    context += '\n';
  }
  
  // Add examples
  if (synthesizedContent.examples.length > 0) {
    context += '### EXAMPLES\n';
    synthesizedContent.examples.forEach((example, index) => {
      context += `${index + 1}. ${example.description}\n`;
    });
    context += '\n';
  }
  
  // Add steps (if any)
  if (synthesizedContent.steps.length > 0) {
    context += '### STEPS\n';
    synthesizedContent.steps.forEach(step => {
      context += `${step.stepNumber}. ${step.instruction}\n`;
    });
    context += '\n';
  }
  
  // Add supporting details
  if (synthesizedContent.supportingDetails.length > 0) {
    context += '### SUPPORTING DETAILS\n';
    synthesizedContent.supportingDetails.slice(0, 8).forEach((detail, index) => {
      context += `- ${detail.detail}\n`;
    });
    context += '\n';
  }
  
  return context;
};

/**
 * Build formatting instructions based on template
 */
const buildFormattingInstructions = (template: SummaryTemplate): string => {
  const formatConfig = getFormattingTemplate(template.format);
  let instructions = '';
  
  instructions += `- Format: ${template.format}\n`;
  instructions += `- Structure: ${template.structure.join(' → ')}\n`;
  instructions += `- Use section headers: ${template.sectionHeaders}\n`;
  instructions += `- Include introduction: ${template.includeIntroduction}\n`;
  instructions += `- Include conclusion: ${template.includeConclusion}\n`;
  
  if (template.format === 'bullet') {
    instructions += '- Use bullet points (•) for main points\n';
    instructions += '- Keep each bullet point concise but complete\n';
  } else if (template.format === 'numbered') {
    instructions += '- Use numbered lists for sequential information\n';
    instructions += '- Ensure logical progression between points\n';
  } else if (template.format === 'paragraph') {
    instructions += '- Use flowing paragraph format\n';
    instructions += '- Ensure smooth transitions between ideas\n';
  }
  
  return instructions;
};

// ========================================
// SUMMARY PARSING AND STRUCTURING
// ========================================

/**
 * Parse Claude's response and structure it into sections
 */
const parseAndStructureSummary = (
  summaryContent: string, 
  template: SummaryTemplate,
  summaryType: SummaryType
): SummarySection[] => {
  console.log('📋 Parsing and structuring summary...');
  
  const sections: SummarySection[] = [];
  
  // If the summary has headers, parse by sections
  if (template.sectionHeaders && summaryContent.includes('##')) {
    const parsedSections = parseSectionedSummary(summaryContent);
    sections.push(...parsedSections);
  } else {
    // Create a single main section
    sections.push({
      type: 'main-content',
      title: getSectionTitle(summaryType),
      content: summaryContent,
      wordCount: summaryContent.split(/\s+/).length,
      sources: [] // Would be populated if we tracked source attribution
    });
  }
  
  return sections;
};

/**
 * Parse summary with section headers
 */
const parseSectionedSummary = (content: string): SummarySection[] => {
  const sections: SummarySection[] = [];
  const sectionPattern = /^##\s+(.+)$/gm;
  const parts = content.split(sectionPattern);
  
  // First part might be intro content without header
  if (parts[0] && parts[0].trim()) {
    sections.push({
      type: 'introduction',
      title: 'Introduction',
      content: parts[0].trim(),
      wordCount: parts[0].trim().split(/\s+/).length,
      sources: []
    });
  }
  
  // Process header-content pairs
  for (let i = 1; i < parts.length; i += 2) {
    const title = parts[i];
    const sectionContent = parts[i + 1];
    
    if (title && sectionContent) {
      sections.push({
        type: determineSectionType(title),
        title: title.trim(),
        content: sectionContent.trim(),
        wordCount: sectionContent.trim().split(/\s+/).length,
        sources: []
      });
    }
  }
  
  return sections;
};

/**
 * Determine section type from title
 */
const determineSectionType = (title: string): SummarySection['type'] => {
  const lowerTitle = title.toLowerCase();
  
  if (/overview|introduction|intro/.test(lowerTitle)) return 'introduction';
  if (/key|main|important|points/.test(lowerTitle)) return 'key-findings';
  if (/example|sample|instance/.test(lowerTitle)) return 'examples';
  if (/conclusion|summary|takeaway/.test(lowerTitle)) return 'conclusion';
  if (/step|instruction|how/.test(lowerTitle)) return 'steps';
  if (/tip|advice|best/.test(lowerTitle)) return 'tips';
  if (/prerequisite|requirement/.test(lowerTitle)) return 'prerequisites';
  if (/troubleshoot|problem|issue/.test(lowerTitle)) return 'troubleshooting';
  
  return 'main-content';
};

/**
 * Get section title for single-section summaries
 */
const getSectionTitle = (summaryType: SummaryType): string => {
  const titles = {
    executive: 'Executive Summary',
    detailed: 'Detailed Analysis',
    'bullet-points': 'Key Points',
    'how-to': 'Instructions',
    comparison: 'Comparison Analysis',
    definition: 'Definition'
  };
  
  return titles[summaryType];
};

// ========================================
// METADATA CREATION
// ========================================

/**
 * Create comprehensive metadata for the generated summary
 */
const createSummaryMetadata = (
  summaryContent: string, 
  analysis: ContentAnalysis,
  startTime: number
): SummaryMetadata => {
  const wordCount = summaryContent.split(/\s+/).length;
  
  return {
    summaryType: analysis.summaryType,
    wordCount,
    readingLevel: calculateReadingLevel(summaryContent),
    technicalLevel: analysis.technicalComplexity === 'low' ? 'beginner' : 
                   analysis.technicalComplexity === 'medium' ? 'intermediate' : 'advanced',
    completeness: calculateCompleteness(summaryContent, analysis),
    generationTime: Date.now() - startTime,
    sourcesUsed: analysis.keyThemes.length
  };
};

/**
 * Calculate reading level (simplified)
 */
const calculateReadingLevel = (content: string): string => {
  const sentences = content.split(/[.!?]+/).length;
  const words = content.split(/\s+/).length;
  const avgWordsPerSentence = words / sentences;
  
  if (avgWordsPerSentence < 15) return 'Easy';
  if (avgWordsPerSentence < 20) return 'Medium';
  return 'Advanced';
};

/**
 * Calculate completeness score
 */
const calculateCompleteness = (summaryContent: string, analysis: ContentAnalysis): number => {
  let completeness = 0.5; // Base score
  
  // Check if main topics are covered
  const summaryLower = summaryContent.toLowerCase();
  const topicsCovered = analysis.detectedTopics.filter(topic => 
    summaryLower.includes(topic.toLowerCase())
  ).length;
  
  const topicCoverage = topicsCovered / Math.max(analysis.detectedTopics.length, 1);
  completeness += topicCoverage * 0.3;
  
  // Check length appropriateness
  const wordCount = summaryContent.split(/\s+/).length;
  const targetLength = analysis.recommendedLength;
  const lengthRatio = Math.min(wordCount / targetLength, 1);
  completeness += lengthRatio * 0.2;
  
  return Math.min(completeness, 1);
};

// ========================================
// FORMATTING INFORMATION
// ========================================

/**
 * Create formatting information about the generated summary
 */
const createFormattingInfo = (summaryContent: string, template: SummaryTemplate): SummaryFormatting => {
  return {
    hasHeaders: summaryContent.includes('##') || summaryContent.includes('#'),
    hasBulletPoints: summaryContent.includes('•') || summaryContent.includes('- '),
    hasNumberedLists: /\d+\.\s/.test(summaryContent),
    hasCodeBlocks: summaryContent.includes('```') || summaryContent.includes('`'),
    hasQuotes: summaryContent.includes('"') || summaryContent.includes("'")
  };
};

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Validate summary quality and length
 */
export const validateSummaryQuality = (summary: GeneratedSummary, template: SummaryTemplate): {
  isValid: boolean;
  issues: string[];
  suggestions: string[];
} => {
  const issues: string[] = [];
  const suggestions: string[] = [];
  
  // Check length
  if (summary.metadata.wordCount > template.maxLength * 1.2) {
    issues.push(`Summary is too long (${summary.metadata.wordCount} words, max ${template.maxLength})`);
    suggestions.push('Consider condensing main points or removing less critical details');
  }
  
  if (summary.metadata.wordCount < template.maxLength * 0.5) {
    issues.push(`Summary is too short (${summary.metadata.wordCount} words, min ${template.maxLength * 0.5})`);
    suggestions.push('Consider adding more supporting details or examples');
  }
  
  // Check completeness
  if (summary.metadata.completeness < 0.7) {
    issues.push('Summary appears incomplete (coverage < 70%)');
    suggestions.push('Ensure all main topics from the query are addressed');
  }
  
  // Check structure
  if (template.sectionHeaders && summary.structure.length < 2) {
    issues.push('Expected multiple sections but found only one');
    suggestions.push('Consider breaking content into logical sections with headers');
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    suggestions
  };
}; 