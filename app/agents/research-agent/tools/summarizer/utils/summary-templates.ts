/**
 * Summary Templates and Configuration
 * 
 * Declarative templates for different summary types and formats
 */

import type { SummaryTemplate, SummaryType, ContentStructure } from "../types";

// ========================================
// SUMMARY TEMPLATES CONFIGURATION
// ========================================

/**
 * Comprehensive templates for each summary type
 * Each template defines structure, length, tone, and formatting
 */
export const SUMMARY_TEMPLATES: Record<SummaryType, SummaryTemplate> = {
  
  // Executive Summary: Brief, high-level overview for decision makers
  executive: {
    structure: ['overview', 'key-findings', 'implications'],
    maxLength: 300,
    tone: 'professional',
    format: 'paragraph',
    includeIntroduction: false,
    includeConclusion: true,
    sectionHeaders: false
  },
  
  // Detailed Summary: Comprehensive analysis with full context
  detailed: {
    structure: ['introduction', 'main-content', 'examples', 'conclusion'],
    maxLength: 800,
    tone: 'comprehensive',
    format: 'mixed',
    includeIntroduction: true,
    includeConclusion: true,
    sectionHeaders: true
  },
  
  // Bullet Points: Scannable, easy-to-digest key points
  'bullet-points': {
    structure: ['key-findings', 'main-content'],
    maxLength: 400,
    tone: 'professional',
    format: 'bullet',
    includeIntroduction: false,
    includeConclusion: false,
    sectionHeaders: true
  },
  
  // How-To Guide: Step-by-step instructional format
  'how-to': {
    structure: ['prerequisites', 'steps', 'tips', 'troubleshooting'],
    maxLength: 600,
    tone: 'instructional',
    format: 'numbered',
    includeIntroduction: true,
    includeConclusion: false,
    sectionHeaders: true
  },
  
  // Comparison: Side-by-side analysis of options or concepts
  comparison: {
    structure: ['overview', 'main-content', 'implications'],
    maxLength: 500,
    tone: 'analytical',
    format: 'mixed',
    includeIntroduction: true,
    includeConclusion: true,
    sectionHeaders: true
  },
  
  // Definition: Clear explanation of concepts and terms
  definition: {
    structure: ['introduction', 'main-content', 'examples'],
    maxLength: 400,
    tone: 'explanatory',
    format: 'paragraph',
    includeIntroduction: false,
    includeConclusion: false,
    sectionHeaders: false
  }
};

// ========================================
// CONTENT STRUCTURE TEMPLATES
// ========================================

/**
 * Templates for different content structures
 * Define how each section should be formatted and what it should contain
 */
export const CONTENT_STRUCTURE_TEMPLATES = {
  
  overview: {
    title: "Overview",
    purpose: "High-level summary of the main topic",
    maxLength: 100,
    format: "paragraph",
    includeKeyTerms: true
  },
  
  'key-findings': {
    title: "Key Points",
    purpose: "Most important insights and takeaways",
    maxLength: 200,
    format: "bullet",
    includeKeyTerms: false
  },
  
  implications: {
    title: "Key Takeaways",
    purpose: "Practical implications and significance",
    maxLength: 100,
    format: "paragraph",
    includeKeyTerms: false
  },
  
  introduction: {
    title: "Introduction",
    purpose: "Context and background information",
    maxLength: 80,
    format: "paragraph",
    includeKeyTerms: true
  },
  
  'main-content': {
    title: "Main Content",
    purpose: "Core information and detailed explanation",
    maxLength: 400,
    format: "mixed",
    includeKeyTerms: true
  },
  
  examples: {
    title: "Examples",
    purpose: "Practical examples and illustrations",
    maxLength: 150,
    format: "bullet",
    includeKeyTerms: false
  },
  
  conclusion: {
    title: "Conclusion",
    purpose: "Summary and final thoughts",
    maxLength: 80,
    format: "paragraph",
    includeKeyTerms: false
  },
  
  prerequisites: {
    title: "Prerequisites",
    purpose: "Requirements and preparation needed",
    maxLength: 100,
    format: "bullet",
    includeKeyTerms: false
  },
  
  steps: {
    title: "Steps",
    purpose: "Sequential instructions to follow",
    maxLength: 300,
    format: "numbered",
    includeKeyTerms: false
  },
  
  tips: {
    title: "Tips & Best Practices",
    purpose: "Helpful advice and recommendations",
    maxLength: 100,
    format: "bullet",
    includeKeyTerms: false
  },
  
  troubleshooting: {
    title: "Troubleshooting",
    purpose: "Common issues and solutions",
    maxLength: 100,
    format: "bullet",
    includeKeyTerms: false
  }
};

// ========================================
// FORMATTING TEMPLATES
// ========================================

/**
 * Text formatting templates for different output styles
 */
export const FORMATTING_TEMPLATES = {
  
  paragraph: {
    sectionSeparator: "\n\n",
    pointPrefix: "",
    pointSeparator: " ",
    useHeaders: false,
    headerFormat: "## {title}\n\n"
  },
  
  bullet: {
    sectionSeparator: "\n\n",
    pointPrefix: "• ",
    pointSeparator: "\n",
    useHeaders: true,
    headerFormat: "## {title}\n\n"
  },
  
  numbered: {
    sectionSeparator: "\n\n",
    pointPrefix: "{number}. ",
    pointSeparator: "\n",
    useHeaders: true,
    headerFormat: "## {title}\n\n"
  },
  
  mixed: {
    sectionSeparator: "\n\n",
    pointPrefix: "dynamic", // Determined by content type
    pointSeparator: "\n",
    useHeaders: true,
    headerFormat: "## {title}\n\n"
  }
};

// ========================================
// TONE TEMPLATES
// ========================================

/**
 * Writing tone and style templates
 */
export const TONE_TEMPLATES = {
  
  professional: {
    vocabulary: "formal",
    sentenceLength: "medium",
    personalPronouns: false,
    technicalTerms: "defined",
    examples: "business-focused"
  },
  
  comprehensive: {
    vocabulary: "detailed",
    sentenceLength: "varied",
    personalPronouns: false,
    technicalTerms: "explained",
    examples: "thorough"
  },
  
  instructional: {
    vocabulary: "clear",
    sentenceLength: "short",
    personalPronouns: true,
    technicalTerms: "simplified",
    examples: "step-by-step"
  },
  
  analytical: {
    vocabulary: "precise",
    sentenceLength: "medium",
    personalPronouns: false,
    technicalTerms: "technical",
    examples: "comparative"
  },
  
  explanatory: {
    vocabulary: "accessible",
    sentenceLength: "medium",
    personalPronouns: false,
    technicalTerms: "defined",
    examples: "illustrative"
  },
  
  casual: {
    vocabulary: "conversational",
    sentenceLength: "short",
    personalPronouns: true,
    technicalTerms: "simplified",
    examples: "relatable"
  }
};

// ========================================
// PROMPT TEMPLATES
// ========================================

/**
 * Claude prompt templates for different summary types
 */
export const CLAUDE_PROMPT_TEMPLATES = {
  
  executive: `Create a concise executive summary that:
- Provides a high-level overview in 2-3 sentences
- Highlights the most critical findings
- Focuses on business implications and actionable insights
- Uses professional, decision-maker oriented language
- Stays within 300 words`,
  
  detailed: `Create a comprehensive detailed summary that:
- Includes a clear introduction with context
- Covers all major points with supporting details
- Provides relevant examples and explanations
- Maintains logical flow and structure
- Concludes with key takeaways
- Stays within 800 words`,
  
  'bullet-points': `Create a bullet-point summary that:
- Lists key points in order of importance
- Uses clear, scannable bullet format
- Keeps each point concise but complete
- Groups related points under headers
- Focuses on actionable information
- Stays within 400 words`,
  
  'how-to': `Create a step-by-step how-to guide that:
- Lists prerequisites and requirements first
- Provides numbered, sequential steps
- Includes helpful tips and best practices
- Addresses common troubleshooting issues
- Uses clear, instructional language
- Stays within 600 words`,
  
  comparison: `Create a comparative analysis that:
- Introduces the items being compared
- Highlights key similarities and differences
- Presents pros and cons objectively
- Provides a balanced perspective
- Concludes with recommendations
- Stays within 500 words`,
  
  definition: `Create a clear definition summary that:
- Defines the main concept clearly
- Explains key characteristics and features
- Provides context and background
- Includes relevant examples
- Uses accessible, explanatory language
- Stays within 400 words`
};

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Get template for specific summary type
 */
export const getSummaryTemplate = (summaryType: SummaryType): SummaryTemplate => {
  return SUMMARY_TEMPLATES[summaryType];
};

/**
 * Get content structure template
 */
export const getContentStructureTemplate = (structure: ContentStructure) => {
  return CONTENT_STRUCTURE_TEMPLATES[structure];
};

/**
 * Get formatting template
 */
export const getFormattingTemplate = (format: string) => {
  return FORMATTING_TEMPLATES[format as keyof typeof FORMATTING_TEMPLATES];
};

/**
 * Get tone template
 */
export const getToneTemplate = (tone: string) => {
  return TONE_TEMPLATES[tone as keyof typeof TONE_TEMPLATES];
};

/**
 * Get Claude prompt template
 */
export const getClaudePromptTemplate = (summaryType: SummaryType): string => {
  return CLAUDE_PROMPT_TEMPLATES[summaryType];
};

/**
 * Calculate recommended summary length based on content volume
 */
export const calculateRecommendedLength = (
  contentWordCount: number, 
  summaryType: SummaryType
): number => {
  const baseTemplate = getSummaryTemplate(summaryType);
  const contentRatio = Math.min(contentWordCount / 1000, 2); // Cap at 2x for very long content
  
  return Math.round(baseTemplate.maxLength * (0.8 + (contentRatio * 0.2)));
};

/**
 * Determine optimal summary type based on query and content analysis
 */
export const determineOptimalSummaryType = (
  query: string,
  hasSteps: boolean,
  hasComparisons: boolean,
  hasDefinitions: boolean,
  queryLength: number
): SummaryType => {
  const queryLower = query.toLowerCase();
  
  // How-to queries
  if (/how to|how do|steps|tutorial|guide|instructions/.test(queryLower) || hasSteps) {
    return 'how-to';
  }
  
  // Comparison queries
  if (/vs|versus|compare|difference|better|best/.test(queryLower) || hasComparisons) {
    return 'comparison';
  }
  
  // Definition queries
  if (/what is|define|meaning|definition/.test(queryLower) || hasDefinitions) {
    return 'definition';
  }
  
  // Executive summary for short queries
  if (queryLength < 30) {
    return 'executive';
  }
  
  // Detailed summary for complex queries
  if (queryLength > 80) {
    return 'detailed';
  }
  
  // Default to bullet points for medium queries
  return 'bullet-points';
}; 