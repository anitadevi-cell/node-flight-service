const assert = require('node:assert/strict');
const test = require('node:test');
const { createServer, createStore } = require('../src/server');

function makeTestRequest(server, { method, path, body }) {
  const port = server.address().port;
  const payload = body ? JSON.stringify(body) : null;

  return new Promise((resolve, reject) => {
    const req = require('node:http').request(
      {
        hostname: '127.0.0.1',
        port,
        method,
        path,
        headers: payload
          ? {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(payload)
            }
          : undefined
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            body: data ? JSON.parse(data) : undefined
          });
        });
      }
    );

    req.on('error', reject);

    if (payload) {
      req.write(payload);
    }

    req.end();
  });
}

test('GET /health returns service status', async () => {
  const server = createServer(createStore());
  await new Promise((resolve) => server.listen(0, resolve));

  const response = await makeTestRequest(server, { method: 'GET', path: '/health' });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, { status: 'ok' });

  await new Promise((resolve) => server.close(resolve));
});

test('POST /bookings creates a booking and decreases available seats', async () => {
  const store = createStore();
  const server = createServer(store);
  await new Promise((resolve) => server.listen(0, resolve));

  const response = await makeTestRequest(server, {
    method: 'POST',
    path: '/bookings',
    body: { flightId: 'FL-1001', passengerName: 'Anita Devi' }
  });

  assert.equal(response.statusCode, 201);
  assert.equal(response.body.flightId, 'FL-1001');
  const flight = store.flights.find((item) => item.id === 'FL-1001');
  assert.ok(flight);
  assert.equal(flight.availableSeats, 1);
  assert.equal(store.bookings.length, 1);
  assert.equal(store.bookings[0].passengerName, 'Anita Devi');

  await new Promise((resolve) => server.close(resolve));
});

test('POST /bookings returns conflict when seats are unavailable', async () => {
  const store = createStore();
  const server = createServer(store);
  await new Promise((resolve) => server.listen(0, resolve));

  await makeTestRequest(server, {
    method: 'POST',
    path: '/bookings',
    body: { flightId: 'FL-3003', passengerName: 'First Passenger' }
  });

  const secondResponse = await makeTestRequest(server, {
    method: 'POST',
    path: '/bookings',
    body: { flightId: 'FL-3003', passengerName: 'Second Passenger' }
  });

  assert.equal(secondResponse.statusCode, 409);
  assert.deepEqual(secondResponse.body, { error: 'No seats available for this flight' });

  await new Promise((resolve) => server.close(resolve));
});
