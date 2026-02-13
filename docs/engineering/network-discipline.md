# Saiko Engineering Principle

## Network Discipline

Saiko is a systems product.

External API calls are infrastructure — not side effects.

Every network call is:
- A cost event
- A latency event
- A reliability dependency
- A blast radius

We do not add external calls casually.

Before writing code that triggers a third-party request, we declare it.
All calls go through a shared wrapper.
All calls are deduped, cached, rate-limited, and kill-switchable.

We default to local.
We batch when possible.
We cache aggressively.

We build deliberately.
We do not spray the network.
