"use client";

import React, { useState, useCallback } from "react";
import {
  analyzeBrandAction,
  generateSpecsAction,
  generateAdCopyAction,
  generateAssetAction,
  generateVideoAction,
  waitForVideoAction,
  type BrandAnalysis,
  type AdCopy,
} from "./actions";

// Asset type
type Asset = {
  id: string;
  type: "image" | "video";
  aspectRatio: "9:16" | "3:4" | "1:1" | "16:9";
  status: "generating" | "completed" | "failed";
  description: string;
  url: string;
};

// Convert File to Base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Spinner Component
function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export default function AdsGenPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<
    "idle" | "analyzing" | "generating" | "completed"
  >("idle");
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [userInstruction, setUserInstruction] = useState("");

  // Aspect ratio counts
  const [portraitCount, setPortraitCount] = useState(1); // 9:16
  const [portrait34Count, setPortrait34Count] = useState(1); // 3:4
  const [squareCount, setSquareCount] = useState(1); // 1:1
  const [landscapeCount, setLandscapeCount] = useState(1); // 16:9
  const [videoCount, setVideoCount] = useState(1); // 16:9 videos

  const [brandContext, setBrandContext] = useState<BrandAnalysis | null>(null);
  const [generatedAssets, setGeneratedAssets] = useState<Asset[]>([]);
  const [adCopy, setAdCopy] = useState<AdCopy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Generate single image asset
  const generateImageAsset = useCallback(
    async (id: string, prompt: string, aspectRatio: Asset["aspectRatio"]) => {
      try {
        const result = await generateAssetAction(prompt, aspectRatio);
        setGeneratedAssets((prev) =>
          prev.map((asset) =>
            asset.id === id
              ? { ...asset, status: "completed" as const, url: result.url }
              : asset
          )
        );
      } catch {
        setGeneratedAssets((prev) =>
          prev.map((asset) =>
            asset.id === id ? { ...asset, status: "failed" as const } : asset
          )
        );
      }
    },
    []
  );

  // Generate video asset
  const generateVideoAsset = useCallback(
    async (id: string, prompt: string) => {
      try {
        const { operationName } = await generateVideoAction(prompt, "16:9");
        // Wait for video to complete
        const result = await waitForVideoAction(operationName);
        setGeneratedAssets((prev) =>
          prev.map((asset) =>
            asset.id === id
              ? { ...asset, status: "completed" as const, url: result.url }
              : asset
          )
        );
      } catch {
        setGeneratedAssets((prev) =>
          prev.map((asset) =>
            asset.id === id ? { ...asset, status: "failed" as const } : asset
          )
        );
      }
    },
    []
  );

  const handleGenerate = async () => {
    if (uploadedImages.length === 0) {
      setError("Please upload at least one image");
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setProgressMessage("Starting...");
    setError(null);
    setCurrentPhase("analyzing");
    setBrandContext(null);
    setGeneratedAssets([]);
    setAdCopy(null);

    try {
      // Phase 1: Analyze brand
      setProgressMessage("Analyzing brand identity...");
      setProgress(10);
      const primaryImageBase64 = await fileToBase64(uploadedImages[0]);
      const analysisResult = await analyzeBrandAction(primaryImageBase64);

      if (!analysisResult) throw new Error("Failed to analyze image");
      setBrandContext(analysisResult);
      setProgress(25);

      // Phase 2: Create specs
      setProgressMessage("Formulating cross-platform strategy...");
      setProgress(35);
      const counts = {
        portrait: portraitCount,
        portrait34: portrait34Count,
        square: squareCount,
        landscape: landscapeCount,
        video: videoCount,
      };
      const specs = await generateSpecsAction(
        analysisResult,
        userInstruction,
        counts
      );

      // Phase 3: Generate assets
      setCurrentPhase("generating");
      setProgressMessage("Generating assets...");
      setProgress(50);

      const pendingTasks: Array<() => Promise<void>> = [];
      const assets: Asset[] = [];

      // Social (9:16)
      if (portraitCount > 0) {
        specs.socialPrompts
          .slice(0, portraitCount)
          .forEach((prompt: string, i: number) => {
            const id = `image-9:16-${Date.now()}-${i}`;
            assets.push({
              id,
              type: "image",
              aspectRatio: "9:16",
              status: "generating",
              description: prompt,
              url: "",
            });
            pendingTasks.push(() => generateImageAsset(id, prompt, "9:16"));
          });
      }

      // Portrait (3:4)
      if (portrait34Count > 0) {
        const portrait34Prompts =
          specs.portrait34Prompts ||
          Array(portrait34Count).fill("Elegant portrait product shot");
        portrait34Prompts
          .slice(0, portrait34Count)
          .forEach((prompt: string, i: number) => {
            const id = `image-3:4-${Date.now()}-${i}`;
            assets.push({
              id,
              type: "image",
              aspectRatio: "3:4",
              status: "generating",
              description: prompt,
              url: "",
            });
            pendingTasks.push(() => generateImageAsset(id, prompt, "3:4"));
          });
      }

      // Square (1:1)
      if (squareCount > 0) {
        specs.squarePrompts
          .slice(0, squareCount)
          .forEach((prompt: string, i: number) => {
            const id = `image-1:1-${Date.now()}-${i}`;
            assets.push({
              id,
              type: "image",
              aspectRatio: "1:1",
              status: "generating",
              description: prompt,
              url: "",
            });
            pendingTasks.push(() => generateImageAsset(id, prompt, "1:1"));
          });
      }

      // Landscape (16:9)
      if (landscapeCount > 0) {
        const landscapePrompts =
          specs.landscapePrompts ||
          Array(landscapeCount).fill("Cinematic product shot");
        landscapePrompts
          .slice(0, landscapeCount)
          .forEach((prompt: string, i: number) => {
            const id = `image-16:9-${Date.now()}-${i}`;
            assets.push({
              id,
              type: "image",
              aspectRatio: "16:9",
              status: "generating",
              description: prompt,
              url: "",
            });
            pendingTasks.push(() => generateImageAsset(id, prompt, "16:9"));
          });
      }

      // Video (16:9)
      if (videoCount > 0) {
        const videoPrompts =
          specs.videoPrompts || Array(videoCount).fill("Cinematic wide shot");
        videoPrompts.slice(0, videoCount).forEach((prompt: string, i: number) => {
          const id = `video-16:9-${Date.now()}-${i}`;
          assets.push({
            id,
            type: "video",
            aspectRatio: "16:9",
            status: "generating",
            description: `[Veo] ${prompt}`,
            url: "",
          });
          pendingTasks.push(() => generateVideoAsset(id, prompt));
        });
      }

      setGeneratedAssets(assets);
      setProgress(60);

      // Execute all tasks in parallel
      await Promise.all(pendingTasks.map((task) => task()));

      // Phase 4: Generate ad copy
      setProgressMessage("Generating ad copy...");
      try {
        const adCopyResult = await generateAdCopyAction(
          analysisResult,
          userInstruction || undefined
        );
        setAdCopy(adCopyResult);
      } catch (err) {
        console.error("Ad copy generation error:", err);
      }

      setCurrentPhase("completed");
      setProgress(100);
      setProgressMessage("All assets generated successfully!");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to generate assets";
      setError(message);
      console.error("Generation error:", err);
      setCurrentPhase("idle");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setCurrentPhase("idle");
    setProgress(0);
    setUploadedImages([]);
    setPreviewUrls([]);
    setUserInstruction("");
    setBrandContext(null);
    setGeneratedAssets([]);
    setAdCopy(null);
    setError(null);
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    const imageFiles = Array.from(files).filter((file) =>
      file.type.startsWith("image/")
    );
    if (imageFiles.length === 0) {
      setError("Please select image files");
      return;
    }
    setUploadedImages((prev) => [...prev, ...imageFiles]);
    const newUrls = imageFiles.map((file) => URL.createObjectURL(file));
    setPreviewUrls((prev) => [...prev, ...newUrls]);
    setError(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const removeImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
    if (previewUrls[index]) {
      URL.revokeObjectURL(previewUrls[index]);
    }
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const getAspectRatioBadgeColor = (ratio: string) => {
    const colors: Record<string, string> = {
      "9:16": "bg-purple-500/20 text-purple-300 border-purple-500/30",
      "3:4": "bg-orange-500/20 text-orange-300 border-orange-500/30",
      "1:1": "bg-blue-500/20 text-blue-300 border-blue-500/30",
      "16:9": "bg-green-500/20 text-green-300 border-green-500/30",
    };
    return colors[ratio] || "bg-gray-500/20 text-gray-300 border-gray-500/30";
  };

  const totalAssets =
    portraitCount + portrait34Count + squareCount + landscapeCount + videoCount;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-gray-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <span className="text-xl">✨</span>
              </div>
              <div>
                <h1 className="text-xl font-bold">Ads Generator</h1>
                <p className="text-xs text-gray-400">
                  Powered by Composio + Gemini
                </p>
              </div>
            </div>
            {currentPhase !== "idle" && (
              <button
                onClick={handleReset}
                className="px-4 py-2 text-sm bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                Start Over
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300">
            {error}
          </div>
        )}

        {/* Upload & Settings */}
        {currentPhase === "idle" && (
          <div className="grid md:grid-cols-2 gap-8">
            {/* Left: Settings */}
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Generation Settings</h2>
                <p className="text-gray-400">
                  Configure how many assets to generate per aspect ratio
                </p>
              </div>

              {/* Aspect Ratio Controls */}
              <div className="space-y-3">
                {[
                  { label: "Portrait 9:16", value: portraitCount, setter: setPortraitCount, color: "purple" },
                  { label: "Portrait 3:4", value: portrait34Count, setter: setPortrait34Count, color: "orange" },
                  { label: "Square 1:1", value: squareCount, setter: setSquareCount, color: "blue" },
                  { label: "Landscape 16:9", value: landscapeCount, setter: setLandscapeCount, color: "green" },
                  { label: "Video 16:9", value: videoCount, setter: setVideoCount, color: "pink" },
                ].map(({ label, value, setter, color }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10"
                  >
                    <span className="font-medium">{label}</span>
                    <div className="flex gap-1">
                      {[0, 1, 2, 3].map((num) => (
                        <button
                          key={num}
                          onClick={() => setter(num)}
                          className={`w-8 h-8 text-sm font-medium rounded transition-all ${
                            value === num
                              ? `bg-${color}-500/30 text-${color}-300 border border-${color}-500/50`
                              : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-sm text-gray-400">
                Total: {totalAssets} assets ({portraitCount + portrait34Count + squareCount + landscapeCount} images, {videoCount} videos)
              </p>

              {/* Custom Instruction */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Custom Instruction (Optional)
                </label>
                <input
                  type="text"
                  value={userInstruction}
                  onChange={(e) => setUserInstruction(e.target.value)}
                  placeholder="e.g., Create vibrant, energetic assets"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500/50"
                />
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={isProcessing || uploadedImages.length === 0 || totalAssets === 0}
                className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold text-lg transition-all"
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner className="w-5 h-5" />
                    Processing...
                  </span>
                ) : (
                  "✨ Generate Assets"
                )}
              </button>
            </div>

            {/* Right: Upload */}
            <div>
              <h2 className="text-2xl font-bold mb-4">Upload Images</h2>
              <div
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all min-h-[300px] flex flex-col items-center justify-center ${
                  isDragging
                    ? "border-purple-500 bg-purple-500/10"
                    : "border-white/20 hover:border-white/30 bg-white/5"
                }`}
              >
                {previewUrls.length > 0 ? (
                  <div className="grid grid-cols-3 gap-3 w-full">
                    {previewUrls.map((url, i) => (
                      <div key={i} className="relative group">
                        <img
                          src={url}
                          alt={`Upload ${i + 1}`}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        <button
                          onClick={() => removeImage(i)}
                          className="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <label className="w-full h-24 border-2 border-dashed border-white/20 rounded-lg flex items-center justify-center cursor-pointer hover:border-white/40">
                      <span className="text-2xl text-gray-500">+</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => handleFileSelect(e.target.files)}
                        className="hidden"
                      />
                    </label>
                  </div>
                ) : (
                  <>
                    <div className="text-5xl mb-4">📷</div>
                    <p className="text-gray-400 mb-2">
                      Drag & drop images or click to browse
                    </p>
                    <label className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg cursor-pointer transition-colors">
                      Browse Files
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => handleFileSelect(e.target.files)}
                        className="hidden"
                      />
                    </label>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Processing State */}
        {(currentPhase === "analyzing" || currentPhase === "generating") &&
          isProcessing && (
            <div className="flex flex-col items-center justify-center py-20">
              <Spinner className="w-16 h-16 text-purple-500 mb-6" />
              <h2 className="text-2xl font-bold mb-2">{progressMessage}</h2>
              <div className="w-64 h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-gray-400 mt-2">{progress}% complete</p>
            </div>
          )}

        {/* Results */}
        {currentPhase === "completed" && (
          <div className="space-y-8">
            {/* Brand Context */}
            {brandContext && (
              <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                <h3 className="text-lg font-semibold mb-4">Brand Analysis</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-400">Mood</p>
                    <p className="font-medium">{brandContext.mood}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Subject</p>
                    <p className="font-medium">{brandContext.subject}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Colors</p>
                    <div className="flex gap-2 mt-1">
                      {brandContext.colors?.map((color, i) => (
                        <div
                          key={i}
                          className="w-6 h-6 rounded border border-white/20"
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Generated Assets */}
            <div>
              <h3 className="text-xl font-bold mb-4">Generated Assets</h3>
              <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
                {generatedAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="bg-white/5 rounded-xl border border-white/10 overflow-hidden"
                  >
                    <div className="aspect-square bg-gray-800 flex items-center justify-center">
                      {asset.status === "generating" ? (
                        <Spinner className="w-8 h-8 text-gray-500" />
                      ) : asset.status === "failed" ? (
                        <span className="text-red-400">Failed</span>
                      ) : asset.type === "video" ? (
                        <video
                          src={asset.url}
                          controls
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <img
                          src={asset.url}
                          alt={asset.description}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`px-2 py-0.5 text-xs rounded border ${getAspectRatioBadgeColor(asset.aspectRatio)}`}
                        >
                          {asset.aspectRatio}
                        </span>
                        {asset.type === "video" && (
                          <span className="px-2 py-0.5 text-xs bg-pink-500/20 text-pink-300 rounded border border-pink-500/30">
                            Video
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 line-clamp-2">
                        {asset.description}
                      </p>
                      {asset.status === "completed" && asset.url && (
                        <a
                          href={asset.url}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-block text-xs text-purple-400 hover:text-purple-300"
                        >
                          Download ↓
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ad Copy */}
            {adCopy && (
              <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                <h3 className="text-xl font-bold mb-4">Ad Copy</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  {adCopy.headline && (
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Headline</p>
                      <p className="text-lg font-semibold">{adCopy.headline}</p>
                    </div>
                  )}
                  {adCopy.tagline && (
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Tagline</p>
                      <p className="font-medium">{adCopy.tagline}</p>
                    </div>
                  )}
                  {adCopy.description && (
                    <div className="md:col-span-2">
                      <p className="text-sm text-gray-400 mb-1">Description</p>
                      <p>{adCopy.description}</p>
                    </div>
                  )}
                  {adCopy.cta && (
                    <div>
                      <p className="text-sm text-gray-400 mb-1">CTA</p>
                      <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded">
                        {adCopy.cta}
                      </span>
                    </div>
                  )}
                  {adCopy.hashtags && adCopy.hashtags.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Hashtags</p>
                      <p className="text-blue-400">
                        {adCopy.hashtags.join(" ")}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
