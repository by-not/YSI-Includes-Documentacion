# Instalación y Configuración de YSI

En esta guía aprenderás paso a paso cómo instalar y configurar la suite **YSI v5** tanto en servidores clásicos de **SA-MP (0.3.7 / 0.3.DL)** como en la plataforma moderna **open.mp**, ya sea mediante el gestor de paquetes **sampctl** o a través de **descarga manual**.

---

## Tabla de Contenido

- [Requisitos Previos y Compilador](#requisitos-previos-y-compilador)
- [Dependencias Principales](#dependencias-principales)
- [Método 1: Instalación Moderna con sampctl](#metodo-1-instalacion-moderna-con-sampctl)
- [Método 2: Instalación Manual en SA-MP](#metodo-2-instalacion-manual-en-sa-mp)
- [Método 3: Instalación en open.mp (qawno)](#metodo-3-instalacion-en-openmp-qawno)
- [Configuración del Servidor (server.cfg / config.json)](#configuracion-del-servidor-servercfg--configjson)
- [Script de Verificación Rápida](#script-de-verificacion-rapida)
- [Solución de Problemas Frecuentes](#solucion-de-problemas-frecuentes)

---

## Requisitos Previos y Compilador

> [!IMPORTANT]
> **No utilices el compilador Pawn oficial antiguo de SA-MP (pawnc versión 3.2.3664 de 2006)**. Dicho compilador contiene fallos de memoria, límites severos de preprocesador y no soporta la sintaxis moderna ni las optimizaciones requeridas por YSI v5.

Debes utilizar el compilador de la comunidad:
- **Pawn Community Compiler (v3.10.11 o superior)**: Mantenido en [github.com/pawn-lang/compiler](https://github.com/pawn-lang/compiler).
- Si usas **open.mp**, este compilador ya viene incluido por defecto dentro de la carpeta `qawno/`.

---

## Dependencias Principales

Para aprovechar al máximo YSI y evitar errores de compilación, instala las siguientes dependencias:

1. **`sscanf2` (Plugin & Include)**: Imprescindible para el procesamiento de argumentos de comandos en `y_commands`.
   - Repositorio oficial: [github.com/Y-Less/sscanf](https://github.com/Y-Less/sscanf) o versión comunitaria [github.com/maddinat0r/sscanf](https://github.com/maddinat0r/sscanf).
2. **`fixes2` (Opcional pero muy recomendado en SA-MP clásico)**:
   - Corrige docenas de fallos y vulnerabilidades del motor nativo de SA-MP (animaciones, estados de vehículos, desincronizaciones).
   - En **open.mp** no es necesario, ya que el servidor open.mp incluye todas estas correcciones en su arquitectura C++.

---

## Método 1: Instalación Moderna con sampctl

Si gestionas tu servidor con **sampctl**, la instalación de YSI v5 y sus dependencias es automática y gestionada por control de versiones.

1. Abre tu archivo `pawn.json` o `pawn.yaml` en la raíz del proyecto.
2. Agrega `pawn-lang/YSI-Includes` y `pawn-lang/compiler` a las dependencias:

```json
{
  "entry": "gamemodes/bare.pwn",
  "output": "gamemodes/bare.amx",
  "dependencies": [
    "pawn-lang/samp-stdlib",
    "pawn-lang/YSI-Includes@v5.x",
    "pawn-lang/sscanf"
  ],
  "compiler": {
    "version": "pawn-lang/compiler@3.10.11"
  }
}
```

3. Ejecuta en tu terminal:
   ```bash
   sampctl package ensure
   ```
4. Para compilar tu proyecto:
   ```bash
   sampctl package build
   ```

---

## Método 2: Instalación Manual en SA-MP

Si utilizas la estructura tradicional con `pawno/`:

1. Dirígete a la sección de lanzamientos (*Releases*) de [pawn-lang/YSI-Includes](https://github.com/pawn-lang/YSI-Includes/releases).
2. Descarga la versión más reciente del archivo comprimido (`YSI-Includes-v5.x.zip`).
3. Extrae el contenido en el directorio de tu servidor. La carpeta `pawno/include/` debe contener las siguientes subcarpetas:
   ```text
   pawno/
   └── include/
       ├── a_samp.inc
       ├── sscanf2.inc
       ├── YSI_Coding/
       ├── YSI_Core/
       ├── YSI_Data/
       ├── YSI_Extra/
       ├── YSI_Game/
       ├── YSI_Players/
       ├── YSI_Server/
       ├── YSI_Storage/
       └── YSI_Visual/
   ```
4. Actualiza el compilador en `pawno/`:
   - Descarga el binario del compilador de la comunidad desde [pawn-lang/compiler](https://github.com/pawn-lang/compiler/releases).
   - Reemplaza `pawno/pawncc.exe`, `pawnc.dll` y `pawndisasm.exe`.
5. Descarga el plugin `sscanf` y copia el archivo `.dll` (en Windows) o `.so` (en Linux) en la carpeta `plugins/`.

---

## Método 3: Instalación en open.mp (qawno)

El servidor open.mp utiliza la carpeta `qawno/` para sus herramientas de desarrollo.

1. Descarga el paquete `YSI-Includes-v5.x.zip`.
2. Extrae las carpetas de YSI directamente dentro de `qawno/include/`:
   ```text
   qawno/
   ├── include/
   │   ├── open.mp/       (o a_samp.inc proporcionado por open.mp)
   │   ├── YSI_Visual/
   │   ├── YSI_Coding/
   │   ├── YSI_Data/
   │   └── ...
   ├── pawncc.exe
   └── qawno.exe
   ```
3. En tus scripts puedes optar por la inclusión nativa de open.mp:
   ```pawn
   #include <open.mp>
   #include <YSI_Visual\y_commands>
   #include <YSI_Visual\y_dialog>
   ```

---

## Configuración del Servidor (server.cfg / config.json)

### En SA-MP (`server.cfg`)
Asegúrate de cargar los plugins necesarios en la línea `plugins`:
```text
echo Executing Server Config...
lanmode 0
rcon_password secreto123
maxplayers 50
port 7777
hostname Servidor de Prueba YSI
gamemode0 test_ysi 1
filterscripts
plugins sscanf
```
*(En sistemas Linux, añade la extensión `.so`, por ejemplo: `plugins sscanf.so`)*.

### En open.mp (`config.json`)
En open.mp, los componentes y librerías se declaran en el archivo JSON de configuración:
```json
{
  "pawn": {
    "main_scripts": [
      "test_ysi 1"
    ]
  }
}
```
*(Nota: open.mp incorpora sscanf internamente o lo maneja como componente modular sin requerir configuraciones complejas).*

---

## Script de Verificación Rápida

Crea un archivo nuevo `gamemodes/test_ysi.pwn` con el siguiente código para verificar que tu entorno compila y ejecuta YSI adecuadamente:

```pawn
#define YSI_YES_HEAP_MALLOC

#if defined __OPEN_MP__
    #include <open.mp>
#else
    #include <a_samp>
#endif

#include <sscanf2>
#include <YSI_Visual\y_commands>
#include <YSI_Coding\y_timers>

main()
{
    print("\n-------------------------------------------");
    print("  [YSI v5]: Entorno compilado exitosamente!  ");
    print("-------------------------------------------\n");
}

public OnGameModeInit()
{
    print("[YSI TEST] Gamemode iniciado correctamente.");
    return 1;
}

// Comando de prueba con sintaxis YCMD
YCMD:saludo(playerid, params[], help)
{
    if (help)
    {
        return SendClientMessage(playerid, 0xFFFF00AA, "Uso: /saludo [mensaje]");
    }
    
    if (IsNull(params))
    {
        return SendClientMessage(playerid, 0xFF0000AA, "Escribe un mensaje tras /saludo!");
    }

    new mensaje[128];
    format(mensaje, sizeof(mensaje), "¡Hola! Has dicho: %s", params);
    SendClientMessage(playerid, 0x00FF00AA, mensaje);
    return 1;
}
```

Compila el archivo y arranca el servidor. Si en la consola visualizas el mensaje de bienvenida y puedes ejecutar `/saludo Hola`, tu instalación está 100% operativa.

---

## Solución de Problemas Frecuentes

### 1. `fatal error 100: cannot read from file: "YSI_Visual\y_commands"`
- **Causa**: El compilador no localiza la carpeta de includes de YSI.
- **Solución**: Revisa la ruta de inclusión en tu editor (Pawno o VS Code). Asegúrate de que las carpetas como `YSI_Visual` están dentro de la carpeta `include` que el compilador tiene configurada.

### 2. `error 017: undefined symbol "sscanf"`
- **Causa**: Falta incluir `#include <sscanf2>` antes de los scripts que procesan comandos o no tienes el archivo include instalado.

### 3. `warning 213: tag mismatch` al usar timers o comandos
- **Causa**: Uso de compilador obsoleto que no reconoce las etiquetas tipadas modernas de YSI.
- **Solución**: Descarga e instala **pawn-lang/compiler v3.10.11**.
