# Ads Generator - Composio + Gemini

An AI-powered ad assets generator built with Next.js, Composio ToolRouter, and Google Gemini.

## Features

- 🖼️ **Image Generation**: Generate high-end product photography using Gemini Nano Banana
- 🎬 **Video Generation**: Create cinematic product videos using Gemini Veo
- 📝 **Ad Copy Generation**: Auto-generate headlines, descriptions, CTAs, and social captions
- 🎨 **Brand Analysis**: AI extracts brand identity (colors, mood, subject) from uploaded images
- 📐 **Multiple Aspect Ratios**: Support for 9:16, 3:4, 1:1, and 16:9

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **AI**: Composio ToolRouter + Gemini
- **Styling**: Tailwind CSS
- **Language**: TypeScript

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env.local
   ```
   Then add your `COMPOSIO_API_KEY` from [Composio Platform](https://platform.composio.dev/settings).

3. **Connect Gemini Toolkit** (Required):
   - Go to [Composio Platform](https://platform.composio.dev)
   - Navigate to Auth Configs → Gemini
   - Connect your Google AI account

4. **Run the development server**:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

## How It Works

1. **Upload**: Drag & drop brand images
2. **Configure**: Select how many assets per aspect ratio
3. **Generate**: AI analyzes brand → creates prompts → generates assets
4. **Download**: Get your images, videos, and ad copy

## Composio Tools Used

| Tool | Purpose |
|------|---------|
| `GEMINI_GENERATE_CONTENT` | Brand analysis, prompt generation, ad copy |
| `GEMINI_GENERATE_IMAGE` | Image generation (Nano Banana) |
| `GEMINI_GENERATE_VIDEOS` | Video generation (Veo) |
| `GEMINI_WAIT_FOR_VIDEO` | Wait for video completion |

## Project Structure

```
ads-gen/
├── src/
│   ├── app/
│   │   ├── page.tsx        # Main UI
│   │   └── actions.ts      # Server Actions (Composio calls)
│   └── lib/
│       └── composio.ts     # Composio client setup
├── .env.example            # Environment template
└── package.json
```

## License

MIT
