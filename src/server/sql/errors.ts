// Traducción de errores de PostgreSQL a retroalimentación pedagógica (sin revelar soluciones).
import { suggest } from './analyzer';

export interface FriendlyError {
  message: string;
  hint: string;
  technical: string;
}

interface PgError {
  code?: string;
  message?: string;
}

export function friendlyPgError(err: unknown, ctx: { columns: string[]; tables: string[] }): FriendlyError {
  const e = (err ?? {}) as PgError;
  const technical = e.message ?? String(err);
  const quoted = /"([^"]+)"/.exec(technical)?.[1];
  switch (e.code) {
    case '42703': {
      const col = quoted?.split('.').pop() ?? '';
      const s = col ? suggest(col, ctx.columns) : null;
      return {
        message: `La columna «${quoted ?? '?'}» no existe en las tablas seleccionadas.`,
        hint: s
          ? `¿Quisiste decir «${s}»? Revisa también que la columna pertenezca a una tabla incluida en FROM o JOIN.`
          : 'Revisa el explorador de esquemas: la columna debe pertenecer a alguna tabla incluida en FROM o JOIN. Si comparas con un texto, ¿olvidaste las comillas simples?',
        technical,
      };
    }
    case '42P01': {
      const s = quoted ? suggest(quoted, ctx.tables) : null;
      return {
        message: `La tabla «${quoted ?? '?'}» no está disponible en este expediente.`,
        hint: s ? `¿Quisiste decir «${s}»?` : 'Si usaste un alias (por ejemplo «e»), defínelo en FROM: FROM empleados e.',
        technical,
      };
    }
    case '42702':
      return {
        message: `La columna «${quoted ?? '?'}» es ambigua: existe en más de una tabla de la consulta.`,
        hint: 'Indica de qué tabla proviene usando tabla.columna o alias.columna (por ejemplo e.id).',
        technical,
      };
    case '42803':
      return {
        message: 'Error de agrupación: mezclaste columnas normales con funciones de agregación.',
        hint: 'Toda columna del SELECT que no esté dentro de COUNT, SUM, AVG, MIN o MAX debe aparecer en GROUP BY. Las condiciones sobre agregados van en HAVING, no en WHERE.',
        technical,
      };
    case '42883':
      return {
        message: 'Estás comparando u operando valores de tipos de datos incompatibles (o la función no acepta esos argumentos).',
        hint: 'Revisa el tipo de cada columna en el explorador de esquemas. Los textos y fechas van entre comillas simples; los números sin comillas.',
        technical,
      };
    case '42804':
      return {
        message: 'Los tipos de datos de la expresión no coinciden.',
        hint: 'Comprueba que estés comparando columnas del mismo tipo (número con número, texto con texto, fecha con fecha).',
        technical,
      };
    case '22P02':
      return {
        message: 'Un valor no corresponde al tipo de la columna con la que lo comparas.',
        hint: 'Por ejemplo, no se puede comparar una columna numérica con un texto como \'abc\'. Revisa los tipos en el explorador de esquemas.',
        technical,
      };
    case '22007':
    case '22008':
      return {
        message: 'El formato de fecha u hora no es válido.',
        hint: "Usa el formato 'AAAA-MM-DD' para fechas, 'HH:MM' u 'HH:MM:SS' para horas y 'AAAA-MM-DD HH:MM' para fecha y hora.",
        technical,
      };
    case '22012':
      return { message: 'División por cero.', hint: 'Revisa la expresión aritmética; puedes usar NULLIF(divisor, 0).', technical };
    case '21000':
      return {
        message: 'Una subconsulta devolvió más de una fila donde se esperaba un único valor.',
        hint: 'Usa IN en lugar de = o agrega una condición que deje un único resultado.',
        technical,
      };
    case '57014':
      return {
        message: 'La consulta tardó demasiado y fue detenida por el sistema de la agencia.',
        hint: '¿Olvidaste la condición ON de un JOIN? Sin ella, las tablas se combinan fila por fila y el resultado explota.',
        technical,
      };
    case '42601':
      return {
        message: 'Error de sintaxis.',
        hint: 'Revisa comas, paréntesis, comillas y el orden de las cláusulas.',
        technical,
      };
    case '42P10':
    case '42P20':
      return { message: 'La referencia de ordenamiento o agrupación no es válida.', hint: 'Si usas un número en ORDER BY/GROUP BY, debe corresponder a una columna del SELECT.', technical };
    case '42501':
      return {
        message: 'Acceso denegado: esa información no forma parte del expediente.',
        hint: 'Solo puedes consultar las tablas de la investigación activa.',
        technical: 'permission denied',
      };
    case '25006':
      return { message: 'La terminal es de solo lectura.', hint: 'Usa SELECT para consultar la información.', technical };
    default:
      return {
        message: 'La consulta no pudo ejecutarse.',
        hint: 'Revisa la estructura de la consulta y los nombres de tablas y columnas.',
        technical,
      };
  }
}
