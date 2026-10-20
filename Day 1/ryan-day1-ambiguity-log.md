# LearnLanka — Ambiguity Hunt Log

## Brief reference

LearnLanka is a Colombo-based startup that connects O/L and A/L students with **vetted tutors** for one-to-one online sessions. Tutors must be able to publish availability slots, **accept or decline bookings**, and **cancel with at least 12 hours notice**. The platform must charge a **15% commission on every completed session** and **pay tutors weekly via bank transfer**. Both parties must be able to **rate each other (1-5 stars) and leave a one-line comment after the session**. **Video calling will be outsourced to a third-party (Daily.co or 100ms)** — not built in-house. Privacy: comply with Sri Lanka Personal Data Protection Act 2022 — consent capture, **deletion request flow**. All **UI strings must support Sinhala, Tamil, and English from launch.**


## Findings

| #   | Quote | Why ambiguous | Clarification question | Priority |
| --- | ----- | ------------- | ---------------------- | -------- |
| 1 | vetted tutors | How does the platform confirm that those tutors are vetted tutors? When a tutor registers, does the platform runs an automated check or admins checks for documentations like certificates, etc? | What exact evidence must a tutor submit (e.g: NIC, degree certificates), and whether there should be an AI automated check or someone who manually reviews and approves tutor accounts? | High |
| 2 | one-to-one online sessions  | Does the tutoring session happen within the web/app, or should it rely on 3rd party services like MS Teams, Zoom, etc? | Should the tutoring session be inside the web/app itself or should it rely on 3rd party services? | High |
| 3 | cancel with at least 12 hours notice  | Doesn't mention what happens if tutor cancels booking within 12 hours | What should happen if the tutor cancels a booking with less than 12 hours notice and what's the policy? | High |
| 4 | pay tutors weekly via bank transfer  | Doesn't specifically mention which day of the week, should there be a minimum payout? | On which day of the week should the payout be transfered? Should there be minimum earnings within the week? | High |
| 5 | 15% commission on every completed session  | It's unclear is the commission is deducted from the tutor or student.  | Should be commission be charged fromt the tutor or student? | High |
| 6 | accept or decline bookings  | Doesn't mention if there should be a timeout period for a tutor to respond to a booking request, which will lead the student unsure whether the booking is accpeted or not by the tutor.  | How long does the tutor have to accept or decline a booking request before it automatically expires? | High |
| 7 | rate each other (1-5 stars) and leave a one-line comment after the session  | Doesn't mention if this is a must to happen or optional, and both required each time. And doesn't specify whether the comment should be publish instantly or gone through moderation | Should both parties rate and give a comment after every session or is it optional? And should both be done or can skip one? Should comment posted by students to tutors be publish instantly or gone through moderations before going public? | Medium |
| 8 | Video calling will be outsourced to a third-party (Daily.co or 100ms)  | The brief doesn't specify which one to choose.  | For the 3rd party services between Daily.co and 100ms, which would should we proceed with? | Medium |
| 9 | deletion request flow | Doesn't happen what happens to financial logs after user delets account | When a user requests account deletion, do we completely erase their transaction history or anonymize their profile while retaining financial logs? | Medium |
| 10 | UI strings must support Sinhala, Tamil, and English from launch. | It is unclear if multi-language support applies only to static application buttons/labels or to user generated content like tutor bios and comments. | When we translate the app into Sinhala and Tamil, are we only translating the buttons, menus, and headings? Or do we also need to automatically translate the descriptions tutors write about themselves and the reviews students leave? | Low |


## Results Summary

| Metric                          | Target | Achieved |
| ------------------------------- | ------ | -------- |
| Items found                     | 10+    | 10        |
| High-priority items             | 3+     | 6        |
| Items convertible to test cases | 5+     | 5        |

## Top 3 questions to ask the founders

- 1. What are some other features you would like to have in the platform which makes the whole learning experience easier, like for example having a way for the tutor to share lecture materials, quizes, record meetings, etc?
- 2. What happens if a student or tutor has a bad internet connection and misses half the class?
- 3. What happens if a tutor accepts a booking but tutor or student fails to show up for the session?

## Reflection

- What kind of ambiguity tripped you up most?
  - Poor business logic behind simple features. A phrase like "15% commission on completed sessions" hides critical pricing decisions. It leaves it unclear whether the fee is deducted from tutor earnings or added to the student's bill, and fails to define what counts as "completed" if connection drops or power cuts disrupt the class.
- Which question is most likely to change the architecture if answered?
  - The question where I asked for any additional nice to have features for better learning experience, where adding recordings requires heavy cloud video storage, while quizzes and file sharing convert a basic booking site into a complex Learning Management System (LMS), completely changing the database schema and backend scope.
