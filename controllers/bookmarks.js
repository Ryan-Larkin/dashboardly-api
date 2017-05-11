const express = require('express');

const onlyLoggedIn = require('../lib/only-logged-in');

module.exports = (dataLoader) => {
  const bookmarksController = express.Router();

  // Modify a bookmark
  bookmarksController.patch('/:id', onlyLoggedIn, (req, res) => {
    dataLoader.bookmarkBelongsToUser(req.params.id, req.user.users_id)
    .then(() => {
      return dataLoader.updateBookmark(req.params.id, {
        title: req.body.bookmarkData.title,
        url: req.body.bookmarkData.url
      });
    })
    .then(data => res.json(data))
    .catch(err => res.status(400).json(err));
  });


  // Delete a bookmark
  bookmarksController.delete('/:id', onlyLoggedIn, (req, res) => {
    dataLoader.bookmarkBelongsToUser(req.params.id, req.user.users_id)
     .then(() => {
      return dataLoader.deleteBookmark(req.params.id);
    })
    .then(() => res.status(204).end())
    .catch(err => res.status(400).json(err));
  });

  return bookmarksController;
};
