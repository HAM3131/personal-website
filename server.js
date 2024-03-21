const https = require('https'); // https module.
const fs = require('fs'); // File system module.
const express = require('express'); // Express module.

const app = express(); // Create an Express application.
const PORT = 443; // Port number.

const credentials = {
    key: fs.readFileSync('secret/private.key'),
    cert: fs.readFileSync('secret/henryamanning.org.crt')
};

// Serve static files from the 'public' directory
app.use(express.static('public'));

app.get('/', (req, res) => { // app.get() is a method of Express which is used to handle GET requests.
    res.sendFile(__dirname + '/public/index.html');
});

const httpsServer = https.createServer(credentials, app); // Create an HTTPS server with the given credentials and Express application.

httpsServer.listen(PORT, () => { // Listen for requests on the given port.
    console.log(`Server running https://localhost:${PORT}`);
});