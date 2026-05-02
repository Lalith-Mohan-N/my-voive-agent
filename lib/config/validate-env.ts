// ============================================================
// VitaVoice — Environment Validation
// ============================================================

export function validateEnv(): { valid: boolean; missing: string[] } {
  const required = [
    'RETELL_API_KEY',
    'RETELL_AGENT_ID',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'GROQ_API_KEY',
    'GOOGLE_PLACES_API_KEY',
  ];

  const missing = required.filter((key) => {
    const value = process.env[key];
    return !value || value.startsWith('your_') || value === 'placeholder';
  });

  return { valid: missing.length === 0, missing };
}

export function logEnvStatus(): void {
  const { valid, missing } = validateEnv();
  
  if (!valid) {
    console.error('❌ Missing environment variables:', missing.join(', '));
    console.error('Please check your .env.local file');
  } else {
    console.log('✅ All environment variables configured');
  }
}
