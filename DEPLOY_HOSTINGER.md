# Deploy VPS Hostinger

## 1. GitHub repo cần tạo

Tạo repo GitHub private tên:

```text
duong-minh-container-dispatch
```

Sau khi tạo, gửi lại URL dạng:

```text
https://github.com/<username>/duong-minh-container-dispatch.git
```

Không commit file `.env`.

## 2. VPS requirements

Trên VPS Hostinger cần có:

```bash
docker --version
docker compose version
git --version
```

Nếu chưa có:

```bash
sudo apt update
sudo apt install -y git ca-certificates curl
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
```

Logout/login lại SSH sau khi thêm user vào group docker.

## 3. Clone code

```bash
git clone https://github.com/<username>/duong-minh-container-dispatch.git
cd duong-minh-container-dispatch
```

## 4. Tạo env production

```bash
cp .env.production.example .env
nano .env
```

Sửa:

- `NEXTAUTH_URL`
- `OPENROUTER_API_KEY`
- `OPENROUTER_SITE_URL`
- password trong `DATABASE_URL`
- password `POSTGRES_PASSWORD` trong `docker-compose.prod.yml` nếu đổi DB password

## 5. Build và chạy

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec app npx prisma db push
docker compose -f docker-compose.prod.yml exec app npm run prisma:seed
```

Kiểm tra:

```bash
curl http://localhost:3001/api/health
```

Nếu dùng domain, trỏ reverse proxy/Nginx/Caddy từ domain về `localhost:3001`.

## 6. Tài khoản admin

```text
admin@duongminhlogistics.vn
admin123@
```
