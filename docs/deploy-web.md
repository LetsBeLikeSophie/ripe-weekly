# 웹 배포: ripe.itssophie.dev

앱(app/)을 웹용 정적 파일로 만들어 itssophie.dev 서버(nginx)에 하위 도메인으로 올린다.
포트폴리오(/var/www/portfolio)와 같은 서버를 쓰되, 도메인을 나눠 로그인 정보가 섞이지 않게 한다.

## 1. 빌드 (컴퓨터에서)

```bash
cd app
cp .env.example .env   # EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_KEY 채우기
npm install
npx expo export --platform web --output-dir dist
```

`app.json`의 `web.output`은 `single`(한 페이지 앱)이라 모든 주소를 `index.html`로 돌려줘야 한다.

## 2. DNS

`itssophie.dev` DNS에 A 레코드 추가: `ripe` → 포트폴리오 서버와 같은 IP

## 3. 서버

```bash
sudo mkdir -p /var/www/ripe
# 컴퓨터에서: scp -r -i <키> app/dist/* ubuntu@<서버 IP>:/tmp/ripe-dist/
sudo rsync -a --delete /tmp/ripe-dist/ /var/www/ripe/
```

nginx `/etc/nginx/sites-available/ripe`:

```nginx
server {
  server_name ripe.itssophie.dev;
  root /var/www/ripe;
  index index.html;
  location /_expo/ { expires 1y; add_header Cache-Control "public, immutable"; }
  location / { try_files $uri $uri/ /index.html; }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/ripe /etc/nginx/sites-enabled/ripe
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d ripe.itssophie.dev
```

## 4. 확인

- https://ripe.itssophie.dev 가 열리고, 새로고침해도 404가 안 나는지 (예: /home)
- 카카오·구글 로그인 후 /auth 를 거쳐 /home 으로 오는지
  - Supabase 돌아올 주소에 `https://ripe.itssophie.dev/**` 등록됨 (2026-11-18)

## 웹에서 다른 점

- 결제: 웹에서는 안내 문구만 (구독은 앱에서)
- 공유 "이미지": 사진첩 저장 대신 PNG 내려받기
- 알림 허용 화면: 웹은 건너뜀
- 공유 웹 보기(/r/<id>)는 아직 없음
