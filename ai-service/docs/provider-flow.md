# Provider Request Lifecycle

This document describes the execution path of an AI generation request through the providers and fallback wrappers.

## 1. Lifecycle Sequence Diagram

```mermaid
sequenceDiagram
    participant Client as Workflow Engine
    participant Wrapper as FallbackChatLLM
    participant Cache as ResponseCache
    participant Groq as GroqChatLLM
    participant Gemini as GeminiChatLLM
    participant Breaker as CircuitBreaker

    Client->>Wrapper: invoke(messages, request_id, content_type)
    Wrapper->>Cache: get(content_type, prompt)
    alt Cache Hit
        Cache-->>Wrapper: Return cached string
        Wrapper-->>Client: Return ChatResult (Cache Hit)
    else Cache Miss
        Wrapper->>Breaker: is_tripped()
        alt Breaker is Tripped (Groq Cooldown)
            Wrapper->>Gemini: _generate(messages)
            Gemini-->>Wrapper: ChatResult (Gemini Success)
            Wrapper-->>Client: Return ChatResult (Bypassed Groq)
        else Breaker is Closed
            Wrapper->>Groq: _generate(messages)
            alt Groq Success
                Groq-->>Wrapper: ChatResult (Groq Success)
                Wrapper-->>Client: Return ChatResult
            else Groq Failure / Timeout (Attempt 1)
                Groq->>Groq: Retry (Attempt 2)
                alt Groq Retry Success
                    Groq-->>Wrapper: ChatResult (Groq Success)
                    Wrapper-->>Client: Return ChatResult
                else Groq Retry Failure
                    Groq-->>Wrapper: Exception
                    Wrapper->>Breaker: record_failure()
                    Wrapper->>Gemini: _generate(messages)
                    alt Gemini Success
                        Gemini-->>Wrapper: ChatResult (Gemini Success)
                        Wrapper-->>Client: Return ChatResult (Fallback Used)
                    else Gemini Failure
                        Gemini-->>Wrapper: Exception
                        Wrapper-->>Client: Raise RuntimeError
                    end
                end
            end
        end
    end
```

---

## 2. Step-by-Step Flow Description

### Step 2.1: Cache Verification
The `FallbackChatLLM` checks the `ResponseCache` using the hashed prompt. If a valid entry exists within the TTL period, it immediately triggers a `cache_hit` event log and returns a mocked LangChain `ChatResult` to the engine.

### Step 2.2: Circuit Breaker Validation
Before attempting the primary provider, the wrapper queries `global_groq_breaker.is_tripped()`. If tripped:
- A circuit breaker tripped event is logged.
- The request immediately skips the primary provider and invokes the Gemini provider directly.
- The request does not block, wait, or queue, avoiding unnecessary latency.

### Step 2.3: Primary Execution (Groq)
If the circuit is closed:
- The request ID is passed down.
- Groq wrapper attempts execution.
- If it encounters an exception, it waits and retries exactly **once**.
- If the retry also fails, the exception is caught, recorded as a Groq failure (and timeout, if applicable) in metrics, and the failure timestamp is recorded in `global_groq_breaker`.

### Step 2.4: Fallback Execution (Gemini)
If Groq fails or the circuit was already tripped:
- The Gemini wrapper is invoked via direct HTTPX POST calls to Google's generative language API.
- If Gemini succeeds, it is returned, and a fallback event is recorded in metrics.
- If Gemini also fails, a `RuntimeError` is raised, indicating that both providers are exhausted.
