import request from 'supertest';
import app from '../src/index';

describe('TypeScript-Backup-Manager', () => {
  it('GET /health', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
  });

  it('POST /api/v1/backups', async () => {
    const res = await request(app)
      .post('/api/v1/backups')
      .send({ resource: 'postgres-db', destination: 's3://backups', schedule: '0 2 * * *' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('scheduled');
  });

  it('GET /api/v1/backups', async () => {
    const res = await request(app).get('/api/v1/backups');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.backups)).toBe(true);
  });

});
