const { google } = require("googleapis");

const scopes = [
  "openid",
  "profile",
  "email",
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/spreadsheets",
];

function getRedirectUri(req) {
  const host = req.get("host"); // e.g., "localhost:3001" or "raven.neuron9.io"

  if (host.startsWith("localhost")) {
    return process.env.OAUTH_REDIRECT_DEV;
  } else if (host === "raven.neuron9.io") {
    return process.env.OAUTH_REDIRECT_PROD;
  } else {
    throw new Error(`Unknown host: ${host}`);
  }
}

function createOAuthClient(req) {
  const redirectUri = getRedirectUri(req);
  console.log("Redirect URI:", redirectUri);

  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );
}

function createOAuthClientWithSessionRedirectUri(req) {
  const redirectUri = req.session.redirectUri;
  console.log("Redirect URI:", redirectUri);

  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );
}

function generateAuthUrl(client) {
  console.log("requesting access to scopes:");
  console.log(scopes);

  const url = client.generateAuthUrl({
    access_type: "offline", // refresh token
    prompt: "consent", // force refresh token first login
    include_granted_scopes: true,
    scope: scopes,
  });

  return url;
}

module.exports = {
  createOAuthClient,
  createOAuthClientWithSessionRedirectUri,
  generateAuthUrl,
  scopes,
};
