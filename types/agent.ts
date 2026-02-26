// Agent types for the AI Resume Tailoring System

export interface JobInfo {
    companyName: string;
    jobTitle: string;
    jobDescription: string;
}

export interface TailoredSection {
    name: string;
    original: string;
    tailored: string;
    keywords: string[];
}

export interface TailoringResult {
    sections: TailoredSection[];
    jobFitScore: JobFitScore;
    summary: string;
}

export interface JobFitScore {
    overall: number;
    keywordMatch: number;
    skillsMatch: number;
    experienceMatch: number;
    gaps: string[];
    suggestions: string[];
}

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: number;
}

export interface ChatEnhanceResult {
    message: string;
    appliedChanges?: {
        section: string;
        before: string;
        after: string;
    }[];
}

export interface StreamingCallbacks {
    onToken?: (token: string) => void;
    onProgress?: (phase: string, progress: number) => void;
    onComplete?: (result: unknown) => void;
    onError?: (error: Error) => void;
}

export interface AgentModel {
    id: string;
    name: string;
    provider: string;
}

export const AVAILABLE_MODELS: AgentModel[] = [
    { id: 'claude-3-7-sonnet', name: 'Claude 3.7 Sonnet', provider: 'Anthropic' },
    { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI' },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'Google' },
    { id: 'mistral-large-latest', name: 'Mistral Large', provider: 'Mistral' },
];

export const DEFAULT_MODEL = 'gpt-4o-mini';
