# ADR 0001: Record architecture decisions

## Status
Accepted (date: 2026-10-29)

## Context
- GreenChit has a 10-person team and a 6-week deadline. Big choices (hosting, database, receipt storage) are made fast, often in chat or in a meeting.
- Chat and meeting decisions get lost. Within weeks nobody remembers why we chose X over Y.
- New joiners and reviewers (including the pair reviewing this pack) need the reasoning, not only the result.
- Finance policy keeps audit records for 7 years. The reasoning behind the system should be just as traceable.
- We don't yet know how often decisions will be revisited, or whether the team will keep the habit after the first release.

## Decision
Record every significant architecture decision as an Architecture Decision Record (ADR), using Michael Nygard's template.

- Each ADR is one Markdown file in `adrs/`, numbered in order (0001, 0002, ...).
- Each ADR covers one decision and has five sections: Status, Context, Decision, Consequences, Alternatives considered.
- Status is Proposed, Accepted, or Superseded. We never delete an ADR.
- Once Accepted, we do not rewrite an ADR. If we change our mind, we write a new ADR and mark the old one Superseded.
- We write the ADR in the same pull request as the change it explains.
- A decision is "significant" if it is hard or costly to reverse, or if a new joiner would ask "why did we do it this way?".
- Keep each ADR to one page.

## Consequences
- Easier: design reviews, and answering "why did we choose this?" months later.
- Easier: the team argues about written trade-offs, not opinions.
- Harder: every big decision now costs about 30 minutes of writing especially under deadline pressure.
- Harder: ADRs need discipline. A stale ADR that still says Accepted is worse than none.
- Different: decisions get reviewed in pull requests like code.
- Uncomfortable: our wrong decisions stay on the record. We cannot quietly edit history. A bad call is visible with its date and our own reasoning.

## Alternatives considered
- **Decisions in meeting notes and Teams chat:** rejected. This is what we do today. Reasoning is hard to find and gets lost when people move teams **and hard to find history records in teams chats also taking more.**
