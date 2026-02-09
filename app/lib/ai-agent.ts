/**
 * AI Agent Module for Resume Tailoring
 * 
 * This module provides intelligent resume tailoring, job fit measurement,
 * and interactive chat enhancement using Puter.js AI with streaming support.
 */

import type {
    JobInfo,
    TailoringResult,
    JobFitScore,
    ChatMessage,
    StreamingCallbacks,
    TailoredSection
} from '~/types/agent';
import { DEFAULT_MODEL } from '~/types/agent';

// Get Puter instance
const getPuter = (): typeof window.puter | null =>
    typeof window !== "undefined" && window.puter ? window.puter : null;

/**
 * Agent prompts for different tasks
 */
const PROMPTS = {
    analyzeJob: (jobInfo: JobInfo) => `You are a job requirements analyst. Analyze the following job posting and extract:
1. Key technical skills required
2. Soft skills required
3. Experience level needed
4. Important keywords for ATS
5. Company culture indicators

Company: ${jobInfo.companyName}
Job Title: ${jobInfo.jobTitle}
Job Description:
${jobInfo.jobDescription}

Return a JSON object with these fields:
{
    "technicalSkills": string[],
    "softSkills": string[],
    "experienceLevel": string,
    "keywords": string[],
    "cultureFit": string[]
}

Return ONLY the JSON, no other text.`,

    tailorSection: (section: string, content: string, requirements: string) => `You are an expert resume writer. Tailor the following resume section to better match the job requirements.

Section: ${section}
Original Content:
${content}

Job Requirements:
${requirements}

Rules:
1. DO NOT invent or fabricate information
2. Reword to incorporate relevant keywords naturally
3. Highlight relevant experience that matches requirements
4. Use strong action verbs
5. Keep it concise and professional

Return ONLY the tailored content, no explanations.`,

    measureFit: (resumeContent: string, jobInfo: JobInfo) => `You are an ATS and job fit expert. Analyze how well this resume matches the job posting.

Resume:
${resumeContent}

Job:
Company: ${jobInfo.companyName}
Title: ${jobInfo.jobTitle}
Description: ${jobInfo.jobDescription}

Provide a detailed analysis in this JSON format:
{
    "overall": number (0-100),
    "keywordMatch": number (0-100),
    "skillsMatch": number (0-100),
    "experienceMatch": number (0-100),
    "gaps": string[] (what's missing),
    "suggestions": string[] (how to improve)
}

Return ONLY the JSON, no other text.`,

    chatEnhance: (resumeContent: string, chatHistory: ChatMessage[], userMessage: string) => `You are an expert resume coach helping a job seeker improve their resume.

Current Resume:
${resumeContent}

Previous Conversation:
${chatHistory.map(m => `${m.role}: ${m.content}`).join('\n')}

User's Request: ${userMessage}

IMPORTANT: After making the requested changes, you MUST respond in this exact format:

EXPLANATION:
[Briefly explain what changes you made and why they help]

UPDATED_RESUME:
[The complete updated resume with all the changes applied]

Make sure to include the full resume content after UPDATED_RESUME:, not just the changed sections.`,
};

/**
 * Parse a streaming response chunk
 */
function parseStreamChunk(chunk: unknown): string {
    if (typeof chunk === 'string') return chunk;
    if (chunk && typeof chunk === 'object') {
        const obj = chunk as Record<string, unknown>;
        if ('text' in obj) return String(obj.text);
        if ('content' in obj) return String(obj.content);
        if ('message' in obj && typeof obj.message === 'object') {
            const msg = obj.message as Record<string, unknown>;
            if ('content' in msg) return String(msg.content);
        }
    }
    return '';
}

/**
 * Robustly extract and parse JSON from AI responses that might be wrapped in markdown
 */
function safeParseJSON<T>(text: string, defaultValue: T): T {
    try {
        // Try direct parsing first
        return JSON.parse(text) as T;
    } catch {
        try {
            // Find JSON content within markdown code blocks
            const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            if (jsonMatch && jsonMatch[1]) {
                return JSON.parse(jsonMatch[1].trim()) as T;
            }

            // Try to find anything that looks like a JSON object if markdown stripping fails
            const contentMatch = text.match(/(\{[\s\S]*\})/);
            if (contentMatch && contentMatch[1]) {
                return JSON.parse(contentMatch[1].trim()) as T;
            }
        } catch (e) {
            console.error('[safeParseJSON] Failed to parse despite extraction efforts:', e);
        }
    }
    return defaultValue;
}

/**
 * Call Puter AI with streaming support
 */
async function streamingChat(
    messages: { role: string; content: string | object[] }[],
    callbacks: StreamingCallbacks,
    model: string = DEFAULT_MODEL
): Promise<string> {
    const puter = getPuter();
    if (!puter) {
        throw new Error('Puter.js not available');
    }

    let fullResponse = '';

    try {
        const response = await puter.ai.chat(messages as never, {
            model,
            stream: true,
        });

        // Handle streaming response
        if (response && typeof response === 'object') {
            // Check if it's an async iterable (streaming)
            if (Symbol.asyncIterator in response) {
                for await (const chunk of response as AsyncIterable<unknown>) {
                    const text = parseStreamChunk(chunk);
                    if (text) {
                        fullResponse += text;
                        callbacks.onToken?.(text);
                    }
                }
            } else {
                // Non-streaming response
                fullResponse = parseStreamChunk(response);
                callbacks.onToken?.(fullResponse);
            }
        }

        callbacks.onComplete?.(fullResponse);
        return fullResponse;
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        callbacks.onError?.(err);
        throw err;
    }
}

/**
 * Tailor a resume for a specific job
 */
export async function tailorResume(
    resumeContent: string,
    jobInfo: JobInfo,
    callbacks: StreamingCallbacks,
    model: string = DEFAULT_MODEL
): Promise<TailoringResult> {
    const puter = getPuter();
    if (!puter) throw new Error('Puter.js not available');

    callbacks.onProgress?.('Analyzing job requirements...', 10);

    // Step 1: Analyze job requirements
    console.log('[tailorResume] Analyzing job with model:', model);
    const jobAnalysisResponse = await puter.ai.chat([
        { role: 'user', content: PROMPTS.analyzeJob(jobInfo) }
    ], { model });

    console.log('[tailorResume] Job analysis response:', jobAnalysisResponse);

    let jobRequirements: Record<string, unknown>;
    try {
        const responseText = parseStreamChunk(jobAnalysisResponse);
        console.log('[tailorResume] Parsed job analysis:', responseText);
        jobRequirements = safeParseJSON(responseText, { keywords: [], technicalSkills: [], softSkills: [] });
        console.log('[tailorResume] Job requirements:', jobRequirements);
    } catch (error) {
        console.error('[tailorResume] Unexpected error in job analysis parsing:', error);
        jobRequirements = { keywords: [], technicalSkills: [], softSkills: [] };
    }

    callbacks.onProgress?.('Tailoring resume sections...', 30);

    // Step 2: Parse resume into sections
    const sections = parseResumeIntoSections(resumeContent);
    const tailoredSections: TailoredSection[] = [];
    const requirementsStr = JSON.stringify(jobRequirements);

    // Step 3: Tailor each section with streaming
    for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        const progress = 30 + ((i + 1) / sections.length) * 40;
        callbacks.onProgress?.(`Tailoring ${section.name}...`, progress);

        const tailoredContent = await streamingChat(
            [{ role: 'user', content: PROMPTS.tailorSection(section.name, section.content, requirementsStr) }],
            {
                onToken: callbacks.onToken,
                onError: callbacks.onError,
            },
            model
        );

        tailoredSections.push({
            name: section.name,
            original: section.content,
            tailored: tailoredContent,
            keywords: (jobRequirements.keywords as string[]) || [],
        });
    }

    callbacks.onProgress?.('Measuring job fit...', 80);

    // Step 4: Measure final job fit
    const tailoredContent = tailoredSections.map(s => `${s.name}:\n${s.tailored}`).join('\n\n');
    const jobFitScore = await measureJobFit(tailoredContent, jobInfo, model);

    callbacks.onProgress?.('Complete!', 100);

    const result: TailoringResult = {
        sections: tailoredSections,
        jobFitScore,
        summary: `Your resume has been tailored for ${jobInfo.jobTitle} at ${jobInfo.companyName}. Overall fit score: ${jobFitScore.overall}%`,
    };

    callbacks.onComplete?.(result);
    return result;
}

/**
 * Measure how well a resume fits a job
 */
export async function measureJobFit(
    resumeContent: string,
    jobInfo: JobInfo,
    model: string = DEFAULT_MODEL
): Promise<JobFitScore> {
    const puter = getPuter();
    if (!puter) throw new Error('Puter.js not available');

    console.log('[measureJobFit] Starting job fit analysis with model:', model);

    const response = await puter.ai.chat([
        { role: 'user', content: PROMPTS.measureFit(resumeContent, jobInfo) }
    ], { model });

    console.log('[measureJobFit] Raw response:', response);

    try {
        const responseText = parseStreamChunk(response);
        console.log('[measureJobFit] Parsed response text:', responseText);

        const parsed = safeParseJSON<JobFitScore>(responseText, {
            overall: 0,
            keywordMatch: 0,
            skillsMatch: 0,
            experienceMatch: 0,
            gaps: ['Unable to analyze resume'],
            suggestions: ['Please try again'],
        });
        console.log('[measureJobFit] Successfully parsed job fit score:', parsed);
        return parsed;
    } catch (error) {
        console.error('[measureJobFit] Unexpected error in job fit score parsing:', error);
        return {
            overall: 0,
            keywordMatch: 0,
            skillsMatch: 0,
            experienceMatch: 0,
            gaps: ['Unable to analyze resume'],
            suggestions: ['Please try again'],
        };
    }
}

/**
 * Interactive chat for resume enhancement
 */
export async function chatEnhance(
    resumeContent: string,
    chatHistory: ChatMessage[],
    userMessage: string,
    callbacks: StreamingCallbacks,
    model: string = DEFAULT_MODEL
): Promise<string> {
    return streamingChat(
        [
            {
                role: 'system',
                content: 'You are an expert resume coach. Help users improve their resumes through conversation. Be helpful, specific, and encouraging.',
            },
            {
                role: 'user',
                content: PROMPTS.chatEnhance(resumeContent, chatHistory, userMessage),
            },
        ],
        callbacks,
        model
    );
}

/**
 * Parse a resume into sections
 */
function parseResumeIntoSections(content: string): { name: string; content: string }[] {
    const sectionHeaders = [
        'Professional Summary',
        'Summary',
        'Experience',
        'Work Experience',
        'Employment History',
        'Education',
        'Skills',
        'Technical Skills',
        'Projects',
        'Certifications',
        'Awards',
        'Languages',
    ];

    const lines = content.split('\n');
    const sections: { name: string; content: string }[] = [];
    let currentSection = { name: 'Header', content: '' };

    for (const line of lines) {
        const trimmedLine = line.trim();
        const matchedHeader = sectionHeaders.find(
            header => trimmedLine.toLowerCase().includes(header.toLowerCase())
        );

        if (matchedHeader && trimmedLine.length < 50) {
            // Save previous section
            if (currentSection.content.trim()) {
                sections.push({ ...currentSection });
            }
            // Start new section
            currentSection = { name: matchedHeader, content: '' };
        } else {
            currentSection.content += line + '\n';
        }
    }

    // Add last section
    if (currentSection.content.trim()) {
        sections.push(currentSection);
    }

    return sections;
}

/**
 * Save tailored resume to Puter storage
 */
export async function saveTailoredResume(
    resumeId: string,
    result: TailoringResult,
    jobInfo: JobInfo
): Promise<void> {
    const puter = getPuter();
    if (!puter) throw new Error('Puter.js not available');

    const tailoredData = {
        originalResumeId: resumeId,
        jobInfo,
        tailoredAt: new Date().toISOString(),
        result,
    };

    await puter.kv.set(
        `tailored:${resumeId}:${Date.now()}`,
        JSON.stringify(tailoredData)
    );
}

/**
 * Save chat history to Puter storage
 */
export async function saveChatHistory(
    resumeId: string,
    messages: ChatMessage[]
): Promise<void> {
    const puter = getPuter();
    if (!puter) throw new Error('Puter.js not available');

    await puter.kv.set(
        `chat:${resumeId}`,
        JSON.stringify(messages)
    );
}

/**
 * Load chat history from Puter storage
 */
export async function loadChatHistory(
    resumeId: string
): Promise<ChatMessage[]> {
    const puter = getPuter();
    if (!puter) throw new Error('Puter.js not available');

    const data = await puter.kv.get(`chat:${resumeId}`);
    if (!data) return [];

    try {
        return JSON.parse(data) as ChatMessage[];
    } catch {
        return [];
    }
}
