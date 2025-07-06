import request from 'supertest';
import app from '../index';

describe('Auth API', () => {
  it('registers and logs in a user', async () => {
    const email = 'test@example.com';
    const password = 'password123';

    const register = await request(app)
      .post('/api/auth/register')
      .send({ email, password });
    expect(register.status).toBe(201);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email, password });
    expect(login.status).toBe(200);
    expect(login.body.data.token).toBeDefined();
  });
});
