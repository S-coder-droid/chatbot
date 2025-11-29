import { Job } from "../models/job.model.js";
import { Company } from "../models/company.model.js";
import { ChatbotConversation } from "../models/chatbot.model.js";
import crypto from "crypto";

// Helper function to generate session ID
const generateSessionId = () => {
  return crypto.randomBytes(16).toString("hex");
};

// Helper function to extract keywords from message
const extractKeywords = (message) => {
  const lowerMessage = message.toLowerCase();
  const jobKeywords = [
    "job",
    "position",
    "vacancy",
    "role",
    "opportunity",
    "career",
    "hiring",
  ];
  const locationKeywords = [
    "location",
    "city",
    "remote",
    "onsite",
    "hybrid",
    "in",
    "at",
  ];
  const skillKeywords = [
    "skill",
    "technology",
    "language",
    "framework",
    "experience",
    "expertise",
  ];

  return {
    isJobQuery: jobKeywords.some((keyword) => lowerMessage.includes(keyword)),
    hasLocation: locationKeywords.some((keyword) =>
      lowerMessage.includes(keyword)
    ),
    hasSkills: skillKeywords.some((keyword) => lowerMessage.includes(keyword)),
  };
};

// Enhanced job search function
const searchJobs = async (query, filters = {}) => {
  try {
    const searchQuery = {
      $or: [
        { title: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
        { location: { $regex: query, $options: "i" } },
      ],
    };

    // Add filters
    if (filters.location) {
      searchQuery.location = { $regex: filters.location, $options: "i" };
    }
    if (filters.maxSalary) {
      searchQuery.salary = { $lte: filters.maxSalary };
    }
    if (filters.minSalary) {
      searchQuery.salary = { ...searchQuery.salary, $gte: filters.minSalary };
    }
    if (filters.experienceLevel) {
      searchQuery.experienceLevel = { $lte: filters.experienceLevel };
    }

    const jobs = await Job.find(searchQuery)
      .populate({
        path: "company",
        select: "name logo location",
      })
      .limit(5)
      .sort({ createdAt: -1 });

    return jobs;
  } catch (error) {
    console.error("Job search error:", error);
    return [];
  }
};

// Intelligent response generator
const generateIntelligentResponse = async (message, context = {}) => {
  const lowerMessage = message.toLowerCase().trim();
  const keywords = extractKeywords(message);
  let response = "";
  let suggestions = [];
  let jobs = [];

  // Greetings with context awareness
  if (
    lowerMessage.includes("hello") ||
    lowerMessage.includes("hi") ||
    lowerMessage.includes("hey")
  ) {
    const greeting = context.hasSearchedJobs
      ? "Hello again! 👋 Ready to continue your job search?"
      : "Hello! 👋 I'm your intelligent Job Portal assistant. I can help you find jobs, answer questions, and guide you through the application process. What would you like to know?";
    response = greeting;
    suggestions = [
      "Show me available jobs",
      "Search for developer jobs",
      "How do I apply?",
      "Update my profile",
    ];
  }
  // Job search queries
  else if (
    keywords.isJobQuery ||
    lowerMessage.includes("show") ||
    lowerMessage.includes("find") ||
    lowerMessage.includes("search")
  ) {
    // Extract search terms
    const searchTerms = message
      .replace(/\b(jobs?|job|find|search|show|me|for|in|at|near)\b/gi, "")
      .trim();

    if (searchTerms) {
      jobs = await searchJobs(searchTerms);
      if (jobs.length > 0) {
        response = `I found ${jobs.length} job${jobs.length > 1 ? "s" : ""} matching "${searchTerms}":\n\n`;
        jobs.forEach((job, index) => {
          response += `${index + 1}. **${job.title}** at ${job.company?.name || "Company"}\n`;
          response += `   Location: ${job.location}\n`;
          response += `   Salary: ₹${job.salary.toLocaleString()}\n`;
          response += `   Experience: ${job.experienceLevel} years\n\n`;
        });
        response += "Would you like more details about any of these positions?";
      } else {
        response = `I couldn't find any jobs matching "${searchTerms}". Try searching with different keywords, or ask me to show all available jobs.`;
        suggestions = ["Show all jobs", "Search by location", "Browse by category"];
      }
    } else {
      // Show all recent jobs
      jobs = await searchJobs("");
      if (jobs.length > 0) {
        response = `Here are ${jobs.length} recent job openings:\n\n`;
        jobs.forEach((job, index) => {
          response += `${index + 1}. **${job.title}** at ${job.company?.name || "Company"}\n`;
          response += `   Location: ${job.location} | Salary: ₹${job.salary.toLocaleString()}\n\n`;
        });
        response += "You can ask me about any specific job or search for jobs by skills, location, or role.";
      } else {
        response = "There are no jobs available at the moment. Check back later!";
      }
    }
  }
  // Location-based queries
  else if (
    keywords.hasLocation ||
    lowerMessage.includes("remote") ||
    lowerMessage.includes("onsite")
  ) {
    const locationMatch = message.match(/\b(in|at|near)\s+([A-Za-z\s]+)/i);
    const location = locationMatch ? locationMatch[2].trim() : null;

    if (location) {
      jobs = await searchJobs("", { location });
      if (jobs.length > 0) {
        response = `Found ${jobs.length} job${jobs.length > 1 ? "s" : ""} in ${location}:\n\n`;
        jobs.forEach((job, index) => {
          response += `${index + 1}. **${job.title}** at ${job.company?.name || "Company"}\n`;
          response += `   Salary: ₹${job.salary.toLocaleString()}\n\n`;
        });
      } else {
        response = `No jobs found in ${location}. Would you like me to search in other locations?`;
      }
    } else {
      response = "I can help you find jobs by location. Just tell me the city or ask for remote jobs. For example: 'Show me jobs in Mumbai' or 'Find remote jobs'";
    }
  }
  // Salary queries
  else if (
    lowerMessage.includes("salary") ||
    lowerMessage.includes("pay") ||
    lowerMessage.includes("compensation")
  ) {
    const salaryMatch = message.match(/(\d+)\s*(lakh|lac|k|thousand)/i);
    if (salaryMatch) {
      const amount = parseInt(salaryMatch[1]);
      const unit = salaryMatch[2].toLowerCase();
      let minSalary = 0;
      if (unit === "lakh" || unit === "lac") {
        minSalary = amount * 100000;
      } else if (unit === "k") {
        minSalary = amount * 1000;
      }

      jobs = await searchJobs("", { minSalary });
      if (jobs.length > 0) {
        response = `Found ${jobs.length} job${jobs.length > 1 ? "s" : ""} with salary ≥ ₹${minSalary.toLocaleString()}:\n\n`;
        jobs.slice(0, 5).forEach((job, index) => {
          response += `${index + 1}. **${job.title}** - ₹${job.salary.toLocaleString()}\n`;
        });
      } else {
        response = `No jobs found with salary ≥ ₹${minSalary.toLocaleString()}. Try searching with a lower salary range.`;
      }
    } else {
      response = "To search by salary, specify the amount. For example: 'Show jobs with salary 5 lakh' or 'Jobs paying 50k'";
    }
  }
  // Application process
  else if (
    lowerMessage.includes("apply") ||
    lowerMessage.includes("application") ||
    lowerMessage.includes("submit")
  ) {
    response =
      "To apply for a job:\n\n" +
      "1️⃣ Find a job you're interested in\n" +
      "2️⃣ Click on the job to view full details\n" +
      "3️⃣ Review requirements and description carefully\n" +
      "4️⃣ Click the 'Apply' button\n" +
      "5️⃣ Your application will be sent to the recruiter\n\n" +
      "💡 **Tips:**\n" +
      "• Make sure your profile is complete\n" +
      "• Upload an updated resume\n" +
      "• Add relevant skills to your profile\n" +
      "• Customize your application for each job";
    suggestions = ["Update my profile", "Upload resume", "Add skills"];
  }
  // Profile queries
  else if (
    lowerMessage.includes("profile") ||
    lowerMessage.includes("resume") ||
    lowerMessage.includes("cv")
  ) {
    response =
      "Here's how to manage your profile:\n\n" +
      "**Update Profile:**\n" +
      "1. Click your avatar in the top right\n" +
      "2. Select 'View Profile'\n" +
      "3. Click 'Update Profile'\n" +
      "4. Add your bio, skills, and resume\n" +
      "5. Save changes\n\n" +
      "**Resume Tips:**\n" +
      "• Keep it updated with latest experience\n" +
      "• Highlight relevant skills\n" +
      "• Use clear formatting\n" +
      "• Include contact information\n\n" +
      "A complete profile increases your chances of getting hired! 📈";
    suggestions = ["Update profile", "Add skills", "View my applications"];
  }
  // Skills/Requirements
  else if (
    lowerMessage.includes("skill") ||
    lowerMessage.includes("requirement") ||
    lowerMessage.includes("qualification")
  ) {
    // Try to extract skill from message
    const commonSkills = [
      "javascript",
      "python",
      "react",
      "node",
      "java",
      "developer",
      "designer",
      "manager",
    ];
    const foundSkill = commonSkills.find((skill) =>
      lowerMessage.includes(skill)
    );

    if (foundSkill) {
      jobs = await searchJobs(foundSkill);
      if (jobs.length > 0) {
        response = `Found ${jobs.length} job${jobs.length > 1 ? "s" : ""} requiring ${foundSkill}:\n\n`;
        jobs.slice(0, 5).forEach((job, index) => {
          response += `${index + 1}. **${job.title}** - ${job.company?.name || "Company"}\n`;
        });
      } else {
        response = `No jobs found requiring ${foundSkill}. Try searching for related skills or browse all jobs.`;
      }
    } else {
      response =
        "Job requirements vary by position. To find jobs matching your skills:\n\n" +
        "• Search for specific technologies (e.g., 'React jobs')\n" +
        "• Browse jobs and check requirements\n" +
        "• Update your profile with your skills\n" +
        "• I can help you find jobs based on your expertise\n\n" +
        "What skills or technologies are you looking for?";
    }
  }
  // Help
  else if (lowerMessage.includes("help") || lowerMessage.includes("support")) {
    response =
      "I'm here to help! 🤖 Here's what I can do:\n\n" +
      "**🔍 Job Search:**\n" +
      "• Find jobs by role, skills, or location\n" +
      "• Search by salary range\n" +
      "• Show recent job openings\n\n" +
      "**📝 Applications:**\n" +
      "• Guide you through the application process\n" +
      "• Help with profile setup\n" +
      "• Resume tips\n\n" +
      "**💡 Quick Actions:**\n" +
      "• 'Show me jobs' - Browse all jobs\n" +
      "• 'Jobs in [city]' - Location-based search\n" +
      "• 'Jobs with salary [amount]' - Salary filter\n" +
      "• 'How do I apply?' - Application guide\n\n" +
      "Just ask me anything!";
    suggestions = ["Show me jobs", "How do I apply?", "Update profile"];
  }
  // Thank you
  else if (lowerMessage.includes("thank") || lowerMessage.includes("thanks")) {
    response =
      "You're welcome! 😊 If you need any more help finding jobs or have questions about the application process, just ask. Good luck with your job search! 🚀";
  }
  // Goodbye
  else if (lowerMessage.includes("bye") || lowerMessage.includes("goodbye")) {
    response =
      "Goodbye! 👋 Best of luck with your job search. Come back anytime if you need help finding the perfect job!";
  }
  // Default intelligent response
  else {
    // Try to extract any meaningful keywords for job search
    const words = message
      .toLowerCase()
      .split(/\s+/)
      .filter(
        (word) =>
          word.length > 3 &&
          !["show", "me", "find", "search", "for", "the", "with", "and", "or"].includes(word)
      );

    if (words.length > 0) {
      jobs = await searchJobs(words.join(" "));
      if (jobs.length > 0) {
        response = `I found ${jobs.length} job${jobs.length > 1 ? "s" : ""} that might interest you:\n\n`;
        jobs.slice(0, 3).forEach((job, index) => {
          response += `${index + 1}. **${job.title}** at ${job.company?.name || "Company"}\n`;
        });
        response += "\nWould you like more details? Or try asking me something like:\n• 'Show me all jobs'\n• 'Jobs in [location]'\n• 'How do I apply?'";
      } else {
        response =
          "I'm not sure I understand that question completely. 🤔\n\n" +
          "I can help you with:\n" +
          "• Finding jobs (try: 'Show me jobs' or 'Search for developer jobs')\n" +
          "• Application process\n" +
          "• Profile management\n" +
          "• Job search by location, salary, or skills\n\n" +
          "What would you like to know?";
        suggestions = ["Show me jobs", "How do I apply?", "Help"];
      }
    } else {
      response =
        "I'm not sure I understand that question. 🤔\n\n" +
        "Try asking me:\n" +
        "• 'Show me jobs'\n" +
        "• 'How do I apply?'\n" +
        "• 'Jobs in [city]'\n" +
        "• 'Update profile'\n\n" +
        "Or just say 'help' for more options!";
      suggestions = ["Show me jobs", "Help", "How do I apply?"];
    }
  }

  return { response, suggestions, jobs };
};

// Main chatbot controller
export const chatMessage = async (req, res) => {
  try {
    const { message, sessionId: providedSessionId } = req.body;
    const userId = req.id || null; // From authentication middleware if available

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid message",
      });
    }

    // Generate or use existing session ID
    let sessionId = providedSessionId;
    if (!sessionId) {
      sessionId = generateSessionId();
    }

    // Get or create conversation
    let conversation = await ChatbotConversation.findOne({ sessionId });

    // Get conversation context
    const context = conversation?.context || {};
    const recentMessages = conversation?.messages.slice(-5) || [];

    // Generate intelligent response
    const { response, suggestions, jobs } = await generateIntelligentResponse(
      message,
      context
    );

    // Update context
    context.hasSearchedJobs = context.hasSearchedJobs || jobs.length > 0;
    context.lastQuery = message;

    // Save conversation
    const userMessage = {
      role: "user",
      content: message,
      timestamp: new Date(),
    };

    const assistantMessage = {
      role: "assistant",
      content: response,
      timestamp: new Date(),
      metadata: {
        suggestions,
        jobsCount: jobs.length,
        jobs: jobs.map((job) => ({
          id: job._id,
          title: job.title,
          company: job.company?.name,
          location: job.location,
          salary: job.salary,
        })),
      },
    };

    if (conversation) {
      conversation.messages.push(userMessage, assistantMessage);
      conversation.context = context;
      conversation.lastActive = new Date();
      if (userId) conversation.userId = userId;
      await conversation.save();
    } else {
      conversation = await ChatbotConversation.create({
        sessionId,
        userId,
        messages: [userMessage, assistantMessage],
        context,
      });
    }

    return res.status(200).json({
      success: true,
      message: response,
      suggestions,
      jobs: jobs.map((job) => ({
        id: job._id,
        title: job.title,
        company: job.company?.name || "Company",
        companyLogo: job.company?.logo,
        location: job.location,
        salary: job.salary,
        experienceLevel: job.experienceLevel,
        jobType: job.jobType,
        description: job.description.substring(0, 150) + "...",
      })),
      sessionId,
    });
  } catch (error) {
    console.error("Chatbot error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

// Get conversation history
export const getConversationHistory = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.id || null;

    const conversation = await ChatbotConversation.findOne({
      $or: [{ sessionId }, userId ? { userId } : {}],
    }).sort({ lastActive: -1 });

    if (!conversation) {
      return res.status(200).json({
        success: true,
        messages: [],
        sessionId,
      });
    }

    return res.status(200).json({
      success: true,
      messages: conversation.messages,
      sessionId: conversation.sessionId,
      context: conversation.context,
    });
  } catch (error) {
    console.error("Get conversation error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve conversation history",
    });
  }
};

// Clear conversation
export const clearConversation = async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (sessionId) {
      await ChatbotConversation.deleteOne({ sessionId });
    }

    return res.status(200).json({
      success: true,
      message: "Conversation cleared successfully",
    });
  } catch (error) {
    console.error("Clear conversation error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to clear conversation",
    });
  }
};
