export const runtime = 'nodejs'

import { streamText, stepCountIs, convertToModelMessages, UIMessage } from 'ai'
import { google } from '@ai-sdk/google'
import { SYSTEM_PROMPT, agentTools } from '@/lib/evalAgent'

export async function POST(request: Request) {
  const { messages } = await request.json() as { messages: UIMessage[] }

  const modelMessages = await convertToModelMessages(messages)

  const result = streamText({
    model: google('gemini-2.5-flash'),
    system: SYSTEM_PROMPT,
    messages: modelMessages,
    tools: agentTools,
    stopWhen: stepCountIs(50),
    providerOptions: {
      google: { thinkingConfig: { thinkingBudget: 1024 } },
    },
  })

  return result.toUIMessageStreamResponse({ sendReasoning: true })
}
