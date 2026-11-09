---
layout: home

hero:
  name: "YSI Includes"
  text: "Documentación Técnica"
  tagline: "Referencia moderna y exhaustiva de funciones, macros y arquitectura Pawn para SA-MP y open.mp"
  actions:
    - theme: brand
      text: Comenzar Guía
      link: /guia/introduccion
    - theme: alt
      text: Ver Comandos
      link: /ysi-visual/y_commands
    - theme: alt
      text: Repositorio Oficial
      link: https://github.com/pawn-lang/YSI-Includes

features:
  - title: y_commands y y_timers
    details: Comandos de alto rendimiento con permisos de grupo, alias y temporizadores balanceados sin saturación de memoria AMX ni lag spikes.
  - title: y_hooks y y_inline
    details: Modularización limpia de callbacks sin modificar un solo archivo central, junto a funciones anidadas y closures locales en Pawn.
  - title: y_iterate (foreach)
    details: Iteración lineal optimizada O(N) sobre listas enlazadas en memoria sin consultar slots vacíos de MAX_PLAYERS.
  - title: Estructuras y Utilidades
    details: Bitarrays para reducción de hasta 32x de memoria RAM, árboles AVL balanceados, hashmaps en O(1) y formateo de cadenas variable va_*.
  - title: Almacenamiento y Persistencia
    details: Parser INI en un solo pase por streaming con y_ini, variables globales persistentes svar y variables por usuario uvar.
  - title: Compatibilidad Abierta
    details: Diseñado para funcionar de forma transparente tanto en servidores SA-MP tradicionales como en la arquitectura moderna de open.mp.
---
