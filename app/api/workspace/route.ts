import { initialState } from '@/lib/demo';
import type { State } from '@/lib/model';
import { mutate, RequestError, visibleState } from '@/lib/operations';
import { notifyExpenseReviewed, notifyExpenseSubmitted } from '@/lib/notifications';
import { getSupabaseAdmin, hasSupabaseServerConfig, userEmailFromToken } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const TABLE = 'expenseiq_workspace';

function removeLegacyDemoWorkspace(state: State) {
  if (state.businesses.length !== 1) return false;
  const [business] = state.businesses;
  const hasOnlySampleExpenses = business.expenses.every((expense) => expense.id.startsWith('sample-'));
  if (!business.demo || !hasOnlySampleExpenses) return false;
  state.businesses = [];
  return true;
}

function trustedHeaderEmail(request: Request) {
  const id = request.headers.get('oai-authenticated-user-id');
  const email = request.headers.get('oai-authenticated-user-email')?.trim().toLowerCase();
  return id && email ? email : null;
}

async function identity(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (token && hasSupabaseServerConfig()) {
    const email = await userEmailFromToken(token);
    if (email) return email;
  }

  const trustedEmail = trustedHeaderEmail(request);
  if (trustedEmail) return trustedEmail;

  throw new RequestError('Sign in to access your business workspace.', 401);
}

async function load(email: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from(TABLE).select('payload, version').eq('id', 1).maybeSingle();
  if (error) throw error;
  if (data) {
    const state = data.payload as State;
    if (removeLegacyDemoWorkspace(state)) {
      await supabase.from(TABLE).update({ payload: state, updated_at: new Date().toISOString() }).eq('id', 1).eq('version', data.version);
    }
    return { state, version: data.version as number };
  }

  const starter = initialState(email);
  const inserted = await supabase
    .from(TABLE)
    .insert({ id: 1, payload: starter, version: 0 })
    .select('payload, version')
    .maybeSingle();

  if (inserted.error && inserted.error.code !== '23505') throw inserted.error;
  if (inserted.data) return { state: inserted.data.payload as State, version: inserted.data.version as number };

  const existing = await supabase.from(TABLE).select('payload, version').eq('id', 1).single();
  if (existing.error) throw existing.error;
  const state = existing.data.payload as State;
  if (removeLegacyDemoWorkspace(state)) {
    await supabase.from(TABLE).update({ payload: state, updated_at: new Date().toISOString() }).eq('id', 1).eq('version', existing.data.version);
  }
  return { state, version: existing.data.version as number };
}

function failure(error: unknown) {
  if (error instanceof RequestError) return Response.json({ error: error.message }, { status: error.status });
  console.error('Workspace request failed', error);
  return Response.json({ error: 'The workspace is temporarily unavailable. Please try again.' }, { status: 503 });
}

export async function GET(request: Request) {
  try {
    const email = await identity(request);
    const { state } = await load(email);
    return Response.json(visibleState(state, email), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    const email = await identity(request);
    const origin = request.headers.get('origin');
    if (!origin || origin !== new URL(request.url).origin) throw new RequestError('Invalid request origin.', 403);
    if (Number(request.headers.get('content-length') || 0) > 16384) throw new RequestError('Request too large.', 413);

    const raw = await request.text();
    if (raw.length > 16384) throw new RequestError('Request too large.', 413);

    let input;
    try {
      input = JSON.parse(raw);
    } catch {
      throw new RequestError('Invalid request.');
    }
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new RequestError('Invalid request.');

    const { state, version } = await load(email);
    const businessBefore = state.businesses.find((business) => business.id === input.businessId);
    const pendingBefore = new Set(businessBefore?.expenses.filter((expense) => expense.status === 'pending').map((expense) => expense.id) ?? []);
    const reviewedBefore = new Map(businessBefore?.expenses.map((expense) => [expense.id, expense.status]) ?? []);

    mutate(state, email, input);

    const businessAfter = state.businesses.find((business) => business.id === input.businessId);
    const newPendingExpense = businessAfter?.expenses.find((expense) => expense.status === 'pending' && !pendingBefore.has(expense.id));
    const reviewedExpense = businessAfter?.expenses.find((expense) => reviewedBefore.get(expense.id) === 'pending' && expense.status !== 'pending');

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from(TABLE)
      .update({ payload: state, version: version + 1, updated_at: new Date().toISOString() })
      .eq('id', 1)
      .eq('version', version)
      .select('version')
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new RequestError('The workspace changed. Refresh and try again.', 409);

    if (businessAfter && newPendingExpense) await notifyExpenseSubmitted(businessAfter, newPendingExpense);
    if (businessAfter && reviewedExpense) await notifyExpenseReviewed(businessAfter, reviewedExpense);

    return Response.json(visibleState(state, email), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return failure(error);
  }
}
