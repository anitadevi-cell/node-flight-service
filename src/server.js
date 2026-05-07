const http = require('node:http');
const MAX_REQUEST_BODY_SIZE = 1_000_000;

const seedFlights = [
  {
    id: 'FL-1001',
    origin: 'NYC',
    destination: 'SFO',
    availableSeats: 2
  },
  {
    id: 'FL-2002',
    origin: 'LAX',
    destination: 'SEA',
    availableSeats: 2
  },
  {
    id: 'FL-3003',
    origin: 'DAL',
    destination: 'MIA',
    availableSeats: 1
  }
];

function createStore() {
  return {
    flights: structuredClone(seedFlights),
    bookings: [],
    nextBookingSequence: 1
  };
}

function sendJson(res, statusCode, payload) {
  const data = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  });
  res.end(data);
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > MAX_REQUEST_BODY_SIZE) {
        reject(new Error('Request body too large'));
        req.destroy();
      }
    });

    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error('Invalid JSON body'));
      }
    });

    req.on('error', reject);
  });
}

function createBooking(store, payload) {
  const { flightId, passengerName } = payload;
  const normalizedPassengerName = typeof passengerName === 'string' ? passengerName.trim() : '';

  if (!flightId || typeof flightId !== 'string' || !normalizedPassengerName) {
    return {
      statusCode: 400,
      payload: { error: 'flightId and passengerName are required' }
    };
  }

  const flight = store.flights.find((item) => item.id === flightId);
  if (!flight) {
    return {
      statusCode: 404,
      payload: { error: 'Flight not found' }
    };
  }

  if (flight.availableSeats <= 0) {
    return {
      statusCode: 409,
      payload: { error: 'No seats available for this flight' }
    };
  }

  flight.availableSeats -= 1;
  const booking = {
    id: `BK-${String(store.nextBookingSequence).padStart(4, '0')}`,
    flightId,
    passengerName: normalizedPassengerName,
    createdAt: new Date().toISOString()
  };

  store.bookings.push(booking);
  store.nextBookingSequence += 1;

  return {
    statusCode: 201,
    payload: booking
  };
}

function createServer(store = createStore()) {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');

    if (req.method === 'GET' && url.pathname === '/health') {
      sendJson(res, 200, { status: 'ok' });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/flights') {
      sendJson(res, 200, store.flights);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/bookings') {
      sendJson(res, 200, store.bookings);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/bookings') {
      try {
        const payload = await parseJsonBody(req);
        const result = createBooking(store, payload);
        sendJson(res, result.statusCode, result.payload);
      } catch (error) {
        sendJson(res, 400, { error: error.message });
      }
      return;
    }

    sendJson(res, 404, { error: 'Route not found' });
  });
}

module.exports = {
  createServer,
  createStore,
  createBooking
};
