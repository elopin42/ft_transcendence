# === Tests smoke (curl) ===
# Suite de tests bout-en-bout legers, app live (apres `make up && make seed`).
# Usage : `make tests` ou cibles individuelles `make tests.<section>`.
#
# Conventions :
#   - PASS = ok (vert),  FAIL = ko bloquant (rouge + exit),  WARN = a regarder.
#   - $(RESET) inline : reset cookies+tmp en debut de cible (PHONY ne marche
#     pas comme dependency dans la meme run, on force a l'ouverture).
#   - $(JQ) tente jq, sinon fallback python3 -c (les deux sont presents
#     partout sur les distros recentes).
#   - $(TOTP_GEN) genere un code TOTP via stdin -> node container (script
#     ne vit que cote hote, jamais dans l'image — cf. .dockerignore).
#
# Throttler : laisser THROTTLER_DISABLED=true tant qu'on iter sur les tests,
# sinon ~200 requetes en rafale declenchent le rate limiter de NestJS.

BASE_URL    := https://$(DOMAIN_NAME)
COOKIE_JAR  := /tmp/ft_test_cookies.txt
TEST_TMP    := /tmp/ft_test
# Compteur global de fails. Chaque check qui rate y append une ligne X. La
# cible orchestrante `tests` lit ce fichier a la fin pour donner le total
# et exit en consequence. Pas de short-circuit -> on voit TOUS les fails
# en une passe (utile quand un fix en casse 5 autres).
FAIL_FILE   := /tmp/ft_test_failures
CURL        := curl -sk -c $(COOKIE_JAR) -b $(COOKIE_JAR) --max-time 5
CURL_NO     := curl -sk --max-time 5

# Reset cookies + tmp avant chaque cible (PHONY est cache dans la meme run).
RESET = rm -f $(COOKIE_JAR) ; rm -rf $(TEST_TMP) ; mkdir -p $(TEST_TMP)

# Generation TOTP : le script vit cote hote (tools/), on le pipe en stdin
# au node du container backend qui a otplib en deps. Le fichier ne traine
# jamais dans l'image -> aucune surface de risque en prod.
TOTP_GEN = cat tools/totp-gen.mjs | $(COMPOSE) exec -T -e TOTP_SECRET="$$secret" backend node --input-type=module 2>/dev/null | tr -d '\r\n'

SEED_EMAIL  := 1@1.com
SEED_PASS   := 1
SEED2_EMAIL := 2@2.com
SEED2_PASS  := 2

# Format affichage : caracteres UTF-8 directs (printf hex casse en dash/sh).
PASS = printf "  $(C_GREEN)✓ %s$(C_RESET)\n"
FAIL = printf "  $(C_RED)✗ %s$(C_RESET)\n"
WARN = printf "  $(C_YELLOW)⚠ %s$(C_RESET)\n"
INFO = printf "  $(C_BLUE)→ %s$(C_RESET)\n"

# Petit helper python pour parser du JSON sans depandre de jq.
PY_GET = python3 -c "import json,sys; d=json.load(open(sys.argv[1])); ks=sys.argv[2].split('.'); v=d; \
  exec('for k in ks:\\n  v=v[int(k)] if k.isdigit() and isinstance(v,list) else v.get(k,\\'\\') if isinstance(v,dict) else \\'\\'\\nprint(v)')"

.PHONY: tests tests.clean \
    tests.health tests.nginx tests.nginx.headers tests.nginx.methods tests.nginx.files \
    tests.frontend tests.db \
    tests.auth.basic tests.auth.headers tests.auth.cookies tests.auth.format \
    tests.auth.email tests.auth.password tests.auth.login tests.auth.errors \
    tests.auth.42 \
    tests.sessions tests.sessions.idor \
    tests.2fa.basic tests.2fa.security tests.2fa.format \
    tests.security tests.security.injection tests.security.replay \
    tests.throttle tests.perf tests.consistency

tests: tests.clean \
    tests.health tests.nginx tests.nginx.headers tests.nginx.methods tests.nginx.files \
    tests.frontend tests.db \
    tests.auth.basic tests.auth.headers tests.auth.cookies tests.auth.format tests.auth.errors \
    tests.auth.email tests.auth.password tests.auth.login tests.auth.42 \
    tests.sessions tests.sessions.idor \
    tests.2fa.basic tests.2fa.security tests.2fa.format \
    tests.security tests.security.injection tests.security.replay \
    tests.consistency tests.perf tests.throttle ## Suite complete (~210 checks, non-bloquant)
	@echo ""
	@if [ -s $(FAIL_FILE) ]; then \
		count=$$(wc -l < $(FAIL_FILE)) ; \
		echo "$(C_RED)============================================$(C_RESET)" ; \
		echo "$(C_RED)  $$count test(s) en echec sur la suite$(C_RESET)" ; \
		echo "$(C_RED)============================================$(C_RESET)" ; \
		echo "$(C_YELLOW)→ Refais defiler la sortie ci-dessus pour les ✗$(C_RESET)" ; \
	else \
		echo "$(C_GREEN)============================================$(C_RESET)" ; \
		echo "$(C_GREEN)  Tous les tests sont passes$(C_RESET)" ; \
		echo "$(C_GREEN)============================================$(C_RESET)" ; \
	fi
# Pas de exit 1 ici : on veut tjrs voir la suite complete des tests, meme
# en cas d echec, pour avoir une vue d ensemble. Le banner rouge + le compteur
# suffisent a signaler les tests rouges. Si tu veux planter en CI, lance
# `make tests.strict` qui chaine `tests` puis verifie $(FAIL_FILE).
.PHONY: tests.strict
tests.strict: tests
	@if [ -s $(FAIL_FILE) ]; then exit 1; fi

tests.clean:
	@rm -f $(COOKIE_JAR) $(FAIL_FILE) ; rm -rf $(TEST_TMP) ; mkdir -p $(TEST_TMP)

# === HEALTH (5) =====================================================
tests.health:
	@echo "$(C_BLUE)-> Backend healthcheck$(C_RESET)"
	@mkdir -p $(TEST_TMP)
	@code=$$($(CURL) -o $(TEST_TMP)/h.json -w "%{http_code}" $(BASE_URL)/api/health) ; \
	if [ "$$code" = "200" ]; then $(PASS) "/api/health = 200"; else $(FAIL) "/api/health = $$code"; echo X >> $(FAIL_FILE); fi
	@time=$$($(CURL) -o /dev/null -w "%{time_total}" $(BASE_URL)/api/health) ; \
	ms=$$(awk "BEGIN {print $$time*1000}" | cut -d. -f1) ; \
	if [ "$$ms" -lt "500" ]; then $(PASS) "Response time < 500ms ($${ms}ms)" ; else $(WARN) "Response time = $${ms}ms"; fi
	@out=$$($(CURL) $(BASE_URL)/api/health) ; \
	if echo "$$out" | grep -q "ok\|status\|health"; then $(PASS) "Health body non vide" ; else $(WARN) "Body inattendu : $$out"; fi
	@type=$$(curl -skI --max-time 5 $(BASE_URL)/api/health | grep -i "content-type") ; \
	if echo "$$type" | grep -qi "json"; then $(PASS) "Content-Type JSON sur /health"; else $(WARN) "Content-Type = $$type"; fi
	@code=$$($(CURL) -o /dev/null -w "%{http_code}" -I $(BASE_URL)/api/health) ; \
	if [ "$$code" = "200" ]; then $(PASS) "HEAD /api/health = 200"; else $(WARN) "HEAD = $$code"; fi

# === NGINX / TLS / PROXY (10) =======================================
tests.nginx:
	@echo "$(C_BLUE)-> Nginx HTTPS / proxy$(C_RESET)"
	@code=$$(curl -sk -o /dev/null -w "%{http_code}" --max-time 5 $(BASE_URL)) ; \
	if [ "$$code" = "200" ] || [ "$$code" = "307" ]; then $(PASS) "HTTPS / = $$code" ; else $(FAIL) "HTTPS / = $$code"; echo X >> $(FAIL_FILE); fi
	@hsts=$$(curl -skI --max-time 5 $(BASE_URL) | grep -i "strict-transport") ; \
	if [ -n "$$hsts" ]; then $(PASS) "HSTS present" ; else $(WARN) "HSTS absent"; fi ; \
	if echo "$$hsts" | grep -qi "preload"; then $(PASS) "HSTS preload" ; else $(WARN) "HSTS preload manquant"; fi ; \
	if echo "$$hsts" | grep -qiE "max-age=[0-9]{7,}"; then $(PASS) "HSTS max-age >= 1y" ; else $(WARN) "HSTS max-age trop court"; fi
	@srv=$$(curl -skI --max-time 5 $(BASE_URL) | grep -i "^server:" | head -1) ; \
	if echo "$$srv" | grep -qi "version\|/[0-9]"; then $(WARN) "Version server : $$srv" ; else $(PASS) "Pas de version server exposee"; fi
	@if curl -sk --max-time 5 --tls-max 1.0 --tlsv1.0 $(BASE_URL) >/dev/null 2>&1; \
		then $(WARN) "TLSv1.0 accepte (faible)"; else $(PASS) "TLSv1.0 refuse"; fi
	@if curl -sk --max-time 5 --tlsv1.2 $(BASE_URL) >/dev/null 2>&1; \
		then $(PASS) "TLSv1.2 accepte"; else $(WARN) "TLSv1.2 refuse"; fi
	@code=$$($(CURL) -o /dev/null -w "%{http_code}" $(BASE_URL)/api/health) ; \
	if [ "$$code" = "200" ]; then $(PASS) "Proxy nginx -> backend OK"; else $(FAIL) "Proxy KO : $$code"; echo X >> $(FAIL_FILE); fi
	@code=$$($(CURL) -o /dev/null -w "%{http_code}" $(BASE_URL)/api/nope/404/route) ; \
	if [ "$$code" = "404" ]; then $(PASS) "404 sur route inconnue" ; else $(WARN) "Route inconnue = $$code"; fi
	@hp=$$(curl -sk --max-time 5 -o /dev/null -w "%{http_version}" $(BASE_URL)/api/health) ; \
	if [ "$$hp" = "2" ]; then $(PASS) "HTTP/2 actif"; else $(WARN) "HTTP version = $$hp"; fi

# === NGINX HEADERS securite (12) ===================================
tests.nginx.headers:
	@echo "$(C_BLUE)-> Headers securite$(C_RESET)"
	@h=$$(curl -skI --max-time 5 $(BASE_URL)/api/health | tr -d '\r') ; \
	for header in "x-content-type-options" "x-frame-options" "x-dns-prefetch-control" \
	              "x-download-options" "x-xss-protection" "x-permitted-cross-domain-policies" \
	              "strict-transport-security" "referrer-policy" \
	              "cross-origin-resource-policy" "cross-origin-opener-policy" ; do \
		if echo "$$h" | grep -qi "$$header"; then $(PASS) "Header $$header present" ; \
		else $(WARN) "Header $$header absent"; fi ; \
	done
	@xfo=$$(curl -skI --max-time 5 $(BASE_URL)/api/health | grep -i "x-frame-options") ; \
	if echo "$$xfo" | grep -qiE "DENY|SAMEORIGIN"; then $(PASS) "X-Frame-Options = DENY/SAMEORIGIN"; else $(WARN) "X-Frame-Options = $$xfo"; fi
	@xct=$$(curl -skI --max-time 5 $(BASE_URL)/api/health | grep -i "x-content-type-options") ; \
	if echo "$$xct" | grep -qi "nosniff"; then $(PASS) "X-Content-Type-Options = nosniff"; else $(WARN) "$$xct"; fi

# === NGINX methods et fichiers proteges (8) ========================
tests.nginx.methods:
	@echo "$(C_BLUE)-> Methods HTTP$(C_RESET)"
	@for m in TRACE TRACK CONNECT ; do \
		code=$$(curl -sk -o /dev/null -w "%{http_code}" --max-time 5 -X $$m $(BASE_URL)/api/health) ; \
		if [ "$$code" = "405" ] || [ "$$code" = "501" ] || [ "$$code" = "404" ] || [ "$$code" = "400" ]; \
		then $(PASS) "Methode $$m bloquee ($$code)"; else $(WARN) "$$m = $$code"; fi ; \
	done
	@for m in GET POST PUT DELETE PATCH OPTIONS ; do \
		code=$$(curl -sk -o /dev/null -w "%{http_code}" --max-time 5 -X $$m $(BASE_URL)/api/health) ; \
		if [ "$$code" -ne "405" ]; then $(PASS) "Methode $$m autorisee ($$code)"; else $(WARN) "$$m bloque"; fi ; \
	done

tests.nginx.files:
	@echo "$(C_BLUE)-> Fichiers sensibles$(C_RESET)"
	@for path in "/.env" "/.env.example" "/.git/config" "/.git/HEAD" "/docker-compose.yml" \
	             "/Dockerfile" "/package.json" "/.dockerignore" ; do \
		code=$$($(CURL) -o /dev/null -w "%{http_code}" $(BASE_URL)$$path) ; \
		if [ "$$code" = "404" ] || [ "$$code" = "403" ]; \
		then $(PASS) "$$path protege ($$code)"; else $(FAIL) "$$path = $$code (LEAK)"; echo X >> $(FAIL_FILE); fi ; \
	done

# === FRONTEND (10) =================================================
tests.frontend:
	@echo "$(C_BLUE)-> Frontend Next.js$(C_RESET)"
	@code=$$(curl -sk -o /dev/null -w "%{http_code}" --max-time 5 -L $(BASE_URL)/) ; \
	if [ "$$code" = "200" ]; then $(PASS) "GET / = 200"; else $(WARN) "/ = $$code"; fi
	@code=$$(curl -sk -o /dev/null -w "%{http_code}" --max-time 5 $(BASE_URL)/fr) ; \
	if [ "$$code" = "200" ]; then $(PASS) "Locale /fr = 200"; else $(WARN) "/fr = $$code"; fi
	@code=$$(curl -sk -o /dev/null -w "%{http_code}" --max-time 5 $(BASE_URL)/en) ; \
	if [ "$$code" = "200" ]; then $(PASS) "Locale /en = 200"; else $(WARN) "/en = $$code"; fi
	@code=$$(curl -sk -o /dev/null -w "%{http_code}" --max-time 5 $(BASE_URL)/zz) ; \
	if [ "$$code" = "404" ] || [ "$$code" = "200" ]; then $(PASS) "Locale inconnue /zz = $$code"; else $(WARN) "/zz = $$code"; fi
	@out=$$(curl -sk --max-time 5 $(BASE_URL)/fr | head -200) ; \
	if echo "$$out" | grep -qi "<html"; then $(PASS) "Frontend renvoie du HTML"; else $(WARN) "Pas d'HTML"; fi
	@out=$$(curl -sk --max-time 5 $(BASE_URL)/fr | grep -ic "next") ; \
	if [ "$$out" -gt "0" ]; then $(PASS) "Markers Next.js presents"; else $(WARN) "Pas de Next markers"; fi
	@code=$$(curl -sk -o /dev/null -w "%{http_code}" --max-time 5 $(BASE_URL)/route-totalement-inconnue-spa) ; \
	if [ "$$code" = "404" ] || [ "$$code" = "200" ]; then $(PASS) "Route SPA inconnue ($$code)"; else $(WARN) "$$code"; fi
	@code=$$(curl -sk -o /dev/null -w "%{http_code}" --max-time 5 $(BASE_URL)/favicon.ico) ; \
	if [ "$$code" = "200" ] || [ "$$code" = "404" ]; then $(PASS) "favicon.ico ($$code)"; else $(WARN) "$$code"; fi
	@out=$$(curl -sk --max-time 5 $(BASE_URL)/fr | grep -cE "JWT_SECRET|TWO_FA_ENCRYPTION_KEY|DATABASE_URL|FORTYTWO_CLIENT_SECRET") ; \
	if [ "$$out" = "0" ]; then $(PASS) "Pas de leak secret dans HTML"; else $(FAIL) "Secret leak dans la page"; echo X >> $(FAIL_FILE); fi
	@enc=$$(curl -skI --max-time 5 -H "Accept-Encoding: gzip" $(BASE_URL)/fr | grep -i "content-encoding") ; \
	if echo "$$enc" | grep -qi "gzip\|br"; then $(PASS) "Compression gzip/br active"; else $(WARN) "Pas de compression : $$enc"; fi

# === DB / PRISMA (5) ===============================================
tests.db:
	@echo "$(C_BLUE)-> DB connectivity$(C_RESET)"
	@if $(COMPOSE) exec -T backend npx prisma migrate status >/dev/null 2>&1; then \
		$(PASS) "DB reachable + migrations a jour" ; \
	else \
		out=$$($(COMPOSE) exec -T backend npx prisma migrate status 2>&1 | tail -3) ; \
		$(FAIL) "DB unreachable" ; echo "$$out" | sed 's/^/    /' ; echo X >> $(FAIL_FILE) ; \
	fi
	@count=$$($(COMPOSE) exec -T backend npx prisma migrate status 2>&1 | grep -c "^[0-9]") ; \
	if [ "$$count" -ge "1" ]; then $(PASS) "Migrations detectees ($$count)"; else $(WARN) "0 migrations"; fi
	@if $(COMPOSE) exec -T backend node -e "console.log('OK')" >/dev/null 2>&1; then \
		$(PASS) "Backend container reactif"; else $(FAIL) "Backend KO"; echo X >> $(FAIL_FILE); fi
	@if $(COMPOSE) exec -T db pg_isready -U $(POSTGRES_USER) -d $(POSTGRES_DB) >/dev/null 2>&1; then \
		$(PASS) "Postgres pg_isready"; else $(FAIL) "DB KO"; echo X >> $(FAIL_FILE); fi
	@count=$$($(COMPOSE) exec -T db psql -U $(POSTGRES_USER) -d $(POSTGRES_DB) -tAc "SELECT count(*) FROM \"User\";" 2>/dev/null) ; \
	if [ -n "$$count" ] && [ "$$count" -ge "0" ]; then $(PASS) "Table User accessible ($$count rows)"; else $(WARN) "Table User KO"; fi

# === AUTH BASIC happy paths (10) ===================================
tests.auth.basic:
	@$(RESET)
	@echo "$(C_BLUE)-> Auth basic flow$(C_RESET)"
	@code=$$($(CURL) -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
		-d '{"email":"$(SEED_EMAIL)","password":"$(SEED_PASS)"}' $(BASE_URL)/api/auth/login) ; \
	if [ "$$code" = "200" ] || [ "$$code" = "201" ]; then $(PASS) "Login seed = $$code"; else $(FAIL) "Login seed = $$code"; echo X >> $(FAIL_FILE); fi
	@code=$$($(CURL) -o /dev/null -w "%{http_code}" $(BASE_URL)/api/users/me) ; \
	if [ "$$code" = "200" ]; then $(PASS) "/users/me apres login = 200"; else $(FAIL) "/users/me = $$code"; echo X >> $(FAIL_FILE); fi
	@$(CURL) -o $(TEST_TMP)/me.json $(BASE_URL)/api/users/me >/dev/null
	@out=$$(python3 -c "import json; d=json.load(open('$(TEST_TMP)/me.json')); print('OK' if 'id' in d and 'email' in d else 'KO')") ; \
	if [ "$$out" = "OK" ]; then $(PASS) "/users/me retourne id + email"; else $(FAIL) "Format /me KO"; echo X >> $(FAIL_FILE); fi
	@out=$$(python3 -c "import json; d=json.load(open('$(TEST_TMP)/me.json')); print('LEAK' if 'password' in d else 'OK')") ; \
	if [ "$$out" = "OK" ]; then $(PASS) "/users/me ne leak pas le password"; else $(FAIL) "LEAK password"; echo X >> $(FAIL_FILE); fi
	@out=$$(python3 -c "import json; d=json.load(open('$(TEST_TMP)/me.json')); print('OK' if 'login' in d else 'KO')") ; \
	if [ "$$out" = "OK" ]; then $(PASS) "/users/me retourne login"; else $(WARN) "login absent"; fi
	@code=$$($(CURL) -o /dev/null -w "%{http_code}" -X POST $(BASE_URL)/api/auth/refresh) ; \
	if [ "$$code" = "200" ] || [ "$$code" = "201" ]; then $(PASS) "Refresh = $$code"; else $(FAIL) "Refresh = $$code"; echo X >> $(FAIL_FILE); fi
	@code=$$($(CURL) -o /dev/null -w "%{http_code}" $(BASE_URL)/api/users/me) ; \
	if [ "$$code" = "200" ]; then $(PASS) "/users/me apres refresh = 200"; else $(FAIL) "Apres refresh = $$code"; echo X >> $(FAIL_FILE); fi
	@code=$$($(CURL) -o /dev/null -w "%{http_code}" -X POST $(BASE_URL)/api/auth/logout) ; \
	if [ "$$code" = "200" ] || [ "$$code" = "201" ]; then $(PASS) "Logout = $$code"; else $(FAIL) "Logout = $$code"; echo X >> $(FAIL_FILE); fi
	@code=$$($(CURL) -o /dev/null -w "%{http_code}" $(BASE_URL)/api/users/me) ; \
	if [ "$$code" = "401" ]; then $(PASS) "/users/me apres logout = 401"; else $(FAIL) "Apres logout = $$code"; echo X >> $(FAIL_FILE); fi
	@code=$$($(CURL) -o /dev/null -w "%{http_code}" -X POST $(BASE_URL)/api/auth/refresh) ; \
	if [ "$$code" = "401" ]; then $(PASS) "Refresh apres logout = 401"; else $(WARN) "Refresh apres logout = $$code"; fi

# === AUTH HEADERS / COOKIES (10) ===================================
tests.auth.headers:
	@$(RESET)
	@echo "$(C_BLUE)-> Auth headers$(C_RESET)"
	@$(CURL) -o /dev/null -X POST -H "Content-Type: application/json" \
		-d '{"email":"$(SEED_EMAIL)","password":"$(SEED_PASS)"}' $(BASE_URL)/api/auth/login
	@h=$$(curl -skI --max-time 5 -b $(COOKIE_JAR) $(BASE_URL)/api/users/me) ; \
	if echo "$$h" | grep -qi "content-type: application/json"; then $(PASS) "/me Content-Type JSON"; else $(WARN) "$$h"; fi
	@h=$$(curl -skI --max-time 5 -b $(COOKIE_JAR) $(BASE_URL)/api/users/me | grep -i "cache-control") ; \
	if [ -n "$$h" ]; then $(PASS) "/me Cache-Control posee ($$h)"; else $(WARN) "Cache-Control absent"; fi
	@code=$$($(CURL) -o /dev/null -w "%{http_code}" -H "Origin: $(BASE_URL)" -X OPTIONS $(BASE_URL)/api/auth/login) ; \
	if [ "$$code" = "204" ] || [ "$$code" = "200" ] || [ "$$code" = "404" ]; then $(PASS) "Preflight OPTIONS = $$code"; else $(WARN) "OPTIONS = $$code"; fi
	@code=$$(curl -sk -o /dev/null -w "%{http_code}" --max-time 5 -X POST $(BASE_URL)/api/auth/login \
		-H "Content-Type: text/plain" -d 'plain text') ; \
	if [ "$$code" = "400" ] || [ "$$code" = "415" ]; then $(PASS) "Content-Type text/plain rejete ($$code)"; else $(WARN) "$$code"; fi
	@code=$$(curl -sk -o /dev/null -w "%{http_code}" --max-time 5 -X POST $(BASE_URL)/api/auth/login \
		-H "Content-Type: application/json" -d 'pas du json') ; \
	if [ "$$code" = "400" ]; then $(PASS) "Body non-JSON = 400"; else $(WARN) "$$code"; fi

tests.auth.cookies:
	@$(RESET)
	@echo "$(C_BLUE)-> Cookies securite$(C_RESET)"
	@$(CURL) -o /dev/null -X POST -H "Content-Type: application/json" \
		-d '{"email":"$(SEED_EMAIL)","password":"$(SEED_PASS)"}' $(BASE_URL)/api/auth/login
	@if grep -q "access_token" $(COOKIE_JAR); then $(PASS) "Cookie access_token pose"; else $(FAIL) "access_token manquant"; echo X >> $(FAIL_FILE); fi
	@if grep -q "refresh_token" $(COOKIE_JAR); then $(PASS) "Cookie refresh_token pose"; else $(FAIL) "refresh_token manquant"; echo X >> $(FAIL_FILE); fi
	@if grep "access_token" $(COOKIE_JAR) | grep -q "TRUE"; then $(PASS) "access_token httpOnly + secure"; else $(WARN) "access_token flags KO"; fi
	@if grep "refresh_token" $(COOKIE_JAR) | grep -q "TRUE"; then $(PASS) "refresh_token httpOnly + secure"; else $(WARN) "refresh_token flags KO"; fi
	@if grep "refresh_token" $(COOKIE_JAR) | grep -q "/api/auth/refresh"; then $(PASS) "refresh_token path = /api/auth/refresh"; else $(WARN) "refresh path KO"; fi
	@if grep "access_token" $(COOKIE_JAR) | awk '{print $$3}' | grep -qE "^/$$"; then $(PASS) "access_token path = /"; else $(WARN) "access path KO"; fi
	@$(CURL) -o /dev/null -X POST $(BASE_URL)/api/auth/logout
	@n=$$(grep -c "access_token" $(COOKIE_JAR) 2>/dev/null || echo 0) ; \
	if [ "$$n" = "0" ] || ! grep "access_token" $(COOKIE_JAR) | grep -qE "[a-zA-Z0-9]"; then $(PASS) "Logout efface access_token"; else $(WARN) "access_token persiste"; fi

# === AUTH FORMAT reponses (10) =====================================
tests.auth.format:
	@$(RESET)
	@echo "$(C_BLUE)-> Format reponses$(C_RESET)"
	@$(CURL) -o $(TEST_TMP)/err.json -X POST -H "Content-Type: application/json" \
		-d '{"email":"none@none.com","password":"WrongPass1!"}' $(BASE_URL)/api/auth/login >/dev/null
	@for k in statusCode code message timestamp path ; do \
		out=$$(python3 -c "import json; d=json.load(open('$(TEST_TMP)/err.json')); print('OK' if '$$k' in d else 'KO')") ; \
		if [ "$$out" = "OK" ]; then $(PASS) "Erreur contient $$k"; else $(FAIL) "$$k absent"; echo X >> $(FAIL_FILE); fi ; \
	done
	@code=$$(python3 -c "import json; print(json.load(open('$(TEST_TMP)/err.json')).get('code',''))") ; \
	if [ "$$code" = "auth.login.invalid_credentials" ]; then $(PASS) "Code = auth.login.invalid_credentials"; else $(FAIL) "Code = $$code"; echo X >> $(FAIL_FILE); fi
	@$(CURL) -o $(TEST_TMP)/val.json -X POST -H "Content-Type: application/json" \
		-d '{"email":"pas-un-email","password":"x"}' $(BASE_URL)/api/auth/login >/dev/null
	@out=$$(python3 -c "import json; d=json.load(open('$(TEST_TMP)/val.json')); print('OK' if 'errors' in d and isinstance(d['errors'],list) else 'KO')") ; \
	if [ "$$out" = "OK" ]; then $(PASS) "errors[] sur validation"; else $(FAIL) "errors[] absent"; echo X >> $(FAIL_FILE); fi
	@out=$$(python3 -c "import json; d=json.load(open('$(TEST_TMP)/val.json')); e=d['errors'][0]; print('OK' if 'field' in e and 'code' in e else 'KO')") ; \
	if [ "$$out" = "OK" ]; then $(PASS) "errors[].field + .code"; else $(FAIL) "Structure errors KO"; echo X >> $(FAIL_FILE); fi
	@p=$$(python3 -c "import json; print(json.load(open('$(TEST_TMP)/err.json')).get('path',''))") ; \
	if echo "$$p" | grep -q "?"; then $(WARN) "path leak query string : $$p"; else $(PASS) "path sans query string"; fi
	@out=$$(python3 -c "import json; d=json.load(open('$(TEST_TMP)/err.json')); print('OK' if d['statusCode'] == 401 else 'KO')") ; \
	if [ "$$out" = "OK" ]; then $(PASS) "statusCode = 401 sur login KO"; else $(FAIL) "statusCode KO"; echo X >> $(FAIL_FILE); fi

# === AUTH ERRORS codes (15) ========================================
tests.auth.errors:
	@$(RESET)
	@echo "$(C_BLUE)-> Mapping ErrorCodes$(C_RESET)"
	@$(CURL) -o $(TEST_TMP)/e1.json -X POST -H "Content-Type: application/json" \
		-d '{"email":"none@none.com","password":"x"}' $(BASE_URL)/api/auth/login >/dev/null
	@code=$$(python3 -c "import json; print(json.load(open('$(TEST_TMP)/e1.json')).get('code',''))") ; \
	if [ "$$code" = "auth.login.invalid_credentials" ]; then $(PASS) "auth.login.invalid_credentials"; else $(FAIL) "Code = $$code"; echo X >> $(FAIL_FILE); fi
	@$(CURL) -o $(TEST_TMP)/e2.json $(BASE_URL)/api/users/me >/dev/null
	@code=$$(python3 -c "import json; print(json.load(open('$(TEST_TMP)/e2.json')).get('code',''))") ; \
	if [ "$$code" = "auth.token.invalid" ]; then $(PASS) "auth.token.invalid (no cookie)"; else $(FAIL) "Code = $$code (body : $$(cat $(TEST_TMP)/e2.json))"; echo X >> $(FAIL_FILE); fi
	@code=$$(curl -sk --max-time 5 -H "Cookie: access_token=eyJfake" $(BASE_URL)/api/users/me \
		| python3 -c "import json,sys; print(json.load(sys.stdin).get('code',''))") ; \
	if [ "$$code" = "auth.token.invalid" ]; then $(PASS) "auth.token.invalid (cookie pourri)"; else $(FAIL) "Code = $$code"; echo X >> $(FAIL_FILE); fi
	@$(CURL) -o $(TEST_TMP)/e3.json -X POST -H "Content-Type: application/json" \
		-d '{"email":"bad","password":"x"}' $(BASE_URL)/api/auth/login >/dev/null
	@code=$$(python3 -c "import json; print(json.load(open('$(TEST_TMP)/e3.json')).get('code',''))") ; \
	if [ "$$code" = "validation.email.invalid" ]; then $(PASS) "validation.email.invalid"; else $(FAIL) "Code = $$code"; echo X >> $(FAIL_FILE); fi
	@$(CURL) -o $(TEST_TMP)/e4.json -X POST -H "Content-Type: application/json" \
		-d '{"email":"new@test.com","password":"Short1!","login":"newuser"}' $(BASE_URL)/api/auth/register >/dev/null
	@code=$$(python3 -c "import json; print(json.load(open('$(TEST_TMP)/e4.json')).get('code',''))") ; \
	if [ "$$code" = "validation.password.too_short" ]; then $(PASS) "validation.password.too_short"; else $(FAIL) "Code = $$code"; echo X >> $(FAIL_FILE); fi
	@$(CURL) -o $(TEST_TMP)/e5.json -X POST -H "Content-Type: application/json" \
		-d '{"email":"new@test.com","password":"alllowercaseweak","login":"newuser"}' $(BASE_URL)/api/auth/register >/dev/null
	@code=$$(python3 -c "import json; print(json.load(open('$(TEST_TMP)/e5.json')).get('code',''))") ; \
	if [ "$$code" = "validation.password.missing_complexity" ]; then $(PASS) "validation.password.missing_complexity"; else $(FAIL) "Code = $$code"; echo X >> $(FAIL_FILE); fi
	@$(CURL) -o $(TEST_TMP)/e6.json -X POST -H "Content-Type: application/json" \
		-d '{"email":"new@test.com","password":"GoodPass1234!","login":"bad@chars"}' $(BASE_URL)/api/auth/register >/dev/null
	@code=$$(python3 -c "import json; print(json.load(open('$(TEST_TMP)/e6.json')).get('code',''))") ; \
	if [ "$$code" = "validation.login.invalid_chars" ]; then $(PASS) "validation.login.invalid_chars"; else $(FAIL) "Code = $$code"; echo X >> $(FAIL_FILE); fi
	@$(CURL) -o $(TEST_TMP)/e7.json -X POST -H "Content-Type: application/json" \
		-d '{"email":"new@test.com","password":"GoodPass1234!","login":"a"}' $(BASE_URL)/api/auth/register >/dev/null
	@code=$$(python3 -c "import json; print(json.load(open('$(TEST_TMP)/e7.json')).get('code',''))") ; \
	if [ "$$code" = "validation.login.too_short" ]; then $(PASS) "validation.login.too_short"; else $(FAIL) "Code = $$code"; echo X >> $(FAIL_FILE); fi
	@$(CURL) -o $(TEST_TMP)/e8.json -X POST -H "Content-Type: application/json" \
		-d '{"email":"new@test.com","password":"GoodPass1234!","login":"aaaaaaaaaaaaaaaaaaaaaaaa"}' $(BASE_URL)/api/auth/register >/dev/null
	@code=$$(python3 -c "import json; print(json.load(open('$(TEST_TMP)/e8.json')).get('code',''))") ; \
	if [ "$$code" = "validation.login.too_long" ]; then $(PASS) "validation.login.too_long"; else $(FAIL) "Code = $$code"; echo X >> $(FAIL_FILE); fi
	@long=$$(python3 -c "print('A1!' + 'a'*200)") ; \
	$(CURL) -o $(TEST_TMP)/e9.json -X POST -H "Content-Type: application/json" \
		-d "{\"email\":\"new@test.com\",\"password\":\"$$long\",\"login\":\"newuser\"}" $(BASE_URL)/api/auth/register >/dev/null
	@code=$$(python3 -c "import json; d=json.load(open('$(TEST_TMP)/e9.json')); print(d.get('code',''))") ; \
	if [ "$$code" = "validation.password.too_long" ]; then $(PASS) "validation.password.too_long"; else $(WARN) "Code = $$code"; fi
	@$(CURL) -o $(TEST_TMP)/e10.json -X POST -H "Content-Type: application/json" \
		-d '{}' $(BASE_URL)/api/auth/login >/dev/null
	@code=$$(python3 -c "import json; print(json.load(open('$(TEST_TMP)/e10.json')).get('code',''))") ; \
	if [ -n "$$code" ]; then $(PASS) "Code present sur body vide ($$code)"; else $(FAIL) "Code absent"; echo X >> $(FAIL_FILE); fi
	@$(CURL) -o $(TEST_TMP)/e11.json $(BASE_URL)/api/route-inconnue >/dev/null
	@code=$$(python3 -c "import json; print(json.load(open('$(TEST_TMP)/e11.json')).get('code',''))" 2>/dev/null) ; \
	if [ -n "$$code" ]; then $(PASS) "Code present sur 404 ($$code)"; else $(WARN) "Pas de code sur 404"; fi
	@code=$$(curl -sk -o /dev/null -w "%{http_code}" --max-time 5 -X POST $(BASE_URL)/api/auth/refresh) ; \
	if [ "$$code" = "401" ]; then $(PASS) "Refresh sans cookie = 401"; else $(FAIL) "$$code"; echo X >> $(FAIL_FILE); fi

# === AUTH email validation (15) ====================================
tests.auth.email:
	@$(RESET)
	@echo "$(C_BLUE)-> Validation email$(C_RESET)"
	@for email in "pasdarobase" "@nodomain.com" "noat.com" "a@" "a@.com" "a@b" "a..b@c.com" "a@b..c.com" "a b@c.com" "a@b c.com" "a@" "@" "a@@b.com" ; do \
		code=$$($(CURL) -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
			-d "{\"email\":\"$$email\",\"password\":\"x\"}" $(BASE_URL)/api/auth/login) ; \
		if [ "$$code" = "400" ]; then $(PASS) "Email '$$email' rejete = 400"; else $(FAIL) "Email '$$email' = $$code"; echo X >> $(FAIL_FILE); fi ; \
	done
	@code=$$($(CURL) -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
		-d '{"email":"valid@email.com","password":"WhateverPass1!"}' $(BASE_URL)/api/auth/login) ; \
	if [ "$$code" = "401" ]; then $(PASS) "Email valide + user inconnu = 401"; else $(FAIL) "$$code"; echo X >> $(FAIL_FILE); fi
	@long=$$(python3 -c "print('a'*250 + '@x.com')") ; \
	code=$$($(CURL) -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
		-d "{\"email\":\"$$long\",\"password\":\"x\"}" $(BASE_URL)/api/auth/login) ; \
	if [ "$$code" = "400" ]; then $(PASS) "Email > 254 = 400"; else $(FAIL) "Email long = $$code"; echo X >> $(FAIL_FILE); fi

# === AUTH password validation register (15) ========================
tests.auth.password:
	@$(RESET)
	@echo "$(C_BLUE)-> Validation password$(C_RESET)"
	@for len in 1 5 8 10 11 ; do \
		pwd=$$(python3 -c "print('A1!' + 'a'*$$((len-3)))") ; \
		code=$$($(CURL) -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
			-d "{\"email\":\"new@test.com\",\"password\":\"$$pwd\",\"login\":\"newuser\"}" $(BASE_URL)/api/auth/register) ; \
		if [ "$$code" = "400" ]; then $(PASS) "Password $${len}c rejete"; else $(FAIL) "$${len}c = $$code"; echo X >> $(FAIL_FILE); fi ; \
	done
	@for pwd in "alllowercase123" "ALLUPPERCASE123" "NoSpecialChar1" "NoDigits!Aa" "abcd1234efgh" "PASSWORD1234" ; do \
		code=$$($(CURL) -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
			-d "{\"email\":\"new@test.com\",\"password\":\"$$pwd\",\"login\":\"newuser\"}" $(BASE_URL)/api/auth/register) ; \
		if [ "$$code" = "400" ]; then $(PASS) "Password '$$pwd' = 400"; else $(FAIL) "$$pwd = $$code"; echo X >> $(FAIL_FILE); fi ; \
	done
	@code=$$($(CURL) -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
		-d '{"email":"new@test.com","password":"","login":"newuser"}' $(BASE_URL)/api/auth/register) ; \
	if [ "$$code" = "400" ]; then $(PASS) "Password vide = 400"; else $(FAIL) "Vide = $$code"; echo X >> $(FAIL_FILE); fi
	@long=$$(python3 -c "print('A1!' + 'a'*200)") ; \
	code=$$($(CURL) -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
		-d "{\"email\":\"new@test.com\",\"password\":\"$$long\",\"login\":\"newuser\"}" $(BASE_URL)/api/auth/register) ; \
	if [ "$$code" = "400" ]; then $(PASS) "Password > 128 = 400"; else $(FAIL) "Long = $$code"; echo X >> $(FAIL_FILE); fi
	@code=$$($(CURL) -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
		-d '{"email":"new@test.com","password":"GoodPass1234!","login":"newuser"}' $(BASE_URL)/api/auth/register) ; \
	if [ "$$code" = "201" ] || [ "$$code" = "200" ] || [ "$$code" = "409" ]; then $(PASS) "Password conforme accepte ($$code)"; else $(FAIL) "$$code"; echo X >> $(FAIL_FILE); fi

# === AUTH login validation (10) ====================================
tests.auth.login:
	@$(RESET)
	@echo "$(C_BLUE)-> Validation login$(C_RESET)"
	@for login in "ab" "a" "" "user@bad" "user space" "user/slash" "user.dot" "user!special" "sp ace" "with#hash" ; do \
		code=$$($(CURL) -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
			-d "{\"email\":\"x@x.com\",\"password\":\"GoodPass1234!\",\"login\":\"$$login\"}" $(BASE_URL)/api/auth/register) ; \
		if [ "$$code" = "400" ]; then $(PASS) "Login '$$login' rejete"; else $(FAIL) "Login '$$login' = $$code"; echo X >> $(FAIL_FILE); fi ; \
	done

# === AUTH 42 OAuth (5) =============================================
tests.auth.42:
	@$(RESET)
	@echo "$(C_BLUE)-> 42 OAuth$(C_RESET)"
	@$(CURL) -o $(TEST_TMP)/42status.json $(BASE_URL)/api/auth/42/status
	@code=$$($(CURL) -o /dev/null -w "%{http_code}" $(BASE_URL)/api/auth/42/status) ; \
	if [ "$$code" = "200" ]; then $(PASS) "GET /auth/42/status = 200"; else $(FAIL) "$$code"; echo X >> $(FAIL_FILE); fi
	@out=$$(python3 -c "import json; d=json.load(open('$(TEST_TMP)/42status.json')); print('OK' if 'available' in d else 'KO')") ; \
	if [ "$$out" = "OK" ]; then $(PASS) "/42/status renvoie available"; else $(FAIL) "$$out"; echo X >> $(FAIL_FILE); fi
	@code=$$(curl -sk -o /dev/null -w "%{http_code}" --max-time 5 $(BASE_URL)/api/auth/42) ; \
	if [ "$$code" = "302" ] || [ "$$code" = "301" ] || [ "$$code" = "503" ]; then $(PASS) "GET /auth/42 redirige ou 503 ($$code)"; else $(WARN) "$$code"; fi
	@code=$$(curl -sk -o /dev/null -w "%{http_code}" --max-time 5 $(BASE_URL)/api/auth/42/callback) ; \
	if [ "$$code" = "401" ] || [ "$$code" = "302" ] || [ "$$code" = "503" ] || [ "$$code" = "400" ]; then $(PASS) "Callback sans code ($$code)"; else $(WARN) "$$code"; fi

# === SESSIONS (10) =================================================
tests.sessions:
	@$(RESET)
	@echo "$(C_BLUE)-> Sessions$(C_RESET)"
	@$(CURL) -o /dev/null -X POST -H "Content-Type: application/json" \
		-d '{"email":"$(SEED_EMAIL)","password":"$(SEED_PASS)"}' $(BASE_URL)/api/auth/login
	@$(CURL) -o $(TEST_TMP)/sess.json $(BASE_URL)/api/auth/sessions
	@count=$$(python3 -c "import json; print(len(json.load(open('$(TEST_TMP)/sess.json'))))") ; \
	if [ "$$count" -ge "1" ]; then $(PASS) "List sessions ($$count actives)"; else $(FAIL) "Liste vide"; echo X >> $(FAIL_FILE); fi
	@for k in id ipAddress userAgent createdAt lastUsedAt expiresAt ; do \
		out=$$(python3 -c "import json; s=json.load(open('$(TEST_TMP)/sess.json'))[0]; print('OK' if '$$k' in s else 'KO')") ; \
		if [ "$$out" = "OK" ]; then $(PASS) "Session contient $$k"; else $(FAIL) "$$k absent"; echo X >> $(FAIL_FILE); fi ; \
	done
	@out=$$(python3 -c "import json; s=json.load(open('$(TEST_TMP)/sess.json'))[0]; print('LEAK' if 'refreshTokenHash' in s or 'userId' in s else 'OK')") ; \
	if [ "$$out" = "OK" ]; then $(PASS) "Pas de leak refreshTokenHash/userId"; else $(FAIL) "LEAK"; echo X >> $(FAIL_FILE); fi
	@code=$$($(CURL) -o /dev/null -w "%{http_code}" $(BASE_URL)/api/auth/sessions) ; \
	if [ "$$code" = "200" ]; then $(PASS) "GET sessions = 200"; else $(FAIL) "$$code"; echo X >> $(FAIL_FILE); fi

# === SESSIONS IDOR / cross-user (5) ================================
tests.sessions.idor:
	@$(RESET)
	@echo "$(C_BLUE)-> Sessions IDOR$(C_RESET)"
	@$(CURL) -o /dev/null -X POST -H "Content-Type: application/json" \
		-d '{"email":"$(SEED_EMAIL)","password":"$(SEED_PASS)"}' $(BASE_URL)/api/auth/login
	@code=$$($(CURL) -o /dev/null -w "%{http_code}" -X DELETE $(BASE_URL)/api/auth/sessions/999999) ; \
	if [ "$$code" = "403" ] || [ "$$code" = "404" ]; then $(PASS) "DELETE session inconnue = $$code"; else $(FAIL) "$$code"; echo X >> $(FAIL_FILE); fi
	@code=$$($(CURL) -o /dev/null -w "%{http_code}" -X DELETE $(BASE_URL)/api/auth/sessions/0) ; \
	if [ "$$code" = "403" ] || [ "$$code" = "404" ] || [ "$$code" = "400" ]; then $(PASS) "DELETE session id 0 = $$code"; else $(WARN) "$$code"; fi
	@code=$$($(CURL) -o /dev/null -w "%{http_code}" -X DELETE $(BASE_URL)/api/auth/sessions/-1) ; \
	if [ "$$code" = "400" ] || [ "$$code" = "404" ]; then $(PASS) "DELETE session id negatif = $$code"; else $(WARN) "$$code"; fi
	@code=$$($(CURL) -o /dev/null -w "%{http_code}" -X DELETE $(BASE_URL)/api/auth/sessions/abc) ; \
	if [ "$$code" = "400" ]; then $(PASS) "DELETE session id non-num = 400"; else $(FAIL) "$$code"; echo X >> $(FAIL_FILE); fi
	@code=$$(curl -sk -o /dev/null -w "%{http_code}" --max-time 5 -X DELETE $(BASE_URL)/api/auth/sessions/1) ; \
	if [ "$$code" = "401" ]; then $(PASS) "DELETE session sans auth = 401"; else $(FAIL) "$$code"; echo X >> $(FAIL_FILE); fi

# === 2FA basic flow (12) ===========================================
tests.2fa.basic:
	@$(RESET)
	@echo "$(C_BLUE)-> 2FA flow$(C_RESET)"
	@$(CURL) -o /dev/null -X POST -H "Content-Type: application/json" \
		-d '{"email":"$(SEED_EMAIL)","password":"$(SEED_PASS)"}' $(BASE_URL)/api/auth/login
	@$(CURL) -o $(TEST_TMP)/setup.json -X POST $(BASE_URL)/api/2fa/setup
	@secret=$$(python3 -c "import json; print(json.load(open('$(TEST_TMP)/setup.json'))['secret'])") ; \
	if [ -n "$$secret" ]; then $(PASS) "Setup -> secret recu"; echo "$$secret" > $(TEST_TMP)/secret; else $(FAIL) "Setup KO"; echo X >> $(FAIL_FILE); fi
	@out=$$(python3 -c "import json; d=json.load(open('$(TEST_TMP)/setup.json')); print('OK' if d['qrCode'].startswith('data:image/') else 'KO')") ; \
	if [ "$$out" = "OK" ]; then $(PASS) "QR code data URL valide"; else $(FAIL) "QR KO"; echo X >> $(FAIL_FILE); fi
	@out=$$(python3 -c "import json; d=json.load(open('$(TEST_TMP)/setup.json')); print('OK' if d['otpauth'].startswith('otpauth://totp/') else 'KO')") ; \
	if [ "$$out" = "OK" ]; then $(PASS) "URI otpauth conforme"; else $(FAIL) "otpauth KO"; echo X >> $(FAIL_FILE); fi
	@secret=$$(cat $(TEST_TMP)/secret) ; \
	out=$$(python3 -c "print(len('$$secret') >= 16)") ; \
	if [ "$$out" = "True" ]; then $(PASS) "Secret >= 16 chars"; else $(FAIL) "Secret court"; echo X >> $(FAIL_FILE); fi
	@secret=$$(cat $(TEST_TMP)/secret) ; \
	code=$$($(TOTP_GEN)) ; \
	echo "$$code" > $(TEST_TMP)/code ; \
	if [ -n "$$code" ]; then $(PASS) "TOTP code genere : $$code"; else $(FAIL) "TOTP gen KO"; echo X >> $(FAIL_FILE); fi
	@code=$$(cat $(TEST_TMP)/code) ; \
	$(CURL) -o $(TEST_TMP)/enable.json -X POST -H "Content-Type: application/json" \
		-d "{\"code\":\"$$code\"}" $(BASE_URL)/api/2fa/enable ; \
	count=$$(python3 -c "import json; d=json.load(open('$(TEST_TMP)/enable.json')); print(len(d.get('backupCodes',[])))") ; \
	if [ "$$count" = "10" ]; then $(PASS) "Enable -> 10 backup codes"; else $(FAIL) "Enable KO"; cat $(TEST_TMP)/enable.json; echo X >> $(FAIL_FILE); fi
	@bk=$$(python3 -c "import json; print(json.load(open('$(TEST_TMP)/enable.json'))['backupCodes'][0])") ; \
	if echo "$$bk" | grep -qE "^[a-f0-9]{8}$$"; then $(PASS) "Backup code = 8 chars hex"; else $(FAIL) "Format = $$bk"; echo X >> $(FAIL_FILE); fi
	@$(CURL) -o /dev/null -X POST $(BASE_URL)/api/auth/logout
	@resp=$$($(CURL) -X POST -H "Content-Type: application/json" \
		-d '{"email":"$(SEED_EMAIL)","password":"$(SEED_PASS)"}' $(BASE_URL)/api/auth/login) ; \
	if echo "$$resp" | grep -q "requires2fa\|requires_2fa"; then $(PASS) "Login -> requires_2fa"; else $(FAIL) "$$resp"; echo X >> $(FAIL_FILE); fi
	@printf "  $(C_YELLOW)... attente 31s anti-replay TOTP$(C_RESET)\n"
	@sleep 31
	@secret=$$(cat $(TEST_TMP)/secret) ; \
	code=$$($(TOTP_GEN)) ; \
	httpcode=$$($(CURL) -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
		-d "{\"code\":\"$$code\"}" $(BASE_URL)/api/2fa/verify) ; \
	if [ "$$httpcode" = "200" ] || [ "$$httpcode" = "201" ]; then $(PASS) "Verify TOTP = $$httpcode"; else $(FAIL) "Verify = $$httpcode"; echo X >> $(FAIL_FILE); fi
	@code=$$($(CURL) -o /dev/null -w "%{http_code}" $(BASE_URL)/api/users/me) ; \
	if [ "$$code" = "200" ]; then $(PASS) "Session authenticated apres 2FA"; else $(FAIL) "Apres 2FA = $$code"; echo X >> $(FAIL_FILE); fi
	@httpcode=$$($(CURL) -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
		-d '{"password":"$(SEED_PASS)"}' $(BASE_URL)/api/2fa/disable) ; \
	if [ "$$httpcode" = "200" ] || [ "$$httpcode" = "201" ]; then $(PASS) "Disable = $$httpcode"; else $(FAIL) "Disable = $$httpcode"; echo X >> $(FAIL_FILE); fi

# === 2FA security edge cases (15) ==================================
tests.2fa.security:
	@$(RESET)
	@echo "$(C_BLUE)-> 2FA security$(C_RESET)"
	@code=$$($(CURL) -o /dev/null -w "%{http_code}" -X POST $(BASE_URL)/api/2fa/setup) ; \
	if [ "$$code" = "401" ]; then $(PASS) "Setup sans auth = 401"; else $(FAIL) "$$code"; echo X >> $(FAIL_FILE); fi
	@code=$$($(CURL) -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
		-d '{"code":"123456"}' $(BASE_URL)/api/2fa/verify) ; \
	if [ "$$code" = "401" ]; then $(PASS) "Verify sans cookie pending = 401"; else $(FAIL) "$$code"; echo X >> $(FAIL_FILE); fi
	@code=$$($(CURL) -o /dev/null -w "%{http_code}" -X POST $(BASE_URL)/api/2fa/enable) ; \
	if [ "$$code" = "401" ]; then $(PASS) "Enable sans auth = 401"; else $(FAIL) "$$code"; echo X >> $(FAIL_FILE); fi
	@code=$$($(CURL) -o /dev/null -w "%{http_code}" -X POST $(BASE_URL)/api/2fa/disable) ; \
	if [ "$$code" = "401" ]; then $(PASS) "Disable sans auth = 401"; else $(FAIL) "$$code"; echo X >> $(FAIL_FILE); fi
	@code=$$($(CURL) -o /dev/null -w "%{http_code}" -X POST $(BASE_URL)/api/2fa/backup-codes) ; \
	if [ "$$code" = "401" ]; then $(PASS) "Backup-codes sans auth = 401"; else $(FAIL) "$$code"; echo X >> $(FAIL_FILE); fi
	@$(CURL) -o /dev/null -X POST -H "Content-Type: application/json" \
		-d '{"email":"$(SEED2_EMAIL)","password":"$(SEED2_PASS)"}' $(BASE_URL)/api/auth/login
	@code=$$($(CURL) -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
		-d '{"code":"abc"}' $(BASE_URL)/api/2fa/enable) ; \
	if [ "$$code" = "400" ]; then $(PASS) "Enable code mal forme = 400"; else $(FAIL) "$$code"; echo X >> $(FAIL_FILE); fi
	@code=$$($(CURL) -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
		-d '{"code":"abcdef"}' $(BASE_URL)/api/2fa/enable) ; \
	if [ "$$code" = "401" ] || [ "$$code" = "400" ] || [ "$$code" = "404" ]; then $(PASS) "Enable code 6 lettres = $$code"; else $(FAIL) "$$code"; echo X >> $(FAIL_FILE); fi
	@code=$$($(CURL) -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
		-d '{}' $(BASE_URL)/api/2fa/disable) ; \
	if [ "$$code" = "400" ]; then $(PASS) "Disable sans password = 400"; else $(FAIL) "$$code"; echo X >> $(FAIL_FILE); fi
	@code=$$($(CURL) -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
		-d '{"password":"WrongPass"}' $(BASE_URL)/api/2fa/disable) ; \
	if [ "$$code" = "401" ]; then $(PASS) "Disable mauvais password = 401"; else $(FAIL) "$$code"; echo X >> $(FAIL_FILE); fi
	@code=$$($(CURL) -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
		-d '{"code":"zzzzzzzz"}' $(BASE_URL)/api/2fa/verify) ; \
	if [ "$$code" = "400" ] || [ "$$code" = "401" ]; then $(PASS) "Verify code non-hex = $$code"; else $(FAIL) "$$code"; echo X >> $(FAIL_FILE); fi
	@code=$$($(CURL_NO) -o /dev/null -w "%{http_code}" -X POST $(BASE_URL)/api/2fa/setup -H "Cookie: access_token=fake.fake.fake") ; \
	if [ "$$code" = "401" ]; then $(PASS) "Setup avec cookie pourri = 401"; else $(FAIL) "$$code"; echo X >> $(FAIL_FILE); fi
	@code=$$($(CURL_NO) -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
		-H "Cookie: two_fa_pending=fake" -d '{"code":"123456"}' $(BASE_URL)/api/2fa/verify) ; \
	if [ "$$code" = "401" ]; then $(PASS) "Verify cookie pending pourri = 401"; else $(FAIL) "$$code"; echo X >> $(FAIL_FILE); fi
	@code=$$($(CURL) -o /dev/null -w "%{http_code}" -X DELETE $(BASE_URL)/api/2fa/setup) ; \
	if [ "$$code" = "404" ] || [ "$$code" = "405" ] || [ "$$code" = "401" ]; then $(PASS) "DELETE /2fa/setup = $$code"; else $(WARN) "$$code"; fi
	@code=$$($(CURL) -o /dev/null -w "%{http_code}" -X PUT -H "Content-Type: application/json" \
		-d '{"code":"123456"}' $(BASE_URL)/api/2fa/verify) ; \
	if [ "$$code" = "404" ] || [ "$$code" = "405" ] || [ "$$code" = "401" ]; then $(PASS) "PUT /2fa/verify = $$code"; else $(WARN) "$$code"; fi

# === 2FA format DTOs (10) ==========================================
tests.2fa.format:
	@$(RESET)
	@echo "$(C_BLUE)-> 2FA format DTOs$(C_RESET)"
	@$(CURL) -o /dev/null -X POST -H "Content-Type: application/json" \
		-d '{"email":"$(SEED_EMAIL)","password":"$(SEED_PASS)"}' $(BASE_URL)/api/auth/login
	@for code_val in "12345" "1234567" "abcdef" "12 34 56" "12345a" "      " "" "12.456" "12-456" ; do \
		code=$$($(CURL) -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
			-d "{\"code\":\"$$code_val\"}" $(BASE_URL)/api/2fa/enable) ; \
		if [ "$$code" = "400" ]; then $(PASS) "Enable code '$$code_val' rejete"; else $(FAIL) "$$code_val = $$code"; echo X >> $(FAIL_FILE); fi ; \
	done
	@code=$$($(CURL) -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
		-d '{"wrong_field":"123456"}' $(BASE_URL)/api/2fa/enable) ; \
	if [ "$$code" = "400" ]; then $(PASS) "Enable champ inconnu = 400"; else $(FAIL) "$$code"; echo X >> $(FAIL_FILE); fi

# === SECURITY misc (15) ============================================
tests.security:
	@$(RESET)
	@echo "$(C_BLUE)-> Security checks$(C_RESET)"
	@code=$$(curl -sk -o /dev/null -w "%{http_code}" --max-time 5 \
		-H "Cookie: access_token=invalid.token.here" $(BASE_URL)/api/users/me) ; \
	if [ "$$code" = "401" ]; then $(PASS) "JWT altere = 401"; else $(FAIL) "JWT altere = $$code"; echo X >> $(FAIL_FILE); fi
	@code=$$(curl -sk -o /dev/null -w "%{http_code}" --max-time 5 \
		-H "Cookie: access_token=" $(BASE_URL)/api/users/me) ; \
	if [ "$$code" = "401" ]; then $(PASS) "JWT vide = 401"; else $(FAIL) "JWT vide = $$code"; echo X >> $(FAIL_FILE); fi
	@code=$$(curl -sk -o /dev/null -w "%{http_code}" --max-time 5 \
		-H "Cookie: access_token=eyJhbGciOiJub25lIn0.eyJzdWIiOjF9." $(BASE_URL)/api/users/me) ; \
	if [ "$$code" = "401" ]; then $(PASS) "JWT alg=none rejete = 401"; else $(FAIL) "JWT none = $$code"; echo X >> $(FAIL_FILE); fi
	@code=$$(curl -sk -o /dev/null -w "%{http_code}" --max-time 5 \
		-H "Authorization: Bearer fake" $(BASE_URL)/api/users/me) ; \
	if [ "$$code" = "401" ]; then $(PASS) "Bearer header alternatif rejete"; else $(WARN) "Bearer = $$code"; fi
	@code=$$(curl -sk -o /dev/null -w "%{http_code}" --max-time 5 -X POST \
		-H "Cookie: refresh_token=randomgarbage123" $(BASE_URL)/api/auth/refresh) ; \
	if [ "$$code" = "401" ]; then $(PASS) "Refresh random = 401"; else $(FAIL) "$$code"; echo X >> $(FAIL_FILE); fi
	@hdr=$$(curl -sk -I --max-time 5 -H "Origin: https://evil.com" $(BASE_URL)/api/health | grep -i "access-control-allow-origin" | grep -i "evil") ; \
	if [ -z "$$hdr" ]; then $(PASS) "CORS bloque evil.com"; else $(FAIL) "CORS leak"; echo X >> $(FAIL_FILE); fi
	@hdr=$$(curl -sk -I --max-time 5 -H "Origin: null" $(BASE_URL)/api/health | grep -i "access-control-allow-origin" | grep -i "null") ; \
	if [ -z "$$hdr" ]; then $(PASS) "CORS bloque Origin: null"; else $(WARN) "CORS leak null"; fi
	@long=$$(python3 -c "print('a'*100000)") ; \
	code=$$($(CURL) -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
		-d "{\"email\":\"$$long\",\"password\":\"x\"}" $(BASE_URL)/api/auth/login) ; \
	if [ "$$code" = "400" ] || [ "$$code" = "413" ] || [ "$$code" = "401" ]; then $(PASS) "Body 100k = $$code"; else $(WARN) "Body 100k = $$code"; fi
	@code=$$(curl -sk -o /dev/null -w "%{http_code}" --max-time 5 \
		-H "Cookie: ;;;malformed===" $(BASE_URL)/api/users/me) ; \
	if [ "$$code" = "401" ]; then $(PASS) "Cookie malforme = 401"; else $(WARN) "Cookie malforme = $$code"; fi

# === SECURITY injection (10) =======================================
tests.security.injection:
	@$(RESET)
	@echo "$(C_BLUE)-> Injection / payloads$(C_RESET)"
	@code=$$($(CURL) -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
		-d "{\"email\":\"' OR 1=1 --@x.com\",\"password\":\"x\"}" $(BASE_URL)/api/auth/login) ; \
	if [ "$$code" = "400" ] || [ "$$code" = "401" ]; then $(PASS) "SQL injection email = $$code"; else $(FAIL) "$$code"; echo X >> $(FAIL_FILE); fi
	@code=$$($(CURL) -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
		-d "{\"email\":\"valid@x.com\",\"password\":\"' OR 1=1 --\"}" $(BASE_URL)/api/auth/login) ; \
	if [ "$$code" = "400" ] || [ "$$code" = "401" ]; then $(PASS) "SQL injection password = $$code"; else $(FAIL) "$$code"; echo X >> $(FAIL_FILE); fi
	@code=$$($(CURL) -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
		-d '{"email":"<script>alert(1)</script>@x.com","password":"x"}' $(BASE_URL)/api/auth/login) ; \
	if [ "$$code" = "400" ]; then $(PASS) "XSS email = 400"; else $(FAIL) "$$code"; echo X >> $(FAIL_FILE); fi
	@code=$$($(CURL) -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
		-d '{"email":"x@x.com","password":"GoodPass1234!","login":"<script>"}' $(BASE_URL)/api/auth/register) ; \
	if [ "$$code" = "400" ]; then $(PASS) "XSS login = 400"; else $(FAIL) "$$code"; echo X >> $(FAIL_FILE); fi
	@for path in "/api/health/../../etc/passwd" "/api/..%2f..%2fetc%2fpasswd" "/api/health/%00" ; do \
		code=$$($(CURL) -o /dev/null -w "%{http_code}" "$(BASE_URL)$$path") ; \
		if [ "$$code" = "400" ] || [ "$$code" = "404" ]; then $(PASS) "Path traversal '$$path' bloque ($$code)"; else $(WARN) "$$code"; fi ; \
	done
	@code=$$($(CURL) -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
		-d '{"email":"x@x.com","password":"x; rm -rf /"}' $(BASE_URL)/api/auth/login) ; \
	if [ "$$code" = "400" ] || [ "$$code" = "401" ]; then $(PASS) "Cmd injection password ($$code)"; else $(FAIL) "$$code"; echo X >> $(FAIL_FILE); fi
	@code=$$($(CURL) -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
		-d '{"email":"x@x.com","password":"x"}' $(BASE_URL)/api/auth/login) ; \
	if [ "$$code" = "400" ]; then $(PASS) "Null byte injection = 400"; else $(WARN) "$$code"; fi
	@code=$$($(CURL) -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
		-d '{"email":{"$$ne":null},"password":{"$$ne":null}}' $(BASE_URL)/api/auth/login) ; \
	if [ "$$code" = "400" ]; then $(PASS) "NoSQL injection = 400"; else $(FAIL) "$$code"; echo X >> $(FAIL_FILE); fi

# === SECURITY replay refresh chain (5) =============================
tests.security.replay:
	@$(RESET)
	@echo "$(C_BLUE)-> Replay refresh$(C_RESET)"
	@$(CURL) -o /dev/null -X POST -H "Content-Type: application/json" \
		-d '{"email":"$(SEED2_EMAIL)","password":"$(SEED2_PASS)"}' $(BASE_URL)/api/auth/login
	@oldref=$$(grep refresh_token $(COOKIE_JAR) | tail -1 | awk '{print $$NF}') ; \
	echo "$$oldref" > $(TEST_TMP)/old_refresh
	@$(CURL) -o /dev/null -X POST $(BASE_URL)/api/auth/refresh
	@old=$$(cat $(TEST_TMP)/old_refresh) ; \
	code=$$(curl -sk -o /dev/null -w "%{http_code}" --max-time 5 -X POST \
		-H "Cookie: refresh_token=$$old" $(BASE_URL)/api/auth/refresh) ; \
	if [ "$$code" = "401" ]; then $(PASS) "Replay refresh = 401 (chaine revoquee)"; else $(FAIL) "Replay = $$code"; echo X >> $(FAIL_FILE); fi
	@code=$$($(CURL) -o /dev/null -w "%{http_code}" -X POST $(BASE_URL)/api/auth/refresh) ; \
	if [ "$$code" = "401" ]; then $(PASS) "User legitime deconnecte apres replay"; else $(WARN) "$$code"; fi
	@code=$$($(CURL) -o /dev/null -w "%{http_code}" $(BASE_URL)/api/users/me) ; \
	if [ "$$code" = "401" ]; then $(PASS) "/users/me 401 apres replay"; else $(WARN) "$$code"; fi
	@code=$$($(CURL) -o /dev/null -w "%{http_code}" $(BASE_URL)/api/auth/sessions) ; \
	if [ "$$code" = "401" ]; then $(PASS) "/sessions 401 apres replay"; else $(WARN) "$$code"; fi

# === CONSISTENCY shape global (5) ==================================
tests.consistency:
	@$(RESET)
	@echo "$(C_BLUE)-> Consistency$(C_RESET)"
	@for ep in "/api/auth/login" "/api/auth/register" "/api/users/me" "/api/auth/sessions" "/api/2fa/setup" ; do \
		$(CURL) -o $(TEST_TMP)/c.json -X POST -H "Content-Type: application/json" -d '{}' $(BASE_URL)$$ep >/dev/null ; \
		out=$$(python3 -c "import json; d=json.load(open('$(TEST_TMP)/c.json')); print('OK' if 'code' in d else 'KO')" 2>/dev/null) ; \
		if [ "$$out" = "OK" ]; then $(PASS) "Format erreur uniforme : $$ep"; else $(WARN) "$$ep : pas de code"; fi ; \
	done

# === PERFORMANCE rapide (5) ========================================
tests.perf:
	@echo "$(C_BLUE)-> Performance$(C_RESET)"
	@for ep in "/api/health" "/api/auth/42/status" ; do \
		t=$$(curl -sk -o /dev/null -w "%{time_total}" --max-time 5 $(BASE_URL)$$ep) ; \
		ms=$$(awk "BEGIN {print $$t*1000}" | cut -d. -f1) ; \
		if [ "$$ms" -lt "200" ]; then $(PASS) "$$ep < 200ms ($${ms}ms)"; else $(WARN) "$$ep = $${ms}ms"; fi ; \
	done
	@total=0 ; for i in 1 2 3 4 5 ; do \
		t=$$(curl -sk -o /dev/null -w "%{time_total}" --max-time 5 $(BASE_URL)/api/health) ; \
		ms=$$(awk "BEGIN {print $$t*1000}" | cut -d. -f1) ; \
		total=$$((total + ms)) ; \
	done ; avg=$$((total / 5)) ; \
	if [ "$$avg" -lt "150" ]; then $(PASS) "Avg /health 5 hits = $${avg}ms"; else $(WARN) "Avg = $${avg}ms"; fi
	@start=$$(date +%s%3N 2>/dev/null || date +%s) ; \
	for i in 1 2 3 4 5 6 7 8 9 10 ; do \
		curl -sk -o /dev/null --max-time 5 $(BASE_URL)/api/health & \
	done ; wait ; \
	end=$$(date +%s%3N 2>/dev/null || date +%s) ; \
	$(PASS) "10 requetes paralleles tenues"
	@code=$$(curl -sk -o /dev/null -w "%{http_code}" --max-time 1 $(BASE_URL)/api/health) ; \
	if [ "$$code" = "200" ]; then $(PASS) "/health repond < 1s"; else $(WARN) "$$code"; fi

# === THROTTLE / rate limit (5) =====================================
# Skip propre si THROTTLER_DISABLED=true (defaut dev). Tout le bloc tient dans
# un seul shell pour que le `exit 0` court-circuite vraiment les commandes
# suivantes (chaque @ ligne est sinon un nouveau shell).
tests.throttle:
	@if [ "$(THROTTLER_DISABLED)" = "true" ]; then \
		echo "$(C_BLUE)-> Throttle / rate limit$(C_RESET)" ; \
		$(WARN) "THROTTLER_DISABLED=true -> tests skip" ; \
		$(WARN) "Lance : make THROTTLER_DISABLED=false rme tests.throttle" ; \
		exit 0 ; \
	fi ; \
	echo "$(C_BLUE)-> Throttle / rate limit$(C_RESET)" ; \
	rm -f $(COOKIE_JAR) ; rm -rf $(TEST_TMP) ; mkdir -p $(TEST_TMP) ; \
	printf "  $(C_YELLOW)→ 12 logins KO en rafale (le 11e+ doit hit le rate limit)$(C_RESET)\n" ; \
	hit=0 ; for i in 1 2 3 4 5 6 7 8 9 10 11 12 ; do \
		code=$$($(CURL) -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
			-d '{"email":"none@none.com","password":"wrong"}' $(BASE_URL)/api/auth/login) ; \
		if [ "$$code" = "429" ]; then hit=$$((hit + 1)); fi ; \
	done ; \
	if [ "$$hit" -ge "1" ]; then $(PASS) "Rate limiter declenche ($$hit/12)"; else $(FAIL) "Rate limiter inactif"; echo X >> $(FAIL_FILE); fi ; \
	code=$$($(CURL) -o $(TEST_TMP)/rl.json -w "%{http_code}" -X POST -H "Content-Type: application/json" \
		-d '{"email":"none@none.com","password":"wrong"}' $(BASE_URL)/api/auth/login) ; \
	if [ "$$code" = "429" ]; then \
		c=$$(python3 -c "import json; print(json.load(open('$(TEST_TMP)/rl.json')).get('code',''))") ; \
		if [ "$$c" = "rate_limit.exceeded" ]; then $(PASS) "Code 429 = rate_limit.exceeded"; else $(WARN) "$$c"; fi ; \
	fi ; \
	h=$$(curl -skI --max-time 5 -X POST $(BASE_URL)/api/auth/login | grep -i "retry-after\|x-ratelimit") ; \
	if [ -n "$$h" ]; then $(PASS) "Headers rate limit poses"; else $(WARN) "Pas de headers RL"; fi ; \
	printf "  $(C_YELLOW)→ attente 1s reset puis hit normal$(C_RESET)\n" ; \
	sleep 2 ; \
	code=$$($(CURL) -o /dev/null -w "%{http_code}" $(BASE_URL)/api/health) ; \
	if [ "$$code" = "200" ]; then $(PASS) "/health OK apres throttle"; else $(WARN) "$$code"; fi
