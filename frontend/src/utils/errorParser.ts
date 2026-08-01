interface ValidationErrorDetail {
  loc?: (string | number)[]
  msg?: string
  type?: string
  ctx?: Record<string, unknown>
}

/**
 * Parses caught API exceptions (Axios, Fetch, FastAPI 422 Pydantic validation errors)
 * into Cyberpunk terminal error readouts.
 */
export function parseApiError(error: any): string[] {
  if (!error) {
    return ['[SYS_ERR] > UNKNOWN_TRANSMISSION_FAILURE']
  }

  // 1. Check Axios format: error?.response?.data?.detail
  let detail = error?.response?.data?.detail

  // 2. Check direct object format: error?.data?.detail or error?.detail
  if (!detail && error?.data?.detail) {
    detail = error.data.detail
  } else if (!detail && error?.detail) {
    detail = error.detail
  }

  // 3. Check if error.message contains stringified FastAPI JSON detail
  if (!detail && typeof error?.message === 'string') {
    try {
      const jsonStart = error.message.indexOf('{')
      if (jsonStart !== -1) {
        const parsedJson = JSON.parse(error.message.slice(jsonStart))
        if (parsedJson?.detail) {
          detail = parsedJson.detail
        }
      }
    } catch {
      // Not JSON or parse failed
    }
  }

  // Handle Pydantic validation error array
  if (Array.isArray(detail)) {
    const formattedErrors: string[] = []

    for (const item of detail as ValidationErrorDetail[]) {
      if (item && typeof item === 'object') {
        const locArray = item.loc || []
        const fieldName =
          locArray.length > 0
            ? String(locArray[locArray.length - 1]).toUpperCase()
            : 'GENERAL'

        const msgText = (item.msg || 'VALIDATION_FAILED').toUpperCase()
        formattedErrors.push(`[ERR_FIELD: ${fieldName}] > ${msgText}`)
      }
    }

    if (formattedErrors.length > 0) {
      return formattedErrors
    }
  }

  // Handle string detail
  if (typeof detail === 'string' && detail.trim()) {
    return [`[SYS_ERR] > ${detail.trim().toUpperCase()}`]
  }

  // Fallback to error message
  if (typeof error?.message === 'string' && error.message.trim()) {
    const msg = error.message.replace(/^Failed to (?:create|update) task: \d+ [^ ]+ /, '').trim()
    return [`[SYS_ERR] > ${msg.toUpperCase()}`]
  }

  return ['[SYS_ERR] > NETWORK_CONNECTION_INTERRUPTED']
}
