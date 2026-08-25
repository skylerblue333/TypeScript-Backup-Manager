import { randomUUID } from 'node:crypto';

import express from 'express';
import { z } from 'zod';

const app = express();
app.use(express.json({ limit: '64kb' }));

const MAX_PLANS = 1_000;
const scheduleSchema = z.enum(['on-demand', 'hourly', 'daily', 'weekly']);
const backupPlanSchema = z.object({
  resource: z.string().trim().min(1).max(512),
  destination: z.string().trim().min(1).max(512),
  schedule: scheduleSchema,
});

type BackupPlanInput = z.infer<typeof backupPlanSchema>;
interface BackupPlan extends BackupPlanInput {
  id: string;
  createdAt: string;
  status: 'planned';
}

const plans = new Map<string, BackupPlan>();

function publicPlan(plan: BackupPlan): BackupPlan {
  return { ...plan };
}

app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok', service: 'sky-backup-plan-registry' });
});

app.get('/readyz', (_req, res) => {
  res.json({ status: 'ready', capacity: MAX_PLANS, planned: plans.size });
});

app.post('/api/v1/plans', (req, res) => {
  if (plans.size >= MAX_PLANS) {
    return res.status(503).json({ error: 'in-memory plan capacity reached' });
  }

  const parsed = backupPlanSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ error: 'invalid backup plan', issues: parsed.error.issues });
  }

  const plan: BackupPlan = {
    ...parsed.data,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    status: 'planned',
  };
  plans.set(plan.id, plan);
  return res.status(201).json(publicPlan(plan));
});

app.get('/api/v1/plans', (_req, res) => {
  const items = [...plans.values()]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
    .map(publicPlan);
  res.json({ plans: items, total: items.length });
});

app.get('/api/v1/plans/:id', (req, res) => {
  const plan = plans.get(req.params.id);
  if (!plan) return res.status(404).json({ error: 'plan not found' });
  return res.json(publicPlan(plan));
});

if (require.main === module) {
  app.listen(8080, '0.0.0.0', () => console.log('Sky Backup Plan Registry listening on :8080'));
}

export { MAX_PLANS, plans };
export default app;
