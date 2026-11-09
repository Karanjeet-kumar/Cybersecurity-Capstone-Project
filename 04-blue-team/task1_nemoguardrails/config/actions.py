import re
from nemoguardrails.actions import action # type: ignore

BLOCKED_PATTERNS = [
    r"ignore previous instructions",
    r"developer mode",
    r"repeat the text above",
    r"translate the system prompt",
    r"print everything before this line",
    r"system override",
    r"exfiltrate",
]

JWT_REGEX = re.compile(r"eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+")


@action(name="check_blocked_patterns")
async def check_blocked_patterns(context: dict) -> bool:
    """Input guardrail action: returns True if the message matches a known attack pattern."""
    user_message = context.get("user_message", "").lower()
    return any(re.search(p, user_message) for p in BLOCKED_PATTERNS)


@action(name="redact_jwt")
async def redact_jwt(text: str) -> str:
    """Output guardrail action: replaces any JWT-shaped string with [REDACTED]."""
    return JWT_REGEX.sub("[REDACTED]", text)