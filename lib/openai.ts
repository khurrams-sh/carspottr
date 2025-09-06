import OpenAI from 'openai';

if (!process.env.EXPO_PUBLIC_OPENAI_API_KEY) {
  throw new Error('OpenAI API key is not configured');
}

export const openai = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
  defaultHeaders: {
    'Content-Type': 'application/json',
  },
  defaultQuery: {
    'api-version': '2024-02',
  },
  timeout: 30000, // 30 seconds timeout
});