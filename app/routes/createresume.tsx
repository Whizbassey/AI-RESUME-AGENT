// pages/CreateResume.tsx

import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { usePuterStore } from '~/lib/puter';
import { createResumeInstructions } from '../../constants';
import { generateUUID } from '~/lib/utils';
import Navbar from '~/components/Navbar';

const CreateResume = () => {
  const { auth, fs, kv, ai } = usePuterStore();
  const navigate = useNavigate();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState('');
  
  // Form state
  const [experienceFields, setExperienceFields] = useState([
    { title: '', company: '', duration: '', description: '' }
  ]);
  const [educationFields, setEducationFields] = useState([
    { degree: '', institution: '', year: '' }
  ]);
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');

  const addExperience = () => {
    setExperienceFields([...experienceFields, { title: '', company: '', duration: '', description: '' }]);
  };

  const addEducation = () => {
    setEducationFields([...educationFields, { degree: '', institution: '', year: '' }]);
  };

  const addSkill = () => {
    if (skillInput.trim()) {
      setSkills([...skills, skillInput.trim()]);
      setSkillInput('');
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsProcessing(true);
    
    const formData = new FormData(e.currentTarget);
    
    const personalInfo = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      location: formData.get('location') as string,
      linkedin: formData.get('linkedin') as string,
      portfolio: formData.get('portfolio') as string,
    };
    
    const jobTitle = formData.get('target-job-title') as string;
    const jobDescription = formData.get('target-job-description') as string;
    
    try {
      // Call AI to generate resume
      setStatusText('Generating your professional resume...');
      const response = await ai.chat(
        createResumeInstructions({
          personalInfo,
          experience: experienceFields,
          education: educationFields,
          skills,
          jobTitle,
          jobDescription,
        })
      );
      
      if (!response) {
        throw new Error("Failed to generate resume content");
      }
      
      const resumeContent = typeof response.message.content === 'string'
        ? response.message.content
        : response.message.content[0].text;
      
      // Save generated resume
      setStatusText('Saving your resume...');
      const resumeFile = new File(
        [resumeContent],
        `resume-${personalInfo.name.replace(/\s+/g, '-')}.txt`,
        { type: 'text/plain' }
      );
      
      const uploadedFile = await fs.upload([resumeFile]);
      
      if (!uploadedFile) {
        throw new Error("Failed to upload resume file");
      }
      
      // Store resume data
      const uuid = generateUUID();
      const data = {
        id: uuid,
        resumePath: uploadedFile.path,
        companyName: '',
        jobTitle,
        jobDescription,
        isGenerated: true,
        feedback: null,
      };
      
      await kv.set(`resume:${uuid}`, JSON.stringify(data));
      
      setStatusText('Resume created successfully!');
      
      // Navigate to view
      setTimeout(() => {
        navigate(`/enhanced/${uuid}`);
      }, 1500);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setStatusText(`Error: ${errorMessage}`);
    }
  };

  return (
    <main className="bg-[url('/images/bg-main.svg')] bg-cover">
      <Navbar />

      <section className="main-section">
        <div className="page-heading py-16">
          <h1>Create Your Resume with AI</h1>
          
          {isProcessing ? (
            <>
              <h2>{statusText}</h2>
              <img src="/images/resume-scan.gif" className="w-full" />
            </>
          ) : (
            <>
              <h2>Fill in your details and let AI craft your perfect resume</h2>
              
              <form onSubmit={handleSubmit} className="flex flex-col gap-6 mt-8 max-w-3xl mx-auto">
                {/* Personal Info */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <h3 className="text-xl font-bold mb-4">Personal Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="form-div col-span-2">
                      <label htmlFor="name">Full Name *</label>
                      <input type="text" name="name" id="name" required />
                    </div>
                    <div className="form-div">
                      <label htmlFor="email">Email *</label>
                      <input type="email" name="email" id="email" required />
                    </div>
                    <div className="form-div">
                      <label htmlFor="phone">Phone *</label>
                      <input type="tel" name="phone" id="phone" required />
                    </div>
                    <div className="form-div col-span-2">
                      <label htmlFor="location">Location</label>
                      <input type="text" name="location" id="location" />
                    </div>
                    <div className="form-div">
                      <label htmlFor="linkedin">LinkedIn</label>
                      <input type="url" name="linkedin" id="linkedin" />
                    </div>
                    <div className="form-div">
                      <label htmlFor="portfolio">Portfolio</label>
                      <input type="url" name="portfolio" id="portfolio" />
                    </div>
                  </div>
                </div>

                {/* Target Job (Optional) */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <h3 className="text-xl font-bold mb-4">Target Job (Optional)</h3>
                  <div className="form-div">
                    <label htmlFor="target-job-title">Job Title</label>
                    <input type="text" name="target-job-title" id="target-job-title" />
                  </div>
                  <div className="form-div">
                    <label htmlFor="target-job-description">Job Description</label>
                    <textarea rows={4} name="target-job-description" id="target-job-description" />
                  </div>
                </div>

                {/* Experience */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">Experience</h3>
                    <button type="button" onClick={addExperience} className="text-blue-600 text-sm">
                      + Add Experience
                    </button>
                  </div>
                  {experienceFields.map((_, index) => (
                    <div key={index} className="mb-4 pb-4 border-b last:border-0">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="form-div">
                          <label>Job Title</label>
                          <input
                            type="text"
                            value={experienceFields[index].title}
                            onChange={(e) => {
                              const newFields = [...experienceFields];
                              newFields[index].title = e.target.value;
                              setExperienceFields(newFields);
                            }}
                          />
                        </div>
                        <div className="form-div">
                          <label>Company</label>
                          <input
                            type="text"
                            value={experienceFields[index].company}
                            onChange={(e) => {
                              const newFields = [...experienceFields];
                              newFields[index].company = e.target.value;
                              setExperienceFields(newFields);
                            }}
                          />
                        </div>
                        <div className="form-div col-span-2">
                          <label>Duration</label>
                          <input
                            type="text"
                            placeholder="e.g., Jan 2020 - Present"
                            value={experienceFields[index].duration}
                            onChange={(e) => {
                              const newFields = [...experienceFields];
                              newFields[index].duration = e.target.value;
                              setExperienceFields(newFields);
                            }}
                          />
                        </div>
                        <div className="form-div col-span-2">
                          <label>Description</label>
                          <textarea
                            rows={3}
                            placeholder="Describe your responsibilities and achievements"
                            value={experienceFields[index].description}
                            onChange={(e) => {
                              const newFields = [...experienceFields];
                              newFields[index].description = e.target.value;
                              setExperienceFields(newFields);
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Education */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">Education</h3>
                    <button type="button" onClick={addEducation} className="text-blue-600 text-sm">
                      + Add Education
                    </button>
                  </div>
                  {educationFields.map((_, index) => (
                    <div key={index} className="mb-4 pb-4 border-b last:border-0">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="form-div col-span-2">
                          <label>Degree</label>
                          <input
                            type="text"
                            value={educationFields[index].degree}
                            onChange={(e) => {
                              const newFields = [...educationFields];
                              newFields[index].degree = e.target.value;
                              setEducationFields(newFields);
                            }}
                          />
                        </div>
                        <div className="form-div">
                          <label>Institution</label>
                          <input
                            type="text"
                            value={educationFields[index].institution}
                            onChange={(e) => {
                              const newFields = [...educationFields];
                              newFields[index].institution = e.target.value;
                              setEducationFields(newFields);
                            }}
                          />
                        </div>
                        <div className="form-div">
                          <label>Year</label>
                          <input
                            type="text"
                            placeholder="e.g., 2020"
                            value={educationFields[index].year}
                            onChange={(e) => {
                              const newFields = [...educationFields];
                              newFields[index].year = e.target.value;
                              setEducationFields(newFields);
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Skills */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <h3 className="text-xl font-bold mb-4">Skills</h3>
                  <div className="flex gap-2 mb-4">
                    <input
                      type="text"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                      placeholder="Add a skill"
                      className="flex-1 px-4 py-2 border rounded"
                    />
                    <button type="button" onClick={addSkill} className="px-4 py-2 bg-blue-600 text-white rounded">
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill, index) => (
                      <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                        {skill}
                        <button
                          type="button"
                          onClick={() => setSkills(skills.filter((_, i) => i !== index))}
                          className="ml-2 text-blue-600"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <button type="submit" className="primary-button">
                  Generate Resume with AI
                </button>
              </form>
            </>
          )}
        </div>
      </section>
    </main>
  );
};

export default CreateResume;