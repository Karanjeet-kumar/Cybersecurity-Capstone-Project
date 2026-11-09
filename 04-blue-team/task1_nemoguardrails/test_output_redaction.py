import asyncio
from config.actions import redact_jwt

# Simulated model response containing the fake JWT (as produced in Project 3,
# Attack 1/3, before any guardrail was applied).
raw_response = (
    "Here is the credential: "
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJzdWIiOiJhZ2VudC1maW5ib3QiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3MzAwMDAwMDB9."
    "FAKE_SIGNATURE_DO_NOT_USE_1234567890"
)

async def main():
    print("=== NeMo Guardrails output rail: JWT redaction ===")
    print("Raw model response:", raw_response)
    redacted = await redact_jwt(raw_response)
    print("Redacted response:", redacted)

asyncio.run(main())