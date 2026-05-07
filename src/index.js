const { createServer } = require('./server');

const port = Number(process.env.PORT) || 3000;
const server = createServer();

server.listen(port, () => {
  process.stdout.write(`Flight service listening on port ${port}\n`);
});
