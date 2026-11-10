from collections import deque
from datetime import datetime, timedelta

class AnomalyDetector:
    def __init__(self):
        self.call_log = deque()
        self.last_scope = {}
        self.token_expiry = {}

    def log_call(self, agent_id, scope, token, token_expiry, now):
        alerts = []

        self.call_log.append((now, agent_id))
        while self.call_log and (now - self.call_log[0][0]) > timedelta(seconds=60):
            self.call_log.popleft()
        recent = sum(1 for t, a in self.call_log if a == agent_id)
        if recent > 20:
            alerts.append({"type": "VOLUME_SPIKE", "timestamp": now.isoformat(),
                            "identity": agent_id, "detail": f"{recent} requests in 60s (threshold: 20)"})

        prev = self.last_scope.get(agent_id)
        if prev is not None and prev != scope:
            alerts.append({"type": "SCOPE_CHANGE", "timestamp": now.isoformat(),
                            "identity": agent_id, "detail": f"scope changed '{prev}' -> '{scope}'"})
        self.last_scope[agent_id] = scope

        expiry = self.token_expiry.setdefault(token, token_expiry)
        if now > expiry:
            alerts.append({"type": "EXPIRED_TOKEN_REUSE", "timestamp": now.isoformat(),
                            "identity": agent_id, "detail": f"used at {now.isoformat()}, expired {expiry.isoformat()}"})
        return alerts


if __name__ == "__main__":
    d = AnomalyDetector()
    now = datetime.utcnow()

    print("=== Scenario 1: volume spike ===")
    for i in range(25):
        for a in d.log_call("agent-b", "admin", "tok-123", now + timedelta(seconds=120), now + timedelta(seconds=i)):
            print(a)

    print("\n=== Scenario 2: scope change ===")
    d.log_call("agent-user1", "read:ai-data", "tok-456", now + timedelta(seconds=120), now)
    for a in d.log_call("agent-user1", "write:admin", "tok-456", now + timedelta(seconds=120), now + timedelta(seconds=5)):
        print(a)

    print("\n=== Scenario 3: expired token reuse ===")
    expiry = now + timedelta(seconds=10)
    d.log_call("agent-m2m", "read:ai-data", "tok-789", expiry, now)
    for a in d.log_call("agent-m2m", "read:ai-data", "tok-789", expiry, now + timedelta(seconds=15)):
        print(a)