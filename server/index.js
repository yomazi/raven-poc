// server.js
require("dotenv").config();
const express = require("express");
const path = require("path");
const cookieSession = require("cookie-session");
const {
  createOAuthClient,
  createOAuthClientWithSessionRedirectUri,
  generateAuthUrl,
} = require("./google/googleClient");

const app = express();
app.use(express.json());
app.use(cookieSession({ name: "session", keys: [process.env.SESSION_SECRET] }));

const cors = require("cors");
const { google } = require("googleapis");

app.use(
  cors({
    origin: "http://localhost:5173", // your React dev server
    credentials: true, // allow cookies
  })
);

app.use(
  cookieSession({
    name: "session",
    keys: [process.env.SESSION_SECRET],
    maxAge: 24 * 60 * 60 * 1000, // 1 day
    sameSite: "lax", // important for cross-origin dev
    secure: false, // true only for HTTPS
  })
);

// OAuth routes
app.get("/auth/google", (req, res) => {
  try {
    const oauth2Client = createOAuthClient(req);
    const url = generateAuthUrl(oauth2Client);

    // Save the exact redirect URI used for this login in session
    req.session.redirectUri = oauth2Client.redirectUri;

    res.redirect(url);
  } catch (err) {
    console.error("Failed to generate auth URL:", err);
    res.status(500).send("Internal Server Error — see server console");
  }
});

app.get("/auth/google/callback", async (req, res) => {
  console.log("Callback query:", req.query); // check what’s actually coming through
  const code = req.query.code;
  if (!code) {
    console.error("No code in callback query!");
    return res.status(400).send("No code in callback");
  }
  const oauth2Client = createOAuthClientWithSessionRedirectUri(req);
  const { tokens } = await oauth2Client.getToken(code);
  console.log("tokens:");
  console.log(tokens);
  oauth2Client.setCredentials(tokens);
  google.options({ auth: oauth2Client });

  // Get basic user info
  const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
  const userinfo = await oauth2.userinfo.get();

  // Store user session in memory
  req.session.user = {
    email: userinfo.data.email,
    name: userinfo.data.name,
    tokens,
  };

  res.redirect("/"); // redirect to frontend
});

// simple API endpoint
app.get("/api/data", (req, res) => {
  res.json({ message: "Hello from your local Node server!" });
});

// Example route to check if logged in
app.get("/api/me", (req, res) => {
  if (!req.session.user) return res.status(401).json({ loggedIn: false });
  res.json({ loggedIn: true, user: req.session.user });
});

// List files in user's Drive root folder
app.get("/api/drive/root", async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: "Not logged in" });
  console.log("Session user:", req.session.user); // <--- add this

  const oauth2Client = createOAuthClientWithSessionRedirectUri(req);
  oauth2Client.setCredentials(req.session.user.tokens);
  google.options({ auth: oauth2Client });

  try {
    const drive = google.drive({ version: "v3", auth: oauth2Client });

    const response = await drive.files.list({
      q: "'root' in parents and trashed = false",
      pageSize: 20,
      fields: "files(id, name, mimeType)",
    });

    res.json(response.data.files);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to list files" });
  }
});

// **Serve React after all API / OAuth routes**
const reactBuildPath = path.join(__dirname, "../client/dist");
app.use(express.static(reactBuildPath));
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(reactBuildPath, "index.html"));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
