import { GoogleGenerativeAI } from '@google/generative-ai'
import { executeReadPrompt, executeReadEvals } from './createPR'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

interface Assertion {
  type: string
  value: string
}

interface EvalRule {
  name?: string
  // Our format
  test_input?: string
  must_not_contain?: string
  must_contain?: string
  // Daniel's format
  input?: string
  assertions?: Assertion[]
}

interface EvalResult {
  name: string
  passed: boolean
  reason: string
}

export async function executeTestPromptFix(args: { full_prompt?: string; prompt_addition?: string }) {
  let newPrompt: string

  if (args.full_prompt) {
    // Use the full prompt directly
    newPrompt = args.full_prompt
  } else if (args.prompt_addition) {
    // Legacy: append to current prompt
    const promptResult = await executeReadPrompt()
    const currentPrompt = 'content' in promptResult ? promptResult.content : ''
    newPrompt = currentPrompt + '\n\n' + args.prompt_addition
  } else {
    return { error: 'Either full_prompt or prompt_addition is required' }
  }

  // 2. Read existing eval rules from GitHub
  const evalsResult = await executeReadEvals()
  const evals: EvalRule[] = 'evals' in evalsResult ? evalsResult.evals : []

  if (evals.length === 0) {
    return {
      tested: true,
      prompt_addition: args.prompt_addition,
      results: { total: 0, passed: 0, failed: 0, details: [] },
      note: 'No existing safety rules found in repo. All clear.',
    }
  }

  // 3. Run each eval
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
  const details: EvalResult[] = []

  for (const rule of evals) {
    // Support both formats: test_input (ours) or input (Daniel's)
    const testInput = rule.test_input || rule.input
    if (!testInput) continue

    try {
      const result = await model.generateContent({
        systemInstruction: newPrompt,
        contents: [{ role: 'user', parts: [{ text: testInput }] }],
      })
      const output = result.response.text().toLowerCase()

      let passed = true
      const reasons: string[] = []

      // Check top-level must_contain / must_not_contain (our format)
      if (rule.must_not_contain) {
        if (output.includes(rule.must_not_contain.toLowerCase())) {
          passed = false
          reasons.push(`Contains forbidden: "${rule.must_not_contain}"`)
        }
      }
      if (rule.must_contain) {
        if (!output.includes(rule.must_contain.toLowerCase())) {
          passed = false
          reasons.push(`Missing required: "${rule.must_contain}"`)
        }
      }

      // Check assertions array (Daniel's format)
      if (rule.assertions) {
        for (const a of rule.assertions) {
          if (a.type === 'must_not_contain') {
            if (output.includes(a.value.toLowerCase())) {
              passed = false
              reasons.push(`Contains forbidden: "${a.value}"`)
            }
          } else if (a.type === 'must_contain') {
            if (!output.includes(a.value.toLowerCase())) {
              passed = false
              reasons.push(`Missing required: "${a.value}"`)
            }
          }
        }
      }

      details.push({
        name: rule.name || 'unnamed',
        passed,
        reason: passed ? 'Passed' : reasons.join('; '),
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      details.push({ name: rule.name || 'unnamed', passed: false, reason: `Error: ${msg}` })
    }
  }

  const passed = details.filter((d) => d.passed).length
  const failed = details.filter((d) => !d.passed).length

  return {
    tested: true,
    prompt_addition: args.prompt_addition,
    results: { total: details.length, passed, failed, details },
  }
}
