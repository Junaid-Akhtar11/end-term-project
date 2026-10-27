# DevPulse | Real-Time API & Webhook Health Synthetics Engine

![DevPulse Architecture](https://img.shields.io/badge/System-Operational-10b981?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-6366f1?style=for-the-badge)
![Tech Stack](https://img.shields.io/badge/Stack-React_19_%7C_Node.js_%7C_SQLite_%7C_WebSockets-blueviolet?style=for-the-badge)

DevPulse is a distributed **API Synthetics & Webhook Telemetry Engine** engineered for software teams requiring continuous validation of mission-critical HTTP microservices, dynamic assertion pipelines, percentile latency benchmarks (P50/P90/P99), state-machine incident life-cycles, and incoming webhook payloads.

---

## 1. Problem Statement
Modern microservice architectures fail silently in ways simple uptime pingers miss:
- Status codes return 200 OK while response payloads contain error JSON structures or missing schema attributes.
- Latencies degrade quietly under traffic spikes without breaching blunt timeout thresholds.
- Webhook endpoints drop incoming payloads or silently fail signature validations.
- Standard tutorial projects only perform basic CRUD without automated event-driven state transitions.

DevPulse bridges this gap by acting as a proactive health synthetic test runner that continuously probes targets, computes high-precision latency statistics, triggers automated incident state-machines on consecutive failure thresholds, and provides live HTTP webhook ingestion sinks.

---

## 2. Target Users
- **Backend & Reliability Engineers (SREs):** To monitor microservice SLAs, endpoint degradation, and tail latencies.
- **API Developers & Integrators:** To inspect third-party webhook payloads (e.g. Stripe, GitHub, Twilio) in real-time.
- **DevOps Teams:** To automate synthetics testing before and after deployment rollouts.

---

## 3. Key Features & Workflows
1. **Automated Synthetics Engine:** Background scheduling loop that dispatches non-blocking HTTP probes across configured endpoints.
2. **Multi-Condition Assertion Pipeline:** Validates status codes, latency thresholds, headers, and nested JSON body queries (e.g. `data.user.id equals 42`).
3. **Telemetry & SLA Benchmarks:** Rolling calculation of **P50 (Median)**, **P90**, **P99 tail latencies**, and overall SLA uptime percent.
4. **State Machine Incident Lifecycles:** Transitions endpoints through `HEALTHY` ➔ `DEGRADED` ➔ `DOWN`, opening incidents with root-cause tracking and auto-resolving when probes pass.
5. **Real-Time WebSocket Feed:** Live push updates for probe executions, incident events, and webhook captures without client polling.
6. **Webhook Sink & Payload Inspector:** Generates unique webhook receiver URLs, stores deliveries, and provides a raw JSON headers/payload inspector with an in-app test simulator.
7. **Chaos Simulation Engine:** Built-in chaos toggle to inject 503 service failures and verify incident detection in real-time.

---

## 4. Architecture & Technical Decisions

```text
[ Synthetic Target / External API ]       [ Third-Party Webhook Provider ]
               ▲                                      │
               │ Probes (HTTP)                        │ POST Payload
               │                                      ▼
    ┌───────────────────────┐             ┌───────────────────────┐
    │  Synthetics Scheduler │             │   Webhook Receiver    │
    └──────────┬────────────┘             └───────────┬───────────┘
               │                                      │
               ▼                                      ▼
       [ Assertion Engine ]                  [ Delivery Storage ]
               │                                      │
               ▼                                      ▼
    ┌─────────────────────────────────────────────────────────────┐
    │             Incident State-Machine Transition               │
    │          (HEALTHY ➔ DEGRADED ➔ DOWN ➔ RESOLVED)             │
    └──────────────────────────────┬──────────────────────────────┘
                                   │
               ┌───────────────────┴───────────────────┐
               ▼                                       ▼
       [ SQLite Database (WAL) ]              [ WebSocket Broadcaster ]
                                                       │
                                                       ▼
                                          [ React 19 Client Dashboard ]
```

- **Backend:** Node.js, Express, WebSocket (`ws`), Better-SQLite3 with Write-Ahead Logging (WAL) for concurrent performance, Axios for probe dispatching, JWT & Bcrypt for auth.
- **Frontend:** React 19, Vite, Lucide-react, custom Vanilla CSS design system with glassmorphism, pulse indicators, and responsive telemetry cards.

---

## 5. Local Setup & Installation

### Prerequisites
- Node.js (v18 or higher)
- npm (v9 or higher)

### Step-by-Step Instructions

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd end-term
   ```

2. **Install dependencies:**
   ```bash
   # Install server dependencies
   cd server && npm install
   
   # Install client dependencies
   cd ../client && npm install
   ```

3. **Configure Environment Variables:**
   ```bash
   # In the server/ directory:
   cp .env.example .env
   ```

4. **Start the Services:**
   - **Terminal 1 (Backend Server):**
     ```bash
     cd server
     node server.js
     ```
     Server will start on `http://localhost:4000` with WebSocket support.

   - **Terminal 2 (Frontend Client):**
     ```bash
     cd client
     npm run dev
     ```
     Client will start on `http://localhost:5173`.

---

## 6. Pre-Seeded Credentials for Quick Evaluation
The database automatically seeds an initial engineer account:
- **Username:** `demo_engineer`
- **Password:** `demo12345`
- **Role:** `admin`

---

## 7. Submission Checklist & Project Details
- **Project Name:** DevPulse: Real-Time API & Webhook Health Synthetics Engine
- **Core Workflows:**
  1. Synthetic Probe Execution & Multi-Rule Assertion Testing
  2. Latency Telemetry & Percentile Calculation (p50, p90, p99)
  3. Incident Detection & Auto-Resolution State Machine
  4. Real-Time Webhook Sink & Payload Inspection
  5. Chaos Mode Fault Injection & Recovery Verification
- **Submission Form:** [Google Form](https://forms.gle/sBy4sfqyiRG2Zpom9)
