/**
 * Tests for the member endpoints and functions
 */
/* eslint-disable no-undef */
// Immediately set environment to test
process.env.NODE_ENV = 'test';
const request = require('supertest');
const assert = require('assert');
const app = require('../app.js');
const models = require('../models');
const common = require('./common');

describe('Member tests', () => {
  // whipe entire database after conclusion of tests
  after((done) => {
    common.clearDatabase().then(() => {
      done();
    });
  });

  // Clear the entire database before each test
  beforeEach((done) => {
    common.clearDatabase().then(() => {
      done();
    });
  });

  // POST /member/profile/update without being signed in - should 401
  it('POST /member/profile/update not signed in', (done) => {
    request.agent(app)
      .post('/member/profile/update')
      .send({
        firstName: 'Test',
        lastName: 'User',
        hometown: 'TestVille',
        major: 'Testing',
        gradYear: '2050',
        minors: 'Javascript',
        clubs: 'Test Club',
        coops: 'Testing INC',
        accend: true,
      })
      .redirects(1)
      .expect(401, done);
  });

  // GET /member/profile of created member
  it('GET profile of existing member', () => {
    return models.Member.create({
      email: 'profile@mail.uc.edu',
      first_name: 'Profile',
      last_name: 'mcProfile',
      password: 'This isnt a hash!', // okay because we won't be logging in
      accend: false,
      private_user: false,
      super_user: false,
    }).then((member) => {
      return request.agent(app)
        .get(`/member/${member.id}`)
        .expect(200);
    });
  });

  // GET /member/profile/ of a non-existent email
  it('GET profile of non-existent member', (done) => {
    request.agent(app)
      .get('/member/-1')
      .redirects(1)
      .expect(404, done);
  });

  // GET /member/ - listing of members
  it('Get member list', (done) => {
    request.agent(app)
      .get('/member')
      .expect(200, done);
  });

  // POST to /member/:email/update-attributes not signed in
  it('POST /member/:id/update-attributes not signed in', () => {
    const email = 'test@mail.uc.edu';
    return models.Member.create({
      email,
      password: 'blah', // doesn't matter because we won't be logging in
      accend: false,
      super_user: false,
      private_user: false,
    }).then((createdMember) => {
      const response = request.agent(app)
        .post(`/member/${createdMember.id}/update-attributes?super_user=true&private_user=true`)
        .redirects(1)
        .expect(401);
      return response.then(() => {
        return models.Member.findByPk(createdMember.id).then((member) => {
          assert.equal(member.super_user, false);
          assert.equal(member.private_user, false);
        });
      });
    });
  });

  // GET profile of private member
  it('GET profile of private member not logged in', () => {
    const email = 'test@mail.uc.edu';
    return models.Member.create({
      email,
      password: 'blah', // doesn't matter because we won't be logging in
      accend: false,
      super_user: false,
      private_user: true,
    }).then((member) => {
      return request.agent(app)
        .get(`/member/${member.id}`)
        .redirects(1)
        .expect(403);
    });
  });

  // Try to POST member delete not logged in
  it('Try to POST /member/:id/delete not logged in', () => {
    return common.createNormalUser().then((member) => {
      const response = request.agent(app)
        .post(`/member/${member.id}/delete`)
        .redirects(1)
        .expect(401);
      return response.then(() => {
        return models.Member.findByPk(member.id).then((assertMember) => {
          assert(assertMember);
        });
      });
    });
  });

  // Try to reset member password not logged in
  // This should be moved to account.js once reset password is rewritten
  it('POST /member/:id/reset-password not logged in', () => {
    return common.createNormalUser().then((member) => {
      const response = request.agent(app)
        .post(`/member/${member.id}/reset-password`)
        .redirects(1)
        .expect(401);

      return response.then(() => {
        return models.Member.findByPk(member.id).then((assertMember) => {
          // assumes that the normal user password is 'password'
          return models.Member.comparePassword('password', assertMember).then((truth) => {
            assert(truth);
          });
        });
      });
    });
  });

  it('GET profile of private member as that private member', () => {
    // create a private user
    return models.Member.generatePasswordHash('password').then((passwordHash) => {
      return models.Member.create({
        email: common.getNormalUserEmail(),
        password: passwordHash,
        accend: false,
        super_user: false,
        private_user: true,
      }).then((member) => {
        // create an agent to reuse
        const agent = request.agent(app);
        // login the user
        const response = agent
          .post('/login')
          .send({
            email: member.email,
            password: 'password',
          })
          .redirects(1)
          .expect(200);
        return response.then(() => {
          // try to get the private profile as the private user
          return agent
            .get(`/member/${member.id}`)
            .expect(200);
        });
      });
    });
  });

  describe('Member tests which require a logged in normal user', () => {
    let agent = null;
    let loginMember = null;
    // Create a normal user session
    beforeEach(() => {
      agent = request.agent(app);
      // create and log in the user
      return common.createNormalUser().then((member) => {
        loginMember = member;
        return common.createUserSession(member, agent);
      });
    });

    // POST /member/profile/update successfully
    it('POST /member/profile/update successfully', () => {
      const firstName = 'Test';
      const lastName = 'User';
      const hometown = 'TestVille';
      const major = 'Testing';
      const gradYear = '2050';
      const minors = 'Javascript';
      const clubs = 'Test Club';
      const coops = 'Testing INC';
      const accendFrontend = 'on'; // because it's a checkbox on the frontend
      const accend = true; // expected end value
      const response = agent.post('/member/profile/update')
        .field('firstName', firstName) // use field because .send() and .attach() are incompatible
        .field('lastName', lastName)
        .field('hometown', hometown)
        .field('major', major)
        .field('gradYear', gradYear)
        .field('minors', minors)
        .field('clubs', clubs)
        .field('coops', coops)
        .field('accend', accendFrontend)
        .attach('picture', 'public/images/default-profile-picture.jpg') // send a proifle picture
        .redirects(1)
        .expect(200);

      return response.then(() => {
        return models.Member.findByPk(loginMember.id).then((member) => {
          assert(member);
          assert.deepEqual(member.first_name, firstName);
          assert.deepEqual(member.last_name, lastName);
          assert.deepEqual(member.hometown, hometown);
          assert.deepEqual(member.major, major);
          assert.deepEqual(member.grad_year, gradYear);
          assert.deepEqual(member.clubs, clubs);
          assert.deepEqual(member.coops, coops);
          assert(member.path_to_picture !== null);
          assert.equal(member.accend, accend);
        });
      });
    });

    // POST /member/profile/update with not all values
    it('POST /member/profile/update with only some values', () => {
      const firstName = 'Test';
      const lastName = 'User';
      const hometown = 'TestVille';
      const accendFrontend = 'on'; // because it's a checkbox on the frontend
      const accend = true; // expected end value
      const response = agent.post('/member/profile/update')
        .send({
          firstName,
          lastName,
          hometown,
          accend: accendFrontend,
        })
        .redirects(1)
        .expect(200);

      return response.then(() => {
        return models.Member.findByPk(loginMember.id).then((member) => {
          assert(member);
          assert.deepEqual(member.first_name, firstName);
          assert.deepEqual(member.last_name, lastName);
          assert.deepEqual(member.hometown, hometown);
          assert.equal(member.accend, accend);
        });
      });
    });

    // POST /member/profile/update with grad year = ''
    it('POST /member/profile/update with gradYear=empty string', () => {
      const gradYear = '';
      const response = agent.post('/member/profile/update')
        .send({
          gradYear,
        })
        .redirects(1)
        .expect(200);
      return response.then(() => {
        return models.Member.findByPk(loginMember.id).then((member) => {
          assert(member);
          assert.deepEqual(member.grad_year, null);
        });
      });
    });

    // POST to /member/:email/update-attributes as normal user and fail
    it('POST /member/:id/update-attributes as normal user', () => {
      const email = 'test@mail.uc.edu';
      return models.Member.create({
        email,
        password: 'blah', // doesn't matter because we won't be logging in
        accend: false,
        super_user: false,
        private_user: false,
      }).then((createdMember) => {
        const response = agent
          .post(`/member/${createdMember.id}/update-attributes?super_user=true&private_user=true`)
          .redirects(1)
          .expect(403);
        return response.then(() => {
          return models.Member.findByPk(createdMember.id).then((member) => {
            assert.equal(member.super_user, false);
            assert.equal(member.private_user, false);
          });
        });
      });
    });

    // GET profile of private member
    it('GET profile of private member as normal user', () => {
      const email = 'test@mail.uc.edu';
      return models.Member.create({
        email,
        password: 'blah', // doesn't matter because we won't be logging in
        accend: false,
        super_user: false,
        private_user: true,
      }).then((member) => {
        return agent.get(`/member/${member.id}`)
          .redirects(1)
          .expect(403);
      });
    });

    it('Try to POST /member/:id/delete as a normal user', () => {
      return common.createSuperUser().then((member) => {
        const response = agent
          .post(`/member/${member.id}/delete`)
          .redirects(1)
          .expect(403);
        return response.then(() => {
          return models.Member.findByPk(member.id).then((assertMember) => {
            assert(assertMember);
          });
        });
      });
    });

    it('POST /member/:id/reset-password as a normal user', () => {
      return common.createSuperUser().then((member) => {
        const response = agent
          .post(`/member/${member.id}/reset-password`)
          .redirects(1)
          .expect(403);

        return response.then(() => {
          return models.Member.findByPk(member.id).then((assertMember) => {
            // assumes that the super user password is 'password'
            return models.Member.comparePassword('password', assertMember).then((truth) => {
              assert(truth);
            });
          });
        });
      });
    });
  });

  describe('Tests which require a signed in super user', () => {
    let agent = null;
    // let loginMember = null; // currently ununused
    // Create a normal user session
    beforeEach(() => {
      agent = request.agent(app);
      // create and log in the user
      return common.createSuperUser().then((member) => {
        // loginMember = member;
        return common.createUserSession(member, agent);
      });
    });

    // POST /member/:email/update-attributes with no query params
    it('POST /member/:id/update-attributes with no query params', () => {
      return models.Member.create({
        email: common.getNormalUserEmail(),
        password: 'blah', // doesn't matter because we won't be logging in
        accend: false,
        super_user: false,
        private_user: false,
      }).then((createdMember) => {
        const response = agent
          .post(`/member/${createdMember.id}/update-attributes?super_user=false&private_user=false`)
          .redirects(1)
          .expect(304);
        return response.then(() => {
          return models.Member.findByPk(createdMember.id).then((member) => {
            assert.equal(member.super_user, false);
            assert.equal(member.private_user, false);
          });
        });
      });
    });

    // POST /member/:email/update-attributes to elevate to super user
    it('POST /member/:id/update-attributes to elevate super user', () => {
      return models.Member.create({
        email: common.getNormalUserEmail(),
        password: 'blah', // doesn't matter because we won't be logging in
        accend: false,
        super_user: false,
        private_user: false,
      }).then((createdMember) => {
        const response = agent
          .post(`/member/${createdMember.id}/update-attributes?super_user=true`)
          .redirects(1)
          .expect(200);
        return response.then(() => {
          return models.Member.findByPk(createdMember.id).then((member) => {
            assert.equal(member.super_user, true);
            assert.equal(member.private_user, false);
          });
        });
      });
    });

    // POST /member/:email/update-attributes to demote from super user
    it('POST /member/:id/update-attributes to demote super user', () => {
      return models.Member.create({
        email: common.getNormalUserEmail(),
        password: 'blah', // doesn't matter because we won't be logging in
        accend: false,
        super_user: true,
        private_user: false,
      }).then((createdMember) => {
        const response = agent
          .post(`/member/${createdMember.id}/update-attributes?super_user=false`)
          .redirects(1)
          .expect(200);
        return response.then(() => {
          return models.Member.findByPk(createdMember.id).then((member) => {
            assert.equal(member.super_user, false);
            assert.equal(member.private_user, false);
          });
        });
      });
    });

    // POST /member/:email/update-attributes to set user to private
    it('POST /member/:id/update-attributes to set user to private', () => {
      return models.Member.create({
        email: common.getNormalUserEmail(),
        password: 'blah', // doesn't matter because we won't be logging in
        accend: false,
        super_user: false,
        private_user: false,
      }).then((createdMember) => {
        const response = agent
          .post(`/member/${createdMember.id}/update-attributes?private_user=true`)
          .redirects(1)
          .expect(200);
        return response.then(() => {
          return models.Member.findByPk(createdMember.id).then((member) => {
            assert.equal(member.super_user, false);
            assert.equal(member.private_user, true);
          });
        });
      });
    });

    // POST /member/:email/update-attributes to set user to public
    it('POST /member/:id/update-attributes to set user to public', () => {
      return models.Member.create({
        email: common.getNormalUserEmail(),
        password: 'blah', // doesn't matter because we won't be logging in
        accend: false,
        super_user: false,
        private_user: true,
      }).then((createdMember) => {
        const response = agent
          .post(`/member/${createdMember.id}/update-attributes?private_user=false`)
          .redirects(1)
          .expect(200);
        return response.then(() => {
          return models.Member.findByPk(createdMember.id).then((member) => {
            assert.equal(member.super_user, false);
            assert.equal(member.private_user, false);
          });
        });
      });
    });

    // POST /member/:email/update-attributes with bad value for super_user and private_user
    it('POST /member/:id/update-attributes with bad values', () => {
      return models.Member.create({
        email: common.getNormalUserEmail(),
        password: 'blah', // doesn't matter because we won't be logging in
        accend: false,
        super_user: false,
        private_user: true,
      }).then((createdMember) => {
        const response = agent
          .post(`/member/${createdMember.id}/update-attributes?private_user=f&super_user=f`)
          .redirects(1)
          .expect(304);
        return response.then(() => {
          return models.Member.findByPk(createdMember.id).then((member) => {
            assert.equal(member.super_user, false);
            assert.equal(member.private_user, true);
          });
        });
      });
    });

    // GET profile of private member
    it('GET profile of private member as super user', () => {
      const email = 'test@mail.uc.edu';
      return models.Member.create({
        email,
        password: 'blah', // doesn't matter because we won't be logging in
        accend: false,
        super_user: false,
        private_user: true,
      }).then((member) => {
        return agent.get(`/member/${member.id}`)
          .redirects(1)
          .expect(200);
      });
    });

    it('POST /member/:id/delete succesfully', () => {
      return common.createNormalUser().then((member) => {
        const response = agent
          .post(`/member/${member.id}/delete`)
          .redirects(1)
          .expect(200);
        return response.then(() => {
          return models.Member.findByPk(member.id).then((assertMember) => {
            assert(!assertMember);
          });
        });
      });
    });

    it('POST /member/:id/reset-password succesfully', () => {
      return common.createNormalUser().then((member) => {
        const response = agent
          .post(`/member/${member.id}/reset-password`)
          .redirects(1)
          .expect(200);

        return response.then(() => {
          return models.Member.findByPk(member.id).then((assertMember) => {
            // assumes that the normal user password is 'password'
            // it's hard to get the new password from the UI, so let's just asser that
            // the password isn't 'password' anymore
            return models.Member.comparePassword('password', assertMember).then((truth) => {
              assert(!truth);
            });
          });
        });
      });
    });
  });
});
