# Duely AI Assistant

BUILD DUELY — MVP V1

AI-Native Financial Operations Assistant

Build a production-quality MVP of Duely, an AI-native financial operations platform for freelancers, small businesses, agencies, consultants and service businesses.

Duely helps a business manage:

Clients

Invoices

Payments

Payment reminders

Basic contracts

Client communication

AI-powered financial operations

The central product principle is:

The user talks to Duely. Duely understands the request, uses the user's data and business context, performs the appropriate action, and explains what it did.

This is NOT a traditional accounting dashboard with an AI chatbot added to it.

The AI is the primary operating interface.

1. MVP SCOPE

Build ONLY the following core MVP workflows:

Core workflow

User
→ creates client through AI
→ creates invoice through AI
→ sends invoice
→ tracks payment
→ detects overdue invoice
→ AI recommends/sends reminder
→ user can record payment through AI
→ Duely updates client financial history
→ Duely stores relevant memory.

MVP features

Authentication

Business onboarding

AI Command Center

Dashboard

Clients

Client profiles

Invoices

Invoice detail

AI-generated reminders

Payment recording

Company preferences/policies

Client memory

Basic AI activity history

Responsive mobile experience

Arabic + English support

RTL support

build advanced contract management, DocuSign, WhatsApp automation, predictive ML, fine-tuning, or complex financial forecasting in V1.

Create the architecture so these can be added later.

2. TECHNOLOGY

Use:

React + Vite

TypeScript

Tailwind CSS

shadcn/ui

Supabase

PostgreSQL

Supabase Auth

Supabase Storage

Supabase Edge Functions where appropriate

OpenAI API through a secure server-side function

pgvector only if needed for the initial memory/knowledge architecture

NEVER expose the OpenAI API key in frontend code.

All AI requests must go through a secure backend/server-side function.

3. DESIGN DIRECTION

Use the current visual identity and color palette of the existing Yalla Duely Base44 application as the visual source of truth.

IMPORTANT:

Do NOT use the old blue/slate palette from the original specification.

Match the existing Yalla Duely application's:

Primary color: Purple

Accent color: Lemon

Background

Surface colors

Borders

Typography

Button styles

Active states

Status colors

Overall visual character

Create centralized CSS/design tokens so the palette can be changed globally later.

The product should feel:

Premium

Modern

Trustworthy

AI-native

Financial

Calm

Minimal

Sophisticated

Avoid:

Generic SaaS templates

Excessive gradients

Excessive shadows

Excessive rounded cards

Visual clutter

Old-fashioned accounting software aesthetics

4. CORE UX PRINCIPLE

Duely must be:

CHAT-FIRST

The user should be able to perform the major MVP operations through natural language.

Examples:

"Create a client called ABC Company."

"Create an invoice for ABC for AED 12,000."

"Make it due in 30 days."

"Send the invoice."

"Who owes me money?"

"Which invoices are overdue?"

"Remind ABC about the overdue invoice."

"Record that ABC paid AED 5,000."

"How much am I expecting this month?"

"Show me my highest-risk clients."

The AI should interpret the request and execute the appropriate operation.

5. GLOBAL LAYOUT

Desktop:

AI Command Center: approximately 30%

Main Workspace: approximately 70%

The AI Command Center remains persistent.

Mobile:

Main workspace becomes primary

AI Command Center becomes an expandable bottom sheet

A persistent AI button opens the assistant

Do not make the AI feel like a secondary chatbot.

Label it:

Duely AI

or

Duely Command Center

6. AI COMMAND CENTER

Build a polished AI interface.

Header:

Duely AI
● Online

Conversation area:

User messages aligned right

AI messages aligned left

Clean typography

Natural conversational spacing

Input:

Text input

Send button

Voice icon placeholder for future implementation

Auto-resizing input

Context indicator:

Examples:

"Context: ABC Company"

"Context: Invoice INV-001"

When the user selects an invoice or client in the workspace, automatically inject that context into the AI session.

7. AI ACTION CARDS

When an action requires confirmation, display an action card inside the AI conversation.

Example:

Create Invoice

Client:
ABC Company

Amount:
AED 12,000

Due:
30 days

Action:
Create invoice

Buttons:

[Approve]
[Modify]
[Cancel]

Do NOT use generic modal dialogs for AI approval.

8. AI AUTONOMY MODEL

Implement three autonomy levels:

AUTO

Low-risk actions can execute immediately.

Examples:

Create draft invoice

Create client

Calculate totals

Analyze overdue status

Generate reports

Record a confirmed payment

APPROVAL_REQUIRED

The AI prepares the action but requires confirmation.

Examples:

Send payment reminder

Change payment terms

Create payment plan

Apply discount

Send invoice externally

HUMAN_ONLY

The AI must not execute.

Examples:

Cancel significant debt

Major financial concessions

Legal disputes

Terminating a client relationship

Store the autonomy level with every AI action.

9. AI ARCHITECTURE

Do NOT implement the AI as one giant prompt.

Create a modular AI architecture.

AI Orchestrator

The backend receives:

User message

User identity

Company

Current page

Current selected object

Relevant company policies

Relevant client memory

Recent financial context

Then determines:

Intent

Entities

Required action

Risk level

Whether approval is required

Tool to execute

Response

Use structured JSON internally.

Example:

{
"intent": "create_invoice",
"confidence": 0.97,
"autonomy": "auto",
"parameters": {
"client_id": "...",
"amount": 12000,
"currency": "AED",
"due_date": "..."
},
"requires_confirmation": false
}

10. AI TOOLS

Implement tool/function abstractions for:

create_client

update_client

get_client

list_clients

create_invoice

update_invoice

get_invoice

list_invoices

send_invoice

record_payment

get_outstanding_balance

list_overdue_invoices

generate_reminder

send_reminder

get_dashboard_summary

get_client_financial_summary

get_company_policies

update_company_policy

save_memory

The AI should NEVER directly manipulate database tables.

The AI requests a tool.

The backend validates the request.

The backend executes the tool.

The backend returns the result.

11. DATABASE

Use Supabase PostgreSQL.

Create at minimum:

profiles

id

full_name

email

phone

company_name

preferred_language

currency

created_at

updated_at

clients

id

owner_id

name

company_name

email

phone

billing_address

preferred_language

status

notes

created_at

updated_at

invoices

id

owner_id

client_id

invoice_number

amount

currency

status

issue_date

due_date

paid_date

paid_amount

remaining_balance

items JSONB

notes

pdf_url

created_at

updated_at

Statuses:

draft
sent
viewed
partially_paid
paid
overdue
cancelled

payments

id

owner_id

invoice_id

client_id

amount

currency

payment_date

payment_method

reference

notes

created_at

reminders

id

owner_id

invoice_id

client_id

channel

reminder_type

message

status

scheduled_at

sent_at

created_at

company_policies

id

owner_id

policy_key

policy_value JSONB

created_at

updated_at

Examples:

reminder_policy
default_payment_terms
default_currency
approval_threshold
preferred_tone

client_memory

id

owner_id

client_id

memory_type

memory_key

memory_value JSONB

confidence

source

created_at

updated_at

Examples:

payment_behavior
communication_preference
relationship_status
important_preference
risk_signal

ai_conversations

id

owner_id

session_id

role

message

context JSONB

created_at

ai_actions

id

owner_id

conversation_id

intent

tool_name

parameters JSONB

autonomy_level

confidence

status

result JSONB

created_at

12. SECURITY

Implement Supabase Row Level Security.

Every business user can only access their own:

Clients

Invoices

Payments

Reminders

Policies

Memories

AI conversations

AI actions

Never expose another company's data.

Clients should NOT be implemented as a full multi-tenant role in V1 unless required for the MVP.

Prepare the schema for client accounts later.

13. DASHBOARD

The dashboard should answer:

1. What needs my attention?

2. How much money is at risk?

3. What can Duely handle?

Top metrics:

Outstanding

Overdue

Paid this month

Expected this month

Then:

Duely Intelligence

Examples:

"ABC Company is 8 days overdue."

"You have 3 overdue invoices."

"You are expecting AED 42,500 this month."

"ABC usually pays within 5 days of the due date."

Then:

Recent AI Activity

Examples:

Invoice created

Reminder prepared

Payment recorded

Client profile updated

Then:

Overdue Invoices

Show:

Client

Invoice

Amount

Days overdue

Recommended action

Clicking an item should open its detail view and inject context into Duely AI.

14. CLIENTS

Create a Clients page.

Each client card should display:

Name

Company

Outstanding

Total billed

Payment status

Risk indicator

Click client:

Open Client Profile.

15. CLIENT PROFILE

Show:

Overview

Total billed

Total paid

Outstanding

Average payment delay

Number of invoices

Overdue invoices

Payment behavior

Basic calculated metrics:

Average delay

On-time percentage

Total overdue amount

Client Intelligence

Example:

"ABC usually pays 4–7 days after the due date."

"Client has 2 overdue invoices."

"Payment behavior has improved over the last 3 months."

These insights must be calculated from actual database data.

Do not fabricate insights.

16. CLIENT MEMORY

Implement the first version of Duely memory.

When a meaningful event occurs, store structured memory.

Examples:

User says:

"ABC is a VIP client."

Store:

memory_type = relationship_status
memory_key = vip
memory_value = true

User says:

"Don't send ABC reminders on weekends."

Store:

memory_type = communication_preference
memory_key = no_weekend_reminders
memory_value = true

Payment history can automatically generate behavioral memory.

Do NOT modify important company policies silently.

When a user wants to establish a global rule, ask for confirmation.

17. INVOICES

Invoices page:

Tabs:

All
Draft
Sent
Paid
Overdue

Each invoice shows:

Invoice number

Client

Amount

Status

Due date

Remaining balance

Clicking an invoice opens Invoice Detail.

18. INVOICE DETAIL

Display:

Invoice number

Client

Amount

Items

Issue date

Due date

Paid amount

Remaining balance

Status

Payment timeline:

Invoice created

Invoice sent

Reminder sent

Partial payment

Final payment

AI context:

"Context: Invoice INV-001"

AI can answer questions about this invoice.

19. INVOICE CREATION THROUGH AI

User:

"Create an invoice for ABC for AED 12,000 due in 30 days."

AI should:

Identify ABC.

Check if ABC exists.

Extract amount.

Determine currency.

Calculate due date.

Prepare invoice.

Create the invoice according to autonomy rules.

Confirm the result.

If information is missing, ask only for the missing information.

Do not make unnecessary assumptions.

20. PAYMENT RECORDING

User:

"ABC paid AED 5,000."

AI should:

Identify ABC.

Find relevant outstanding invoices.

If one obvious invoice exists, propose applying payment.

If multiple invoices are possible, ask the user which invoice.

Record payment.

Update invoice balance.

Update client financial history.

Update client memory if appropriate.

Example:

Invoice:
AED 12,000

Payment:
AED 5,000

Remaining:
AED 7,000

Status:
partially_paid

21. PAYMENT REMINDERS

The AI should identify overdue invoices.

Example:

"ABC is 6 days overdue on INV-001 for AED 7,000."

Then:

"Would you like me to send a friendly reminder?"

Show AI Action Card.

Generate a professional reminder.

Support:

Friendly

Professional

Firm

Store generated message.

Do not automatically send external communications in V1 unless the user explicitly approves.

For MVP, simulated sending is acceptable if the external email integration is not configured.

Clearly label simulated actions.

22. COMPANY POLICIES

Allow users to establish rules through AI.

Example:

User:
"All invoices should have 30 day payment terms."

AI:
"I can save that as your default payment policy. Approve?"

After approval:

Save to company_policies.

Example policies:

default_payment_terms

default_currency

reminder_tone

reminder_delay

approval_threshold

preferred_language

These policies become part of the AI context.

23. MEMORY ARCHITECTURE

For MVP, do NOT build complex autonomous machine learning.

Use:

Structured memory

PostgreSQL tables.

Conversation memory

Recent conversation history.

Company memory

Company policies and preferences.

Client memory

Client-specific preferences and behavioral signals.

Financial memory

Invoices, payments and historical behavior.

Later we can add vector search/RAG.

Design the architecture so a vector memory layer can be added without rewriting the application.

24. AI CONTEXT BUILDER

Every AI request should construct a context object.

Example:

{
user: {...},
company: {...},
current_page: "invoice_detail",
current_focus: {
type: "invoice",
id: "...",
summary: "INV-001, ABC Company, AED 12,000, overdue 6 days"
},
relevant_client_memory: [...],
company_policies: [...],
relevant_invoices: [...],
recent_payments: [...],
recent_conversation: [...]
}

Do NOT send the entire database to the model.

Only retrieve relevant information.

25. AI SAFETY

The AI must never:

Invent invoices

Invent payments

Invent clients

Invent financial figures

Claim an email was sent if it was not

Claim a payment was received if it was not

Modify high-risk financial data without confirmation

Reveal another user's/company's information

If uncertain:

Ask.

If data is unavailable:

Say so.

Never fabricate.

26. AI RESPONSE STYLE

The AI should be:

concise

direct

useful

professional

conversational

Support Arabic and English.

If the user writes Arabic, respond in Arabic.

If the user writes English, respond in English.

Support mixed Arabic/English naturally.

Arabic should support RTL correctly.

Example:

User:
"مين عليه فلوس؟"

AI:

"عندك 3 عملاء عليهم مبالغ مستحقة:

ABC — AED 7,000 — متأخر 6 أيام
XYZ — AED 3,500 — مستحق اليوم
Delta — AED 12,000 — متأخر 2 يوم"

27. EMPTY STATES

Do not show empty accounting dashboards.

If the user has no clients:

"Your business starts here."

"Tell Duely who your first client is."

Example:

"Create my first client: ABC Company."

If no invoices:

"Tell Duely what you billed and who you billed."

28. NAVIGATION

Desktop navigation:

Dashboard

Clients

Invoices

Payments

AI Activity

Settings

The AI Command Center is always accessible.

Do not create unnecessary pages.

29. SETTINGS

Settings should display:

Company information

Default currency

Default payment terms

Reminder preferences

AI tone

Approval threshold

Language

Important:

Settings that affect AI behavior should preferably be editable through AI.

Example:

"Change my default payment terms to 30 days."

30. AI ACTIVITY

Create an AI Activity page showing:

Time

Action

Object

Confidence

Autonomy level

Result

Example:

09:42
Created Invoice INV-003
Confidence 98%
AUTO
Completed

10:12
Prepared reminder for ABC
Confidence 94%
APPROVAL REQUIRED
Waiting

This becomes the foundation for future AI evaluation.

31. FUTURE-READY ARCHITECTURE

Do not implement these features now, but structure the application so they can be added later:

Phase 2:

Contracts

Contract analysis

E-signatures

Client portal

Email integration

WhatsApp integration

Phase 3:

Client risk scoring

Cash flow forecasting

Automated collections

Advanced memory

RAG knowledge base

Phase 4:

Autonomous financial operations

Advanced prediction

AI agents

Fine-tuning/evaluation infrastructure

Do not build fake versions of these features in V1.

32. DEVELOPMENT PRIORITY

Build in this exact order:

Phase 1

Supabase Auth
+
Database
+
RLS
+
Application shell

Phase 2

Dashboard
+
Clients
+
Invoices

Phase 3

AI Command Center
+
OpenAI integration
+
AI Orchestrator
+
Tool calling

Phase 4

AI invoice creation
+
Client creation
+
Payment recording

Phase 5

Overdue detection
+
Reminder generation
+
Approval workflow

Phase 6

Company policies
+
Client memory
+
AI activity

Phase 7

Arabic/English
+
RTL
+
Mobile optimization
+
UI polish

33. CRITICAL IMPLEMENTATION RULE

Do not create a visually impressive prototype with fake data.

The MVP must use real Supabase data.

The following must actually work:

Create account

Create client

Create invoice through AI

View invoice

Record payment through AI

Calculate remaining balance

Detect overdue invoices

Generate reminder

Approve reminder

Store AI action

Store client memory

Store company policies

Retrieve relevant context in future AI conversations

Use seed/demo data ONLY for initial development/testing.

Clearly separate demo data from real user data.

34. FINAL PRODUCT PRINCIPLE

The MVP should demonstrate one powerful experience:

A business owner opens Duely and does not need to learn accounting software.

They simply say:

"مين عليه فلوس؟"

Duely understands the business.

Then:

"ذكر ABC."

Duely understands the client.

Then:

"خليه تذكير ودي."

Duely prepares the message.

The user approves.

Duely executes.

Then:

"ABC دفع 5 آلاف."

Duely records the payment, updates the invoice, updates the client history, and remembers the event.

That experience is the heart of Duely.

BUILD THIS MVP NOW.

Do not add unnecessary features.

Prioritize:

Real functionality

AI reliability

Data integrity

Security

Clean UX

AI-native interaction

Extensibility

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://yalladuely-app.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/26c4f38e-1d11-4209-9d15-175ebef52e43).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
