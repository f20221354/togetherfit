# Tests

## Unit tests

```bash
npm test
```

Pure functions only; no server or database needed.

## API tests

These run against a real production build, a Postgres database and a fake
mail server, so the full email-code flows (sign-up, login, email change) are
exercised without sending real email.

```bash
# 1. Fake mail server (writes every email to the file)
node tests/support/smtp-sink.mjs 2465 /tmp/togetherfit-mail.log &

# 2. Migrate the test database and build the app
DATABASE_URL=postgres://localhost:5432/togetherfit_test DATABASE_SSL=false npm run db:migrate
npm run build

# 3. Start the app pointed at the fake mail server
DATABASE_URL=postgres://localhost:5432/togetherfit_test DATABASE_SSL=false \
AUTH_SECRET=test-auth-secret-0123456789abcdef0123456789 \
SMTP_HOST=127.0.0.1 SMTP_PORT=2465 SMTP_SECURE=true SMTP_USER=noreply@example.com SMTP_PASS=x \
NODE_TLS_REJECT_UNAUTHORIZED=0 VERIFICATION=mock CRON_SECRET=test-cron-secret \
npx next start -p 3100 &

# 4. Run the tests
TEST_MAIL_LOG=/tmp/togetherfit-mail.log TEST_DATABASE_URL=postgres://localhost:5432/togetherfit_test npm run test:api
```

`NODE_TLS_REJECT_UNAUTHORIZED=0` is only for the fake mail server's
throwaway certificate; never set it outside tests. To test the bot check,
start the app with `CAPTCHA=turnstile` and Cloudflare's test secret
(`1x0000000000000000000000000000000AA` always passes,
`2x0000000000000000000000000000000AA` always fails) and run with
`TEST_CAPTCHA=pass` or `TEST_CAPTCHA=fail`.
