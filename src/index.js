/**
 * Required External Modules
 */

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { clientOrigins, serverPort } = require("./config/env.dev");
const { messagesRouter } = require("./messages/messages.router");
const axios = require("axios");
const { checkJwt } = require("./authz/check-jwt");
const emily_token = "f3dc0dee1fa5428b40353b177c74f370be5663ca6eeba3c3ae09c365bd5d3f3d";

/**
 * App Variables
 */

const app = express();
const apiRouter = express.Router();

/**
 *  App Configuration
 */

app.use(helmet());
app.use(cors({ origin: clientOrigins }));
app.use(express.json());

app.use("/api", apiRouter);

apiRouter.use("/messages", messagesRouter);

app.use(function (err, req, res, next) {
  console.log(err);
  res.status(500).send(err.message);
});

/**
 * Prepare the access token for API Calls
 */

 let auth0Token = null;
 const getAuth0API = async () => {
     if (!auth0Token) {
         await axios({
             url: `https://${process.env.AUTH0_DOMAIN}/oauth/token`,
             method: 'POST',
             headers: {'content-type': 'application/json'},
             data: {
                 client_id: process.env.AUTH0_CLIENT_ID,
                 client_secret: process.env.AUTH0_CLIENT_SECRET,
                 audience: process.env.AUTH0_AUDIENCE,
                 grant_type: 'client_credentials'
             }
         }).then((response) => {
             const token = response.data.access_token;
             const tokenType = response.data.token_type;
             auth0Token = tokenType + ' ' + token;
             console.log('Access Token for calling api: ', auth0Token);

             return auth0Token;
         }).catch((error)=>{
            console.log(error.message);
         });
     }
 
     return auth0Token;
 };

 
 getAuth0API();


/**
 * API - Auth0 Users
 */
 app.get("/api/users", checkJwt, (req, res) => {
  //console.log('here1', auth0Token);

  axios.get(`https://matthewoh93.au.auth0.com/api/v2/users`, {
      headers: {
          Authorization: auth0Token
      }
  }).then((response) => {
      res.json(response.data);
  }).catch((error) => {
    console.log('here2', error);
      res.json(error.message);
  });
});


/**
 * API - Auth0 get a user
 */
 app.get("/api/users/:userId", checkJwt, (req, res) => {
  //console.log('here1', auth0Token);

  const { userId } = req.params;

  axios.get(`https://matthewoh93.au.auth0.com/api/v2/users/${userId}`, {
      headers: {
          Authorization: auth0Token
      }
  }).then((response) => {
      res.json(response.data);
  }).catch((error) => {
    console.log('here2', error);
      res.json(error.message);
  });
});


/**
 * CascadeAPI: Get Cascade users
 */
 app.get("/api/cascade_users", checkJwt, (req, res) => {  
  axios.get(`http://demo.cascade.localhost/api/v2/users?XDEBUG_SESSION_START=PHPSTORM`, {
      headers: {
          'Auth-Token': emily_token
      }
  }).then((response) => {
    console.log('success');
      res.json(response.data);
  }).catch((error) => {
    console.log('error');
      res.json(error.message);
  });
});


/**
 * CascadeAPI: Check if a user is invited
 */
 app.post("/api/invitations/check/", checkJwt, (req, res) => {  
  const { email, jwt } = req.body;

  // I had to give token query parameter to use _COOKIE. See cascade >> apicontroller.php
  axios.post(`http://demo.cascade.localhost/api/v2/invitations/check/${email}?XDEBUG_SESSION_START=PHPSTORM`, {
      headers: {
          'Auth0-Token': jwt,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
      }
  }).then((response) => {
    console.log('success');
      res.json(response.data);
  }).catch((error) => {
    console.log('error');
      res.json(error.message);
  });
});


/**
 * Server Activation
 */

app.listen(serverPort, () =>
  console.log(`API Server listening on port ${serverPort}`)
);
