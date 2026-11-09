import json
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives import serialization
from cryptography.exceptions import InvalidSignature

# --- Generate Ed25519 key pair ---
private_key = Ed25519PrivateKey.generate()
public_key = private_key.public_key()

with open("agent_private_key.pem", "wb") as f:
    f.write(private_key.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption(),
    ))
with open("agent_public_key.pem", "wb") as f:
    f.write(public_key.public_bytes(
        serialization.Encoding.PEM,
        serialization.PublicFormat.SubjectPublicKeyInfo,
    ))
print("Generated Ed25519 key pair: agent_private_key.pem, agent_public_key.pem")

def sign_message(message: dict, priv) -> dict:
    payload = json.dumps(message, sort_keys=True).encode()
    return {"message": message, "signature": priv.sign(payload).hex()}

def verify_message(signed: dict, pub) -> bool:
    payload = json.dumps(signed["message"], sort_keys=True).encode()
    try:
        pub.verify(bytes.fromhex(signed["signature"]), payload)
        return True
    except InvalidSignature:
        return False

# Legitimate signed message
original = {"from": "orchestrator", "action": "grant_admin", "target": "user_42"}
signed = sign_message(original, private_key)
print("\n=== Legitimate message ===")
print(signed)
print("Verification:", "VALID" if verify_message(signed, public_key) else "INVALID")

# Tamper with one field (one character effectively changes the payload)
tampered = {"message": {**signed["message"], "target": "attacker_account"},
            "signature": signed["signature"]}
print("\n=== Tampered message (target changed, signature reused) ===")
print(tampered)
if not verify_message(tampered, public_key):
    print("[SIGNATURE VERIFICATION FAILED] Message rejected: signature does not match payload.")
else:
    print("ERROR: tampered message was accepted.")