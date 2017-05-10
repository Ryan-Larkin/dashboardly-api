const validate = require('validate.js');

const VALID_ID = {
  onlyInteger: true,
  greaterThan: 0
};

const USER_VALIDATION = {
  email: {
    presence: true,
    email: true
  },
  password: {
    presence: true,
    length: {
      minimum: 12,
      message: 'must be at least 12 characters'
    }
  }
};
exports.user = function validateUser(userData) {
  return validate(userData, USER_VALIDATION);
};



const BOARD_VALIDATION = {
  ownerId: {
    presence: true,
    numericality: VALID_ID
  },
  title: {
    presence: true
  }
};

exports.board = function validateBoard(boardData) {
  return validate(boardData, BOARD_VALIDATION);
};

const BOARD_UPDATE_VALIDATION = {
  ownerId: {
    numericality: VALID_ID
  }
};

exports.boardUpdate = function validateBoardUpdate(boardData) {
  return validate(boardData, BOARD_UPDATE_VALIDATION);
};

const BOOKMARK_VALIDATION = {
  title: {
    presence: true,
    length: {
      maximum: 50,
      message: 'must be 50 characters or less'
    }
  },
  url: {
    presence: true,
    length: {
      maximum: 1000,
      message: 'must be 1000 characters or less'
    }
  }
};

exports.bookmark = function validateBookmark(bookmarkData) {
  return validate(bookmarkData, BOOKMARK_VALIDATION);
};

const CREDS_VALIDATION = {
  email: {
    presence: true,
    email: true
  },
  password: {
    presence: true
  }
};
exports.credentials = function validateCredentials(credsData) {
  return validate(credsData, CREDS_VALIDATION);
};
