import request from 'supertest';

import app, { plans } from '../src/index';

beforeEach(() => plans.clear());

test('health and readiness expose bounded registry state', async () => {
  const health = await request(app).get('/healthz');
  expect(health.status).toBe(200);
  expect(health.body.status).toBe('ok');

  const ready = await request(app).get('/readyz');
  expect(ready.status).toBe(200);
  expect(ready.body.planned).toBe(0);
  expect(ready.body.capacity).toBeGreaterThan(0);
});

test('creates and retrieves a validated plan without claiming execution', async () => {
  const created = await request(app).post('/api/v1/plans').send({
    resource: 'postgres://logical/customer-db',
    destination: 's3://example-backups/customer-db',
    schedule: 'daily',
  });
  expect(created.status).toBe(201);
  expect(created.body.status).toBe('planned');
  expect(created.body.id).toEqual(expect.any(String));

  const fetched = await request(app).get(`/api/v1/plans/${created.body.id}`);
  expect(fetched.status).toBe(200);
  expect(fetched.body.destination).toBe('s3://example-backups/customer-db');
});

test('rejects unsupported schedules and blank resources', async () => {
  const invalidSchedule = await request(app).post('/api/v1/plans').send({
    resource: 'db', destination: 'archive', schedule: '* * * * *',
  });
  expect(invalidSchedule.status).toBe(422);

  const blank = await request(app).post('/api/v1/plans').send({
    resource: '   ', destination: 'archive', schedule: 'daily',
  });
  expect(blank.status).toBe(422);
});

test('lists plans and returns 404 for unknown ids', async () => {
  await request(app).post('/api/v1/plans').send({ resource: 'a', destination: 'one', schedule: 'weekly' });
  await request(app).post('/api/v1/plans').send({ resource: 'b', destination: 'two', schedule: 'on-demand' });

  const listed = await request(app).get('/api/v1/plans');
  expect(listed.status).toBe(200);
  expect(listed.body.total).toBe(2);
  expect(listed.body.plans.every((plan: { status: string }) => plan.status === 'planned')).toBe(true);
  expect((await request(app).get('/api/v1/plans/missing')).status).toBe(404);
});
