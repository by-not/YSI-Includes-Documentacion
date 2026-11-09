import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: 'es-ES',
  title: 'YSI Includes',
  description: 'Documentación técnica completa en español de la suite YSI para SA-MP y open.mp',

  // Configuración para GitHub Pages (se adapta automáticamente si se define BASE_PATH)
  base: process.env.BASE_PATH || '/',

  markdown: {
    languageAlias: {
      pawn: 'c',
      pwn: 'c'
    }
  },

  themeConfig: {
    siteTitle: 'YSI Includes',
    logo: undefined,

    nav: [
      { text: 'Inicio', link: '/' },
      { text: 'Guía', link: '/guia/introduccion' },
      { text: 'Comandos', link: '/ysi-visual/y_commands' },
      { text: 'Temporizadores', link: '/ysi-coding/y_timers' },
      { text: 'Iteradores', link: '/ysi-data/y_iterate' },
      { text: 'GitHub YSI', link: 'https://github.com/pawn-lang/YSI-Includes' }
    ],

    search: {
      provider: 'local',
      options: {
        locales: {
          root: {
            translations: {
              button: {
                buttonText: 'Buscar función o macro',
                buttonAriaLabel: 'Buscar'
              },
              modal: {
                noResultsText: 'No se encontraron resultados para',
                resetButtonTitle: 'Borrar búsqueda',
                footer: {
                  selectText: 'para seleccionar',
                  navigateText: 'para navegar',
                  closeText: 'para cerrar'
                }
              }
            }
          }
        }
      }
    },

    sidebar: [
      {
        text: 'Primeros Pasos',
        items: [
          { text: 'Introducción a YSI', link: '/guia/introduccion' },
          { text: 'Instalación y Configuración', link: '/guia/instalacion' },
          { text: 'Conceptos y Buenas Prácticas', link: '/guia/conceptos' }
        ]
      },
      {
        text: 'YSI_Visual (Comandos y UI)',
        collapsed: false,
        items: [
          { text: 'y_commands (YCMD)', link: '/ysi-visual/y_commands' },
          { text: 'y_dialog (Diálogos modernos)', link: '/ysi-visual/y_dialog' },
          { text: 'y_areas (Zonas y Detección)', link: '/ysi-visual/y_areas' },
          { text: 'y_classes (Selección de Personaje)', link: '/ysi-visual/y_classes' },
          { text: 'y_properties & y_races', link: '/ysi-visual/y_properties_races' },
          { text: 'y_zonenames & y_zonepulse', link: '/ysi-visual/y_zones' }
        ]
      },
      {
        text: 'YSI_Coding (Lógica y Lenguaje)',
        collapsed: false,
        items: [
          { text: 'y_timers (defer, repeat, task)', link: '/ysi-coding/y_timers' },
          { text: 'y_hooks (Hooking modular)', link: '/ysi-coding/y_hooks' },
          { text: 'y_inline (Funciones Inline y Closures)', link: '/ysi-coding/y_inline' },
          { text: 'y_va (Formato variable va_*)', link: '/ysi-coding/y_va' },
          { text: 'y_async (Corrutinas y Await)', link: '/ysi-coding/y_async' },
          { text: 'y_functional (Map, Filter, Reduce)', link: '/ysi-coding/y_functional' },
          { text: 'y_ctrl & y_malloc (Memoria y Control)', link: '/ysi-coding/y_malloc_ctrl' },
          { text: 'y_remote & y_stringhash & y_unique', link: '/ysi-coding/y_remote_stringhash' }
        ]
      },
      {
        text: 'YSI_Data (Estructuras de Datos)',
        collapsed: false,
        items: [
          { text: 'y_iterate (foreach e Iteradores)', link: '/ysi-data/y_iterate' },
          { text: 'y_bit (Arrays de Bits / Bitarrays)', link: '/ysi-data/y_bit' },
          { text: 'y_hashmap (Tablas Hash)', link: '/ysi-data/y_hashmap' },
          { text: 'y_bintree (Árboles AVL)', link: '/ysi-data/y_bintree' },
          { text: 'y_playerarray & y_playerset', link: '/ysi-data/y_player_data' },
          { text: 'y_sparsearray & y_sortedarray & y_circular', link: '/ysi-data/y_arrays_advanced' }
        ]
      },
      {
        text: 'YSI_Players (Jugadores y Permisos)',
        collapsed: true,
        items: [
          { text: 'y_groups (Grupos y Permisos)', link: '/ysi-players/y_groups' },
          { text: 'y_users (Autenticación y Cuentas)', link: '/ysi-players/y_users' },
          { text: 'y_text & y_languages (Localización)', link: '/ysi-players/y_text_languages' },
          { text: 'y_android (Detección Móvil)', link: '/ysi-players/y_android' }
        ]
      },
      {
        text: 'YSI_Storage (Almacenamiento)',
        collapsed: true,
        items: [
          { text: 'y_ini (Lector y Escritor INI ultra rápido)', link: '/ysi-storage/y_ini' },
          { text: 'y_svar & y_uvar (Variables de Servidor y Jugador)', link: '/ysi-storage/y_svar_uvar' },
          { text: 'y_amx (Inspección y Manipulación AMX)', link: '/ysi-storage/y_amx' }
        ]
      },
      {
        text: 'YSI_Core (Núcleo y Diagnóstico)',
        collapsed: true,
        items: [
          { text: 'y_utils (Funciones utilitarias esenciales)', link: '/ysi-core/y_utils' },
          { text: 'y_master (Sincronización Gamemode-Filterscript)', link: '/ysi-core/y_master' },
          { text: 'y_debug & y_testing (Logging y Unit Tests)', link: '/ysi-core/y_debug_testing' },
          { text: 'y_als (Advanced Library Shield)', link: '/ysi-core/y_als' }
        ]
      },
      {
        text: 'YSI_Extra & YSI_Game (Extensiones)',
        collapsed: true,
        items: [
          { text: 'y_inline_mysql / streamer / bcrypt', link: '/ysi-extra/y_inline_integrations' },
          { text: 'y_vehicledata & y_weapondata', link: '/ysi-game/y_game_data' }
        ]
      }
    ],

    outline: {
      level: [2, 3],
      label: 'En esta página'
    },

    footer: {
      message: 'Documentación técnica en español para la comunidad de SA-MP y open.mp.',
      copyright: 'Basado en YSI v5.x por Alex "Y_Less" Cole y la comunidad pawn-lang.'
    }
  }
})
