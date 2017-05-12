const express = require('express');

const onlyLoggedIn = require('../lib/only-logged-in');

module.exports = (dataLoader) => {
  const authController = express.Router();

  // Create a new user (signup)
  // change the form in the front end

  authController.post('/users', (req, res) => {
    dataLoader.createUser({
      username: req.body.username,
      email: req.body.email,
      password: req.body.password
    })
    .then(user => res.status(201).json(user))
    .catch(err => res.status(400).json(err));
  });


  // Create a new session (login)
  authController.post('/sessions', (req, res) => {
    dataLoader.createTokenFromCredentials(
      req.body.email,
      req.body.password
    )
    .then(token => res.status(201).json({ token: token }))
    .catch(err => res.status(401).json(err));
  });

   // Retrieve current user
  authController.get('/me', onlyLoggedIn, (req, res) => {
    res.json(req.user);
  });


  // Delete a session (logout)
  authController.delete('/sessions', onlyLoggedIn, (req, res) => {
    const token = req.headers.authorization.split(' ')[1];
    if (req.sessionToken === token) {
      dataLoader.deleteToken(token)
      .then(() => res.status(204).end())
      .catch(err => res.status(400).json(err));
    } else {
      res.status(401).json({ error: 'Invalid session token' });
    }
  });

  return authController;
};
