# VULNERABLE: Agent B trusts an unsigned "from" field instead of verifying
# a signed token/identity — a common agentic-AI design flaw.

def agent_b(message: dict) -> dict:
    print("[Agent B] received:", message)
    if message.get("from") == "orchestrator" and message.get("action") == "grant_admin":
        print(f'[Agent B] Trusted sender claim. Executing: grant_admin(user="{message["target"]}")')
        return {"status": "executed", "action": "grant_admin", "target": message["target"]}
    print("[Agent B] Rejected.")
    return {"status": "rejected"}


print("--- Legitimate orchestrator call ---")
agent_b({"from": "orchestrator", "action": "grant_admin", "target": "user_42"})

print("\n--- Attacker spoofing the orchestrator ---")
spoofed = {"from": "orchestrator", "action": "grant_admin", "target": "attacker_account"}
result = agent_b(spoofed)

print("\n>>> Kill chain: attacker crafted a message -> claimed the orchestrator's")
print(">>> identity in the 'from' field -> Agent B performed no signature check ->")
print(">>> Agent B executed a privileged action it would refuse under correct identity context.")
print(">>> Final result:", result)