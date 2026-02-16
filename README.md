# 🎯 AI Resume Analyzer

<div align="center">
  
[![React](https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![React Router](https://img.shields.io/badge/React_Router_7-CA4245?style=for-the-badge&logo=react-router&logoColor=white)](https://reactrouter.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Puter.js](https://img.shields.io/badge/Puter.js-181758?style=for-the-badge&logoColor=white)](https://puter.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

**A modern, AI-powered resume analysis and optimization platform built with cutting-edge web technologies.**

[Features](#-features) • [Tech Stack](#-tech-stack) • [Getting Started](#-getting-started) • [License](#-license)

</div>

---

## 📖 Overview

AI Resume Analyzer is a sophisticated web application that leverages artificial intelligence to help job seekers optimize their resumes for specific job opportunities. The platform provides intelligent resume analysis, ATS (Applicant Tracking System) scoring, and AI-powered resume tailoring capabilities—all without requiring a traditional backend infrastructure.

### What Makes This Project Stand Out

- **Serverless Architecture**: Built entirely on client-side technologies with Puter.js providing backend services (authentication, storage, AI) directly in the browser
- **Advanced AI Integration**: Utilizes multiple AI models (GPT, Claude) for resume analysis, job matching, and intelligent content optimization
- **Modern React Patterns**: Implements React 19 features with React Router 7's data loading patterns and type-safe routing
- **Premium UX/UI**: Carefully crafted user interface with smooth animations, responsive design, and attention to detail
- **Document Processing**: Advanced PDF parsing and generation capabilities with support for DOCX export
- **Real-time Collaboration**: Interactive chat-based resume refinement powered by AI

---

## ✨ Features

### 🔐 Authentication & User Management
- **Browser-based Authentication**: Seamless sign-up and login using Puter.js—no backend required
- **Secure Session Management**: Persistent authentication with automatic session handling
- **User Data Privacy**: All user data stored securely in Puter's cloud infrastructure

### 📄 Resume Management
- **Multi-Resume Support**: Upload and manage multiple resumes in one centralized dashboard
- **Smart Resume Upload**: Drag-and-drop interface with instant PDF processing
- **Resume History**: Track all your resume versions and analyses in one place
- **Cross-Device Access**: Access your resumes from anywhere with cloud synchronization

### 🤖 AI-Powered Analysis
- **Comprehensive Resume Feedback**: Get detailed AI analysis on resume content, structure, and effectiveness
- **ATS Score Calculation**: Understand how well your resume performs against Applicant Tracking Systems
- **Keyword Optimization**: Receive suggestions for improving keyword density and relevance
- **Section-by-Section Analysis**: Detailed feedback on each resume section (summary, experience, skills, etc.)

### 🎯 Job-Specific Tailoring
- **Smart Resume Tailoring**: Automatically optimize your resume for specific job descriptions
- **AI Job Matching**: Get a job fit score showing how well your resume matches the position
- **Interactive Refinement**: Chat with AI to iteratively improve your tailored resume
- **Side-by-Side Comparison**: View original vs. tailored resume with highlighted changes
- **Multi-Format Export**: Download tailored resumes as PDF or DOCX

### 🎨 User Experience
- **Modern, Responsive Design**: Beautiful interface that works seamlessly on desktop, tablet, and mobile
- **Smooth Animations**: Polished micro-interactions and transitions throughout the app
- **Real-time Feedback**: Instant visual feedback during AI processing
- **Intuitive Navigation**: Clean, user-friendly interface with logical information architecture

---

## 🛠 Tech Stack

### Frontend Framework
- **[React 19](https://react.dev/)** - Latest version of React with improved performance and new features
- **[React Router 7](https://reactrouter.com/)** - Type-safe routing with data loaders, actions, and nested routes
- **[TypeScript 5.8](https://www.typescriptlang.org/)** - Full type safety across the entire application

### Styling & UI
- **[Tailwind CSS 4](https://tailwindcss.com/)** - Utility-first CSS framework for rapid UI development
- **[tw-animate-css](https://www.npmjs.com/package/tw-animate-css)** - Animation utilities for Tailwind
- **Custom CSS Utilities** - Hand-crafted gradients, transitions, and design tokens

### Backend & AI Services
- **[Puter.js](https://puter.com/)** - Serverless platform providing:
  - User authentication and session management
  - Cloud storage (KV store) for resume data
  - AI model access (GPT-4, Claude, etc.)
  - File storage and management

### State Management
- **[Zustand](https://github.com/pmndrs/zustand)** - Lightweight, hook-based state management with zero boilerplate

### Document Processing
- **[pdfjs-dist](https://mozilla.github.io/pdf.js/)** - PDF parsing and text extraction
- **[jsPDF](https://github.com/parallax/jsPDF)** - Client-side PDF generation
- **[docx](https://docx.js.org/)** - DOCX document creation and export
- **[file-saver](https://github.com/eligrey/FileSaver.js/)** - Cross-browser file download support

### File Upload
- **[react-dropzone](https://react-dropzone.js.org/)** - Drag-and-drop file upload with validation

### Build Tools
- **[Vite 6](https://vite.dev/)** - Lightning-fast build tool and dev server
- **[vite-tsconfig-paths](https://github.com/aleclarson/vite-tsconfig-paths)** - TypeScript path mapping support

### Utilities
- **[clsx](https://github.com/lukeed/clsx)** - Conditional className construction
- **[tailwind-merge](https://github.com/dcastil/tailwind-merge)** - Intelligent Tailwind class merging
- **[isbot](https://github.com/omrilotan/isbot)** - Bot detection for analytics

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed:
- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Git**

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Whizbassey/AI-RESUME-AGENT.git
   cd AI-RESUME-AGENT
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   
   Navigate to [http://localhost:5173](http://localhost:5173)

### Available Scripts

- `npm run dev` - Start development server with hot module replacement
- `npm run build` - Build production-ready application
- `npm run start` - Serve production build locally
- `npm run typecheck` - Run TypeScript type checking

---

## 📁 Project Structure

```
ai-resume-analyzer/
├── app/
│   ├── components/          # Reusable React components
│   │   ├── ATS.tsx         # ATS score display
│   │   ├── ChatEnhancer.tsx # AI chat interface
│   │   ├── Details.tsx     # Resume details view
│   │   ├── FileUploader.tsx # File upload component
│   │   ├── Navbar.tsx      # Navigation bar
│   │   ├── ResumeCard.tsx  # Resume preview card
│   │   └── Summary.tsx     # Resume summary
│   ├── lib/                # Utility functions and services
│   │   ├── ai-agent.ts     # AI integration logic
│   │   ├── pdf2img.ts      # PDF to image conversion
│   │   ├── pdfText.ts      # PDF text extraction
│   │   ├── puter.ts        # Puter.js integration
│   │   └── utils.ts        # Helper functions
│   ├── routes/             # Application routes
│   │   ├── auth.tsx        # Authentication page
│   │   ├── home.tsx        # Dashboard
│   │   ├── resume.tsx      # Resume analysis view
│   │   ├── tailor.tsx      # Resume tailoring page
│   │   └── upload.tsx      # Resume upload page
│   ├── app.css             # Global styles and utilities
│   └── routes.ts           # Route configuration
├── public/                 # Static assets
├── types/                  # TypeScript type definitions
└── package.json           # Project dependencies
```

---

## 🎯 Key Features Implementation

### AI-Powered Resume Analysis
The application uses Puter.js to access multiple AI models for comprehensive resume analysis. The AI agent evaluates:
- Resume structure and formatting
- Content quality and relevance
- ATS compatibility
- Keyword optimization
- Section-specific improvements

### Intelligent Resume Tailoring
The tailoring feature analyzes job descriptions and automatically optimizes resumes by:
- Matching relevant skills and experience
- Adjusting keyword density
- Reordering sections for maximum impact
- Highlighting transferable skills
- Providing job fit scoring

### Document Processing Pipeline
Advanced document handling includes:
- PDF text extraction using Mozilla's PDF.js
- Client-side PDF generation with jsPDF
- DOCX export with proper formatting
- Image preview generation for visual comparison

---

## 🤝 Contributing

This is an **open-source project** and contributions are welcome! Whether you're fixing bugs, improving documentation, or proposing new features, your input is valued.

### How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is **open source** and available under the [MIT License](LICENSE). Feel free to use, modify, and distribute this software for personal or commercial purposes.

### What This Means

✅ **Commercial use** - Use this project in commercial applications  
✅ **Modification** - Modify the source code to suit your needs  
✅ **Distribution** - Distribute the original or modified code  
✅ **Private use** - Use the software privately  

---

## 🙏 Acknowledgments

- **Puter.js** for providing an innovative serverless platform
- **React Router** team for the excellent v7 framework
- **Tailwind CSS** for the utility-first CSS approach
- The open-source community for inspiration and tools

---

## 📧 Contact

**Developer**: Afone Agbo  
**GitHub**: [@Whizbassey](https://github.com/Whizbassey)  
**Project Repository**: [AI-RESUME-AGENT](https://github.com/Whizbassey/AI-RESUME-AGENT)

---

<div align="center">

**If you find this project helpful, please consider giving it a ⭐️**

Made with ❤️ using React, TypeScript, and Puter.js

</div>
