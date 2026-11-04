window.supabase = { createClient: () => {
  const q = (t) => { const st = { t, cols: '*', filt: null, op: 'select' }; const api = {
    select(c) { st.cols = c || '*'; st.op = 'select'; return api; }, in(k, v) { st.filt = { k, v }; return api; }, eq(k, v) { st.filt = { k, v: [v] }; return api; },
    upsert(row, o) { st.op = 'upsert'; st.row = row; st.conf = o && o.onConflict; return api; }, delete() { st.op = 'delete'; return api; },
    then(res, rej) { const ses = JSON.parse(localStorage.getItem('__ses') || 'null'); st.uid = ses && ses.user.id; return window.__rem(JSON.stringify(st)).then(r => JSON.parse(r)).then(res, rej); } }; return api; };
  return { auth: {
    getSession: async () => ({ data: { session: JSON.parse(localStorage.getItem('__ses') || 'null') } }),
    signInWithPassword: async ({ email, password }) => { if (password !== 'ok') return { data: {}, error: { message: 'Invalid login credentials' } }; const s = { user: { id: 'u1', email } }; localStorage.setItem('__ses', JSON.stringify(s)); return { data: { session: s }, error: null }; },
    signOut: async () => localStorage.removeItem('__ses') }, from: q };
} };
