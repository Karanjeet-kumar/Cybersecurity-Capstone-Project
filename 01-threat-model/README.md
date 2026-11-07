# Capstone Project Assessment

## Project 1 – Threat Model the AI Identity System

This document converts the supplied _Capstone Project 1.pdf_ into Markdown. The text and tables below preserve the source document's terminology and findings. Images are included for the original diagrams and supporting screenshots.

---

## 1. Threat Modelling – Identity types in the SecureNova AI Platform

### 1.1 Human user (customer)

The actual end-user or customer interacting with the application. This is a highly secure, standard flow for public and native applications to securely authenticate users without exposing credentials.

| Field                        | Description                                                                                                                                       |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Authentication Mechanism** | **Auth0 Universal Login** utilizing **OIDC Auth Code + PKCE**, alongside **TOTP MFA** (Time-based One-Time Password Multi-Factor Authentication). |
| **Privilege Level**          | `read:ai-data` (own data only). The user can only view or read AI-generated data or responses that belong strictly to their own account context.  |

### 1.2 Human admin / support lead

Internal staff members who manage the system or provide customer support.

| Field                        | Description                                                                                                                                                |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Authentication Mechanism** | The same as the user (**Auth0 + MFA**), but strictly enforced through an enterprise connection (**SSO**).                                                  |
| **Privilege Level**          | `read:ai-data`, `write:admin`. They have elevated privileges allowing them to read general AI data and execute administrative write/configuration actions. |

### 1.3 AI agent (LLM agent)

The central core AI or Large Language Model orchestrator executing tasks.

| Field                        | Description                                                                                                                                                                                                                                                                             |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Authentication Mechanism** | Acts on behalf of user via a user's access token (**OBO - On-Behalf-Of flow**) combined with an `agent_id` claim using **Ed25519-signed inter-agent messages**. This ensures that the agent's actions are cryptographically signed and directly tied to the authorizing user's session. |
| **Privilege Level**          | Inherits user scope, never more. The AI agent is strictly sandboxed; it cannot perform any action or access any data that the initiating human user does not already have permission to access.                                                                                         |

### 1.4 OAuth M2M client (agent backend)

The backend service infrastructure supporting the AI agent, communicating machine-to-machine (M2M).

| Field                        | Description                                                                                                                                                                                                                             |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Authentication Mechanism** | **Client Credentials** utilizing a `client_secret` or `private_key_jwt` with a short **60–300s TTL** (Time-To-Live). This is standard for secure server-to-server communication where tokens expire rapidly to reduce exposure windows. |
| **Privilege Level**          | `read:ai-data`. The backend service has programmatic read access to the broader pool of AI system data to serve its functions.                                                                                                          |

### 1.5 LLM API key (model provider)

The credential used to authenticate requests sent to the upstream foundational model provider (e.g., OpenAI, Anthropic).

| Field                        | Description                                                                                                                                                                                        |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Authentication Mechanism** | Static bearer key securely injected and retrieved via a secrets manager.                                                                                                                           |
| **Privilege Level**          | Inference only, billing exposure. This key is strictly restricted to running model inference (generating text/data) but carries a risk profile related to financial/billing consumption if abused. |

### 1.6 RAG pipeline service identity

The automated background service responsible for Retrieval-Augmented Generation (RAG) processes.

| Field                        | Description                                                                                                                            |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Authentication Mechanism** | M2M token providing read-only access to the vector store database.                                                                     |
| **Privilege Level**          | `read:kb`. It holds restricted permission to query and read data from the system's Knowledge Base (`kb`) to contextualize LLM prompts. |

### 1.7 MCP server identity

The Model Context Protocol (MCP) server identity, which manages tools or integrations the AI can invoke.

| Field                        | Description                                                                                                                                                                                                          |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Authentication Mechanism** | M2M token per tool paired with a per-tool scope. Every tool integration has its own isolated, highly specific token.                                                                                                 |
| **Privilege Level**          | Tool-specific (`write:admin`, `read:pii-export`). Depending on the specific tool's role, it can carry highly sensitive privileges like administrative writes or exporting Personally Identifiable Information (PII). |

---

## 2. STRIDE Matrix – With Data Flow Diagram

### 2.1 STRIDE Matrix

Applying all six STRIDE categories to every identity flow in the system.

| Flow                                    | S (Spoofing)                          | T (Tampering)                              | R (Repudiation)                            | I (Information disclosure)                  | D (Denial of service)              | E (Elevation)                          |
| --------------------------------------- | ------------------------------------- | ------------------------------------------ | ------------------------------------------ | ------------------------------------------- | ---------------------------------- | -------------------------------------- |
| **F1 – User → Chat App (login)**        | Credential stuffing / phished session | Token tampering in transit (mitigated TLS) | User denies action; no per-user audit logs | ID token leakage in logs                    | Login flood                        | Account takeover → admin               |
| **F2 – Chat App → Agent (user token)**  | Stolen/replayed access token          | Prompt tampering in request                | Agent actions not tied to `sub`            | Token echoed in LLM context                 | Token-heavy requests               | Agent accepts self-asserted role       |
| **F3 – Agent → LLM provider (API key)** | Stolen API key used by attacker       | Response manipulation                      | No key-level audit                         | Key exfiltration via prompt injection       | Unbounded consumption / quota burn | Key shared across environments         |
| **F4 – Agent → RAG pipeline**           | Fake KB source                        | Chunk poisoning                            | Unknown chunk provenance                   | Over-broad retrieval of other tenants' data | Vector DB exhaustion               | Retrieved text treated as instructions |
| **F5 – Agent → MCP server**             | Tool-call forgery                     | Tool args tampered                         | No tool-call log                           | Tool returns PII                            | Tool call loops                    | Agent calls admin tool without scope   |
| **F6 – Agent A → Agent B**              | Orchestrator impersonation            | Message altered mid-hop                    | Sender can deny instruction                | Context leakage between agents              | Message flood                      | Privileged action by spoofed message   |
| **F7 – M2M client → Internal API**      | Client secret theft                   | JWT algorithm confusion                    | Missing `jti` / client audit               | Long-lived tokens leaked                    | Token-endpoint abuse               | Scope creep on M2M app                 |
| **F8 – Auth0 → apps (token issue)**     | Rogue IdP / misconfigured callback    | Claim tampering (needs RS256 verify)       | Auth0 log retention too short              | Verbose errors                              | Brute-force lockouts used as DoS   | Overly broad scopes/audience           |

### 2.2 Data-flow diagram

The source describes the complete data-flow diagram (DFD) as built in **OWASP Threat Dragon**, with three layers:

- **TB1 – User Layer**
- **TB2 – Agent Layer**
- **TB3 – Internal API Layer**

![Data-flow diagram](images/data-flow-diagram.png)

The diagram shows the customer interacting with the Chat Web App, which communicates with the LLM Agent. The agent connects to the LLM Provider API, RAG pipeline/vector database, MCP server, and internal REST API. Auth0 is shown issuing tokens for the relevant flows, and the internal API accesses the customer database.

#### Threat Dragon screenshots

The source includes Threat Dragon screenshots showing the model and selected STRIDE threats. The caption identifies the highlighted flow as **Auth0 Tenant → Chat Web App (Token Issuance)**.

![Threat Dragon overview](images/threat-dragon-overview.png)

![STRIDE threat example](images/stride-threat-example.png)

---

## 3. Attack Trees and the Scores of each Threat

### 3.1 LLM API key exfiltration via prompt injection

![Attack tree – LLM API key exfiltration](images/attack-tree-api-key-exfiltration.png)

**Risk Score** = Likelihood × Impact = 4 × 4 = **16 (High)**

### 3.2 Agent identity spoofing to gain elevated API scope

![Attack tree – Agent identity spoofing](images/attack-tree-agent-identity-spoofing.png)

**Risk Score** = Likelihood × Impact = 3 × 5 = **15 (High)**

### 3.3 RAG chunk poisoning to manipulate agent behavior

![Attack tree – RAG chunk poisoning](images/attack-tree-rag-poisoning.png)

**Risk Score** = Likelihood × Impact = 4 × 4 = **16 (High)**

---

## 4. MITRE ATLAS Mapping

### 4.1 Mapping each Attack Tree to the Closest MITRE ATLAS Technique

| Attack Tree Scenario                  | Closest ATLAS Technique | ATLAS ID    |
| ------------------------------------- | ----------------------- | ----------- |
| Key exfiltration via prompt injection | LLM Prompt Injection    | `AML.T0051` |
| Agent identity spoofing               | Impersonation           | `AML.T0073` |
| RAG chunk poisoning                   | RAG Poisoning           | `AML.T0070` |

The source states that the supporting image provides the ID of the closest MITRE ATLAS technique and that the image below shows the RAG Poisoning technique found on the MITRE ATLAS organization site.

![MITRE ATLAS – RAG Poisoning](images/mitre-atlas-rag-poisoning.png)

### 4.2 Final Risk-Ranked Register

The final risk-ranked register is shown in the source as an Excel screenshot.

![Final risk-ranked register](images/risk-ranked-register.png)

---

**END OF PROJECT 1**
