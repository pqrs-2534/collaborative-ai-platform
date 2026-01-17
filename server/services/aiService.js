// AI Service - Supports both OpenAI and Google Gemini
// Configure which AI service to use in .env file

const generateText = async (prompt) => {
  try {
    // Check which AI service is configured
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
      return await generateWithOpenAI(prompt);
    } else if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
      return await generateWithGemini(prompt);
    } else {
      // Fallback to mock response for development/testing
      console.log('📝 No AI API key configured, using mock response');
      return generateMockResponse(prompt);
    }
  } catch (error) {
    console.error('AI generation error:', error.message);
    // If API call fails, fall back to mock response
    console.log('⚠️ AI API failed, falling back to mock response');
    return generateMockResponse(prompt);
  }
};

// OpenAI Implementation
const generateWithOpenAI = async (prompt) => {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a creative assistant helping teams brainstorm ideas and solutions. Provide detailed, actionable ideas.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      generated_text: data.choices[0].message.content.trim(),
      source: 'openai'
    };
  } catch (error) {
    console.error('OpenAI error:', error);
    throw error;
  }
};

// Google Gemini Implementation
const generateWithGemini = async (prompt) => {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are a creative assistant helping teams brainstorm ideas and solutions. Provide detailed, actionable ideas for: ${prompt}`
            }]
          }]
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      generated_text: data.candidates[0].content.parts[0].text.trim(),
      source: 'gemini'
    };
  } catch (error) {
    console.error('Gemini error:', error);
    throw error;
  }
};

// Mock Response for Development/Testing (when no API key is configured)
const generateMockResponse = (prompt) => {
  const ideas = [
    `Based on your prompt "${prompt}", here are some creative ideas:

1. **Innovative Approach**: Consider implementing a modular system that allows for scalability and flexibility. This approach enables teams to adapt quickly to changing requirements.

2. **User-Centric Design**: Focus on understanding user needs through research and feedback loops. Create personas and user journey maps to guide development.

3. **Technology Integration**: Leverage modern technologies like AI, cloud computing, and automation to enhance efficiency and reduce manual workload.

4. **Collaborative Workflow**: Establish clear communication channels and use collaborative tools to ensure all team members are aligned and informed.

5. **Iterative Development**: Adopt an agile methodology with regular sprints, reviews, and retrospectives to continuously improve the product.

These ideas can serve as a starting point for your project. Feel free to adapt and expand on them based on your specific context and goals.`,

    `Here are some actionable ideas for "${prompt}":

• **Strategic Planning**: Break down the problem into smaller, manageable components. Create a roadmap with clear milestones and deadlines.

• **Resource Optimization**: Identify available resources (time, budget, people) and allocate them efficiently. Consider automation where possible.

• **Risk Management**: Anticipate potential challenges and develop contingency plans. Regular risk assessments can help mitigate issues early.

• **Stakeholder Engagement**: Keep stakeholders informed and involved throughout the process. Their input can provide valuable insights.

• **Continuous Learning**: Encourage team members to stay updated with industry trends and best practices. Knowledge sharing sessions can foster growth.

Remember, the key to success is execution. Start with small wins and build momentum!`
  ];

  // Return a random idea from the mock responses
  const randomIdea = ideas[Math.floor(Math.random() * ideas.length)];

  return {
    generated_text: randomIdea,
    source: 'mock'
  };
};

module.exports = {
  generateText
};