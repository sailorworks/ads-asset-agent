"use server";

import { executeTool } from "@/lib/composio";

// ============================================================================
// Types
// ============================================================================

export type BrandAnalysis = {
  colors: string[];
  mood: string;
  subject: string;
  brandName?: string;
  slogan?: string;
  hasLogo?: boolean;
};

export type AssetSpecs = {
  socialPrompts: string[];
  portrait34Prompts: string[];
  videoPrompts: string[];
  squarePrompts: string[];
  landscapePrompts: string[];
};

export type AdCopy = {
  headline?: string;
  tagline?: string;
  description?: string;
  cta?: string;
  hashtags?: string[];
  instagramCaption?: string;
  facebookCaption?: string;
  twitterCaption?: string;
  linkedinCaption?: string;
};

// ============================================================================
// Brand Analysis Action
// ============================================================================

export async function analyzeBrandAction(
  imageBase64: string
): Promise<BrandAnalysis> {
  // Note: For vision analysis, we need to pass the image
  // GEMINI_GENERATE_CONTENT may need image passed differently
  const prompt = `You are a brand identity analyst. Analyze this image and extract:
1. colors: Array of hex codes for dominant brand colors
2. mood: The emotional tone (e.g., Energetic, Serene, Luxury, Minimalist)
3. subject: The main subject of the image
4. brandName: The brand name if visible or inferable
5. slogan: A potential marketing slogan
6. hasLogo: Whether a distinct logo is present

Respond ONLY with valid JSON matching this structure:
{
  "colors": ["#hexcode"],
  "mood": "string",
  "subject": "string",
  "brandName": "string or null",
  "slogan": "string or null",
  "hasLogo": boolean
}

Image data (base64): ${imageBase64.substring(0, 100)}...`;

  try {
    const result = await executeTool("GEMINI_GENERATE_CONTENT", {
      prompt: prompt,
      model: "gemini-2.5-flash",
    });

    // Parse the response
    const content =
      (result as { text?: string; content?: string })?.text ||
      (result as { text?: string; content?: string })?.content ||
      JSON.stringify(result);
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    // Fallback
    return {
      colors: ["#000000"],
      mood: "Modern",
      subject: "Product",
    };
  } catch (error) {
    console.error("Brand analysis error:", error);
    return {
      colors: ["#000000"],
      mood: "Modern",
      subject: "Product",
    };
  }
}

// ============================================================================
// Asset Specs Generation Action
// ============================================================================

export async function generateSpecsAction(
  context: BrandAnalysis,
  userInstruction: string,
  counts: {
    portrait: number;
    portrait34: number;
    square: number;
    landscape: number;
    video: number;
  }
): Promise<AssetSpecs> {
  const { portrait, portrait34, square, landscape, video } = counts;

  let prompt = `Based on brand context: ${JSON.stringify(context)}, create:
- ${portrait} prompts for social (9:16)
- ${portrait34} prompts for portrait (3:4)
- ${video} prompts for Video (16:9) [All for Veo]
- ${square} prompts for Square (1:1)
- ${landscape} prompts for Landscape (16:9)

CRITICAL: All image prompts must be for "high-end product photography" or "ad shoot" style.
They must be EXTREMELY creative and visually stunning.
ABSOLUTELY NO TEXT IN IMAGES. Pure visual storytelling.

For Video Prompts:
- FOCUS: Creative product cinematography. Dynamic camera movements, lighting effects, slow motion.
- DO NOT include people speaking or introducing the product unless explicitly requested.
- NO "commercial film" style with actors. Focus on the PRODUCT itself in a creative way.

Respond ONLY with valid JSON:
{
  "socialPrompts": ["prompt1", ...],
  "portrait34Prompts": ["prompt1", ...],
  "videoPrompts": ["prompt1", ...],
  "squarePrompts": ["prompt1", ...],
  "landscapePrompts": ["prompt1", ...]
}`;

  if (userInstruction) {
    prompt += `\n\nIMPORTANT USER INSTRUCTION: ${userInstruction}\nEnsure all prompts align with this instruction.`;
  }

  try {
    const result = await executeTool("GEMINI_GENERATE_CONTENT", {
      prompt,
      model: "gemini-2.5-flash",
    });

    const content =
      (result as { text?: string; content?: string })?.text ||
      (result as { text?: string; content?: string })?.content ||
      JSON.stringify(result);
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    // Fallback
    return {
      socialPrompts: Array(portrait).fill("Vibrant lifestyle shot"),
      portrait34Prompts: Array(portrait34).fill("Elegant portrait composition"),
      videoPrompts: Array(video).fill("Cinematic wide shot"),
      squarePrompts: Array(square).fill("Minimalist product focus"),
      landscapePrompts: Array(landscape).fill("Wide cinematic product shot"),
    };
  } catch (error) {
    console.error("Specs generation error:", error);
    return {
      socialPrompts: Array(portrait).fill("Vibrant lifestyle shot"),
      portrait34Prompts: Array(portrait34).fill("Elegant portrait composition"),
      videoPrompts: Array(video).fill("Cinematic wide shot"),
      squarePrompts: Array(square).fill("Minimalist product focus"),
      landscapePrompts: Array(landscape).fill("Wide cinematic product shot"),
    };
  }
}

// ============================================================================
// Ad Copy Generation Action
// ============================================================================

export async function generateAdCopyAction(
  context: BrandAnalysis,
  userInstruction?: string
): Promise<AdCopy> {
  let prompt = `Based on brand context: ${JSON.stringify(context)}, generate comprehensive advertising copy.

Create:
- headline: Main advertising headline (max 10 words, attention-grabbing)
- tagline: Brand tagline/slogan (memorable and brand-aligned)
- description: Compelling product/service description (2-3 sentences)
- cta: Call-to-action text (e.g., 'Shop Now', 'Learn More')
- hashtags: 5-8 relevant hashtags for social media
- instagramCaption: Engaging, emoji-friendly caption with hashtags
- facebookCaption: Professional, informative caption
- twitterCaption: Concise, punchy, within character limit
- linkedinCaption: Professional, B2B focused

CRITICAL:
- Align with brand mood: ${context.mood}
- Subject focus: ${context.subject}
- Brand name: ${context.brandName || "Brand"}

Respond ONLY with valid JSON matching this structure.`;

  if (userInstruction) {
    prompt += `\n\nIMPORTANT USER INSTRUCTION: ${userInstruction}`;
  }

  try {
    const result = await executeTool("GEMINI_GENERATE_CONTENT", {
      prompt,
      model: "gemini-2.5-flash",
    });

    const content =
      (result as { text?: string; content?: string })?.text ||
      (result as { text?: string; content?: string })?.content ||
      JSON.stringify(result);
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    // Fallback
    return {
      headline: `Discover ${context.brandName || "Excellence"}`,
      tagline: `${context.mood || "Premium"} Quality`,
      description: `Experience exceptional quality. Crafted with care.`,
      cta: "Learn More",
      hashtags: ["#premium", "#quality", "#lifestyle"],
    };
  } catch (error) {
    console.error("Ad copy generation error:", error);
    return {
      headline: `Discover Excellence`,
      description: `Experience exceptional quality.`,
      cta: "Learn More",
      hashtags: ["#premium", "#quality"],
    };
  }
}

// ============================================================================
// Image Generation Action (Nano Banana via GEMINI_GENERATE_IMAGE)
// ============================================================================

export async function generateAssetAction(
  prompt: string,
  aspectRatio: "9:16" | "3:4" | "1:1" | "16:9"
): Promise<{ url: string }> {
  const fullPrompt =
    "High-end product photography, ad shoot, creative lighting, " + prompt;

  try {
    const result = await executeTool("GEMINI_GENERATE_IMAGE", {
      prompt: fullPrompt,
      aspect_ratio: aspectRatio,
      model: "gemini-3-pro-image-preview",
      image_size: "1K",
    });

    const typedResult = result as {
      url?: string;
      image_url?: string;
      image?: { s3url?: string };
      data?: { url?: string; image?: { s3url?: string } };
    };
    const imageUrl =
      typedResult?.url ||
      typedResult?.image_url ||
      typedResult?.data?.url ||
      typedResult?.image?.s3url ||
      typedResult?.data?.image?.s3url;

    if (imageUrl) {
      return { url: imageUrl };
    }

    throw new Error(`No image URL returned from Gemini. Result: ${JSON.stringify(result)}`);
  } catch (error) {
    console.error("Image generation error:", error);
    throw error;
  }
}

// ============================================================================
// Video Generation Action (Veo via GEMINI_GENERATE_VIDEOS)
// ============================================================================

export async function generateVideoAction(
  prompt: string,
  aspectRatio: "16:9" | "9:16" = "16:9"
): Promise<{ operationName: string }> {
  const videoPrompt = "Cinematic, high-end product video, " + prompt;

  try {
    const result = await executeTool("GEMINI_GENERATE_VIDEOS", {
      prompt: videoPrompt,
      model: "veo-3.0-generate-001",
      aspect_ratio: aspectRatio,
      duration_seconds: 6,
    });

    const typedResult = result as {
      operation_name?: string;
      operationName?: string;
      name?: string;
    };
    const operationName =
      typedResult?.operation_name ||
      typedResult?.operationName ||
      typedResult?.name;

    if (operationName) {
      return { operationName };
    }

    throw new Error("No operation name returned from Veo");
  } catch (error) {
    console.error("Video generation error:", error);
    throw error;
  }
}

// ============================================================================
// Video Status Check Action
// ============================================================================

export async function checkVideoStatusAction(operationName: string): Promise<{
  status: "pending" | "processing" | "completed" | "failed";
  url?: string;
}> {
  try {
    const result = await executeTool("GEMINI_GET_VIDEOS_OPERATION", {
      operation_name: operationName,
    });

    const typedResult = result as {
      done?: boolean;
      status?: string;
      video_url?: string;
      url?: string;
      response?: { generatedSamples?: Array<{ video?: { uri?: string } }> };
    };
    const done = typedResult?.done || typedResult?.status === "completed";

    if (done) {
      const videoUrl =
        typedResult?.video_url ||
        typedResult?.url ||
        typedResult?.response?.generatedSamples?.[0]?.video?.uri;
      return { status: "completed", url: videoUrl };
    }

    return { status: "processing" };
  } catch (error) {
    console.error("Video status check error:", error);
    return { status: "failed" };
  }
}

// ============================================================================
// Wait for Video Action (Blocking)
// ============================================================================

export async function waitForVideoAction(
  operationName: string
): Promise<{ url: string }> {
  try {
    const result = await executeTool("GEMINI_WAIT_FOR_VIDEO", {
      operation_name: operationName,
    });

    const typedResult = result as {
      url?: string;
      video_url?: string;
      data?: { url?: string };
    };
    const videoUrl =
      typedResult?.url || typedResult?.video_url || typedResult?.data?.url;

    if (videoUrl) {
      return { url: videoUrl };
    }

    throw new Error("No video URL returned");
  } catch (error) {
    console.error("Wait for video error:", error);
    throw error;
  }
}
