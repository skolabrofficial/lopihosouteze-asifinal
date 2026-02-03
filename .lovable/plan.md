
# Úprava OAuth callback pro Alík.cz

## Přehled změn

Edge function potřebuje upravit mapování polí z Alík.cz API:
- `sub` → unikátní ID uživatele (číslo) - použít pro vyhledávání existujícího uživatele
- `nickname` → username pro profil
- `user_link` → URL vizitky (uložit do metadat)

## Soubor k úpravě

**`supabase/functions/oauth-callback/index.ts`**

### Změna 1: Parsování Alík.cz dat (řádky 100-114)

Aktuální kód hledá `username`, `login`, `name` - ale Alík vrací `nickname`.

```typescript
// NOVÉ - Alík.cz specifické parsování
const username = userData.nickname || userData.username || userData.name;
const alikUserId = userData.sub;  // Číslo - ID uživatele
const userLink = userData.user_link;  // URL vizitky

if (!username) {
  console.error("No username found in user data:", userData);
  return new Response(JSON.stringify({ error: "No username in OAuth response" }), {
    status: 400,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Email pro Supabase Auth - použít sub jako unikátní identifikátor
const email = `alik_${alikUserId}@ls.local`;
```

### Změna 2: Vyhledávání existujícího uživatele (řádek 137)

Místo hledání podle emailu hledat podle `alik_user_id` v metadatech:

```typescript
// Hledat uživatele podle Alík ID v metadatech
const existingUser = existingUsers.users.find(
  u => u.user_metadata?.alik_user_id === alikUserId
);
```

### Změna 3: Vytvoření nového uživatele (řádky 146-155)

```typescript
const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
  email,
  password: randomPassword,
  email_confirm: true,
  user_metadata: {
    username,           // nickname z Alíka
    alik_user_id: alikUserId,  // sub - číslo
    user_link: userLink,       // URL vizitky
    gender: userData.gender,
    oauth_provider: "alik",
  },
});
```

### Změna 4: Update existujícího uživatele (po řádku 141)

Přidat aktualizaci metadat pro existující uživatele (nickname se mohl změnit):

```typescript
if (existingUser) {
  userId = existingUser.id;
  console.log("Existing user found:", userId);
  
  // Aktualizovat metadata (nickname se mohl změnit)
  await supabaseAdmin.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...existingUser.user_metadata,
      username,
      user_link: userLink,
      gender: userData.gender,
    },
  });
  
  // Aktualizovat i profiles tabulku
  await supabaseAdmin.from('profiles').update({
    username: username,
  }).eq('id', userId);
}
```

## Výsledná struktura dat

### Odpověď z Alík.cz:
```json
{
  "sub": 123456,
  "nickname": "SuperAlik",
  "user_link": "https://www.alik.cz/u/superalik",
  "gender": "male",
  "can_approve_images": false
}
```

### User metadata v Supabase:
```json
{
  "username": "SuperAlik",
  "alik_user_id": 123456,
  "user_link": "https://www.alik.cz/u/superalik",
  "gender": "male",
  "oauth_provider": "alik"
}
```

### Profil v tabulce `profiles`:
```text
id: uuid (z auth.users)
username: "SuperAlik"
points: 0
avatar_url: null
```

## Důležité poznámky

1. **`sub` jako primární identifikátor** - Používáme `alik_user_id` místo emailu pro identifikaci uživatele, protože Alík neposkytuje email
2. **Syntetický email** - Vytváříme `alik_123456@ls.local` pro Supabase Auth, který vyžaduje email
3. **Automatická synchronizace profilu** - Trigger `handle_new_user` vytvoří profil automaticky, ale pro existující uživatele musíme ručně aktualizovat username
