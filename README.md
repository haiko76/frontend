# How to run 
## Mirgate Database
+ Install Migrate Go CLI: [https://github.com/golang-migrate/migrate/tree/master/cmd/migrate](https://github.com/golang-migrate/migrate/tree/master/cmd/migrate)
+ Change the config in `dev/migrate.sh` for `POSTGRES_HOST`, `POSTGRES_PORT`
+ Run `dev/migrate.sh`
+ Create a `.env` with the same structure in `.env.example`
+ Run the following commands:
```
cd packages/backend
pnpm prisma db pull
pnpm prisma generate
```
## Run the app 
Run the syncer for data (OR USE DATA IN `./data`) and run the app:
```
pnpm tsx /home/tlinh/Downloads/frontend/packages/backend/src/syncer/index.ts
pnpm tsx packages/backend/src/api/index.ts
```
