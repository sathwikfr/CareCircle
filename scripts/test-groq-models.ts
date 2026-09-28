import 'dotenv/config';
import Groq from 'groq-sdk';

async function main() {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  
  // List available models
  const models = await groq.models.list();
  console.log('Available Groq models:');
  models.data.forEach(m => console.log(' -', m.id));
  
  // Test a simple call
  console.log('\nTesting llama-3.3-70b-versatile...');
  try {
    const r = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: 'Say only: {"confirmed":true}' }],
      max_tokens: 50
    });
    console.log('Response:', r.choices[0].message.content);
  } catch (err) {
    console.error('Error with llama-3.3-70b-versatile:', err instanceof Error ? err.message : err);
  }
}

main().catch(console.error);
