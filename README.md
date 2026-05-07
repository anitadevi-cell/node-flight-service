# node-flight-service

Minimal flight booking backend built with Node.js.

## Run

```bash
npm start
```

## Test

```bash
npm test
```

## API

- `GET /health` - service status
- `GET /flights` - list available flights and seat counts
- `GET /bookings` - list existing bookings
- `POST /bookings` - create a booking
  - Body: `{ "flightId": "FL-1001", "passengerName": "Anita Devi" }`
