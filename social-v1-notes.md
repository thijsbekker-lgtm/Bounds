# Social v1

Visual-first foundation based on approved Social concept.

Scope of this phase:
- Social overview visual foundation
- Overview / Vrienden / Verzoeken navigation shell
- Play Together and Find a Golfer entry cards
- nearby/active golfers and invitations visual sections

Not in this phase:
- friendship mutations
- golfer discovery queries
- invitations persisted to Supabase
- messaging
- notifications

Safety constraints:
- Do not modify Supabase Auth or auth-wire.js.
- Do not change scorecard, Courses, or My Game data flows.
- Social data must remain opt-in and RLS-protected before real data is connected.
