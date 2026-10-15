# LearnLanka — Requirements Document

## 1\. Problem Statement

LearnLanka is a system that connects Sri Lankan O/L and A/L students with vetted tutors for one-to-one online sessions. Students should be able to search for tutors by subject, grade, language and price band. Students should also be able to book 1-hour sessions with a tutor and pay for the booking via eZ Cash or card. Tutors set their availability slots and can either accept or decline bookings. A 15% commission is charged on every completed session and are paid to tutors weekly via bank transfer. Both students and tutors can rate each other and leave one line comment after session. When searching for tutors results should return under 800 ms at the 95 percentile from a Sri Lankan ISP. There should be a 99.5% monthly uptime and is measured against the booking endpoint. Data privacy should be followed according to Sri Lanka Personal Data Protection Act 2022 and payment data shouldn't be stored on LearnLanka servers and must use PCI-DSS compliant gateway.

## 2\. Personas

### Student

#### Goals:

1. Find tutors based on subject, grade, language and price.
2. Able to book 1 hour session with tutor and make payment.
3. Rate and comment tutors after sessions.

#### Frustrations:

1. Tutors may not have available booking slots.
2. Tutors may decline or cancel bookings.
3. Due to bad internet connection, search tutor results may be delayed.
4. Due to bad internet connection, video call may experience some lag in audio or video.
5. Lack of transparent tutor ratings and verified qualifications.

### Tutor

#### Goals:

1. Receive bookings from students.
2. Receive payments weekly.
3. Rate and comment on students after sessions.
4. Having a good rated tutor profile with genuine reviews.

#### Frustrations:

1. Student may cancel bookings.
2. Payment delays.
3. Due to bad internet connection, video call may experience some lag in audio or video.

### Operations Admin

#### Goals:

1. Receive 15% commission from tutor bookings after every session.
2. Following data privacy guidelines.
3. Update and maintain the system to avoid negative user experience.
4. Need to keep on eye on Azure credits avoiding them to zero balance.

#### Frustrations:

1. Video call errors will be difficult to manage since they are from outsourced third party.
2. Errors in payment gateways.
3. Low on Azure credits will effect the system availability.

## 3\. Functional Requirements

1. Students should be able to search tutors based on grade, subject, language and price.
2. Students should be able to book 1 hour sessions with tutors.
3. Students should be able to pay via eZ Cash or Card through PayHere.
4. Students should be able to cancel bookings.
5. Tutors should be able to publish availability slots.
6. Tutors should be able to accept, decline or cancel bookings with at least 12 hours of notice.
7. System must update the system once a booking is booked successfully and block from other students booking to the same booking slot.
8. Students and tutors should be able to rate and leave one line commend after sessions.
9. Platform must charge 15% commission on every completed session.
10. Platform must pay tutor weekly via bank transfer before start of the week (Monday).

## 4\. Non-Functional Requirements

| Category     | Metric                               | Target                                                         | How we'll measure it              |
| ------------ | ------------------------------------ | -------------------------------------------------------------- | --------------------------------- |
| Performance  | Search API response time, p95        | <800ms                                                         | Azure Application Insights        |
| Availability | /book endpoint successful response % | 99.5% per calendar month                                       | Azure Monitor + synthetic         |
| Security     | Payment Safety                       | Payment information shouldn't be stored in LearnLanka servers. | Annual security compliance audit. |
| Scalability  | Active video sessions                | >= 200 simultaneous                                            | Daily.co dashboard                |

## 5\. Assumptions

- No direct video conference tool, and relies on Daily.co.
- Automated session reminders, where it notifies tutor and student once student books or reminder prior session.
- Tutors may use a PC while students may use a mobile phone.
- Every session will be fixed for 1 hours without any customer duration adjustment.

## 6\. Out of Scope

- Group classes are not supported.
- In house video technology: Developing a custom video conference tool build directly by the internal team.
- Custom class duration: Allowing custom class durations like 30mins, 2 hours, etc.
