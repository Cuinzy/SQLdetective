// Resaltado de sintaxis SQL ligero para el visor docente.
const KW = new Set(
  'select from where and or not in like ilike between is null order by group having join inner left right full outer cross on using as distinct limit offset count sum avg min max case when then else end with union all exists cast asc desc true false'.split(' '),
);

export function SqlView({ sql }: { sql: string }) {
  const parts: React.ReactNode[] = [];
  const re = /(--[^\n]*)|('(?:[^']|'')*')|(\b\d+(?:\.\d+)?\b)|([A-Za-zÁÉÍÓÚáéíóúñÑ_][\wÁÉÍÓÚáéíóúñÑ]*)|(\s+)|(.)/g;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(sql))) {
    const [tok, cm, str, num, word] = m;
    if (cm) parts.push(<span key={i++} className="cm">{tok}</span>);
    else if (str) parts.push(<span key={i++} className="str">{tok}</span>);
    else if (num) parts.push(<span key={i++} className="num">{tok}</span>);
    else if (word && KW.has(word.toLowerCase())) parts.push(<span key={i++} className="kw">{tok}</span>);
    else parts.push(tok);
  }
  return <pre className="sql-code">{parts}</pre>;
}
