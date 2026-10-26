import { NextResponse } from 'next/server';
import { getSupabaseAdmin, hasSupabaseServerConfig } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const start = performance.now();
  let dbStatus: 'connected' | 'standby' | 'error' = 'standby';
  let dbLatencyMs = 0;

  if (hasSupabaseServerConfig()) {
    try {
      const dbStart = performance.now();
      const supabase = getSupabaseAdmin();
      const { error } = await supabase.from('expenseiq_workspace').select('id').limit(1);
      dbLatencyMs = Math.round(performance.now() - dbStart);
      dbStatus = error ? 'error' : 'connected';
    } catch {
      dbStatus = 'error';
    }
  } else {
    // Local / development standby mode
    dbStatus = 'standby';
  }

  const apiLatencyMs = Math.max(1, Math.round(performance.now() - start));
  const memory = typeof process !== 'undefined' && process.memoryUsage ? Math.round(process.memoryUsage().rss / 1024 / 1024) : 0;
  const uptime = typeof process !== 'undefined' && process.uptime ? Math.round(process.uptime()) : 0;

  return NextResponse.json(
    {
      status: dbStatus === 'error' ? 'degraded' : 'operational',
      database: dbStatus,
      dbLatencyMs,
      apiLatencyMs,
      memoryUsageMb: memory,
      uptimeSeconds: uptime,
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development',
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        Pragma: 'no-cache',
      },
    }
  );
}
