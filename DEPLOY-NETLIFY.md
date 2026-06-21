# Публикация на Netlify (как lustrous-faloodeh-b46fef.netlify.app)

Пошаговая инструкция: бесплатный публичный URL вида `https://ваше-имя.netlify.app`.

## Шаг 1. База данных (PostgreSQL, бесплатно)

SQLite на Netlify не сохраняется — нужен PostgreSQL в облаке.

### Вариант А — Supabase (рекомендуется, если Neon не открывается)

1. Зайдите на [supabase.com](https://supabase.com) → **Start your project**
2. **New project** → задайте пароль для БД (сохраните!)
3. **Project Settings** → **Database** → **Connection string** → вкладка **URI**
4. Скопируйте строку, замените `[YOUR-PASSWORD]` на ваш пароль:
   ```
   postgresql://postgres.xxxx:ВАШ_ПАРОЛЬ@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
   ```
5. Добавьте в конец: `?sslmode=require` (если ещё нет)

### Вариант Б — Neon (если сайт открывается)

1. [neon.tech](https://neon.tech) → **New Project**
2. Скопируйте Connection string (PostgreSQL)

### Вариант В — Railway (хостинг + БД в одном месте, без Netlify)

Если и Supabase не открывается — проще всего задеплоить всё на [railway.app](https://railway.app):
1. `railway login` → `railway init` → `railway up`
2. Добавьте PostgreSQL: **+ New** → **Database** → **PostgreSQL**
3. Railway сам подставит `DATABASE_URL`

Подробнее — в `README.md`, раздел Railway.

### Если ничего не открывается

- Включите VPN и попробуйте Supabase или Railway
- Или попросите знакомого за границей создать проект Supabase и прислать `DATABASE_URL`

## Шаг 2. GitHub

1. Создайте репозиторий на [github.com](https://github.com) (например `exam-prep`)
2. В папке проекта выполните:

```bash
git add .
git commit -m "Prepare for Netlify deploy"
git branch -M main
git remote add origin https://github.com/ВАШ_ЛОГИН/exam-prep.git
git push -u origin main
```

## Шаг 3. Netlify

1. Зайдите на [app.netlify.com](https://app.netlify.com)
2. **Add new site** → **Import an existing project**
3. Выберите **GitHub** → ваш репозиторий
4. Настройки подставятся из `netlify.toml` автоматически:
   - Build command: `npm run netlify-build`
   - Plugin: `@netlify/plugin-nextjs`

## Шаг 4. Переменные окружения

В Netlify: **Site configuration** → **Environment variables** → **Add a variable**:

| Переменная        | Значение |
|-------------------|----------|
| `DATABASE_URL`    | Строка подключения из Supabase / Neon / Railway |
| `NEXTAUTH_SECRET` | Случайная строка (32+ символа). Можно сгенерировать: `openssl rand -base64 32` |
| `NEXTAUTH_URL`    | Пока оставьте пустым — добавите после первого деплоя |

Нажмите **Deploy site**.

## Шаг 5. После первого деплоя

1. Netlify выдаст URL, например: `https://random-name-123.netlify.app`
2. **Environment variables** → добавьте/обновите:
   - `NEXTAUTH_URL` = `https://random-name-123.netlify.app`
3. **Deploys** → **Trigger deploy** → **Deploy site** (пересборка)

## Шаг 6. Локальная разработка

В файле `.env` укажите ту же `DATABASE_URL` из Supabase — сайт будет работать и локально, и на Netlify с одной базой.

```bash
npm install
npm run db:push
npm run dev
```

---

## Переименовать сайт

**Site configuration** → **Domain management** → **Options** → **Edit site name**  
Получите адрес вида: `https://exam-prep.netlify.app`

## Если сборка упала

- Проверьте, что все 3 переменные окружения заданы
- `DATABASE_URL` должен содержать `?sslmode=require`
- Логи: **Deploys** → клик по деплою → **Deploy log**

## Сравнение с примером

Сайт [lustrous-faloodeh-b46fef.netlify.app](https://lustrous-faloodeh-b46fef.netlify.app/) — статический/фронтенд на Netlify.  
ExamPrep — Next.js с сервером и БД, поэтому дополнительно нужны Neon + переменные окружения. URL будет таким же: `https://название.netlify.app`.
