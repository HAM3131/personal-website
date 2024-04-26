require('dotenv').config(); // Load environment variables from .env file.
const https = require('https'); // https module.
const fs = require('fs'); // File system module.
const express = require('express'); // Express module.
const mongoose = require('mongoose'); // MongoDB module
const cookieParser = require('cookie-parser'); // Cookie parser module.

const app = express(); // Create an Express application.
app.use(cookieParser()); // For parsing cookies
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded
app.use(express.json()); // For parsing application/json
// app.use((req, res, next) => {
//     console.log("Host Header:", req.headers.host);
//     next();
// });

const PORT = 443; // Port number.

const credentials = {
    key: fs.readFileSync('secret/private.key'),
    cert: fs.readFileSync('secret/henryamanning.org.crt')
};

/////////////////////////////////////////////////////////////////////////////////////////////
//////                          Set up MongoDB Database                                 /////
/////////////////////////////////////////////////////////////////////////////////////////////

mongoose.connect(process.env.DATABASE_URL).then(() => {
    console.log('Connected to Database');
}).catch(err => {
    console.error('Database connection error:', err);
});
const db = mongoose.connection;

const User = require('./models/User'); // Import User model.
const Friends = require('./models/Friends') // Import Friends model.

/////////////////////////////////////////////////////////////////////////////////////////////
//////                            Set up Server Paths                                   /////
/////////////////////////////////////////////////////////////////////////////////////////////

// Serve static files from the 'public' directory
app.use(express.static('public'));

app.get('/login', (req, res) => {
    res.sendFile(__dirname + '/public/login.html'); // Send the login.html file to the client.
});

app.post('/perform_login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).send('Missing fields');
    }

    try {
        const user = await User.findOne({ username: username.toLowerCase(), password: password});
        if (!user) {
            console.log('Invalid username or password');
            return res.status(400).send('Invalid username or password');
        }

        const isPasswordValid = user.password == password;
        if (!isPasswordValid) {
            return res.status(400).send('Invalid username or password');
        }

        res.cookie('userCookie', user.username, { maxAge: 86400000, httpOnly: true }); // Set a cookie with the user ID max
        res.status(200).redirect(`/dashboard/${user.username}`);
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

app.get('/signup', (req, res) => {
    res.sendFile(__dirname + '/public/signup.html'); // Send the signup.html file to the client.
});

app.post('/perform_signup', async (req, res) => {
    const { username, display_name, password } = req.body;
    if (!username || !display_name || !password) {
        return res.status(400).send('Missing fields');
    }

    const user = new User({
        username: username.toLowerCase(),
        display_name,
        password // Remember to hash this in real applications
    });

    try {
        const existingUser = await User.findOne({ username: user.username });
        if (existingUser) {
            return res.status(400).send('Username already taken');
        }
    } catch (error) {
        console.error(error);
        return res.status(500).send('Server error');
    }

    user.save()
        .then(newUser => {
            res.cookie('userCookie', newUser.username, { maxAge: 86400000, httpOnly: true }); // Set a cookie with the user ID max
            res.status(201).redirect(`/dashboard/${newUser.username}`);
        })
        .catch(error => {
            res.status(400).send("Failed to create account, try again" );
        });
});

app.post('/set_status', async (req, res) => {
    const status = req.body.status;
    const userCookie = req.cookies.userCookie;
    
    if (!userCookie) {
        return res.status(400).send('Lost authentication. Try signing in again.');
    }
    if (!status) {
        return res.status(400).send('Missing status');
    }

    try {
        const user = await User.findOne({ username: userCookie });
        if (!user) {
            return res.status(400).send('User not found');
        }

        user.status = status;
        await user.save();

        response = {
            status: status
        }

        res.status(200).json(response);
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

app.post('/add_friend', async (req, res) => {
    const friend_name = req.body.friendee.toLowerCase();
    const userCookie = req.cookies.userCookie;

    if (!userCookie) {
        return res.status(400).send('Lost authentication. Try signing in again.');
    }
    if (!friend_name) {
        return res.status(400).send('Missing friend');
    }

    try {
        const friender = await User.findOne({ username: userCookie });
        if (!friender) {
            return res.status(400).send('User not found');
        }
        
        const friendee = await User.findOne({ username: friend_name });
        if (!friendee) {
            return res.status(400).send('Friend not found');
        }
        
        const existingFriend = await Friends.findOne({ friender: friender._id, friendee: friendee._id });
        if (existingFriend) {
            return res.status(400).send('Friend already added');
        }

        const friend = new Friends({
            friender: friender._id,
            friendee: friendee._id
        });
        friend.save();
        
        res.status(200).send('Friend added sucessfully.');

    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

app.post('/status', async (req, res) => {
    const userCookie = req.cookies.userCookie;

    if (!userCookie) {
        return res.status(400).send('Lost authentication. Try signing in again.');
    }

    try {
        const user = await User.findOne({ username: userCookie });

        if (!user) {
            return res.status(400).send('User not found');
        }

        response = {
            status: user.status
        }

        res.status(200).json(response);
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

app.post('/friends', async (req, res) => {
    // Validate user cookie, then return friends list in JSON
    const userCookie = req.cookies.userCookie;
    if (!userCookie) {
        return res.status(400).send('Lost authentication. Try signing in again.');
    }
    try {
        const user = await User.findOne({ username: userCookie });
        if (!user) {
            return res.status(400).send('User not found');
        
        }
        const friends = await Friends.find({ friender:  user._id });
        // Create a list of friends names from `friends`
        var friendsList = [];
        for (const friend of friends) {
            const friendUser = await User.findById(friend.friendee);
            if (friendUser) {
                friendsList.push({ name: friendUser.display_name, status: friendUser.status });
            } else {
                friendsList.push({ name: 'User not found' });
            }
        }

        res.status(200).json(friendsList);
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
    
})

app.get('/', (req, res) => { // app.get() is a method of Express which is used to handle GET requests.
    res.sendFile(__dirname + '/public/index.html'); // Send the index.html file to the client.
});

/////////////////////////////////////////////////////////////////////////////////////////////
//////                               User Dashboard                                     /////
/////////////////////////////////////////////////////////////////////////////////////////////

app.get('/dashboard/:user', (req, res) => {
    const username = req.params.user;
    const userCookie = req.cookies.userCookie;

    // Check if the cookie is valid
    if (!userCookie) {
        return res.status(401).send('Authentication required.');
    }

    // Find the user by ID stored in cookie
    User.findOne({username: userCookie})
        .then(user => {
            if (!user || user.username !== username) {
                return res.status(404).redirect('/login'); // redirect to login
            }

            // Load the template
            fs.readFile('./public/user.html', 'utf8', (err, data) => {
                if (err) {
                    console.error(err);
                    return res.status(500).send('Failed to load user profile.');
                }

                // Replace placeholders with actual data
                let result = data.replace('{{username}}', user.username)
                                 .replace('{{status}}', user.status); 
                        // .replace('{{username}}', user.username)
                        //.replace('{{display_name}}', user.display_name);

                // Send the customized page
                res.send(result);
            });
        })
        .catch(err => {
            console.error(err);
            res.status(500).send('Error retrieving user data.');
        });
});

/////////////////////////////////////////////////////////////////////////////////////////////
//////                            Launch The Server                                     /////
/////////////////////////////////////////////////////////////////////////////////////////////

const httpsServer = https.createServer(credentials, app); // Create an HTTPS server with the given credentials and Express application.

httpsServer.listen(PORT, async () => { // Listen for requests on the given port.
    console.log(`Server running https://localhost:${PORT}`);
    try {
        const publicIp = await import('public-ip');
        const ip = await publicIp.publicIpv4();
        console.log("Your public IP address is:", ip);
    } catch (error) {
        console.error("Error fetching public IP address:", error);
    }
});