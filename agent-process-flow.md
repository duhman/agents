# Elaway Email Agent Process Flow

## Complete Agent Process from HubSpot Webhook to Customer Reply

```mermaid
graph TD
    A[HubSpot Custom Code] -->|POST webhook| B[Vercel Webhook Handler]
    B --> C{Validate Request}
    C -->|Invalid| D[Return 400 Error]
    C -->|Valid| E[Parse & Mask Email]
    
    E --> F[Extract Subject & Body]
    F --> G[Call Agents SDK]
    G --> H[Hybrid Email Processor]
    
    H --> I[PII Masking]
    I --> J[Deterministic Extraction]
    J --> K{Check Classification}
    
    K -->|Non-Cancellation| L[Log & Return Early]
    K -->|Cancellation| M{Complex Case?}
    
    M -->|Yes| N[OpenAI Extraction]
    M -->|No| O[Use Deterministic Result]
    N --> P[Edge Case Detection]
    O --> P
    
    P --> Q[Create Database Ticket]
    Q --> R[Get RAG Context]
    R --> S[Generate Enhanced Draft]
    S --> T[Validate Policy Compliance]
    T --> U[Calculate Confidence Score]
    U --> V[Save Draft to Database]
    
    V --> W[Post to Slack for Review]
    W --> X{Slack Action}
    X -->|Approve| Y[Send Email to Customer]
    X -->|Edit| Z[Human Edits & Sends]
    X -->|Reject| AA[Human Handles Manually]
    
    Y --> BB[Log Human Review]
    Z --> BB
    AA --> BB
    BB --> CC[Store Feedback for Training]
    
    L --> DD[No Action - Email Ignored]
    
    style A fill:#e1f5fe
    style B fill:#f3e5f5
    style H fill:#fff3e0
    style K fill:#ffebee
    style W fill:#e8f5e8
    style Y fill:#e8f5e8
    style Z fill:#fff8e1
    style AA fill:#ffebee
```

## Detailed Classification Process

```mermaid
graph TD
    A[Raw Email Input] --> B[PII Masking]
    B --> C[Analyze Email Structure]
    C --> D[Extract Subject & Body]
    
    D --> E{Check Non-Cancellation Patterns}
    E -->|Feedback Request| F[Return: Not Cancellation]
    E -->|Question/Support| F
    E -->|Inquiry # Pattern| F
    E -->|No Match| G[Check Cancellation Patterns]
    
    G --> H{Has Cancellation Keywords?}
    H -->|Yes| I[Analyze Subject vs Body]
    H -->|No| J[Return: Not Cancellation]
    
    I --> K{Subject Indicates Non-Cancellation?}
    K -->|Yes| J
    K -->|No| L[Check Body for Cancellation Intent]
    
    L --> M{Body Has Cancellation Intent?}
    M -->|Yes| N[Return: Is Cancellation]
    M -->|No| O[Check Confidence Factors]
    
    O --> P[Calculate Standard Case]
    P --> Q[Determine Processing Method]
    
    style E fill:#ffebee
    style G fill:#e8f5e8
    style F fill:#ffcdd2
    style N fill:#c8e6c9
    style J fill:#ffcdd2
```

## Email Processing Decision Tree

```mermaid
flowchart TD
    A[Email Received] --> B[Parse Subject & Body]
    B --> C{Subject Analysis}
    
    C -->|"How would you rate..."| D[FEEDBACK REQUEST]
    C -->|"Inquiry #"| E[INQUIRY NOTIFICATION]
    C -->|"How do I..."| F[GENERAL QUESTION]
    C -->|"App not working"| G[SUPPORT REQUEST]
    C -->|"Cancel/Oppsigelse"| H[CANCELLATION REQUEST]
    C -->|"Moving + Cancel"| I[MOVING CANCELLATION]
    C -->|Other| J[ANALYZE BODY]
    
    D --> K[❌ No Action - Log as Non-Cancellation]
    E --> K
    F --> K
    G --> K
    
    H --> L[✅ Create Ticket & Draft]
    I --> L
    J --> M{Body Contains Cancellation?}
    M -->|Yes| L
    M -->|No| K
    
    L --> N[Generate Norwegian/English Draft]
    N --> O[Post to Slack for Review]
    O --> P{Human Decision}
    P -->|Approve| Q[Send to Customer]
    P -->|Edit| R[Human Edits & Sends]
    P -->|Reject| S[Human Handles]
    
    style D fill:#ffcdd2
    style E fill:#ffcdd2
    style F fill:#ffcdd2
    style G fill:#ffcdd2
    style H fill:#c8e6c9
    style I fill:#c8e6c9
    style K fill:#ffcdd2
    style L fill:#c8e6c9
    style Q fill:#a5d6a7
    style R fill:#fff9c4
    style S fill:#ffcdd2
```

## Hybrid Processing Architecture

```mermaid
graph LR
    A[Email Input] --> B[Deterministic Processor]
    B --> C{Standard Case?}
    C -->|Yes| D[Fast Processing]
    C -->|No| E[OpenAI Fallback]
    
    E --> F[GPT-4o Analysis]
    F --> G[Structured Output]
    G --> H[Edge Case Detection]
    
    D --> I[Pattern Matching]
    I --> J[Template Generation]
    
    H --> K[Enhanced Draft]
    J --> K
    
    K --> L[Policy Validation]
    L --> M[Confidence Scoring]
    M --> N[Database Storage]
    N --> O[Slack Review]
    
    style B fill:#e3f2fd
    style E fill:#fff3e0
    style F fill:#f3e5f5
    style K fill:#e8f5e8
    style O fill:#e8f5e8
```

## Database Schema & Data Flow

```mermaid
erDiagram
    TICKETS {
        uuid id PK
        string source
        text customer_email
        text raw_email_masked
        string reason
        date move_date
        timestamp created_at
    }
    
    DRAFTS {
        uuid id PK
        uuid ticket_id FK
        string language
        text draft_text
        numeric confidence
        string model
        timestamp created_at
    }
    
    HUMAN_REVIEWS {
        uuid id PK
        uuid ticket_id FK
        uuid draft_id FK
        string decision
        text final_text
        text reviewer_slack_id
        timestamp created_at
    }
    
    TICKETS ||--o{ DRAFTS : "has"
    TICKETS ||--o{ HUMAN_REVIEWS : "reviewed"
    DRAFTS ||--o{ HUMAN_REVIEWS : "reviewed"
```

## Slack Review Workflow

```mermaid
sequenceDiagram
    participant Agent
    participant Slack
    participant Human
    participant Customer
    
    Agent->>Slack: Post draft with buttons
    Note over Slack: Shows original email + draft
    Note over Slack: Approve | Edit | Reject buttons
    
    Human->>Slack: Click Approve
    Slack->>Agent: Webhook notification
    Agent->>Customer: Send approved draft
    Agent->>Agent: Log human review
    
    Human->>Slack: Click Edit
    Slack->>Agent: Webhook notification
    Human->>Customer: Send edited version
    Agent->>Agent: Log human review
    
    Human->>Slack: Click Reject
    Slack->>Agent: Webhook notification
    Human->>Customer: Handle manually
    Agent->>Agent: Log human review
```

## Key Components & Technologies

### Frontend (HubSpot)
- **Custom Code Action**: Triggers webhook with ticket data
- **Properties**: subject, description, ID, email, threadID

### Backend (Vercel)
- **Webhook Handler**: `/api/webhook` - Receives and validates requests
- **Hybrid Processor**: Deterministic + OpenAI fallback
- **Database**: Neon PostgreSQL with Drizzle ORM
- **Slack Integration**: Posts drafts for human review

### AI/ML Components
- **Pattern Matching**: Regex-based deterministic classification
- **OpenAI GPT-4o**: Complex case analysis with structured outputs
- **RAG Context**: Vector store for enhanced responses
- **Confidence Scoring**: Multi-factor confidence calculation

### Human-in-the-Loop
- **Slack Review**: Interactive buttons for approve/edit/reject
- **Feedback Loop**: Stores approved pairs for fine-tuning
- **Metrics**: Tracks accuracy and performance

## Error Handling & Monitoring

```mermaid
graph TD
    A[Request Received] --> B{Validation}
    B -->|Fail| C[Return 400 Error]
    B -->|Pass| D[Process Email]
    
    D --> E{Classification Success?}
    E -->|Fail| F[Log Error & Return 500]
    E -->|Success| G{OpenAI Available?}
    
    G -->|No| H[Fallback to Deterministic]
    G -->|Yes| I[Use OpenAI]
    
    H --> J[Generate Draft]
    I --> J
    
    J --> K{Slack Post Success?}
    K -->|Fail| L[Log Error - Continue]
    K -->|Success| M[Complete Successfully]
    
    L --> M
    
    style C fill:#ffcdd2
    style F fill:#ffcdd2
    style L fill:#fff3e0
    style M fill:#c8e6c9
```

This comprehensive flow shows how the Elaway email agent processes customer emails from initial receipt through final response, with multiple validation layers and human oversight to ensure accuracy and prevent misclassification.
