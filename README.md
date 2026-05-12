# Facility Booking System- Frontend

React-based web interface for the University of Limerick facility booking system.

## Team Memebrs

- Member 1: [Jing Peng] - [22301658] - User Service
- Member 2: [Eryk Marcinkowski] - [22374248] - Facility Service
- Member 3: [Darren Nugent] - [22365893] - Booking Service
- Member 4: [Kevin Burke] - [22355634] - Notification Service
- Member 5: [Michael Cronin] - [22336842] - NLP Service
- Member 6: [Muadh Muhsin Zibiri] - [22235302] - Frontend & API gateway

## API contract (gateway-relative)

UI flows, endpoints, auth, and error expectations: [docs/frontend-api-endpoint-matrix.md](docs/frontend-api-endpoint-matrix.md).

## Run locally (`app/`)

```bash
cd app
npm install
npm run dev
```

- SPA: [http://localhost:3000](http://localhost:3000) (Vite dev server)
- Set `VITE_API_BASE_URL` in `.env.development` if the gateway is not at `http://localhost:8080`.

## Docker (production static build)

From `app/`:

```bash
docker build -t facility-frontend --build-arg VITE_API_BASE_URL=http://localhost:8080 .
```

Serves nginx on port **80** (map host `3000:80` in Compose if you want `http://localhost:3000`).

## Features

- Role-based UI for Students, Staff, and Administrators
- Interactive calendar view for facility booking
- Real-time booking conflict detection
- Natural language booking via NLP integration
- In-app notifications for booking updates
- Responsive design for mobile and desktop

## Project Structure
```
src/
├── components/          # Reusable UI components
│   ├── booking/        # Booking-related components
│   ├── facility/       # Facility-related components
│   ├── user/          # User-related components
│   └── common/        # Shared components
├── pages/             # Page-level components
├── services/          # API integration layer
└── utils/             # Helper functions
```