# Architecture Overview: AI Resume Analyzer

This project is an AI-powered resume analysis and enhancement tool built with a "backend-less" architecture using Puter.js.

## Tech Stack

| Component | Technology |
| :--- | :--- |
| **Frontend Framework** | React 19 + React Router v7 (Vite) |
| **Backend / Infrastructure** | Puter.js (Serverless Browser SDK) |
| **Styling** | Tailwind CSS 4 |
| **State Management** | Zustand |
| **PDF Processing** | PDF.js (`pdfjs-dist`) |
| **AI Models** | Claude 3.7 Sonnet (via Puter AI) |

## Core Architecture

### 1. Browser-Based Backend (Puter.js)
The project leverages **Puter.js**, which eliminates the need for a traditional server. All backend-side logic (Auth, Database, AI, Storage) is handled directly in the browser via the Puter client-side SDK.

- **Authentication**: `puter.auth` handles user sign-in/sign-out and session management.
- **Storage (FS)**: `puter.fs` is used to store uploaded PDF resumes and generated preview images.
- **Database (KV)**: `puter.kv` stores metadata for each resume, including the AI-generated feedback and ATS scores.
- **AI Integration**: `puter.ai` provides access to LLMs (like Claude 3.7 Sonnet) for analyzing resume text and providing enhancement suggestions.

### 2. State Management (Zustand)
A central store (`app/lib/puter.ts`) wraps Puter.js functionality. This provides:
- React hooks (`usePuterStore`) for accessing Puter services.
- Loading and error states.
- Abstracted methods for FS, KV, and AI operations.

### 3. PDF Processing Workflow
When a user uploads a resume:
1. **Extraction**: `pdfText.ts` extracts the raw text from the PDF.
2. **Preview**: `pdf2img.ts` renders the first page of the PDF to a PNG/JPEG for visual display.
3. **Storage**: Both the PDF and the image are saved to Puter's filesystem.
4. **Analysis**: The extracted text is sent to Puter AI with a specific prompt to generate feedback (ATS score, summary, strengths, weaknesses).
5. **Persistence**: The feedback and file paths are saved in Puter's KV store.

## Project Structure

- `app/`:
    - `routes/`: Page-level components defining the application's views.
    - `components/`: Reusable UI elements (Summary, ATS score, Details, etc.).
    - `lib/`: Core logic and Puter.js integration.
    - `root.tsx`: The main application shell and layout.
- `constants/`: Global constants and prompt templates.
- `types/`: TypeScript interfaces for the domain model.

## User Review Required

> [!NOTE]
> This project is designed as a standalone browser application. It relies entirely on Puter.com for infrastructure. Users must sign in to Puter to save their resumes and access AI features.
