import { createAI, type ChatInput } from '@broberg/ai-sdk';

/**
 * Every app LLM call goes through @broberg/ai-sdk, routed to EU-hosted Mistral
 * (GDPR-safe — pitch content may include client data). Swap the provider/model
 * here once and every call follows. Keys come from env (MISTRAL_API_KEY).
 *
 * mistral-small = the EU equivalent of the Haiku tier these routes used.
 */
const EU_ROUTE = { provider: 'mistral', model: 'mistral-small-latest' };

const ai = createAI();

export function aiChat(input: ChatInput) {
  return ai.chat({ ...input, override: EU_ROUTE });
}
