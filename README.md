# MUNAY AI — prototipo v0.1

> Tu inteligencia inmobiliaria en movimiento.

Copiloto del agente inmobiliario. Máxima inteligencia, mínima interfaz.
React + TypeScript + Vite · 3 dependencias de runtime (react, react-dom, qrcode-generator) · costo S/0.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck (app + functions) + build de producción (dist/)
npm run dev:api    # opcional: proxy LLM local en :8788 (Vite reenvía /api)
```

Sin `dev:api` o sin clave, MUNAY funciona igual con el motor local.

## Modelo de lenguaje (OpenAI) — sin claves en el navegador

```
navegador ── POST /api/llm {task, input} ──▶ functions/api/llm.ts ── OPENAI_API_KEY ──▶ OpenAI
```

- La clave vive **solo** en el entorno del proxy. Nunca con prefijo `VITE_` (Vite lo publicaría en el bundle).
- El navegador solo elige una `task` de la lista cerrada de `functions/_lib/prompts.ts`; instrucciones,
  modelo y límites de tokens se fijan en el servidor. El proxy valida el origen, el tamaño de entrada y
  aplica un rate limit básico, y pide `store: false`.
- Hoy la única tarea es `interpret`: si las reglas locales no entienden un pedido, el modelo lo clasifica
  en una intención conocida y el motor local construye la respuesta.

**Local:** copia `.dev.vars.example` como `.dev.vars` (ignorado por git), pon tu clave y ejecuta
`npm run dev:api` junto a `npm run dev`.

**Producción (Cloudflare Pages, plan gratuito):** conecta el repo en Cloudflare Pages (build `npm run build`,
salida `dist`), luego `npx wrangler pages secret put OPENAI_API_KEY` (y opcionalmente `OPENAI_MODEL`).
En OpenAI usa un Project propio para MUNAY con límite de gasto mensual. En Cloudflare añade una regla de
Rate Limiting para `/api/*`. `VITE_LLM=off` desactiva el modelo en el build.

## HubSpot (Fase 8) — CRM como infraestructura, en modo híbrido

```
navegador ── GET/POST /api/hubspot (X-Munay-Key) ──▶ functions/api/hubspot.ts ── HUBSPOT_TOKEN ──▶ api.hubapi.com
```

- **Desde HubSpot:** clientes (Contacts), operaciones (Deals), tareas (Tasks) y actividad (Notes).
  **En el dispositivo:** agente, propiedades y sus propietarios, captaciones, documentos, leads y mercado.
  HubSpot Free no tiene un objeto "Propiedad", así que el catálogo sigue siendo el de demostración y la
  marca DEMO se mantiene.
- No es un proxy abierto: el servidor traduce HubSpot ⇄ MUNAY (`functions/_lib/hubspot.ts`) y solo acepta
  una lista cerrada de cambios (`task.create`, `task.complete`, `client.contacted`, `activity.log`,
  `operation.update`, `lead.create`). Captaciones y leads vistos viven en el dispositivo.
- Como devuelve datos de clientes, exige `MUNAY_ACCESS_KEY` (cabecera `X-Munay-Key`); sin ella configurada
  no responde. Además valida el origen y aplica rate limit. Para más de un usuario, pon Cloudflare Access
  delante de `/api/hubspot`.
- Un Deal aparece como operación si su `munay_property_id` coincide con una propiedad del catálogo y tiene un
  contacto comprador asociado; Perfil dice cuántos quedaron fuera. Si HubSpot no responde, MUNAY vuelve a la
  demo y lo avisa.

**Configurar:** crea en HubSpot una Private App con scopes `crm.objects.contacts.read/write` y
`crm.objects.deals.read/write` (y los de tareas y notas si tu cuenta los lista aparte); opcionalmente las propiedades personalizadas listadas en
`functions/_lib/hubspot.ts` (`munay_property_id`, `munay_rol`, `munay_presupuesto`…). Luego:

```bash
npx wrangler pages secret put HUBSPOT_TOKEN
npx wrangler pages secret put MUNAY_ACCESS_KEY      # openssl rand -hex 24
npx wrangler pages secret put HUBSPOT_DEAL_STAGES   # opcional, si tu pipeline no es el por defecto
```

Construye con `VITE_CRM=hubspot` (variable de build en Cloudflare Pages) y, en la app, Perfil → HubSpot →
pega la clave de acceso. En local: mismas variables en `.dev.vars` y `VITE_CRM=hubspot npm run dev` junto a
`npm run dev:api`.

## Arquitectura

```
src/
├─ app/            Shell (header, tab bar), store (estado + ACTION), nav (tabs, hojas, acciones)
├─ screens/        HOY · ANALIZA · MERCADO · CREA · NEGOCIO + PublicProperty (experiencia QR)
├─ sheets/         Vistas de detalle: resolver (conversación), propiedad, cliente, operación,
│                  documento, captación (con firma), análisis, pulse, perfil/memoria, QR
├─ intelligence/   El cerebro — sin UI
│   ├─ resolver.ts   intención + contexto + estado + siguiente acción (RESOLVER)
│   ├─ pulse.ts      señales priorizadas; solo muestra 3 (PULSE)
│   ├─ coach.ts      un consejo por contexto, con acción (COACH)
│   ├─ memory.ts     foco actual, lo que pediste, sesiones (MEMORY)
│   ├─ finance.ts    comisión, cuota, alcabala, rentabilidad (MONEY)
│   ├─ creative.ts   propiedad → reel, post, descripción, WhatsApp, campaña (STUDIO)
│   ├─ docReader.ts  primera capa documental (LEGAL)
│   ├─ drafts.ts     mensajes listos para enviar (ACTION)
│   ├─ intents.ts    intenciones del RESOLVER (compartidas con el proxy)
│   └─ llm.ts        cliente del proxy LLM; si falla, sigue el motor local
├─ data/
│   ├─ types.ts      modelo de dominio
│   ├─ changes.ts    todo cambio es un evento explícito (Change)
│   ├─ source.ts     contrato DataSource
│   ├─ adapters/     localMock (por defecto) · hubspot (híbrido: CRM vía proxy + catálogo local)
│   ├─ integrations.ts  registro honesto: activa / preparada / futura
│   ├─ mock/seed.ts  datos de demostración (Carlos, 9 propiedades, 9 clientes, 4 operaciones…)
│   └─ select.ts     consultas y posicionamiento de precio
├─ ui/             Sistema de diseño: kit, iconos, Composer (texto/voz/archivos), Scene, ZoneMap
└─ styles/         tokens.css (paleta funcional, tipografía, movimiento) · components.css
functions/         Cloudflare Pages Functions (servidor): api/llm.ts (proxy OpenAI), api/hubspot.ts (proxy CRM),
                   _lib/prompts.ts, _lib/hubspot.ts (mapeo HubSpot ⇄ MUNAY), _lib/http.ts
```

**Flujo de datos:** la UI llama a `run(action)` → los efectos se aplican como `Change` al store (optimista) → la
`DataSource` activa los persiste. Hoy es `localStorage`; para cambiar a HubSpot se implementa
`adapters/hubspot.ts` sin tocar pantallas (ya implementado, ver HubSpot arriba).

## Qué es real y qué está preparado

| Capacidad | Estado |
|---|---|
| Interpretar lo que pides (texto) y llevarte al lugar correcto | Real · motor local de reglas + entidades + memoria; OpenAI vía proxy como respaldo cuando hay clave |
| Dictado por voz | Real · Web Speech API del navegador (Chrome/Edge) |
| Cálculos de comisión, cuota, alcabala, rentabilidad | Real · parámetros referenciales editables en `finance.ts` |
| Lectura de documentos .txt/.md | Real · extracción local de montos, áreas, partidas, plazos |
| Lectura de PDF/imagen | Preparada · requiere modelo (`llm.ts`); hoy revisa por tipo y lo dice |
| Contenido (reel, post, WhatsApp…) | Real · plantillas locales con variaciones |
| QR de propiedad + experiencia del visitante + lead al PULSE | Real en este dispositivo · para visitantes externos hay que alojarlo |
| Firma de autorización | Firma en pantalla (demo) · proveedor certificado preparado |
| HubSpot | Real con `VITE_CRM=hubspot` + secretos · clientes, negocios, tareas y notas; catálogo aún demo |

## Fases

- [x] 1 · Sistema visual y navegación
- [x] 2 · HOY (entrada universal, lo siguiente, PULSE, COACH, agenda)
- [x] 3 · ANALIZA (propiedad, cliente, documento, oportunidad, decisión)
- [x] 4 · MERCADO (zonas, comparables, tendencias, "¿qué significa para tu propiedad?")
- [x] 5 · CREA (6 objetivos, propuesta, 5 piezas, enfoque/versión)
- [x] 6 · NEGOCIO (transacciones, clientes, captaciones, desempeño, siguiente paso)
- [x] 7 · MEMORY / PULSE / COACH / ACTION con datos mock
- [x] 8 · HubSpot: proxy con token en el servidor + adapter híbrido (CRM real, catálogo local)

## Para probar

En HOY escribe o di: *"¿Cuánto me queda de esta venta?"*, *"Voy a ver una propiedad mañana"*,
*"Quiero captar la oficina de Begonias"*, *"Seguimiento a Lucía"*, *"Créame un Reel"*.
Abre una propiedad → **QR** → *Ver como visitante* → pide una visita → vuelve: aparece en PULSE.
Perfil (avatar) → *Reiniciar datos de demostración*.

`npm test` cubre el Core, el Truth Gate y el mapeo/escritura de HubSpot (`src/core/tests/p8.test.ts`).
