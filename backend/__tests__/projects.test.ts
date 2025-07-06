import request from 'supertest';
import app from '../index';
import { signToken } from '../utils/jwt';
import { ProjectService } from '../services/ProjectService';

const userId = 'user1';
const token = signToken({ id: userId });

describe('Project API', () => {
  it('creates and retrieves a project', async () => {
    const create = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'My Project' });
    expect(create.status).toBe(201);
    const id = create.body.data.id;

    const get = await request(app)
      .get(`/api/projects/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(get.status).toBe(200);
    expect(get.body.data.name).toBe('My Project');
  });
});
