# ExamPrep — сайт для подготовки к экзаменам

## Локальный запуск

```bash
npm install
npm run db:push
npm run dev
```

Откройте http://localhost:3000

> Если видите **Internal Server Error** — остановите все процессы Node, удалите папку `.next` и запустите снова:
> ```bash
> Remove-Item -Recurse -Force .next
> npm run dev
> ```

## Публичный доступ (Railway — рекомендуется)

1. Создайте аккаунт на [railway.app](https://railway.app)
2. Установите CLI: `npm i -g @railway/cli`
3. В папке проекта:
   ```bash
   railway login
   railway init
   railway up
   ```
4. В Railway Dashboard → Variables добавьте:
   - `NEXTAUTH_SECRET` — случайная строка (например `openssl rand -base64 32`)
   - `NEXTAUTH_URL` — URL вашего приложения (например `https://exam-prep.up.railway.app`)
   - `DATABASE_URL` — `file:./prod.db`
5. Добавьте Volume в Railway: mount path `/app/prisma` (для сохранения базы данных)

## Публичный доступ (Vercel + Neon PostgreSQL)

SQLite не работает на Vercel. Нужна PostgreSQL:

1. Создайте бесплатную БД на [neon.tech](https://neon.tech)
2. В `prisma/schema.prisma` смените `provider = "sqlite"` на `provider = "postgresql"`
3. Загрузите проект на GitHub
4. Импортируйте в [vercel.com](https://vercel.com)
5. Environment Variables:
   - `DATABASE_URL` — строка подключения Neon
   - `NEXTAUTH_SECRET` — случайная строка
   - `NEXTAUTH_URL` — `https://ваш-домен.vercel.app`
6. Build Command: `npx prisma generate && npx prisma db push && next build`

## Быстрый туннель (временная ссылка)

```bash
npx localtunnel --port 3000
```

Или:

```bash
npx cloudflared tunnel --url http://localhost:3000
```
