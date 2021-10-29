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

const cascadeApi = "http://demo.cascade.localhost/api/v2";
const emily_token = "f3dc0dee1fa5428b40353b177c74f370be5663ca6eeba3c3ae09c365bd5d3f3d";

/**
 * App Variables
 */

const app = express();
const apiRouter = express.Router();
const audience = process.env.AUTH0_AUDIENCE;
const domain = process.env.AUTH0_DOMAIN;

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
 const getAuth0APIToken = async () => {
     if (!auth0Token) {
         await axios({
             url: `https://${domain}/oauth/token`,
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

 
 getAuth0APIToken();


/****************************************************************************
 * AUTH0
 ***************************************************************************/

/** 
 * Auth0 API - Auth0 Users
 * 27/10/21. Note that checkJWT parameter is removed to support search users functionality when user is not logged in.
 * However, you can set all-users-api still require a JWT from client side.
 */
 app.get("/api/users", (req, res) => {
  //console.log('here1', auth0Token);
  const {email} = req.query;

  if (email) {
    // search users by email
    axios.get(`${audience}users`, {
      headers: {
          Authorization: auth0Token
      },
      params: {q: `email:"${email}"`, search_engine: 'v3'},
    }).then((response) => {
        res.json(response.data);
    }).catch((error) => {
        res.json(error.message);
    });
  } else {
    // get all users
    axios.get(`${audience}users`, {
      headers: {
          Authorization: auth0Token
      }
    }).then((response) => {
        res.json(response.data);
    }).catch((error) => {
      console.log('here2', error);
        res.json(error.message);
    });
  }
  
});



/**
 * AUth0 API - Auth0 get a user
 */
 app.get("/api/users/:userId", checkJwt, (req, res) => {
  //console.log('here1', auth0Token);

  const { userId } = req.params;

  axios.get(`${audience}users/${userId}`, {
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
 * AUth0 API - Auth0 get a user's organizations
 */
 app.get("/api/users/:userId/organizations", (req, res) => {
  //console.log('here1', auth0Token);

  const { userId } = req.params;

  axios.get(`${audience}users/${userId}/organizations`, {
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
 * AUth0 API - Auth0 organization detail
 */
 app.get("/api/organizations/:orgId", (req, res) => {
  
  const { orgId } = req.params;

  axios.get(`${audience}organizations/${orgId}`, {
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
 * Auth0 API - update a user
 */
 app.patch("/api/users/", checkJwt, (req, res) => {
  const { user_metadata, sub } = req.body;
  const testData = {
    user_metadata: user_metadata
  }
  axios({
    url: `${audience}users/${sub}`,
    headers: {
          Authorization: auth0Token,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
      },
    method: 'PATCH',
    data: testData
  }).then((response) => {
      res.json(response.data);
  }).catch((error) => {
    console.log('here2', error);
      res.json(error.message);
  });
});

/****************************************************************************
 * CASCADE
 ***************************************************************************/


/**
 * CascadeAPI: Get Cascade users
 */
 app.get("/api/cascade_users", checkJwt, (req, res) => {  
  axios.get(`${cascadeApi}/users?XDEBUG_SESSION_START=PHPSTORM`, {
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
  axios.post(`${cascadeApi}/invitations/check/${email}?XDEBUG_SESSION_START=PHPSTORM`, {
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



/****************************************************************************
 * SERVER
 ***************************************************************************/

/**
 * Server Activation
 */

app.listen(serverPort, () =>
  console.log(`API Server listening on port ${serverPort}`)
);
