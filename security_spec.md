# Security Specification

## Data Invariants
- A User must have a valid string email, username, and role. Role must be 'client' or 'lawyer'.
- A Conversation must have valid client_id and lawyer_id, and must reference existing users.
- A Message must belong to an existing Conversation, and sender_id must be part of that Conversation.
- An Appointment must reference a client and a lawyer, and type must be appointment or consultation. Status transitions must go through pending -> accepted / rejected -> completed / cancelled.
- A Complaint must reference a valid user_id.

## The "Dirty Dozen" Payloads
1. Create a User with an admin role.
2. Update a User to add `isVerified: true`.
3. Create a Conversation with someone else's client_id.
4. Add a Message to a Conversation the user is not part of.
5. Create an Appointment without a requested_date.
6. Modify an Appointment status from pending directly to completed as a client.
7. Inject a 2MB string into message content.
8. Set a timestamp to a future date.
9. Change `sender_id` on an existing message.
10. Query users collection to read other users' private PII.
11. Update typing status for another user.
12. Create a complaint for another user.

## Test Runner
See `firestore.rules.test.ts`.
