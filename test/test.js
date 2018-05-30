/*
 * This file is home to the test suite. It uses some functions that confues
 * eslint, so disable no-undef rule to allow for undefined functions
 */
/* eslint-disable no-undef */
// Immediately set environment to test
process.env.NODE_ENV = 'test';
const request = require('supertest');
const app = require('../app.js');

describe('Ambassador Site Tests', () => {
  // any actions that need done before ALL tests
  before((done) => {
    done();
  });

  // any actions that need done after ALL tests
  after((done) => {
    done();
  });

  describe('Basic Tests', () => {
    // Test /
    it('Get hompeage', (done) => {
      request.agent(app)
        .get('/')
        .expect(200, done);
    });

    // Test 404
    it('Get 404', (done) => {
      request.agent(app)
        .get('/404') // As long as the page 404 doesn't exist, this will give a 404
        .expect(404, done);
    });
  });

  describe('Login Tests', () => {
    // GET /login/
    it('Get login page', (done) => {
      request.agent(app)
        .get('/login')
        .expect(200, done);
    });

    // GET login while signed in

    // POST login

    // POST login while signed in

    // POST login with bad email

    // POST login with empty password

    // GET /signup/
    it('Get signup page', (done) => {
      request.agent(app)
        .get('/signup')
        .expect(200, done);
    });

    // GET signup while signed in

    // POST signup

    // POST signup while signed in

    // POST signup with password != confirm password
  });
});
