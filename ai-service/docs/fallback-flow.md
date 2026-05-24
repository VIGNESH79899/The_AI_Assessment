# Failover and Circuit Breaker Parameters

This document details the circuit breaker and fallback trigger mechanics designed to protect the service under rate-limiting, downtime, or validation failures.

---

## 1. Circuit Breaker Parameters

The circuit breaker for the primary Groq provider operates under the following thresholds:

| Parameter | Value | Rationale / Behavior |
| :--- | :--- | :--- |
| **Failure Limit** | `5` | Maximum failures allowed before tripping the circuit. |
| **Failure Window** | `120.0 seconds` | The sliding window size in which the failures must occur. |
| **Cooldown Duration** | `300.0 seconds` | Time the circuit remains tripped before attempting Groq again. |

- **State - Closed (Healthy)**: Requests flow to Groq. Retries and failures are tracked.
- **State - Open (Tripped/Degraded)**: If `5` failures are registered in any `120s` period, the circuit trips. All Groq requests are bypassed for `300s`, directing traffic immediately to Gemini to preserve latency.
- **State - Half-Open**: After `300s` cooldown, the circuit naturally allows a probe request to Groq. If it succeeds, the breaker resets. If it fails, the breaker trips again for another `300s`.

---

## 2. Fallback Triggers

Fallback failovers are categorized into two layers: **Wrapper-level failures** and **Workflow-level failures**.

```
+-------------------------------------------------------------+
|               Wrapper-Level Failover (API Layer)            |
| - API timeouts (Groq 10s timeout limit)                     |
| - Network / Connection issues                               |
| - Provider rate limits (HTTP 429)                           |
| - Invalid/expired key exceptions (HTTP 401)                 |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|               Workflow-Level Failover (Validation Layer)    |
| - Output fails schema validation                            |
| - Empty sections or missing keys                            |
| - Word count under minimum threshold (150 words)            |
| - Excessive repetition/infinite loop loops                  |
| - Canned AI refusal signatures                              |
+-------------------------------------------------------------+
```

### 2.1 API Wrapper Failovers
These are handled automatically by `FallbackChatLLM`. If the primary provider raises a Python exception (such as `groq.APIConnectionError`, `groq.RateLimitError`, or a general connection timeout), it:
1. Logs a `provider_failure` event.
2. Updates `global_metrics`.
3. Triggers the circuit breaker increment.
4. Switches execution transparently to the Gemini fallback provider.

### 2.2 Validation / Workflow Failovers
If the LLM responds successfully, but the output fails the rigorous quality checking in `validate_content()` (e.g. malformed JSON or word count < 150 words), the workflow engine:
1. Records a validation failure for the active provider.
2. Emits a structured JSON warning log.
3. Explicitly requests Gemini bypass execution using `self.run_ai_pipeline(llm=self.llm.gemini_llm)`.
4. If Gemini validation passes, that output is cached and returned.
5. If Gemini validation also fails, the workflow reverts to a safe local fallback payload to prevent frontend crash or blank document generation.
