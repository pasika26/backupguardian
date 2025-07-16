const request = require('supertest');
const app = require('./src/app');
const { pool } = require('./src/config/database');
const jwt = require('jsonwebtoken');

describe('Admin Endpoints', () => {
  let adminToken, userToken;
  let adminUserId, regularUserId;

  beforeAll(async () => {
    // Create admin user
    const adminResult = await pool.query(
      'INSERT INTO users (email, password, is_admin) VALUES ($1, $2, $3) RETURNING id',
      ['admin@test.com', 'hashedpassword', true]
    );
    adminUserId = adminResult.rows[0].id;
    
    // Create regular user  
    const userResult = await pool.query(
      'INSERT INTO users (email, password, is_admin) VALUES ($1, $2, $3) RETURNING id',
      ['user@test.com', 'hashedpassword', false]
    );
    regularUserId = userResult.rows[0].id;

    // Generate tokens
    adminToken = jwt.sign({ 
      userId: adminUserId, 
      isAdmin: true 
    }, process.env.JWT_SECRET);
    
    userToken = jwt.sign({ 
      userId: regularUserId, 
      isAdmin: false 
    }, process.env.JWT_SECRET);
  });

  afterAll(async () => {
    await pool.query('DELETE FROM users WHERE id IN ($1, $2)', [adminUserId, regularUserId]);
    await pool.end();
  });

  describe('GET /api/admin/stats', () => {
    it('should return admin dashboard stats', async () => {
      const response = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalUsers');
      expect(response.body).toHaveProperty('totalBackups');
      expect(response.body).toHaveProperty('totalTests');
      expect(response.body).toHaveProperty('recentActivity');
    });

    it('should deny access to non-admin users', async () => {
      await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('GET /api/admin/users', () => {
    it('should return all users with activity metrics', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      
      const user = response.body[0];
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('backup_count');
      expect(user).toHaveProperty('test_count');
    });

    it('should deny access to non-admin users', async () => {
      await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('GET /api/admin/activity', () => {
    it('should return recent activity', async () => {
      const response = await request(app)
        .get('/api/admin/activity')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('recentUploads');
      expect(response.body).toHaveProperty('recentTests');
      expect(Array.isArray(response.body.recentUploads)).toBe(true);
      expect(Array.isArray(response.body.recentTests)).toBe(true);
    });

    it('should deny access to non-admin users', async () => {
      await request(app)
        .get('/api/admin/activity')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });
});
