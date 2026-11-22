# Ruventu online demo (free plans only)

The root `render.yaml` creates one **Free** Docker web service and one **Free**
Key Value service in Singapore. Nginx serves the frontend and proxies the API
and WebSocket to Java inside the same container. Browser cookies stay on one
HTTPS origin. Local Docker deployment is unchanged.
The frontend port opens only after the settings API responds successfully, so
Render's default TCP readiness check also waits for the backend to start.

## Required before deploying

1. Connect Render and choose the intended workspace.
2. Create an **Aiven MySQL Free** service, not a paid trial. Use a separate demo
   database. Do not import customers, orders, real account passwords, or mail keys.
3. Set these backend environment variables privately in Render:

   | Variable | Value |
   | --- | --- |
   | `DB_CONNECTED` | `jdbc:mysql://HOST:PORT/defaultdb?sslMode=VERIFY_IDENTITY` |
   | `DB_USERNAME` | The Aiven database user |
   | `DB_PASSWORD` | The Aiven database password |
   | `DB_CA_CERTIFICATE` | The complete Aiven project CA certificate (PEM) |

The blueprint generates new `JWT_SECRET` and `BOOTSTRAP_ADMIN_PASSWORD` values.
For creation through the Render connector, generate both values separately and
set `SPRING_PROFILES_ACTIVE=render` and `REDIS_URL` as in the blueprint. Render
provides `RENDER_EXTERNAL_URL`; the app uses it to restrict the WebSocket origin.
The bootstrap admin email is `admin@gmail.com`; its generated password is only
used when this account does not already exist. Never publish it in frontend code.

The runtime verifies both the MySQL certificate and hostname. The CA is public
certificate material, not its private key. The generated truststore password
`changeit` protects no private key and is not a database credential.

## Build and checks

Run from the repository root:

```powershell
docker build -f Dockerfile.render -t feruventu-online-demo:latest .
```

This builds the frontend without `.env.local` or admin credential build arguments,
compiles the backend, and runs the two `DataInitializerTest` checks. The existing
unrelated backend test suite currently has compilation errors, so the demo image
copies only this focused test. It does not claim a passing full test suite.

The startup readiness and termination checks can run inside the built image:

```powershell
docker run --rm --entrypoint bash --mount "type=bind,source=$((Resolve-Path deploy/render).Path),target=/checks,readonly" feruventu-online-demo:latest /checks/start.test.sh
```

Configure the Render service health check to `/api/v1/system-settings/status`.
After deployment, check the home page, a refreshed category URL, products,
catalog options, sign-in/refresh, guest cart cookies, and the admin WebSocket.
Start load tests only after these checks pass.

Local verification on 2026-11-03 used a fresh, isolated MySQL database with TLS
hostname verification and a separate Redis. Under a hard 512 MB container limit,
home/category refresh, public APIs, login/refresh, secure guest cookies, and
WebSocket upgrade/origin rejection passed. Observed memory after those requests
was about 424 MiB. This was a smoke check with an empty catalog, not a load test
or evidence of cloud deployment capacity. The blueprint also passed Render's
published JSON schema validation.

## Free-tier limits

- Render Free currently has 512 MB RAM and sleeps after 15 minutes idle. The
  blueprint bounds the Java heap, threads, and database pool for this demo.
  Memory and latency still need measuring on the deployed service.
- Redis Free is not durable; guest carts and temporary state can disappear on
  restart. MySQL remains the persistent datastore.
- Aiven MySQL Free currently has 1 GB storage. Seed only demo/catalog data.
- Render Free blocks outbound SMTP ports 25, 465, and 587. Registration OTP mail
  is not enabled by this configuration; no real SMTP credentials are copied.
- No payment method or paid plan is required by this configuration. Do not
  enable paid upgrades or overage billing. Check each provider's current limits.
- Load-test results describe these free resources, not a larger production VPS.

References: [Render Free](https://render.com/docs/free),
[Aiven MySQL Free](https://aiven.io/docs/products/mysql/concepts/mysql-free-tier),
[MySQL TLS verification](https://dev.mysql.com/doc/connector-j/en/connector-j-server-authentication.html).
