# LearnLanka — User Story Set v0.1

## Story 1: Search Tutors by Subject and Filters

**As a** Student
**I want** to search and filter tutors by subject, grade, language, and price band.
**So that** I can quickly find a tutor who fits my academic needs and budget.

### Acceptance Criteria

* **Given** a Student is on the tutor search page, **when** they select "Maths", grade "A/L", language "English", and set the price slider to "LKR 1,000 - 2,000", **then** the system displays only tutors matching all four criteria within 800 milliseconds.
* **Given** search criteria with no matching tutors, **when** the Student clicks search, **then** the system shows a clear message saying "No tutors found" and suggests broadening the search filters.

### INVEST self-check

* \[x] Independent
* \[x] Negotiable
* \[x] Valuable
* \[x] Estimable
* \[x] Small
* \[x] Testable

## Story 2: Book and pay for a session

**As a** Student
**I want** to select an available time slot and to pay by debit card or eZ Cash via PayHere.
**So that** my tutoring session is confirmed instantly and secured.

### Acceptance Criteria

* **Given** a Student is on the a tutor's page, and have selected an available booking slot, **when** they select card or eZ Cash on PayHere and completes the payment **then** the system displays "Confirmed Booking" message.
* **Given** search criteria with no matching tutors, **when** the Student clicks search, **then** the system shows a clear message saying "No tutors found" and suggests broadening the search filters.

### INVEST self-check

* \[x] Independent
* \[x] Negotiable
* \[x] Valuable
* \[x] Estimable
* \[x] Small
* \[x] Testable

## Story 3: Tutor sets availability weekly

**As a** Tutor
**I want** publish and manage my weekly available booking slots.
**So that** students can only book when I am available.

### Acceptance Criteria

* **Given** a tutor in their bookings calendar page, **when** they select dates they are available, **then** the system displays available slots for students to book.
* **Given** a slot that is already has a confirmed booking **when** the Tutor tries to remove or edit that slot, **then** the system prevents the action and prompts the Tutor to cancellation the booking.

### INVEST self-check

* \[x] Independent
* \[x] Negotiable
* \[x] Valuable
* \[x] Estimable
* \[x] Small
* \[x] Testable

## Story 4: Rate and Review Completed Session

**As a** Student or Tutor
**I want** to leave a 1-to-5 star rating and a one-line comment after a completed session,
**So that** both parties build a public reputation and trust on the platform

### Acceptance Criteria

* **Given** a tutoring session has ended, **when** either user opens the app, **then** the system displays a rating pop-up appears asking for 1 to 5 stars and a single line comment.
* **Given** a student submits a review, **when** the review is saved, **then** the tutor's overall average star rating updates instantly on their public profile.

INVEST self-check

### INVEST self-check

* \[x] Independent
* \[x] Negotiable
* \[x] Valuable
* \[x] Estimable
* \[x] Small
* \[x] Testable

## Story 5: Weekly Tutor Commission and Bank Payouts

**As an** Operations Admin
**I want** the system to calculate the 15% platform commission and prepare weekly tutor payouts.
**So that** tutors receive their net earnings accurately via Sampath Vishwa.

### Acceptance Criteria

* **Given** the weekly payout schedule runs every Sunday at midnight, **when** the system processes completed sessions, **then** it deducts 15% from the total session price and generates a payout file listing net earnings per tutor bank account.
* **Given** a session that was canceled, **when** the payout processing occurs, **then** commission is not charged and the session is excluded from the tutor's earnings calculation.

INVEST self-check

### INVEST self-check

* \[x] Independent
* \[x] Negotiable
* \[x] Valuable
* \[x] Estimable
* \[x] Small
* \[x] Testable

## Story 6: Tutor Cancels Session Prior 12 Hours

**As an** Tutor
**I want** to cancel an upcoming session with at least 12 hours' notice.
**So that** students are informed early and refunded.

### Acceptance Criteria

* **Given** a scheduled session more than 12 hours away, **when** the Tutor clicks "Cancel Session" and provides a reason, **then** the session is canceled, the Student is notified, and a full refund is queued.
* **Given** a scheduled session less than 12 hours, **when** the Tutor attempts to cancel, **then** the system blocks the cancellation and displays a message that cancellations require 12 hours' advance notice.

INVEST self-check

### INVEST self-check

* \[x] Independent
* \[x] Negotiable
* \[x] Valuable
* \[x] Estimable
* \[x] Small
* \[x] Testable

