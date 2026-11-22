# filterOptions validation fails on create with MongoDB transactions

Minimal reproduction for [payloadcms/payload#18679](https://github.com/payloadcms/payload/issues/18679) on Payload `4.0.0-beta.11`.

Created with `create-payload-app@beta -t blank` (MongoDB). The only additions are the `posts` collection in [src/collections/Posts.ts](src/collections/Posts.ts), with two upload fields that both use `filterOptions`, and the script [src/repro.ts](src/repro.ts).

## Run

```bash
cp .env.example .env
docker compose up -d --wait
pnpm install
pnpm payload run src/repro.ts
```

Expected: every create succeeds. Actual:

```
Same image in both fields: 0/10 creates failed
Different images: 10/10 creates failed (The following field is invalid: Image B)
Update to different images: succeeded
```

The server logs `MongoServerError: Only servers in a sharded cluster can start a new transaction at the active transaction number`.

With `?directConnection=true` instead of `?replicaSet=rs0` in `DATABASE_URL`, transactions are disabled and every create succeeds.

## Admin panel

1. Run `pnpm dev`, open http://localhost:3000/admin, create a user and upload two images.
2. Create a post with different images in Image A and Image B. Saving fails with `The following field is invalid: Image B`.
3. The same image in both fields saves, and changing Image B on the saved post works as well.
