#!/usr/bin/env bash
# ساخت نسخه‌ی نهایی و اجرای آن روی http://localhost:8080
set -e
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js پیدا نشد. ابتدا Node 20 یا بالاتر را نصب کن (مثلاً با nvm)."
  exit 1
fi

if [ ! -d node_modules ]; then
  echo ">> نصب پکیج‌ها (فقط یک بار)..."
  npm install
fi

echo ">> ساخت نسخه‌ی نهایی..."
npm run build

echo ">> اجرا روی http://localhost:8080  (برای توقف: Ctrl+C)"
cd dist
python3 -m http.server 8080
