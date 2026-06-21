# Публикация на Vercel (бесплатно)

Пошаговая инструкция после исчерпания кредитов Netlify.

## Что понадобится

- Аккаунт [GitHub](https://github.com) с репозиторием `exam-prep`
- База **Neon** (у вас уже есть `DATABASE_URL` в `.env`)
- Аккаунт [Vercel](https://vercel.com) (бесплатный)

---

## Шаг 1. Регистрация на Vercel

1. Откройте [vercel.com/signup](https://vercel.com/signup)
2. Нажмите **Continue with GitHub**
3. Разрешите Vercel доступ к репозиториям

---

## Шаг 2. Импорт проекта

1. На главной Vercel нажмите **Add New…** → **Project**
2. Найдите репозиторий **`exam-prep`** (или `podanevasofia745-coder/exam-prep`)
3. Нажмите **Import**

### Настройки сборки (обычно подставляются автоматически)

| Поле | Значение |
|------|----------|
| Framework Preset | **Next.js** |
| Build Command | `prisma generate && next build` |
| Output Directory | *(оставить пустым)* |
| Install Command | `npm install` |

---

## Шаг 3. Переменные окружения

Перед деплоем нажмите **Environment Variables** и добавьте:

| Имя | Значение |
|-----|----------|
| `DATABASE_URL` | Строка подключения Neon из вашего `.env` |
| `NEXTAUTH_SECRET` | Секрет из `.env` (длинная случайная строка) |
| `NEXTAUTH_URL` | Пока оставьте пустым — обновите после первого деплоя |

Нажмите **Deploy**.

---

## Шаг 4. После первого деплоя

1. Vercel выдаст URL вида `https://exam-prep-xxxxx.vercel.app`
2. Зайдите в **Settings** → **Environment Variables**
3. Добавьте или измените **`NEXTAUTH_URL`** на этот URL (без слэша в конце):
   ```
   https://exam-prep-xxxxx.vercel.app
   ```
4. **Deployments** → последний деплой → **⋯** → **Redeploy** (чтобы применить `NEXTAUTH_URL`)

---

## Шаг 5. Проверка

1. Откройте сайт по URL Vercel
2. Зарегистрируйтесь / войдите
3. Создайте экзамен, загрузите билеты, откройте **Общее расписание**

База данных **та же Neon** — старые аккаунты и экзамены сохранятся.

---

## Локальная разработка

В `.env` для локального запуска:

```env
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="ваш-секрет"
NEXTAUTH_URL="http://localhost:3000"
```

```powershell
npm run dev
```

---

## Частые проблемы

### «Не удалось создать экзамен» / ошибка входа
- Проверьте `NEXTAUTH_URL` — должен **точно** совпадать с URL сайта на Vercel
- После смены переменной сделайте **Redeploy**

### Ошибка Prisma при сборке
- Убедитесь, что `DATABASE_URL` добавлен в Environment Variables на Vercel

### Netlify
- Старый сайт на Netlify можно не удалять или отключить в Netlify → Site settings

---

## Автодеплой

Каждый `git push` в ветку `main` на GitHub — Vercel автоматически пересобирает сайт (как раньше на Netlify).
