export const resumes: Resume[] = [
    {
        id: "1",
        companyName: "Google",
        jobTitle: "Frontend Developer",
        imagePath: "/images/resume_01.png",
        resumePath: "/resumes/resume-1.pdf",
        feedback: {
            overallScore: 85,
            ATS: {
                score: 90,
                tips: [],
            },
            toneAndStyle: {
                score: 90,
                tips: [],
            },
            content: {
                score: 90,
                tips: [],
            },
            structure: {
                score: 90,
                tips: [],
            },
            skills: {
                score: 90,
                tips: [],
            },
        },
    },
    {
        id: "2",
        companyName: "Microsoft",
        jobTitle: "Cloud Engineer",
        imagePath: "/images/resume_02.png",
        resumePath: "/resumes/resume-2.pdf",
        feedback: {
            overallScore: 55,
            ATS: {
                score: 90,
                tips: [],
            },
            toneAndStyle: {
                score: 90,
                tips: [],
            },
            content: {
                score: 90,
                tips: [],
            },
            structure: {
                score: 90,
                tips: [],
            },
            skills: {
                score: 90,
                tips: [],
            },
        },
    },
    {
        id: "3",
        companyName: "Apple",
        jobTitle: "iOS Developer",
        imagePath: "/images/resume_03.png",
        resumePath: "/resumes/resume-3.pdf",
        feedback: {
            overallScore: 75,
            ATS: {
                score: 90,
                tips: [],
            },
            toneAndStyle: {
                score: 90,
                tips: [],
            },
            content: {
                score: 90,
                tips: [],
            },
            structure: {
                score: 90,
                tips: [],
            },
            skills: {
                score: 90,
                tips: [],
            },
        },
    },
    {
        id: "4",
        companyName: "Google",
        jobTitle: "Frontend Developer",
        imagePath: "/images/resume_01.png",
        resumePath: "/resumes/resume-1.pdf",
        feedback: {
            overallScore: 85,
            ATS: {
                score: 90,
                tips: [],
            },
            toneAndStyle: {
                score: 90,
                tips: [],
            },
            content: {
                score: 90,
                tips: [],
            },
            structure: {
                score: 90,
                tips: [],
            },
            skills: {
                score: 90,
                tips: [],
            },
        },
    },
    {
        id: "5",
        companyName: "Microsoft",
        jobTitle: "Cloud Engineer",
        imagePath: "/images/resume_02.png",
        resumePath: "/resumes/resume-2.pdf",
        feedback: {
            overallScore: 55,
            ATS: {
                score: 90,
                tips: [],
            },
            toneAndStyle: {
                score: 90,
                tips: [],
            },
            content: {
                score: 90,
                tips: [],
            },
            structure: {
                score: 90,
                tips: [],
            },
            skills: {
                score: 90,
                tips: [],
            },
        },
    },
    {
        id: "6",
        companyName: "Apple",
        jobTitle: "iOS Developer",
        imagePath: "/images/resume_03.png",
        resumePath: "/resumes/resume-3.pdf",
        feedback: {
            overallScore: 75,
            ATS: {
                score: 90,
                tips: [],
            },
            toneAndStyle: {
                score: 90,
                tips: [],
            },
            content: {
                score: 90,
                tips: [],
            },
            structure: {
                score: 90,
                tips: [],
            },
            skills: {
                score: 90,
                tips: [],
            },
        },
    },
];

export const AIResponseFormat = `
      interface Feedback {
      overallScore: number; //max 100
      ATS: {
        score: number; //rate based on ATS suitability
        tips: {
          type: "good" | "improve";
          tip: string; //give 3-4 tips
        }[];
      };
      toneAndStyle: {
        score: number; //max 100
        tips: {
          type: "good" | "improve";
          tip: string; //make it a short "title" for the actual explanation
          explanation: string; //explain in detail here
        }[]; //give 3-4 tips
      };
      content: {
        score: number; //max 100
        tips: {
          type: "good" | "improve";
          tip: string; //make it a short "title" for the actual explanation
          explanation: string; //explain in detail here
        }[]; //give 3-4 tips
      };
      structure: {
        score: number; //max 100
        tips: {
          type: "good" | "improve";
          tip: string; //make it a short "title" for the actual explanation
          explanation: string; //explain in detail here
        }[]; //give 3-4 tips
      };
      skills: {
        score: number; //max 100
        tips: {
          type: "good" | "improve";
          tip: string; //make it a short "title" for the actual explanation
          explanation: string; //explain in detail here
        }[]; //give 3-4 tips
      };
    }`;

export const prepareInstructions = ({jobTitle, jobDescription}: { jobTitle: string; jobDescription: string; }) =>
    `You are an expert in ATS (Applicant Tracking System) and resume analysis.
      Please analyze and rate this resume and suggest how to improve it.
      The rating can be low if the resume is bad.
      Be thorough and detailed. Don't be afraid to point out any mistakes or areas for improvement.
      If there is a lot to improve, don't hesitate to give low scores. This is to help the user to improve their resume.
      If available, use the job description for the job user is applying to to give more detailed feedback.
      If provided, take the job description into consideration.
      The job title is: ${jobTitle}
      The job description is: ${jobDescription}
      Provide the feedback using the following format:
      ${AIResponseFormat}
      Return the analysis as an JSON object, without any other text and without the backticks.
      Do not include any other text or comments.`;

// constants/index.ts

export const FinetuneResumeFormat = `{
  enhancedContent: string; // The complete enhanced resume content
  sections: {
    [key: string]: string; // Each section of the resume with its enhanced content
  };
  improvements: {
    section: string;
    original: string;
    enhanced: string;
    explanation: string;
  }[];
  analysis: {
    overallScore: number; // 1-10
    atsScore: number; // 1-10
    atsOptimization: string[]; // List of ATS optimization tips
  };
}`;

export const prepareFinetuneInstructions = ({
  feedback,
  jobTitle,
  jobDescription,
  resumeContent
}: {
  feedback: any;
  jobTitle: string;
  jobDescription: string;
  resumeContent: string;
}) =>
  `You are an expert resume enhancer specializing in ATS optimization and job-specific tailoring.
   Based on the original resume and feedback provided, create an enhanced version that is optimized for ATS systems and tailored for the specific job.
   
   Original Resume:
   ${resumeContent}
   
   Original Feedback:
   ${JSON.stringify(feedback)}
   
   Job Title: ${jobTitle}
   Job Description: ${jobDescription}
   
   Enhance the resume by:
   1. Improving content based on the original feedback
   2. Tailoring it specifically for the job role and description
   3. Optimizing for ATS systems
   4. Maintaining professional formatting
   
   Provide the enhanced resume and analysis using the following format:
   ${FinetuneResumeFormat}
   
   Return the enhanced resume as a JSON object, without any other text and without the backticks.`;

export const enhancementInstructions = ({
  feedback,
  jobTitle,
  jobDescription,
  resumeContent,
}: {
  feedback: Feedback;
  jobTitle: string;
  jobDescription: string;
  resumeContent: string;
}) => `
# Resume Enhancement Task

You are an expert resume writer and career coach who helps job seekers create compelling, ATS-friendly resumes that get interviews. 
Your goal is to transform the given resume into a **more professional, ATS-optimized, and better-structured version** — 
but you must **never invent or fabricate** any information not present in the original content.

---

## IMPORTANT RULES

1. **DO NOT make up details** — never add new companies, job titles, projects, technologies, or achievements that are not explicitly mentioned in the original resume.
2. **Enhance only structure and clarity** — you may reword, reorder, and tighten language, but the meaning must remain faithful to the original.
3. **Use the Resume Builder System Prompt below as your formatting and styling guide.**
4. **If data is missing**, leave placeholders like [Add metric here] or [Clarify responsibility].
5. **Focus on improving presentation, formatting, and ATS alignment.**

---

## CONTEXT

**Job Title:** ${jobTitle}
**Job Description:** ${jobDescription}

**Original Resume Content:**
${resumeContent}

**Original AI Feedback:**
${JSON.stringify(feedback, null, 2)}

---

## Resume Builder AI System Prompt



---

## TASK

Using the principles above:
- Keep all factual information intact.
- Restructure and polish the resume according to best practices.
- Improve clarity, action verbs, and consistency.
- Follow the structure in the Resume Builder AI System Prompt (Header, Experience, Education, Skills).
- Return the final result as plain text or markdown (no JSON or explanations).

Return **only** the enhanced resume content — no commentary or extra text.
`;


export const createResumeInstructions = ({
  personalInfo,
  experience,
  education,
  skills,
  jobTitle,
  jobDescription,
}: {
  personalInfo: {
    name: string;
    email: string;
    phone: string;
    location: string;
    linkedin?: string;
    portfolio?: string;
  };
  experience: Array<{
    title: string;
    company: string;
    duration: string;
    description: string;
  }>;
  education: Array<{
    degree: string;
    institution: string;
    year: string;
  }>;
  skills: string[];
  jobTitle?: string;
  jobDescription?: string;
}) => `You are an expert resume writer specializing in ATS-optimized resumes.

TARGET JOB (if provided):
- Job Title: ${jobTitle || 'Not specified'}
- Job Description: ${jobDescription || 'Not specified'}

USER INFORMATION:
Personal Info: ${JSON.stringify(personalInfo)}
Experience: ${JSON.stringify(experience)}
Education: ${JSON.stringify(education)}
Skills: ${skills.join(', ')}

TASK:
Create a professional, ATS-optimized resume using the information provided.
- Use a clean, modern format
- Optimize for ATS scanning
- Use action verbs and quantifiable achievements
- Tailor content to the target job (if provided)
- Include a compelling professional summary
- Format: Plain text or markdown

Return ONLY the resume content in a professional format.
No explanations, no comments, just the resume.`;