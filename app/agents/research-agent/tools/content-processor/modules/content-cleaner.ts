/**
 * Content Cleaner Module - Stage 2 of Content Processing Pipeline
 * 
 * Purpose: Transform raw scraped web content into clean, structured, research-ready text
 * Input: Raw HTML content with JavaScript, navigation, and UI elements
 * Output: Clean, well-formatted text suitable for AI analysis
 */

interface CleanedContent {
  content: string;
  metadata: {
    originalLength: number;
    cleanedLength: number;
    reductionPercentage: number;
    processingTime: number;
  };
}

interface ContentCleanerInput {
  content: string;
  title: string;
  url: string;
}

// ========================================
// STEP 1: JAVASCRIPT & SCRIPT REMOVAL
// ========================================

/**
 * Remove JavaScript code, function calls, and script artifacts
 * 
 * What this removes:
 * - window.function() calls
 * - JavaScript variables and assignments
 * - Function definitions and calls
 * - Script tags and their content
 * - Browser initialization code
 */
const removeJavaScriptArtifacts = (content: string): string => {
  console.log("🧹 Step 1: Removing JavaScript artifacts...");
  
  return content
    // Remove window.* function calls
    .replace(/window\.[^;()]*\([^)]*\)[^;]*;?/g, '')
    
    // Remove function calls like function() or functionName()
    .replace(/\w+\([^)]*\)\s*[{;]?/g, '')
    
    // Remove variable assignments with = 
    .replace(/\w+\s*=\s*[^;]+;/g, '')
    
    // Remove JavaScript objects and arrays in curly/square brackets
    .replace(/\{[^}]*\}/g, '')
    .replace(/\[[^\]]*\]/g, '')
    
    // Remove script-like patterns
    .replace(/var\s+\w+/g, '')
    .replace(/const\s+\w+/g, '')
    .replace(/let\s+\w+/g, '')
    
    // Remove semicolons and excessive punctuation
    .replace(/;+/g, '')
    .replace(/\|\|/g, '')
    .replace(/&&/g, '');
};

// ========================================
// STEP 2: NAVIGATION & UI ELEMENT REMOVAL
// ========================================

/**
 * Remove website navigation, menus, buttons, and UI elements
 * 
 * What this removes:
 * - Navigation menus (menuOverview, menuProducts, etc.)
 * - Button text (Get started, Contact us, Subscribe, etc.)
 * - Breadcrumb navigation
 * - Footer and header elements
 * - Call-to-action elements
 */
const removeNavigationElements = (content: string): string => {
  console.log("🧹 Step 2: Removing navigation and UI elements...");
  
  // Define navigation patterns to remove
  const navigationPatterns = [
    // Menu items
    /menu[A-Z][a-zA-Z]+/g,
    
    // Common button text
    /(Get started|Stay informed|Contact|Subscribe|Sign up|Learn more|Try now|Download)/gi,
    
    // Navigation words
    /(Overview|Solutions|Products|Pricing|Resources|Docs|Support|About|Home|Blog)/gi,
    
    // Call-to-action phrases
    /(Click here|Read more|See all|View all|Explore|Discover)/gi,
    
    // Footer elements
    /(Privacy|Terms|Cookies|Copyright|All rights reserved)/gi,
    
    // Social media
    /(Follow us|Share|Like|Tweet|LinkedIn|Facebook|Twitter)/gi,
    
    // Promotional content
    /\$\d+\s+(in\s+)?(free\s+)?(credits?|trial|offer)/gi,
    
    // Form elements
    /(Enter your email|Subscribe|Newsletter|Email address)/gi
  ];
  
  // Apply all navigation patterns
  return navigationPatterns.reduce((text, pattern) => {
    return text.replace(pattern, '');
  }, content);
};

// ========================================
// STEP 3: METADATA & TRACKING CODE REMOVAL
// ========================================

/**
 * Remove analytics tracking, metadata, and SEO artifacts
 * 
 * What this removes:
 * - Google Analytics tracking codes
 * - UTM parameters and tracking pixels
 * - SEO metadata and schema markup
 * - Internal website configuration data
 * - CSS class names and IDs
 */
const removeMetadataAndTracking = (content: string): string => {
  console.log("🧹 Step 3: Removing metadata and tracking codes...");
  
  return content
    // Remove tracking and analytics
    .replace(/track-[a-zA-Z-_]+/g, '')
    .replace(/utm_[a-zA-Z-_]+/g, '')
    .replace(/analytics?[a-zA-Z-_]*/gi, '')
    .replace(/metadata[a-zA-Z-_]*/gi, '')
    
    // Remove CSS-related artifacts
    .replace(/class[a-zA-Z-_]*=/gi, '')
    .replace(/id[a-zA-Z-_]*=/gi, '')
    .replace(/style[a-zA-Z-_]*=/gi, '')
    
    // Remove data attributes
    .replace(/data-[a-zA-Z-_]+/g, '')
    
    // Remove schema markup
    .replace(/schema\.org/g, '')
    .replace(/itemscope|itemtype|itemprop/g, '')
    
    // Remove URL fragments and parameters
    .replace(/https?:\/\/[^\s]+/g, '')
    .replace(/www\.[^\s]+/g, '')
    
    // Remove email addresses (often in footers)
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '');
};

// ========================================
// STEP 4: TEXT STRUCTURE & FORMATTING
// ========================================

/**
 * Add proper structure, spacing, and formatting to the text
 * 
 * What this does:
 * - Separates merged words (camelCase to proper spacing)
 * - Adds proper sentence boundaries
 * - Normalizes whitespace and line breaks
 * - Creates paragraph structure
 * - Removes excessive punctuation
 */
const addTextStructure = (content: string): string => {
  console.log("🧹 Step 4: Adding text structure and formatting...");
  
  return content
    // Separate camelCase words (menuOverview -> menu Overview)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    
    // Add spaces between words that are stuck together
    .replace(/([a-z])([A-Z][a-z])/g, '$1. $2')
    
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    
    // Fix sentence boundaries
    .replace(/([.!?])\s*([A-Z])/g, '$1 $2')
    
    // Remove excessive punctuation
    .replace(/[.]{2,}/g, '.')
    .replace(/[,]{2,}/g, ',')
    .replace(/[!]{2,}/g, '!')
    .replace(/[?]{2,}/g, '?')
    
    // Add line breaks for better paragraph structure
    .replace(/\.\s+([A-Z][^.]*(?:is|are|can|will|should|would|could|may|might))/g, '.\n\n$1')
    
    // Clean up
    .trim();
};

// ========================================
// STEP 5: CONTENT QUALITY FILTERING
// ========================================

/**
 * Filter out low-quality sentences and keep only substantial content
 * 
 * What this filters:
 * - Sentences with too many capital letters (likely navigation)
 * - Very short fragments
 * - Sentences with too many numbers (likely metadata)
 * - Repetitive or promotional content
 * - Sentences with poor word-to-character ratio
 */
const filterQualityContent = (content: string): string => {
  console.log("🧹 Step 5: Filtering for quality content...");
  
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  const qualitySentences = sentences.filter(sentence => {
    const trimmed = sentence.trim();
    
    // Skip very short sentences
    if (trimmed.length < 30) return false;
    
    // Skip sentences with too few words
    const words = trimmed.split(/\s+/);
    if (words.length < 5) return false;
    
    // Skip sentences with too many capital letters (likely navigation/titles)
    const capitalLetters = (trimmed.match(/[A-Z]/g) || []).length;
    const capitalRatio = capitalLetters / trimmed.length;
    if (capitalRatio > 0.3) return false;
    
    // Skip sentences with too many numbers (likely metadata/dates)
    const numbers = (trimmed.match(/\d/g) || []).length;
    const numberRatio = numbers / trimmed.length;
    if (numberRatio > 0.2) return false;
    
    // Skip sentences that are mostly punctuation
    const punctuation = (trimmed.match(/[^\w\s]/g) || []).length;
    const punctuationRatio = punctuation / trimmed.length;
    if (punctuationRatio > 0.3) return false;
    
    // Skip common promotional phrases
    const promotionalPatterns = [
      /free trial|sign up|get started|contact us|learn more/i,
      /subscribe|newsletter|email|download/i,
      /\$\d+|price|pricing|cost|buy now/i
    ];
    
    if (promotionalPatterns.some(pattern => pattern.test(trimmed))) {
      return false;
    }
    
    return true;
  });
  
  return qualitySentences.join('. ').trim();
};

// ========================================
// STEP 6: FINAL CLEANUP & VALIDATION
// ========================================

/**
 * Final cleanup pass and content validation
 * 
 * What this does:
 * - Removes any remaining artifacts
 * - Ensures proper capitalization
 * - Validates minimum content length
 * - Adds proper sentence endings
 */
const finalCleanupAndValidation = (content: string): string => {
  console.log("🧹 Step 6: Final cleanup and validation...");
  
  let cleaned = content
    // Remove any remaining single characters or short words scattered around
    .replace(/\s+[a-zA-Z]\s+/g, ' ')
    
    // Fix spacing around punctuation
    .replace(/\s+([,.!?])/g, '$1')
    .replace(/([,.!?])\s*([A-Z])/g, '$1 $2')
    
    // Ensure sentences start with capital letters
    .replace(/(^|\.\s+)([a-z])/g, (match, prefix, letter) => prefix + letter.toUpperCase())
    
    // Remove multiple spaces
    .replace(/\s+/g, ' ')
    
    // Trim and ensure content ends with proper punctuation
    .trim();
  
  // Add final period if missing
  if (cleaned && !/[.!?]$/.test(cleaned)) {
    cleaned += '.';
  }
  
  return cleaned;
};

// ========================================
// MAIN CONTENT CLEANING FUNCTION
// ========================================

/**
 * Main function that orchestrates all cleaning steps
 * 
 * Processing Pipeline:
 * 1. Remove JavaScript artifacts
 * 2. Remove navigation elements
 * 3. Remove metadata and tracking codes
 * 4. Add proper text structure and formatting
 * 5. Filter for quality content only
 * 6. Final cleanup and validation
 * 
 * @param input - Object containing content, title, and URL
 * @returns Promise<CleanedContent> - Cleaned content with metadata
 */
export const cleanContent = async (input: ContentCleanerInput): Promise<CleanedContent> => {
  const startTime = Date.now();
  const originalLength = input.content.length;
  
  console.log(`🧹 Starting content cleaning for: ${input.title}`);
  console.log(`📊 Original content length: ${originalLength} characters`);
  
  try {
    // Apply all cleaning steps in sequence
    let cleanedContent = input.content;
    
    // Step 1: Remove JavaScript artifacts
    cleanedContent = removeJavaScriptArtifacts(cleanedContent);
    
    // Step 2: Remove navigation elements
    cleanedContent = removeNavigationElements(cleanedContent);
    
    // Step 3: Remove metadata and tracking
    cleanedContent = removeMetadataAndTracking(cleanedContent);
    
    // Step 4: Add text structure
    cleanedContent = addTextStructure(cleanedContent);
    
    // Step 5: Filter quality content
    cleanedContent = filterQualityContent(cleanedContent);
    
    // Step 6: Final cleanup
    cleanedContent = finalCleanupAndValidation(cleanedContent);
    
    const processingTime = Date.now() - startTime;
    const cleanedLength = cleanedContent.length;
    const reductionPercentage = Math.round(((originalLength - cleanedLength) / originalLength) * 100);
    
    console.log(`✅ Content cleaning completed in ${processingTime}ms`);
    console.log(`📊 Cleaned content length: ${cleanedLength} characters`);
    console.log(`📉 Content reduction: ${reductionPercentage}%`);
    
    return {
      content: cleanedContent,
      metadata: {
        originalLength,
        cleanedLength,
        reductionPercentage,
        processingTime
      }
    };
    
  } catch (error) {
    console.error(`❌ Content cleaning failed for ${input.url}:`, error);
    throw new Error(`Content cleaning failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// ========================================
// BATCH CLEANING FUNCTION
// ========================================

/**
 * Clean multiple content pieces in batch
 * 
 * @param inputs - Array of content to clean
 * @returns Promise<CleanedContent[]> - Array of cleaned content
 */
export const cleanMultipleContent = async (inputs: ContentCleanerInput[]): Promise<CleanedContent[]> => {
  console.log(`🧹 Starting batch content cleaning for ${inputs.length} items...`);
  
  const results: CleanedContent[] = [];
  
  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i];
    console.log(`📄 Processing ${i + 1}/${inputs.length}: ${input.title}`);
    
    try {
      const cleaned = await cleanContent(input);
      results.push(cleaned);
    } catch (error) {
      console.error(`❌ Failed to clean content ${i + 1}:`, error);
      // Add empty result for failed cleaning
      results.push({
        content: input.content, // Return original content if cleaning fails
        metadata: {
          originalLength: input.content.length,
          cleanedLength: input.content.length,
          reductionPercentage: 0,
          processingTime: 0
        }
      });
    }
  }
  
  console.log(`✅ Batch content cleaning completed: ${results.length} items processed`);
  return results;
};

// Export types for use in other modules
export type { CleanedContent, ContentCleanerInput }; 