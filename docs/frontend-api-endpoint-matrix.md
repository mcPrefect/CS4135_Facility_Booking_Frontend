# Frontend & API Integration Endpoint Matrix

Owner: Muadh Muhsin Zibiri (22235302)
Context: Frontend & API Integration (API Gateway consumer)
Gateway Base URL: [http://localhost:8080](http://localhost:8080)


| Service Context  | UI Use Case                    | Method | Endpoint (via Gateway)                                   | Request DTO                                 | Success Response            | Error Response | Auth           | Notes / ACL Mapping                              |
| ---------------- | ------------------------------ | ------ | -------------------------------------------------------- | ------------------------------------------- | --------------------------- | -------------- | -------------- | ------------------------------------------------ |
| User             | Login                          | POST   | /api/v1/auth/login                                       | { email, password }                         | 200 { token, role, userId } | 401/422        | Public         | Persist token + role; map role to UI permissions |
| User             | Register                       | POST   | /api/v1/auth/register                                    | { name, email, password }                   | 201 { userId }              | 409/422        | Public         | Validate email/password client-side first        |
| Facility         | Search facilities              | GET    | /api/v1/facilities?query=&type=&capacity=                | None                                        | 200 [FacilitySummary]       | 400/500        | Bearer         | Retry once for transient 5xx                     |
| Facility         | Check availability             | GET    | /api/v1/facilities/{facilityId}/availability?start=&end= | None                                        | 200 { available: boolean }  | 400/404/500    | Bearer         | Disable booking CTA if unavailable               |
| Booking          | Create booking                 | POST   | /api/v1/bookings                                         | { facilityId, startTime, endTime, purpose } | 201 { bookingId, status }   | 409/422/500    | Bearer         | Map 409 to "time slot conflict" message          |
| Booking          | User booking history           | GET    | /api/v1/bookings?userId={userId}                         | None                                        | 200 [Booking]               | 403/500        | Bearer         | Only owner/admin                                 |
| Booking/Approval | Approve booking                | PATCH  | /api/v1/approvals/{bookingId}/approve                    | { reason? }                                 | 200 { status: "APPROVED" }  | 403/404/409    | Bearer (ADMIN) | Admin-only route guard                           |
| Booking/Approval | Reject booking                 | PATCH  | /api/v1/approvals/{bookingId}/reject                     | { reason }                                  | 200 { status: "REJECTED" }  | 403/404/409    | Bearer (ADMIN) | Admin-only route guard                           |
| Notification     | List notifications             | GET    | /api/v1/notifications/{userId}                           | None                                        | 200 [Notification]          | 403/500        | Bearer         | Poll every 30-60s (or websocket later)           |
| Notification     | Unread count                   | GET    | /api/v1/notifications/{userId}/unread-count              | None                                        | 200 { count }               | 403/500        | Bearer         | Update badge in navbar                           |
| Notification     | Mark read                      | PATCH  | /api/v1/notifications/{notificationId}/read              | None                                        | 200 { isRead: true }        | 403/404        | Bearer         | Optimistic UI update allowed                     |
| NLP              | Parse natural language booking | POST   | /api/nlp/query                                           | { rawText }                                 | 200 { resolution }          | 422/500        | Bearer         | Call through gateway; NLP service exposes `/api/nlp/query` |


## Shared Error Mapping (Frontend)

- 400/422: show validation helper text near fields.
- 401: force logout + redirect to login.
- 403: show "permission denied" toast and hide protected actions.
- 404: show not found state.
- 409: show conflict message and refresh availability.
- 5xx/timeout: show fallback banner and retry action.

## Evidence To Capture For Report

- Screenshot of each UI flow above with successful response.
- Screenshot of 409 booking conflict and 401 token expiry handling.
- Postman collection or HTTP logs showing endpoint calls through gateway.

