# MUNAY AI — prototipo v0.1

> Tu inteligencia inmobiliaria en movimiento.

Copiloto del agente inmobiliario. Máxima inteligencia, mínima interfaz.
React + TypeScript + Vite · 3 dependencias de runtime (react, react-dom, qrcode-generator) · costo S/0.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + build de producción (dist/)
```

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
│   └─ llm.ts        punto de extensión para un modelo de lenguaje (hoy: null)
├─ data/
│   ├─ types.ts      modelo de dominio
│   ├─ changes.ts    todo cambio es un evento explícito (Change)
│   ├─ source.ts     contrato DataSource
│   ├─ adapters/     localMock (activo) · hubspot (preparado, con mapeo documentado)
│   ├─ integrations.ts  registro honesto: activa / preparada / futura
│   ├─ mock/seed.ts  datos de demostración (Carlos, 9 propiedades, 9 clientes, 4 operaciones…)
│   └─ select.ts     consultas y posicionamiento de precio
├─ ui/             Sistema de diseño: kit, iconos, Composer (texto/voz/archivos), Scene, ZoneMap
└─ styles/         tokens.css (paleta funcional, tipografía, movimiento) · components.css
```

**Flujo de datos:** la UI llama a `run(action)` → los efectos se aplican como `Change` al store (optimista) → la
`DataSource` activa los persiste. Hoy es `localStorage`; para cambiar a HubSpot se implementa
`adapters/hubspot.ts` sin tocar pantallas.

## Qué es real y qué está preparado

| Capacidad | Estado |
|---|---|
| Interpretar lo que pides (texto) y llevarte al lugar correcto | Real · motor local de reglas + entidades + memoria |
| Dictado por voz | Real · Web Speech API del navegador (Chrome/Edge) |
| Cálculos de comisión, cuota, alcabala, rentabilidad | Real · parámetros referenciales editables en `finance.ts` |
| Lectura de documentos .txt/.md | Real · extracción local de montos, áreas, partidas, plazos |
| Lectura de PDF/imagen | Preparada · requiere modelo (`llm.ts`); hoy revisa por tipo y lo dice |
| Contenido (reel, post, WhatsApp…) | Real · plantillas locales con variaciones |
| QR de propiedad + experiencia del visitante + lead al PULSE | Real en este dispositivo · para visitantes externos hay que alojarlo |
| Firma de autorización | Firma en pantalla (demo) · proveedor certificado preparado |
| HubSpot | Preparado · requiere un proxy para el token (Fase 8) |

## Fases

- [x] 1 · Sistema visual y navegación
- [x] 2 · HOY (entrada universal, lo siguiente, PULSE, COACH, agenda)
- [x] 3 · ANALIZA (propiedad, cliente, documento, oportunidad, decisión)
- [x] 4 · MERCADO (zonas, comparables, tendencias, "¿qué significa para tu propiedad?")
- [x] 5 · CREA (6 objetivos, propuesta, 5 piezas, enfoque/versión)
- [x] 6 · NEGOCIO (transacciones, clientes, captaciones, desempeño, siguiente paso)
- [x] 7 · MEMORY / PULSE / COACH / ACTION con datos mock
- [~] 8 · Adapter HubSpot preparado (contrato + mapeo); falta el proxy y la implementación

## Para probar

En HOY escribe o di: *"¿Cuánto me queda de esta venta?"*, *"Voy a ver una propiedad mañana"*,
*"Quiero captar la oficina de Begonias"*, *"Seguimiento a Lucía"*, *"Créame un Reel"*.
Abre una propiedad → **QR** → *Ver como visitante* → pide una visita → vuelve: aparece en PULSE.
Perfil (avatar) → *Reiniciar datos de demostración*.
