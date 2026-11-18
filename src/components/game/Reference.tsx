'use client';
// Referencia SQL general (con ejemplos genéricos que no resuelven ningún caso).

const SECTIONS: { title: string; text: string; code?: string }[] = [
  { title: 'SELECT y FROM', text: 'SELECT elige las columnas; FROM, la tabla. El asterisco * muestra todas las columnas.', code: 'SELECT nombre, ciudad\nFROM clientes;' },
  { title: 'WHERE', text: 'Filtra filas. Textos y fechas entre comillas simples; números sin comillas.', code: "SELECT * FROM pedidos\nWHERE total > 100 AND estado = 'enviado';" },
  { title: 'Comparaciones', text: '= igual · <> o != distinto · > mayor · < menor · >= · <=. También puedes comparar dos columnas entre sí.', code: 'SELECT * FROM productos\nWHERE stock < stock_minimo;' },
  { title: 'AND, OR, NOT', text: 'AND exige ambas condiciones; OR, al menos una; NOT invierte. Usa paréntesis para agrupar.', code: "SELECT * FROM empleados\nWHERE (area = 'ventas' OR area = 'soporte')\n  AND NOT activo = false;" },
  { title: 'LIKE', text: "Busca patrones de texto: % = cualquier cantidad de caracteres, _ = un carácter. ILIKE ignora mayúsculas.", code: "SELECT * FROM clientes\nWHERE apellido LIKE 'Gar%';" },
  { title: 'IN y BETWEEN', text: 'IN compara con una lista; BETWEEN con un rango (incluye ambos extremos).', code: "SELECT * FROM ventas\nWHERE region IN ('Norte', 'Sur')\n  AND fecha BETWEEN '2024-01-01' AND '2024-01-31';" },
  { title: 'IS NULL', text: 'Un valor desconocido es NULL. No se compara con =: usa IS NULL o IS NOT NULL.', code: 'SELECT * FROM tareas\nWHERE fecha_cierre IS NULL;' },
  { title: 'ORDER BY y LIMIT', text: 'Ordena (ASC ascendente, DESC descendente). LIMIT recorta el número de filas.', code: 'SELECT nombre, puntaje FROM jugadores\nORDER BY puntaje DESC\nLIMIT 5;' },
  { title: 'DISTINCT', text: 'Elimina filas repetidas del resultado.', code: 'SELECT DISTINCT ciudad FROM clientes;' },
  { title: 'Funciones de agregación', text: 'COUNT cuenta, SUM suma, AVG promedia, MIN y MAX buscan extremos. COUNT(columna) ignora los NULL.', code: 'SELECT COUNT(*), AVG(precio), MAX(precio)\nFROM productos;' },
  { title: 'GROUP BY y HAVING', text: 'GROUP BY forma grupos y calcula una agregación por grupo. HAVING filtra grupos (WHERE filtra filas antes de agrupar).', code: 'SELECT categoria, COUNT(*) AS cantidad\nFROM productos\nGROUP BY categoria\nHAVING COUNT(*) > 10;' },
  { title: 'INNER JOIN', text: 'Une filas de dos tablas que cumplen la condición ON. Solo aparecen las filas con pareja en ambas tablas.', code: 'SELECT p.id, c.nombre\nFROM pedidos p\nINNER JOIN clientes c ON p.id_cliente = c.id;' },
  { title: 'LEFT JOIN', text: 'Conserva TODAS las filas de la tabla izquierda; si no hay pareja, las columnas de la derecha quedan NULL. Ideal para encontrar lo que falta.', code: 'SELECT c.nombre\nFROM clientes c\nLEFT JOIN pedidos p ON p.id_cliente = c.id\nWHERE p.id IS NULL;' },
  { title: 'RIGHT JOIN', text: 'Igual que LEFT JOIN pero conserva todas las filas de la tabla derecha.', code: 'SELECT p.id, c.nombre\nFROM pedidos p\nRIGHT JOIN clientes c ON p.id_cliente = c.id;' },
  { title: 'Varios JOIN y alias', text: 'Encadena JOIN para recorrer relaciones. Los alias (p, c, d…) acortan la escritura y permiten unir una misma tabla dos veces.', code: 'SELECT e.nombre AS empleado, j.nombre AS jefe\nFROM empleados e\nINNER JOIN empleados j ON e.id_jefe = j.id;' },
  { title: 'Fechas y horas', text: "Formato 'AAAA-MM-DD' y 'AAAA-MM-DD HH:MM'. CAST(columna AS date) o CAST(columna AS time) extrae una parte; EXTRACT(HOUR FROM columna) obtiene la hora.", code: "SELECT * FROM accesos\nWHERE CAST(momento AS time) > '22:00';" },
];

export function SqlReference({ onClose }: { onClose: () => void }) {
  return (
    <aside className="ref-drawer" aria-label="Referencia SQL">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2 style={{ fontFamily: 'var(--font-title)', color: 'var(--paper)', margin: 0, fontSize: 20 }}>Manual SQL de la agencia</h2>
        <button className="btn btn--small" onClick={onClose}>Cerrar</button>
      </div>
      <p>Ejemplos genéricos: adapta las ideas a las tablas de tu caso. El manual no contiene respuestas.</p>
      {SECTIONS.map((s) => (
        <section key={s.title}>
          <h3>{s.title}</h3>
          <p>{s.text}</p>
          {s.code && <pre>{s.code}</pre>}
        </section>
      ))}
      <h3>Orden de las cláusulas</h3>
      <pre>{'SELECT … FROM … JOIN … ON …\nWHERE … GROUP BY … HAVING …\nORDER BY … LIMIT …;'}</pre>
    </aside>
  );
}
