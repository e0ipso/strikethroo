**Clarification cadence.** When you have questions, run the clarification loop
with this cadence — it raises answer quality and prevents bundled,
half-answered prompts:

- **One question at a time.** Ask a single question, wait for the answer, then
  decide the next question from that answer. Do not dump a multi-question batch
  on the user.
- **Multiple-choice first.** Whenever the question allows, offer concrete
  options with a recommended default marked, so the user can confirm with one
  word. Always include an open-ended "Other" path for nuances you did not
  anticipate.
- **Explicit pre-emit approval gate.** Before you write or update the plan,
  present the resolved scope back to the user and obtain explicit confirmation.
  Do not emit the plan until the user confirms.

These rules sharpen *how* you ask; they do not relax *what* the existing rules
require. Never invent answers, explicitly confirm whether backwards
compatibility is required, and when a blocking question goes unanswered follow
this skill's failure-mode rule rather than papering over it.
