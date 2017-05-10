"use strict"
const bcrypt = require('bcrypt-as-promised');
const knex = require('knex')({ client: 'mysql' });
const validate = require('./validations');
const util = require('./util');
const md5 = require('md5');

const HASH_ROUNDS = 10;

const USER_FIELDS = ['id','username', 'email', 'avatarUrl', 'createdAt', 'updatedAt'];

const BOARD_FIELDS = ['id', 'ownerId', 'title', 'description', 'createdAt', 'updatedAt'];
const BOARD_WRITE_FIELDS = ['ownerId', 'title', 'description'];

const BOOKMARK_FIELDS = ['id', 'boardId', 'ownerId', 'title', 'url', 'createdAt', 'updatedAt'];
const BOOKMARK_WRITE_FIELDS = ['boardId', 'ownerId', 'title', 'url'];

const GRAVATAR_START = 'https://www.gravatar.com/avatar/';

class DashboardlyDataLoader {
  constructor(conn) {
    this.conn = conn;
  }

  query(sql) {
    return this.conn.query(sql);
  }



  createUser(userData) {
    const errors = validate.user(userData);
    // console.log(errors);
    if (errors) {
      return Promise.reject({ errors: errors });
    }
    var passwordHash = bcrypt.hash(userData.password, HASH_ROUNDS);
    var emailHash = md5(userData.email.trim().toLowerCase());
    // console.log(passwordHash, emailHash)
    return Promise.all([passwordHash, emailHash])
    .then((hashes) => {
      // console.log('hello its me' + hashes);
      return this.query(
        knex
        .insert({
          username: userData.username,
          email: userData.email,
          avatarUrl: GRAVATAR_START + hashes[1],
          password: hashes[0]
        })
        .into('users')
        .toString()
      );
    })
    .then((result) => {
      return this.query(
        knex
        .select(USER_FIELDS)
        .from('users')
        .where('id', result.insertId)
        .toString()
      );
    })
    .then(result => result[0])
    .catch((error) => {
      // Special error handling for duplicate entry
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('A user with this email already exists');
      } else {
        throw error;
      }
    });
  }

  deleteUser(userId) {
    return this.query(
      knex
      .delete()
      .from('users')
      .where('id', userId)
      .toString()
    );
  }

  getUserFromSession(sessionToken) {
    return this.query(
      knex
      .select(util.joinKeys('users', USER_FIELDS))
      .from('sessions')
      .join('users', 'sessions.userId', '=', 'users.id')
      .where({
        'sessions.token': sessionToken
      })
      .toString()
    )
    .then((result) => {
      if (result.length === 1) {
        return result[0];
      }

      return null;
    });
  }

  createTokenFromCredentials(email, password) {
    const errors = validate.credentials({
      email: email,
      password: password
    });
    if (errors) {
      return Promise.reject({ errors: errors });
    }

    let sessionToken;
    let user;
    return this.query(
      knex
      .select('id', 'password')
      .from('users')
      .where('email', email)
      .toString()
    )
    .then((results) => {
      if (results.length === 1) {
        user = results[0];
        return bcrypt.compare(password, user.password).catch(() => false);
      }

      return false;
    })
    .then((result) => {
      if (result === true) {
        return util.getRandomToken();
      }

      throw new Error('Username or password invalid');
    })
    .then((token) => {
      sessionToken = token;
      return this.query(
        knex
        .insert({
          userId: user.id,
          token: sessionToken
        })
        .into('sessions')
        .toString()
      );
    })
    .then(() => sessionToken);
  }

  deleteToken(token) {
    return this.query(
      knex
      .delete()
      .from('sessions')
      .where('token', token)
      .toString()
    )
    .then(() => true);
  }


  // Board methods
  getAllBoards(options) {
    const page = Number(options.page) || 1;
    const limit = Number(options.limit) || 20;
    const offset = (page - 1) * limit;

    return this.query(
      knex
      .select(BOARD_FIELDS)
      .from('boards')
      .limit(limit)
      .offset(offset)
      .toString()
    );
  }

  getSingleBoard(boardId) {
    return this.query(
      knex
      .select(BOARD_FIELDS)
      .from('boards')
      .where('id', boardId)
      .toString()
    );
  }

  createBoard(boardData) {
    const errors = validate.board(boardData);
    if (errors) {
      return Promise.reject({ errors: errors });
    }

    return this.query(
      knex
      .insert(util.filterKeys(BOARD_WRITE_FIELDS, boardData))
      .into('boards')
      .toString()
    )
    .then((result) => {
      return this.query(
        knex
        .select(BOARD_FIELDS)
        .from('boards')
        .where('id', result.insertId)
        .toString()
      );
    })
  }

  boardBelongsToUser(boardId, userId) {
    return this.query(
      knex
      .select('id')
      .from('boards')
      .where({
        id: boardId,
        ownerId: userId
      })
      .toString()
    )
    .then((results) => {
      if (results.length === 1) {
        return true;
      }

      throw new Error('Access denied');
    });
  }

  updateBoard(boardId, boardData) {
    const errors = validate.boardUpdate(boardData);
    if (errors) {
      return Promise.reject({ errors: errors });
    }

    return this.query(
      knex('boards')
      .update(util.filterKeys(BOARD_WRITE_FIELDS, boardData))
      .where('id', boardId)
      .toString()
    )
    .then(() => {
      return this.query(
        knex
        .select(BOARD_FIELDS)
        .from('boards')
        .where('id', boardId)
        .toString()
      );
    });
  }

  deleteBoard(boardId) {
    return this.query(
      knex
      .delete()
      .from('boards')
      .where('id', boardId)
      .toString()
    );
  }


  // Bookmark methods
  getAllBookmarksForBoard(boardId) {
   return this.query(
      knex
      .select()
      .from('bookmarks')
      .where('boardId', boardId)
      .toString()
    );

  }

  createBookmark(bookmarkData) {
    const errors = validate.bookmark(bookmarkData);
    if (errors) {
      return Promise.reject({ errors: errors});
    }
    return this.query(
      knex
      .insert(util.filterKeys(BOOKMARK_WRITE_FIELDS, bookmarkData))
      .into('bookmarks')
      .toString()
      )
      .then((result) => {
      return this.query(
        knex
        .select(BOOKMARK_FIELDS)
        .from('bookmarks')
        .where('id', result.insertId)
        .toString()
      );
  });
}


  bookmarkBelongsToUser(bookmarkId, userId) {
    // test this
    return this.query(
      knex
      .select('id')
      .from('bookmarks')
      .where({
        id: bookmarkId,
        ownerId: userId
      })
      .toString()
      )
      .then((results) => {
        if (results.length === 1) {
          return true;
        }

        throw new Error('Access denied');
      });
  }

//make sure bookmarkData.id works or do we need a parameter bookmarkId
  updateBookmark(bookmarkId, bookmarkData) {
    // test this
  const errors = validate.bookmark(bookmarkData);
  if (errors) {
    return Promise.reject({errors: errors });
  }
  return this.query(
    knex('bookmarks')
    .update(util.filterKeys(BOOKMARK_WRITE_FIELDS, bookmarkData))
    .where('id', bookmarkId)
    .toString()
    );
  }


  deleteBookmark(bookmarkId) {
    // test this
    return this.query(
      knex
      .delete()
      .from('bookmarks')
      .where('id', bookmarkId)
      .toString()
      );
  }

}

module.exports = DashboardlyDataLoader;
