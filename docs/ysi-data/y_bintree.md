# y_bintree (Árboles Binarios Balanceados)

`y_bintree` es una biblioteca de estructuras de datos perteneciente a YSI que implementa **árboles binarios de búsqueda auto-balanceados** (estilo AVL/bisección recursiva) sobre la memoria de Pawn. Permite almacenar, ordenar y consultar grandes volúmenes de claves numéricas con una complejidad temporal logarítmica $\mathcal{O}(\log N)$.

---

## Introducción y Propósito

En scripts de SA-MP y open.mp es habitual necesitar indexar grandes colecciones numéricas que cambian o deben ser consultadas constantemente:
- Rangos de precios de vehículos o propiedades.
- IDs de casas, negocios o puntos de interés ordenados por coordenada o nivel.
- Direcciones IP convertidas a enteros de 32 bits para filtrado y seguridad.
- Puntuaciones y rankings de jugadores.

### Búsqueda Lineal vs Búsqueda Logarítmica

En una lista no ordenada de 10,000 elementos:
- Una búsqueda lineal tradicional con bucle `for` requiere en el peor de los casos **10,000 comparaciones** ($\mathcal{O}(N)$).
- En un árbol binario balanceado de `y_bintree`, la profundidad máxima es $\lceil \log_2(10000) \rceil \approx \mathbf{14}$ **comparaciones** ($\mathcal{O}(\log N)$).

```
Nivel 0:                   [ 500 ]
                         /         \
Nivel 1:           [ 250 ]         [ 750 ]
                   /     \         /     \
Nivel 2:       [ 125 ] [ 375 ] [ 625 ] [ 875 ]
```

Cada comparación divide el espacio de búsqueda restante a la mitad, reduciendo exponencialmente el consumo de CPU.

### Inclusión en el Proyecto

```pawn
#include <YSI_Data\y_bintree>
```

## Tabla de Contenidos

1. [Estructuras y Declaración](#estructuras-y-declaracion)
2. [Constantes del Módulo](#constantes-del-modulo)
3. [Funciones de Generación y Búsqueda](#funciones-de-generacion-y-busqueda)
   - [Bintree_Generate](#bintree_generate)
   - [Bintree_FindValue](#bintree_findvalue)
   - [Bintree_Add](#bintree_add)
   - [Bintree_Delete](#bintree_delete)
   - [Bintree_Reset](#bintree_reset)
   - [Bintree_FindMin y Bintree_FindMax](#bintree_findmin-y-bintree_findmax)
4. [Ejemplo Práctico Completo: Sistema de Búsqueda Rápida de Propiedades](#ejemplo-practico-completo)
5. [Buenas Prácticas y Errores Comunes](#buenas-practicas-y-errores-comunes)

---

## Estructuras y Declaración

`y_bintree` distingue entre el array de entrada plano (*input*) y el árbol binario resultante (*tree*):

### 1. `BinaryInput` (Datos de Entrada)
Almacena pares de valor clave (`VALUE`) y puntero a datos asociados (`POINTER`):
```pawn
// new BinaryInput:Nombre<CAPACIDAD>;
new BinaryInput:g_DatosEntrada<100>;
```
Internamente es un array `[100][E_BINTREE_INPUT]` con los campos:
- `E_BINTREE_INPUT_VALUE`: El valor numérico de búsqueda.
- `E_BINTREE_INPUT_POINTER`: Un índice o ID que referencia a los datos reales (ej. ID de casa, ID de jugador).

### 2. `BinaryTree` (Estructura de Árbol Balanceado)
Almacena el árbol generado con sus ramas de navegación:
```pawn
// new BinaryTree:Nombre<CAPACIDAD>;
new BinaryTree:g_Arbol<100>;
```
Internamente es un array `[100][E_BINTREE_TREE]` con los campos:
- `E_BINTREE_TREE_VALUE`: Valor numérico del nodo.
- `E_BINTREE_TREE_POINTER`: Puntero o ID asociado.
- `E_BINTREE_TREE_LEFT`: Índice del nodo hijo izquierdo ($< \text{valor}$).
- `E_BINTREE_TREE_RIGHT`: Índice del nodo hijo derecho ($\ge \text{valor}$).
- `E_BINTREE_TREE_PARENT`: Índice del nodo padre.

---

## Constantes del Módulo

| Constante | Valor | Significado |
| :--- | :--- | :--- |
| `BINTREE_NO_BRANCH` | `-1` | Indica la ausencia de rama hija o padre (puntero nulo). |
| `BINTREE_NOT_FOUND` | `-1` | Indica que el valor consultado no fue encontrado en el árbol. |

---

## Funciones de Generación y Búsqueda

### Bintree_Generate

- **Módulo requerido:** `#include <YSI_Data\y_bintree>`
- **Tipo:** Función stock
- **Descripción:** Toma una lista no ordenada de elementos `BinaryInput`, la ordena internamente mediante QuickSort (`Bintree_QSort`) y construye recursivamente un árbol binario perfectamente balanceado en el array `BinaryTree` de salida.

#### Sintaxis
```pawn
Bintree_Generate(BinaryTree:output<>, BinaryInput:input<>, size = sizeof (input));
```

#### Parámetros
- `output`: El array destino donde se construirá el árbol.
- `input`: El array de entrada con los datos sin ordenar.
- `size` *(opcional)*: Cantidad de elementos válidos a procesar (por defecto `sizeof(input)`).

#### Retorno
Devuelve `1` si se generó el árbol con éxito, o `0` si el tamaño proporcionado era 0.

#### Ejemplo Práctico
```pawn
stock ConstruirIndicePropiedades(totalPropiedades)
{
    // Generar el árbol balanceado en O(N log N)
    Bintree_Generate(g_ArbolPropiedades, g_EntradaPropiedades, totalPropiedades);
    print("[BINTREE] Árbol de propiedades generado y balanceado.");
}
```

---

### Bintree_FindValue

- **Módulo requerido:** `#include <YSI_Data\y_bintree>`
- **Tipo:** Función stock
- **Descripción:** Busca un valor numérico específico en el árbol binario descendiendo por sus ramas izquierda y derecha en tiempo $\mathcal{O}(\log N)$.

#### Sintaxis
```pawn
Bintree_FindValue(const BinaryTree:tree<>, value, &cont = 0, &old = 0);
```

#### Parámetros
- `tree`: El árbol binario donde se realizará la búsqueda.
- `value`: El valor numérico entero a localizar.
- `&cont` *(opcional, referencia)*: Nodo de inicio (por defecto `0`, la raíz).
- `&old` *(opcional, referencia)*: Almacena el último nodo visitado antes de alcanzar el resultado.

#### Retorno
Devuelve el `POINTER` asociado al valor si fue encontrado, o `BINTREE_NOT_FOUND` (`-1`) si no existe en el árbol.

#### Ejemplo Práctico
```pawn
stock BuscarCasaPorPrecio(precioExacto)
{
    new casaId = Bintree_FindValue(g_ArbolPropiedades, precioExacto);
    if (casaId == BINTREE_NOT_FOUND)
    {
        printf("No existe ninguna propiedad con el precio exacto de $%d.", precioExacto);
        return -1;
    }

    printf("Propiedad encontrada! ID de casa: %d", casaId);
    return casaId;
}
```

---

### Bintree_Add

- **Módulo requerido:** `#include <YSI_Data\y_bintree>`
- **Tipo:** Función stock
- **Descripción:** Inserta un nuevo nodo de forma dinámica en un árbol existente sin reconstruirlo desde cero, enlazando los punteros correspondientes.

#### Sintaxis
```pawn
Bintree_Add(BinaryTree:data<>, pointer, value, offset, maxsize = sizeof (data));
```

#### Parámetros
- `data`: El árbol binario.
- `pointer`: El ID o puntero asociado al nuevo elemento.
- `value`: El valor numérico del nuevo nodo.
- `offset`: La posición en el array donde se almacenará el nuevo nodo (habitualmente el número actual de elementos).
- `maxsize` *(opcional)*: Capacidad máxima del array.

#### Retorno
Devuelve la siguiente posición libre (`offset + 1`), o `BINTREE_NOT_FOUND` si el árbol ha alcanzado su capacidad máxima.

---

### Bintree_Delete

- **Módulo requerido:** `#include <YSI_Data\y_bintree>`
- **Tipo:** Función stock
- **Descripción:** Elimina un nodo del árbol binario y reestructura las ramas descendientes para preservar el balance y la consistencia del árbol.

#### Sintaxis
```pawn
Bintree_Delete(BinaryTree:source<>, index, count);
```

#### Parámetros
- `source`: El árbol binario.
- `index`: El índice del nodo en el array que se desea remover.
- `count`: El número total de elementos activos en el árbol.

---

### Bintree_Reset

- **Módulo requerido:** `#include <YSI_Data\y_bintree>`
- **Tipo:** Función stock
- **Descripción:** Reinicia los valores y punteros de un slot específico del árbol a su estado neutro (`BINTREE_NO_BRANCH`).

#### Sintaxis
```pawn
Bintree_Reset(BinaryTree:tree<>, pointer = 0);
```

---

### Bintree_FindMin y Bintree_FindMax

- **Módulo requerido:** `#include <YSI_Data\y_bintree>`
- **Tipo:** Función stock
- **Descripción:** Encuentra el valor mínimo o máximo contenido en una rama específica del árbol recorriendo el extremo izquierdo o derecho.

```pawn
Bintree_FindMin(BinaryTree:data<>, offset); // Encuentra el mínimo
Bintree_FindMax(BinaryTree:data<>, offset); // Encuentra el máximo
```

---

## Ejemplo Práctico Completo

### Sistema de Búsqueda Rápida de Propiedades por Precio

```pawn
#include <openmultiplayer>
#include <YSI_Data\y_bintree>
#include <YSI_Visual\y_commands>

#define MAX_CASAS (200)

enum E_CASA_DATA
{
    E_CASA_PRECIO,
    E_CASA_DESCRIPCION[64],
    Float:E_CASA_X,
    Float:E_CASA_Y,
    Float:E_CASA_Z
}

new g_Casas[MAX_CASAS][E_CASA_DATA];
new BinaryInput:g_EntradaCasas<MAX_CASAS>;
new BinaryTree:g_ArbolCasas<MAX_CASAS>;
new g_TotalCasasRegistradas = 0;

// Registrar una propiedad en el sistema
stock RegistrarCasa(casaId, precio, const descripcion[], Float:x, Float:y, Float:z)
{
    if (g_TotalCasasRegistradas >= MAX_CASAS) return 0;

    g_Casas[casaId][E_CASA_PRECIO] = precio;
    format(g_Casas[casaId][E_CASA_DESCRIPCION], 64, "%s", descripcion);
    g_Casas[casaId][E_CASA_X] = x;
    g_Casas[casaId][E_CASA_Y] = y;
    g_Casas[casaId][E_CASA_Z] = z;

    // Asignar al array de entrada
    g_EntradaCasas[g_TotalCasasRegistradas][E_BINTREE_INPUT_VALUE] = precio;
    g_EntradaCasas[g_TotalCasasRegistradas][E_BINTREE_INPUT_POINTER] = casaId;
    g_TotalCasasRegistradas++;
    return 1;
}

// Al cargar todas las casas desde la base de datos
public OnGameModeInit()
{
    // Simulamos la carga de algunas propiedades
    RegistrarCasa(0, 150000, "Casa en Idlewood", 1950.0, -1700.0, 13.5);
    RegistrarCasa(1, 450000, "Mansion en Mulholland", 1200.0, -800.0, 45.0);
    RegistrarCasa(2, 85000, "Apartamento en Ganton", 2200.0, -1800.0, 13.0);
    RegistrarCasa(3, 250000, "Casa con garaje en Temple", 1400.0, -1100.0, 23.0);

    // Generar el árbol balanceado
    Bintree_Generate(g_ArbolCasas, g_EntradaCasas, g_TotalCasasRegistradas);
    printf("[CASAS] Árbol de %d casas indexado con éxito.", g_TotalCasasRegistradas);
    return 1;
}

// Comando para buscar casa por precio exacto en O(log N)
YCMD:buscarcasaprecio(playerid, params[], help)
{
    new precio = strval(params);
    if (precio <= 0)
    {
        return SendClientMessage(playerid, 0xFFFFFFFF, "Uso: /buscarcasaprecio [precio]");
    }

    // Búsqueda logarítmica ultra rápida
    new casaId = Bintree_FindValue(g_ArbolCasas, precio);
    if (casaId == BINTREE_NOT_FOUND)
    {
        return SendClientMessage(playerid, 0xFF0000AA, "No hay ninguna propiedad con ese valor exacto.");
    }

    new str[128];
    format(str, sizeof(str), "Propiedad encontrada: %s | Precio: $%d | ID: %d",
        g_Casas[casaId][E_CASA_DESCRIPCION],
        g_Casas[casaId][E_CASA_PRECIO],
        casaId
    );
    SendClientMessage(playerid, 0x00FF00AA, str);
    return 1;
}
```

---

## Buenas Prácticas y Errores Comunes

### 1. Inserción Masiva vs `Bintree_Generate`
Si dispones de un lote inicial de elementos (por ejemplo, al iniciar el servidor desde una base de datos MySQL o archivo INI), es mucho más eficiente cargar todos los datos en `BinaryInput` y llamar a `Bintree_Generate` una sola vez. Construir el árbol nodo por nodo con llamadas sucesivas a `Bintree_Add` puede degenerar en ramas asimétricas si los datos llegan ya ordenados.

### 2. Capacidad Coincidente
Asegúrate de que la capacidad declarada en `<CAPACIDAD>` sea idéntica o compatible tanto en `BinaryInput` como en `BinaryTree`.

### 3. Duplicados de Clave
Si dos elementos tienen exactamente el mismo valor de búsqueda, `Bintree_FindValue` permite avanzar al siguiente resultado mediante el parámetro de referencia `&cont`.
