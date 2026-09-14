export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { runMigrations } = await import('@/lib/db/migrate');
    runMigrations();

    // Complain if a deployed instance came up unable to reach customers. The
    // shut gate answers ok on every send, so nothing else would ever say it.
    // (F031.1)
    const { assertMailGateSane } = await import('@/lib/email/mailer');
    assertMailGateSane();
  }
}
