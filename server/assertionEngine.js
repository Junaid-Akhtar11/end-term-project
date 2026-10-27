/**
 * Synthetics Assertion Evaluation Engine
 * Evaluates assertions against HTTP execution response:
 * - status
 * - latency
 * - json_body (nested keys e.g. "data.user.id" or "status")
 * - header
 */

function evaluateAssertion(assertion, executionData) {
  const { source, property, operator, target_value } = assertion;
  let actualValue = null;
  let passed = false;
  let detail = '';

  try {
    switch (source) {
      case 'status':
        actualValue = executionData.statusCode;
        break;

      case 'latency':
        actualValue = executionData.latencyMs;
        break;

      case 'header':
        if (executionData.headers && property) {
          actualValue = executionData.headers[property.toLowerCase()];
        }
        break;

      case 'json_body':
        if (executionData.data) {
          let parsed = executionData.data;
          if (typeof parsed === 'string') {
            try {
              parsed = JSON.parse(parsed);
            } catch {
              // Not JSON
            }
          }

          if (property && typeof parsed === 'object' && parsed !== null) {
            const keys = property.split('.');
            let curr = parsed;
            for (const k of keys) {
              if (curr && typeof curr === 'object' && k in curr) {
                curr = curr[k];
              } else {
                curr = undefined;
                break;
              }
            }
            actualValue = curr !== undefined ? String(curr) : null;
          } else if (typeof parsed === 'object') {
            actualValue = JSON.stringify(parsed);
          } else {
            actualValue = String(parsed);
          }
        }
        break;

      default:
        actualValue = null;
    }

    // Apply operator comparison
    switch (operator) {
      case 'equals':
        passed = String(actualValue).trim() === String(target_value).trim();
        break;

      case 'contains':
        passed = String(actualValue).toLowerCase().includes(String(target_value).toLowerCase());
        break;

      case 'less_than':
        passed = Number(actualValue) < Number(target_value);
        break;

      case 'greater_than':
        passed = Number(actualValue) > Number(target_value);
        break;

      case 'regex':
        const reg = new RegExp(target_value);
        passed = reg.test(String(actualValue));
        break;

      default:
        passed = false;
    }

    detail = `Expected [${source}${property ? '.' + property : ''}] ${operator} "${target_value}", received: "${actualValue}"`;
  } catch (err) {
    passed = false;
    detail = `Evaluation error: ${err.message}`;
  }

  return {
    assertionId: assertion.id,
    source,
    property,
    operator,
    targetValue: target_value,
    actualValue: String(actualValue),
    passed,
    detail
  };
}

function evaluateAllAssertions(assertions, executionData) {
  if (!assertions || assertions.length === 0) {
    // Default fallback check: HTTP status 200..299 or matching expectedStatus
    const statusPass = executionData.expectedStatus
      ? executionData.statusCode === executionData.expectedStatus
      : executionData.statusCode >= 200 && executionData.statusCode < 400;

    return {
      allPassed: statusPass,
      results: [
        {
          assertionId: 'default_status',
          source: 'status',
          operator: 'equals',
          targetValue: String(executionData.expectedStatus || '2xx/3xx'),
          actualValue: String(executionData.statusCode),
          passed: statusPass,
          detail: statusPass ? 'HTTP status within acceptable range' : `Unexpected HTTP status ${executionData.statusCode}`
        }
      ]
    };
  }

  const results = assertions.map(ast => evaluateAssertion(ast, executionData));
  const allPassed = results.every(r => r.passed);

  return {
    allPassed,
    results
  };
}

module.exports = {
  evaluateAssertion,
  evaluateAllAssertions
};
