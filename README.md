# InsightAI

> **An AI-powered data analyst that turns raw datasets into executable analysis, visualizations, and evidence-backed insights.**

InsightAI is a full-stack AI data analysis application that lets users upload a CSV or Excel dataset, ask questions in natural language, and receive analysis based on the actual data.

Instead of asking an LLM to calculate answers directly, InsightAI uses a structured analysis pipeline:

```text
Natural-language question
        ↓
Gemini Planner
        ↓
Validated analysis plan
        ↓
Pandas execution
        ↓
Verified results
        ↓
Gemini explanation
        ↓
Charts + insights
```

This separation between **reasoning and computation** is the core design principle of the project.

---

## Features

### 📊 Dataset analysis
- Upload CSV and XLSX datasets
- Dataset preview
- Column-level profiling
- Missing-value and duplicate-row information
- Numeric statistics
- Dataset health information
- Private dataset storage

### 🤖 Natural-language analysis
Ask questions such as:

> "Which product generated the most revenue?"

> "Show the percentage share of each product."

> "Compare Latte with Hot Chocolate by payment type."

InsightAI converts the question into a structured analysis workflow rather than allowing the AI model to invent numerical answers.

### 🔬 Verified analysis pipeline

The AI planner produces structured operations that are validated before execution.

Supported operations include:

- Describe
- Group by
- Top N
- Filter
- Sort
- Correlation
- Compare
- Share
- Difference
- Percentage change
- Time grouping

Pandas performs the actual calculations against the uploaded dataset.

### 🔗 Multi-step analysis

Complex questions can be broken into multiple dependent or independent analysis steps.

Example:

```text
Question
  ↓
Step 1: Group revenue by product
  ↓
Step 2: Calculate product share
  ↓
Step 3: Compare selected products
  ↓
Verified final result
```

Later steps can reference results from earlier steps, while independent branches can execute from the original dataset.

### 📈 Visualizations

InsightAI generates visualizations from verified analysis results using:

- Bar charts
- Line charts
- Pie charts

The visualization is based on the executed result rather than raw LLM-generated numbers.

### 💡 Evidence-backed insights

After computation, Gemini receives the verified results and generates a natural-language explanation.

The system is designed to distinguish between:

- What the data actually shows
- What can be calculated
- What the analysis does **not** establish

This helps avoid presenting unsupported causal explanations as facts.

### 🔁 Follow-up questions

After an analysis is completed, InsightAI generates deterministic follow-up suggestions based on the existing analysis.

Users can continue exploring the same dataset without starting from scratch.

### 🕘 Analysis history

Completed and previous analyses can be accessed through Analysis History, making it possible to revisit earlier questions and results.

### 🔐 Authentication and data isolation

The application uses Supabase authentication and owner-based authorization.

Users can only access their own:

- Datasets
- Dataset previews
- Dataset profiles
- Analyses

Dataset files are stored in a private Supabase Storage bucket.

---

## Architecture

```text
                         ┌─────────────────────┐
                         │   React + Vite UI   │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │    FastAPI API      │
                         └──────────┬──────────┘
                                    │
                    ┌───────────────┼────────────────┐
                    ▼               ▼                ▼
             Dataset Service   Analysis API     Auth Service
                    │               │
                    ▼               ▼
             Supabase Storage   Analysis Worker
                                    │
                                    ▼
                              Gemini Planner
                                    │
                                    ▼
                              Plan Validator
                                    │
                                    ▼
                               Pandas Engine
                                    │
                                    ▼
                             Verified Results
                                    │
                                    ▼
                             Gemini Insight
                                    │
                                    ▼
                           Visualization + UI
```

### Analysis architecture

The most important part of InsightAI is the separation between AI reasoning and deterministic computation.

```text
User question
     │
     ▼
Gemini
     │
     │ structured plan
     ▼
Pydantic validation
     │
     │ valid plan
     ▼
Analysis Engine
     │
     │ Pandas operations
     ▼
Actual dataset results
     │
     ▼
Gemini
     │
     │ explanation of verified results
     ▼
User
```

The model does not directly calculate the final numerical answer.

---

## Tech Stack

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS
- Recharts
- Lucide React

### Backend
- Python
- FastAPI
- Pydantic
- SQLAlchemy
- Pandas
- NumPy

### AI
- Google Gemini API
- `google-genai`

### Database & Storage
- Supabase PostgreSQL
- Supabase Storage
- Supabase Authentication

### Infrastructure
- Vercel — frontend
- Render — backend
- GitHub — source control

---

## Project Structure

```text
InsightAI/
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── analyses.py
│   │   │   ├── auth.py
│   │   │   └── datasets.py
│   │   │
│   │   ├── models/
│   │   │   ├── analysis.py
│   │   │   ├── analysis_schema.py
│   │   │   ├── dataset.py
│   │   │   └── visualization_schema.py
│   │   │
│   │   └── services/
│   │       ├── ai.py
│   │       ├── analysis_engine.py
│   │       ├── auth.py
│   │       ├── followups.py
│   │       ├── insight_generator.py
│   │       ├── planner.py
│   │       ├── profiler.py
│   │       ├── resource_limits.py
│   │       ├── storage.py
│   │       └── visualization.py
│   │
│   ├── sql/
│   ├── database.py
│   ├── config.py
│   ├── main.py
│   ├── run.py
│   └── worker.py
│
├── frontend/
│   └── src/
│       ├── components/
│       ├── lib/
│       ├── pages/
│       ├── App.tsx
│       └── main.tsx
│
└── README.md
```

---

## Local Development

### Prerequisites

- Node.js
- Python 3.11+
- A Supabase project
- A Google Gemini API key

### 1. Clone the repository

```bash
git clone https://github.com/btwitssparth/InsightAI.git
cd InsightAI
```

### 2. Backend setup

```bash
cd backend

python -m venv venv
```

Activate the environment.

Windows:

```powershell
venv\Scripts\activate
```

macOS/Linux:

```bash
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create `.env`:

```env
DATABASE_URL=your_database_connection_string

SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key

GEMINI_API_KEY=your_gemini_api_key
```

Start the API:

```bash
python run.py
```

The API runs locally at:

```text
http://localhost:8000
```

Start the analysis worker in another terminal:

```bash
python worker.py
```

The worker processes queued analysis jobs.

### 3. Frontend setup

```bash
cd frontend
npm install
```

Create `.env`:

```env
VITE_API_URL=http://localhost:8000
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

Start the frontend:

```bash
npm run dev
```

---

## Environment Variables

### Backend

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Server-side Supabase access |
| `GEMINI_API_KEY` | Gemini API authentication |

### Frontend

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | FastAPI backend URL |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Browser-side Supabase key |

**Never commit secret keys or production credentials to Git.**

---

## API Overview

### Authentication

```http
GET /auth/me
```

Returns the authenticated user's information.

### Datasets

```http
POST /datasets/upload
GET  /datasets/
GET  /datasets/{dataset_id}
GET  /datasets/{dataset_id}/preview
GET  /datasets/{dataset_id}/profile
GET  /datasets/{dataset_id}/analyses
DELETE /datasets/{dataset_id}
```

### Analyses

```http
POST /analyses/ask
POST /analyses/execute
GET  /analyses/
GET  /analyses/{analysis_id}
```

The asynchronous analysis endpoint queues work for the analysis worker, allowing longer-running AI/data-processing workflows to execute outside the request lifecycle.

---

## Example

Given a dataset containing:

| Product | Revenue |
|---|---:|
| Laptop | 125,000 |
| Monitor | 30,000 |
| Keyboard | 5,000 |
| Mouse | 2,500 |

A question such as:

> "Show the percentage share of each product."

can produce verified results such as:

| Product | Share |
|---|---:|
| Laptop | 76.92% |
| Monitor | 18.46% |
| Keyboard | 3.08% |
| Mouse | 1.54% |

The percentages are calculated by the analysis engine from the dataset. Gemini is then used to explain the verified output.

---

## Design Principles

### 1. AI plans, code calculates

The LLM is responsible for interpreting natural language and producing an executable plan.

Pandas is responsible for numerical computation.

### 2. Validate before execution

AI-generated plans pass through Pydantic validation before reaching the analysis engine.

### 3. Results before explanations

The insight generator receives computed results rather than asking the model to independently calculate the answer.

### 4. User data isolation

Dataset and analysis access is scoped to the authenticated user.

### 5. Transparent limitations

The generated insight is expected to stay within what the executed analysis can establish instead of inventing explanations for observed patterns.

---

## Security Considerations

InsightAI includes several protections around uploaded data and API access:

- Supabase authentication
- Owner-based dataset authorization
- Owner-based analysis authorization
- Private dataset storage
- File extension and MIME validation
- File signature validation
- 10 MB upload limit
- Resource limits for uploaded datasets
- JSON sanitization for Pandas values such as `NaN`
- Server-side validation of AI-generated analysis plans
- Environment-based secret management

---

## Deployment

The application is deployed as two services:

**Frontend**

Vercel

**Backend**

Render

The production application uses Supabase for authentication, PostgreSQL data, and dataset storage.

---

## Future Improvements

Planned improvements include:

- More analysis operations
- More visualization types
- Stronger follow-up context between analyses
- Dataset transformations and cleaning
- Statistical analysis
- Machine-learning workflows
- Better job progress reporting
- Analysis export
- Larger dataset support
- More granular resource controls
- Automated tests and CI/CD improvements

---

## Why InsightAI?

Traditional AI data-analysis tools can blur the line between reasoning and computation.

InsightAI is built around a different approach:

> **The AI decides what should be calculated. The analysis engine calculates it. The AI explains what was actually calculated.**

This makes the system easier to reason about, validate, and extend while keeping numerical computation grounded in the source dataset.

---

## License

This project is currently intended as a portfolio and learning project.
