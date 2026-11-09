# y_malloc & y_ctrl: Memoria Dinámica y Control de Bajo Nivel

Pawn es un lenguaje diseñado originalmente para sistemas embebidos, con un modelo de memoria estático donde todos los arrays deben tener un tamaño prefijado en tiempo de compilación. Sin embargo, en servidores de SA-MP y open.mp con sistemas complejos (inventarios dinámicos, lectura de archivos grandes, estructuras de datos adaptables y cachés), el límite de celdas fijas provoca un desperdicio masivo del archivo `.amx` o fallos por memoria insuficiente.

La combinación de **`y_malloc`** y **`y_ctrl`** proporciona a los desarrolladores avanzados el control de memoria y flujo más potente disponible en Pawn:
1. **`y_malloc`:** Asignación y liberación dinámica de memoria en el heap del AMX (`malloc`, `free`, `realloc`, `calloc`), permitiendo dimensionar buffers en tiempo de ejecución.
2. **`y_ctrl`:** Control de ejecución y manejo de bajo nivel de la máquina virtual AMX, permitiendo crear registros personalizados interceptables vía `#emit LCTRL` y `#emit SCTRL`.

---

## Cómo incluir los módulos

Puedes incluirlos juntos o por separado según las necesidades de tu arquitectura:

```pawn
#include <open.mp> // o <a_samp>
#include <YSI_Coding\y_malloc>
#include <YSI_Coding\y_ctrl>
```

---

## Parte 1: y_malloc (Asignación Dinámica de Memoria)

### Resumen de Funciones de y_malloc

| Función | Tipo | Descripción |
| :--- | :--- | :--- |
| [`malloc`](#malloc) | Función stock | Asigna un bloque de memoria de N celdas en el heap de la AMX. |
| [`calloc`](#calloc) | Función stock | Asigna un bloque de memoria y limpia todas sus celdas inicializándolas a `0`. |
| [`realloc`](#realloc) | Función stock | Cambia el tamaño de un bloque previamente reservado sin perder sus datos. |
| [`free`](#free) | Función stock | Libera el bloque de memoria dinámico y lo devuelve al heap. |
| [`mget` y `mset`](#mget-y-mset) | Funciones stock | Leen y escriben valores escalares individuales en una posición del bloque. |
| [`mgets` y `msets`](#mgets-y-msets) | Funciones stock | Leen y escriben cadenas de texto (empaquetadas o desempaquetadas) en el bloque. |
| [`mgeta` y `mseta`](#mgeta-y-mseta) | Funciones stock | Leen y copian arrays completos de celdas hacia o desde el bloque dinámico. |

---

### malloc

- **Módulo requerido:** `#include <YSI_Coding\y_malloc>`
- **Tipo:** Función stock
- **Descripción:** Reserva un bloque contiguo de memoria en el heap con al menos la cantidad especificada de celdas (`size`). La memoria asignada **no** es inicializada (puede contener datos residuales).
- **Sintaxis:**
```pawn
Alloc:puntero = malloc(size);
```
- **Parámetros:**
  - `size`: Cantidad mínima de celdas (*cells*) a reservar.
- **Retorno:** Devuelve un identificador de tipo `Alloc:`. Si el servidor no dispone de suficiente memoria en el heap, devuelve la constante `NO_ALLOC` (equivalente a `Alloc:0`).
- **Ejemplo práctico:**
```pawn
new Alloc:buffer = malloc(256);
if (buffer == NO_ALLOC)
{
    print("Error crítico: No se pudo reservar memoria en el heap.");
    return;
}

// Usar el buffer...

free(buffer); // Siempre liberar al finalizar
```

---

### calloc

- **Módulo requerido:** `#include <YSI_Coding\y_malloc>`
- **Tipo:** Función stock
- **Descripción:** Similar a `malloc`, pero inicializa explícitamente todas las celdas del bloque reservado a valor `0`. Es ideal para estructuras de datos limpias o contadores.
- **Sintaxis:**
```pawn
Alloc:puntero = calloc(size);
```
- **Parámetros:**
  - `size`: Cantidad de celdas a reservar e inicializar a cero.
- **Retorno:** Manejador `Alloc:` del bloque asignado, o `NO_ALLOC` si falló.

---

### realloc

- **Módulo requerido:** `#include <YSI_Coding\y_malloc>`
- **Tipo:** Función stock
- **Descripción:** Redimensiona un bloque de memoria asignado previamente conservando el contenido existente hasta el tamaño menor entre el antiguo y el nuevo.
- **Sintaxis:**
```pawn
Alloc:nuevoPuntero = realloc(Alloc:antiguoPuntero, nuevoTamaño);
```
- **Parámetros:**
  - `antiguoPuntero`: Bloque asignado previamente con `malloc` o `calloc`.
  - `nuevoTamaño`: Nueva dimensión en celdas.
- **Retorno:** El nuevo manejador `Alloc:`. Si la reasignación falla, devuelve `NO_ALLOC` y el bloque original permanece intacto en memoria.
- **Ejemplo práctico:**
```pawn
new Alloc:miLista = malloc(10);

// Necesitamos ampliar la lista a 50 elementos
new Alloc:redim = realloc(miLista, 50);
if (redim != NO_ALLOC)
{
    miLista = redim; // Reasignación exitosa
}
else
{
    print("Fallo al expandir memoria. Se conserva el tamaño previo.");
}
```

---

### free

- **Módulo requerido:** `#include <YSI_Coding\y_malloc>`
- **Tipo:** Función stock
- **Descripción:** Libera un bloque de memoria previamente asignado para que sus celdas puedan ser reutilizadas por futuras llamadas a `malloc`. 
- **Sintaxis:**
```pawn
free(Alloc:puntero);
```
- **Parámetros:**
  - `puntero`: Bloque `Alloc:` a destruir.
- **Retorno:** No retorna valor.
- **Notas / Advertencias:**
  - Todo bloque creado con `malloc`, `calloc` o `realloc` debe ser eventualmente liberado con `free`. Olvidar liberar memoria genera **fugas de memoria** (*memory leaks*) que eventualmente agotarán el espacio del AMX provocando un crash `AMX out of memory`.

---

### Lectura y Escritura en Memoria Dinámica

Dado que Pawn no permite el uso directo de operadores de subíndice (`buffer[i]`) sobre etiquetas que no sean arrays de longitud fija de compilación, `y_malloc` provee funciones de acceso optimizadas:

#### mget y mset (Celdas individuales)
```pawn
// Asignar un valor a la posición index (buffer[5] = 42)
mset(Alloc:buffer, 5, 42);

// Leer el valor en la posición index
new valor = mget(Alloc:buffer, 5);
printf("Valor en celda 5: %d", valor);
```

#### mgets y msets (Cadenas de texto)
```pawn
new Alloc:strBuffer = malloc(32);

// Escribir una cadena en el offset 0
msets(strBuffer, 0, "Texto dinámico en el Heap");

// Leer la cadena hacia un array local
new destino[64];
mgets(destino, sizeof(destino), strBuffer, 0);
printf("Leído del heap: %s", destino);

free(strBuffer);
```

#### mgeta y mseta (Arrays de datos)
```pawn
new Alloc:arrayBuffer = malloc(100);

new localData[4] = { 10, 20, 30, 40 };
// Copiar 4 celdas locales a partir del índice 10 del buffer dinámico
mseta(arrayBuffer, 10, localData, sizeof(localData));

new resultado[4];
// Recuperar las 4 celdas del heap
mgeta(resultado, sizeof(resultado), arrayBuffer, 10);

free(arrayBuffer);
```

---

## Parte 2: y_ctrl (Control de Flujo de Bajo Nivel en AMX)

En la máquina virtual AMX de Pawn, la instrucción ensambladora `LCTRL` (*Load Control Register*) lee registros internos del procesador virtual (tales como `DAT`, `COD`, `STK`, `HEA`, `FRM`), mientras que `SCTRL` (*Store Control Register*) escribe sobre ellos.

Los números de registro del **0 al 255** están reservados para la máquina virtual y plugins de auditoría (por ejemplo, `crashdetect` emplea los registros 254 y 255 para trazas de depuración).

El módulo `y_ctrl` permite registrar **pseudo-registros personalizados de VM** (con números superiores a 255) que interceptan lecturas y escrituras en ensamblador `#emit`, habilitando:
* Saltos y control de flujo ultra optimizados sin costo de creación de marco de pila (*stack frame*).
* Comunicación instantánea entre subsistemas de bajo nivel.
* Instrumentación de código y temporizadores de ciclo de reloj precisos.

---

### Decoradores @lctrl y @sctrl

- **Módulo requerido:** `#include <YSI_Coding\y_ctrl>`
- **Tipo:** Decoradores preprocesadores
- **Descripción:** Definen funciones manejadoras que se disparan cuando el código ejecuta `#emit LCTRL n` o `#emit SCTRL n`.
- **Sintaxis:**
```pawn
// Manejador de lectura (LCTRL): debe retornar el nuevo valor de 'pri'
@lctrl(registro_id) NombreLCTRL(pri, alt)
{
    return nuevo_valor;
}

// Manejador de escritura (SCTRL): recibe 'pri' y 'alt'
@sctrl(registro_id) NombreSCTRL(pri, alt)
{
    // Código ejecutado al escribir en el registro
}
```
- **Parámetros del decorador:**
  - `registro_id`: Número entero mayor o igual a 256 que identifica el registro personalizado.
  - `pri`, `alt`: Valores actuales de los registros primario y secundario de la CPU virtual en el momento de la emisión.
- **Ejemplo práctico:**
```pawn
#include <open.mp>
#include <YSI_Coding\y_ctrl>

static gVirtualRegister = 0;

// Registramos el pseudo-registro de lectura 1000
@lctrl(1000) LeerRegistro1000(pri, alt)
{
    // Retorna el valor que se depositará en el registro 'pri'
    return gVirtualRegister;
}

// Registramos el pseudo-registro de escritura 1000
@sctrl(1000) EscribirRegistro1000(pri, alt)
{
    // Captura el valor que venía en 'pri'
    gVirtualRegister = pri * 2;
}

main()
{
    new resultado = 0;

    // Escribir 50 en el registro personalizado 1000
    #emit CONST.pri        50
    #emit SCTRL            1000

    // Leer el registro personalizado 1000 hacia la variable 'resultado'
    #emit LCTRL            1000
    #emit STOR.S.pri       resultado

    // Imprime: resultado = 100 (50 * 2)
    printf("Valor del registro VM: %d", resultado);
}
```

---

## Ejemplo Completo Integrado: Buffer Dinámico Seguro

Un caso realista que demuestra la creación de un búfer de tamaño adaptable para leer registros de log con validación de punteros y liberación garantizada:

```pawn
#include <open.mp>
#include <YSI_Coding\y_malloc>
#include <YSI_Coding\y_va>

// Estructura que gestiona un array redimensionable de enteros
stock bool:CargarRegistrosDinamicos(const datos[], cantidad)
{
    if (cantidad <= 0) return false;

    // 1. Reservamos la memoria exacta requerida en tiempo de ejecución
    new Alloc:memoria = calloc(cantidad);
    if (memoria == NO_ALLOC)
    {
        print("[MEMORIA] Fallo de asignación: Memoria RAM insuficiente en el Heap AMX.");
        return false;
    }

    // 2. Escribimos los datos en el heap
    mseta(memoria, 0, datos, cantidad);

    // 3. Procesamos los datos leyendo del heap
    new suma = 0;
    for (new i = 0; i < cantidad; i++)
    {
        suma += mget(memoria, i);
    }

    printf("[PROCESADOR] Se procesaron %d elementos en el heap. Suma total: %d", cantidad, suma);

    // 4. Liberación obligatoria para evitar fugas de memoria
    free(memoria);
    return true;
}

public OnGameModeInit()
{
    new muestra[5] = { 100, 250, 400, 750, 900 };
    CargarRegistrosDinamicos(muestra, sizeof(muestra));
    return 1;
}
```

---

## Buenas Prácticas y Errores Comunes

1. **Fugas de Memoria (*Memory Leaks*):**  
   Cada llamada a `malloc()` o `calloc()` debe tener su correspondiente `free()`. Si reservas memoria dinámicamente en un callback o comando y olvidas liberarla, el heap de la AMX crecerá indefinidamente hasta saturarse.

2. **Doble Liberación (*Double Free*):**  
   Llamar a `free()` dos veces sobre el mismo puntero `Alloc:` corrompe la lista de asignación interna de `y_malloc`. Tras liberar un bloque, es una excelente práctica reasignar su variable a `NO_ALLOC`:
   ```pawn
   free(buffer);
   buffer = NO_ALLOC;
   ```

3. **Uso de punteros tras ser liberados (*Use-After-Free*):**  
   No intentes leer o escribir con `mget`/`mset` sobre un bloque que ya ha sido liberado con `free()`.

4. **Uso de IDs de registro reservados en `y_ctrl`:**  
   Nunca utilices IDs de registro inferiores a 256 en `@lctrl` o `@sctrl`. Los identificadores del 0 al 255 están estrictamente reservados para la máquina virtual oficial de SA-MP/open.mp y sus plugins nativos.
