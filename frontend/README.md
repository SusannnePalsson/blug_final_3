# BLUG – Forumapplikation

## Projektöversikt

BLUG är en fullstack-baserad forumapplikation byggd med **React + Vite** i frontend och **Node.js + Express** i backend. Applikationen använder databas för att lagra användare, forum, trådar, inlägg och medlemskap i privata trådar.

Syftet med projektet är att skapa ett modernt diskussionsforum där användare kan:

- registrera konto och logga in
- skapa forum
- skapa publika och privata trådar
- läsa och skriva inlägg
- bjuda in medlemmar till privata trådar
- utse moderatorer
- administrera innehåll beroende på roll

Projektet innehåller också flera säkerhetsmekanismer såsom autentisering, CSRF-skydd, sessionshantering och åtkomstkontroll via ACL.

---

## Mål med projektet

Målet har varit att bygga ett forum med:

- tydlig roll- och behörighetsmodell
- stöd för både publika och privata diskussioner
- möjlighet att moderera innehåll
- säker hantering av inloggning och skrivoperationer
- enkel och tydlig frontend för demonstration och användning

---

## Teknikstack

### Frontend

- **React**
- **Vite**
- **React Router**
- vanlig CSS via `styles.css`

### Backend

- **Node.js**
- **Express**
- **Zod** för validering av request payloads
- sessionsbaserad autentisering
- CSRF-skydd

### Databas

Projektet använder relationsdatabas med tabeller för bland annat:

- `users`
- `forums`
- `threads`
- `posts`
- `thread_members`

---

## Projektstruktur

### Exempel på huvudstruktur

```text
project-root/
  backend/
    src/
      config/
      middleware/
      routes/
      utils/
      server.js
  frontend/
    src/
      components/
      pages/
      state/
      api.js
      App.jsx
      main.jsx
```

### Viktiga filer

#### Frontend filer

- `src/api.js` – central API-klient för alla anrop till backend
- `src/pages/Forums.jsx` – listar forum
- `src/pages/ForumDetail.jsx` – visar ett forum och dess trådar
- `src/pages/ThreadView.jsx` – visar tråd, inlägg, medlemmar och hantering
- `src/state/auth.jsx` – autentiseringstillstånd i frontend
- `src/components/Toast.jsx` – meddelanden/fel i UI

#### Backend filer

- `src/routes/threads.routes.js` – logik för trådar
- `src/routes/posts.routes.js` – logik för inlägg
- `src/middleware/access-list.json` – ACL/åtkomstkontroll
- `src/config/db.js` – databasanslutning
- `src/utils/audit.js` – audit-loggning

---

## Funktionalitet

## 1. Användare och autentisering

Systemet stödjer:

- registrering av nya användare
- inloggning
- utloggning
- hämtning av aktuell session

Autentiseringen är sessionsbaserad. När en användare loggar in sparas sessionen på serversidan och frontend skickar med cookie i efterföljande anrop.

---

## 2. Forum

Användare kan:

- se lista över forum
- öppna ett forum
- skapa nya forum (om behörighet finns)

Varje forum innehåller flera trådar.

---

## 3. Trådar

En tråd kan vara:

- **public** – synlig för alla
- **private** – endast tillgänglig för behöriga användare

Användare med rätt behörighet kan:

- skapa tråd
- redigera trådens namn
- redigera trådens beskrivning
- ändra trådens synlighet
- ta bort tråd

---

## 4. Inlägg

I varje tråd kan användare skriva inlägg.

Stöd finns för att:

- skapa inlägg
- redigera inlägg
- ta bort inlägg
- blockera och återställa inlägg beroende på roll

I privata trådar får endast behöriga användare posta.

---

## 5. Medlemskap i privata trådar

Privata trådar har en medlemsmodell via tabellen `thread_members`.

En användare kan ha exempelvis följande roller i en tråd:

- `moderator`
- `member`

Trådägaren läggs också in som moderator i medlemslistan, vilket förenklar behörighetskontroll i privata trådar.

I frontend visas nu medlemslistan för tråden tillsammans med roll.

---

## 6. Moderering

Systemet stödjer moderering av trådar och inlägg.

Beroende på användarroll kan man:

- bjuda in medlemmar
- ta bort medlemmar
- göra användare till moderatorer
- ta bort moderatorstatus
- redigera andras inlägg i tråden
- ta bort andras inlägg i tråden

---

## Roller och behörigheter

Systemet bygger på tre huvudsakliga roller:

### Anonymous

Kan normalt:

- registrera konto
- logga in
- se publika forum och trådar
- läsa publika trådar

Kan inte:

- skapa tråd
- skriva inlägg
- se privata trådar

### Member

Kan normalt:

- skapa trådar
- skriva egna inlägg
- se publika trådar
- se privata trådar där användaren är owner eller medlem
- hantera privata trådar om användaren är moderator/ägare

### Admin

Har full åtkomst till systemet och kan:

- se publika och privata trådar
- skapa forum och trådar
- redigera och ta bort innehåll
- blockera/återställa trådar och inlägg
- hantera medlemmar och moderatorer
- administrera hela systemet

---

## Behörighetsmodell i privata trådar

För privata trådar gäller i praktiken följande:

### Läsrättighet

En privat tråd kan läsas av:

- admin
- trådägare
- användare som finns i `thread_members`

### Skrivrättighet

Inlägg i privat tråd får skapas av:

- admin
- trådägare
- medlem/moderator i tråden

### Hantering av tråd

Trådens inställningar kan hanteras av:

- admin
- trådägare
- moderator

Detta inkluderar exempelvis:

- ändra titel
- ändra beskrivning
- ändra visibility
- hantera medlemskap

---

## Säkerhet

Projektet innehåller flera säkerhetskomponenter.

### 1. Sessionsbaserad autentisering

När användaren loggar in skapas en session. Frontend skickar med session-cookie vid API-anrop genom `credentials: 'include'`.

### 2. CSRF-skydd

Vid skrivoperationer hämtas CSRF-token från endpointen `/csrf-token`.

Frontend skickar sedan token i headern:

```http
X-CSRF-Token: <token>
```

Detta används för operationer som:

- skapa
- uppdatera
- ta bort

### 3. Validering med Zod

Alla viktiga request-body payloads valideras i backend med Zod.

Detta minskar risken för:

- felaktig data
- saknade fält
- trasiga request-format

### 4. ACL / Access Control List

Systemet använder `access-list.json` för övergripande kontroll av vilka roller som får nå vilka endpoints och HTTP-metoder.

Det ger ett extra lager ovanpå route-logiken.

### 5. Roll- och resurskontroll i routes

Utöver ACL kontrolleras också om användaren faktiskt har rätt till den specifika resursen, till exempel:

- om användaren är owner
- om användaren är moderator
- om användaren är medlem i privat tråd

---

## API-översikt

### Exempel på viktiga endpoints

#### Auth

- `GET /login` – hämta session
- `POST /login` – logga in
- `DELETE /login` – logga ut

#### Forum

- `GET /forums`
- `GET /forums/by-id/:id`
- `GET /forums/by-name/:name`
- `GET /forums/by-slug/:slug`
- `POST /forum`
- `POST /forums/:id/threads`

#### Trådar

- `GET /threads`
- `POST /threads`
- `GET /threads/by-id/:id`
- `GET /threads/by-title/:title`
- `GET /thread/:idOrTitle`
- `PATCH /threads/:id`
- `PATCH /threads/:id/visibility`
- `PATCH /threads/:id/block`
- `PATCH /threads/:id/restore`

#### Inlägg

- `POST /threads/:id/posts`
- `PATCH /posts/:id`
- `DELETE /posts/:id`
- `PATCH /posts/:id/block`
- `PATCH /posts/:id/restore`

#### Medlemmar och moderatorer

- `POST /threads/:id/members`
- `DELETE /threads/:id/members/:userId`
- `POST /threads/:id/moderators`
- `DELETE /threads/:id/moderators/:userId`

---

## Frontend-logik

Frontend använder en central fil `api.js` för att samla alla API-anrop.

Fördelar med detta:

- återanvändbar kod
- enklare felsökning
- konsekvent hantering av CSRF och felmeddelanden

Exempel på funktioner i `api.js`:

- `getForums()`
- `getForumById()`
- `createThreadInForum()`
- `getThreadById()`
- `createPostInThread()`
- `updateThread()`
- `setThreadVisibility()`
- `addThreadMember()`
- `assignModerator()`

---

## Viktiga utvecklingsbeslut

### 1. Stabil identifiering via id

Tidigare användes ibland forum-namn eller trådtitel för att skapa eller läsa resurser. Detta är mindre stabilt eftersom namn kan ändras eller kollidera.

Projektet har därför successivt anpassats för att i första hand använda:

- forum-id
- thread-id

Det gör systemet mer robust.

### 2. Privat tråd = medlemsstyrd åtkomst

Privata trådar bygger på relationsdata i `thread_members` istället för att bara kontrollera ägare.

Det gör det möjligt att:

- bjuda in användare
- utse moderatorer
- hantera separata medlemskap per tråd

### 3. Separation mellan generell ACL och detaljerad route-kontroll

ACL avgör om användaren överhuvudtaget får nå endpointen.

Routes avgör därefter om användaren får agera på den specifika resursen.

Detta ger tydligare säkerhetsmodell.

---

## Testade scenarier

Följande scenarier har testats under utvecklingen:

### Publika trådar

- anonym användare kan läsa
- inloggad medlem kan läsa och skriva
- admin kan läsa och moderera

### Privata trådar

- ägare kan läsa och skriva
- inbjuden medlem kan läsa och skriva
- ej inbjuden användare blockeras
- admin kan läsa och administrera

### Moderering

- moderator kan hantera medlemskap
- moderator kan redigera/ta bort andras inlägg i tråden
- owner kan hantera trådinställningar
- admin kan göra allt

### Trådinställningar

- ändra trådtitel
- ändra trådbeskrivning
- ändra visibility public/private

### Hantera inlägg

- skapa inlägg
- redigera inlägg
- ta bort inlägg

---

## Så kör man projektet

### 1. Installera beroenden

Från projektets root:

```bash
npm install
cd frontend && npm install
cd ../backend && npm install
```

### 2. Starta projektet

Från root:

```bash
npm run dev
```

Detta startar normalt både:

- backend på `http://localhost:3000`
- frontend på `http://localhost:5173`

### 3. Alternativ separat start

#### Starta Backend

```bash
cd backend
npm run dev
```

#### Starta Frontend

```bash
cd frontend
npm run dev
```

---

## Exempel på användarflöde

### Scenario: skapa privat tråd och bjuda in medlem

1. Användare loggar in
2. Går till ett forum
3. Skapar ny tråd med visibility = `private`
4. Trådägaren öppnar tråden
5. Trådägaren använder funktionen “Bjud in medlem”
6. Inbjuden användare kan därefter öppna tråden och skriva inlägg
7. Moderator/ägare/admin kan hantera innehållet

---

## Kända förbättringsområden

Även om projektet fungerar bra finns flera möjliga förbättringar:

- snyggare UI/UX och bättre responsiv design
- sökning efter användare via namn istället för bara userId
- tydligare listor för medlemmar och moderatorer
- paginering för många trådar och inlägg
- bättre audit-loggar i admin-vy
- tester med exempelvis Vitest/Jest och integrationstester
- förbättrad felhantering och användarfeedback i frontend

---

## Lärdomar från projektet

Under arbetet med projektet har vi lärt oss bland annat:

- vikten av konsekvent användning av id-baserade endpoints
- hur sessionsbaserad autentisering och CSRF-skydd fungerar i praktiken
- hur roll- och resursbaserad åtkomstkontroll kan kombineras
- hur frontend och backend måste hållas synkroniserade när API-responsen ändras
- hur små skillnader i route-definitioner eller ACL kan få stor effekt på systemets funktion

---

## Sammanfattning

BLUG är en forumapplikation med stöd för:

- användarhantering
- forum och trådar
- publika och privata diskussioner
- moderator- och medlemskapshantering
- säker autentisering och skrivskyddade operationer

Projektet visar tydligt hur ett forum kan byggas med modern JavaScript-stack där säkerhet, behörigheter och struktur är centrala delar.

---
