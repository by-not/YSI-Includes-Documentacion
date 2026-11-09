# Documentación en Español de YSI Includes (SA-MP & open.mp)

Sitio de documentación técnica exhaustiva para la suite **YSI Includes** (v5.x), desarrollada originalmente por Alex "Y_Less" Cole y mantenida por la comunidad pawn-lang.

Este proyecto compila una web estática moderna basada en **VitePress** con búsqueda instantánea en local, soporte para modo oscuro/claro, resaltado de sintaxis Pawn y ejemplos prácticos funcionales para SA-MP y open.mp.

---

## 🚀 Comandos Rápidos

```bash
# Iniciar servidor de desarrollo con recarga en vivo
npm run docs:dev

# Compilar para producción (archivos HTML/CSS/JS estáticos en docs/.vitepress/dist)
npm run docs:build

# Previsualizar la versión de producción localmente
npm run docs:preview
```

---

## 📚 Estructura de la Documentación

- **📖 Primeros Pasos (`docs/guia/`)**
  - [Introducción](file:///docs/guia/introduccion.md): ¿Qué es YSI?, arquitectura general y compatibilidad con SA-MP y open.mp.
  - [Instalación](file:///docs/guia/instalacion.md): Guía paso a paso con sampctl o manual para Qawno/PawnCC 3.10.11+.
  - [Conceptos Clave](file:///docs/guia/conceptos.md): Paradigma de preprocesador, decoradores y directivas.

- **🎨 YSI_Visual (`docs/ysi-visual/`)**
  - [y_commands](file:///docs/ysi-visual/y_commands.md): Sistema de comandos `YCMD:`, alias, permisos por grupo y sscanf2.
  - [y_dialog](file:///docs/ysi-visual/y_dialog.md): Diálogos basados en closures inline y callbacks sin colisiones de IDs numéricos.
  - [y_areas](file:///docs/ysi-visual/y_areas.md): Detección espacial rápida de cubos, esferas y polígonos.
  - [y_classes](file:///docs/ysi-visual/y_classes.md): Selección de skins y clases dinámicas sin límites de SA-MP.
  - [y_properties & y_races](file:///docs/ysi-visual/y_properties_races.md): Creación de propiedades inmobiliarias y checkpoints de carreras.
  - [y_zones](file:///docs/ysi-visual/y_zones.md): Cartografía de zonas de San Andreas y efecto de pulso para GangZones.

- **⚡ YSI_Coding (`docs/ysi-coding/`)**
  - [y_timers](file:///docs/ysi-coding/y_timers.md): Temporizadores precisos (`defer`, `repeat`, `task`, `ptask`).
  - [y_hooks](file:///docs/ysi-coding/y_hooks.md): Hookeo modular de callbacks y funciones sin macros ALS repetitivas.
  - [y_inline](file:///docs/ysi-coding/y_inline.md): Closures y funciones anidadas en Pawn.
  - [y_va](file:///docs/ysi-coding/y_va.md): Formateo variable automático (`va_SendClientMessage`, `va_format`).
  - [y_async](file:///docs/ysi-coding/y_async.md): Corrutinas y programación asíncrona sin callback hell (`await`).
  - [y_functional](file:///docs/ysi-coding/y_functional.md): Programación funcional (`Map`, `Filter`, `Fold`, lambdas).
  - [y_malloc_ctrl](file:///docs/ysi-coding/y_malloc_ctrl.md): Asignación dinámica en el heap de AMX y control de bajo nivel.
  - [y_remote_stringhash](file:///docs/ysi-coding/y_remote_stringhash.md): Llamadas tipadas inter-scripts y hashes en compilación (`_H<>`).

- **📊 YSI_Data (`docs/ysi-data/`)**
  - [y_iterate](file:///docs/ysi-data/y_iterate.md): Bucle `foreach` optimizado sobre listas enlazadas en memoria.
  - [y_bit](file:///docs/ysi-data/y_bit.md): Bitarrays para compactar memoria RAM (hasta 32 veces menos celdas).
  - [y_hashmap](file:///docs/ysi-data/y_hashmap.md): Tablas hash con inserción y búsqueda en O(1).
  - [y_bintree](file:///docs/ysi-data/y_bintree.md): Árboles binarios AVL balanceados para búsqueda logarítmica.
  - [y_player_data](file:///docs/ysi-data/y_player_data.md): `PlayerArray` y conjuntos polimórficos de destinatarios (`PlayerSet`).
  - [y_arrays_advanced](file:///docs/ysi-data/y_arrays_advanced.md): Arrays dispersos, auto-ordenados y buffers circulares FIFO.

- **👥 YSI_Players (`docs/ysi-players/`)**
  - [y_groups](file:///docs/ysi-players/y_groups.md): Permisos jerárquicos y visibilidad por grupos de jugadores.
  - [y_users](file:///docs/ysi-players/y_users.md): Autenticación, registro y guardado de cuentas de usuario.
  - [y_text & y_languages](file:///docs/ysi-players/y_text_languages.md): Internacionalización de textos y cambio de idiomas.
  - [y_android](file:///docs/ysi-players/y_android.md): Detección no invasiva de jugadores móviles y adaptaciones de interfaz.

- **💾 YSI_Storage (`docs/ysi-storage/`)**
  - [y_ini](file:///docs/ysi-storage/y_ini.md): Parser y generador INI de ultra alto rendimiento en un solo pase.
  - [y_svar & y_uvar](file:///docs/ysi-storage/y_svar_uvar.md): Variables de servidor y usuario con persistencia transparente.
  - [y_amx](file:///docs/ysi-storage/y_amx.md): Introspección y manipulación directa de la máquina virtual AMX.

- **⚙️ YSI_Core (`docs/ysi-core/`)**
  - [y_utils](file:///docs/ysi-core/y_utils.md): Utilidades matemáticas, cadenas, clamps y conversiones seguras.
  - [y_master](file:///docs/ysi-core/y_master.md): Sincronización maestra y compartición de memoria entre Gamemode y Filterscripts.
  - [y_debug & y_testing](file:///docs/ysi-core/y_debug_testing.md): Macros de diagnóstico condicional (`P:0` a `P:7`) y unit tests (`@test`).
  - [y_als](file:///docs/ysi-core/y_als.md): Historia y estructura del patrón ALS (Advanced Library Shield).

- **🔌 YSI_Extra & YSI_Game (`docs/ysi-extra/` y `docs/ysi-game/`)**
  - [y_inline_integrations](file:///docs/ysi-extra/y_inline_integrations.md): Closures aplicados a MySQL (pBlueG/maddinat0r), Streamer (Incognito) y BCrypt.
  - [y_game_data](file:///docs/ysi-game/y_game_data.md): Metadatos completos de vehículos (velocidades, asientos, tipos) y armas (slots, calibres, alcances).
