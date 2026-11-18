'use client';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, placeholder as cmPlaceholder } from '@codemirror/view';
import { EditorState, Prec } from '@codemirror/state';
import { sql, PostgreSQL } from '@codemirror/lang-sql';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { autocompletion, completionKeymap, closeBrackets } from '@codemirror/autocomplete';
import { syntaxHighlighting, HighlightStyle, bracketMatching } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import { sfx } from '@/lib/client';

const phosphor = HighlightStyle.define([
  { tag: t.keyword, color: '#ffcf6b', fontWeight: 'bold' },
  { tag: [t.string, t.special(t.string)], color: '#b7dc8c' },
  { tag: [t.number, t.bool, t.null], color: '#8fd3e0' },
  { tag: t.comment, color: '#6b7a5e', fontStyle: 'italic' },
  { tag: [t.operator, t.punctuation], color: '#e8dcbc' },
  { tag: [t.typeName, t.standard(t.name)], color: '#f0a35e' },
  { tag: t.name, color: '#f2c879' },
]);

export interface SqlEditorHandle {
  getValue: () => string;
  setValue: (v: string) => void;
  focus: () => void;
}

interface Props {
  schema: Record<string, string[]>;
  onRun: () => void;
  onBlocked: (kind: string) => void;
  placeholder?: string;
}

/** Editor SQL basado en CodeMirror 6. Copiar, cortar, pegar y arrastrar están bloqueados. */
export const SqlEditor = forwardRef<SqlEditorHandle, Props>(function SqlEditor({ schema, onRun, onBlocked, placeholder }, ref) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const runRef = useRef(onRun);
  const blockedRef = useRef(onBlocked);
  runRef.current = onRun;
  blockedRef.current = onBlocked;

  useImperativeHandle(ref, () => ({
    getValue: () => view.current?.state.doc.toString() ?? '',
    setValue: (v: string) => {
      const ed = view.current;
      if (!ed) return;
      ed.dispatch({ changes: { from: 0, to: ed.state.doc.length, insert: v }, selection: { anchor: v.length } });
    },
    focus: () => view.current?.focus(),
  }));

  useEffect(() => {
    if (!host.current) return;
    const block = (kind: string) => (e: Event) => {
      e.preventDefault();
      blockedRef.current(kind);
      return true;
    };
    let lastKey = 0;
    const state = EditorState.create({
      doc: '',
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        history(),
        bracketMatching(),
        closeBrackets(),
        sql({ dialect: PostgreSQL, schema, upperCaseKeywords: true }),
        syntaxHighlighting(phosphor),
        autocompletion({ activateOnTyping: true, maxRenderedOptions: 12 }),
        cmPlaceholder(placeholder ?? 'Escribe tu consulta SQL…  (Ctrl+Enter para ejecutar)'),
        Prec.highest(
          keymap.of([
            { key: 'Mod-Enter', run: () => (runRef.current(), true) },
            { key: 'Mod-v', run: () => (blockedRef.current('paste'), true) },
            { key: 'Mod-c', run: () => (blockedRef.current('copy'), true) },
            { key: 'Mod-x', run: () => (blockedRef.current('copy'), true) },
            { key: 'Shift-Insert', run: () => (blockedRef.current('paste'), true) },
            { key: 'Mod-Insert', run: () => (blockedRef.current('copy'), true) },
          ]),
        ),
        keymap.of([...completionKeymap, ...defaultKeymap, ...historyKeymap, indentWithTab]),
        EditorView.domEventHandlers({
          paste: block('paste'),
          drop: block('drop'),
          copy: block('copy'),
          cut: block('copy'),
          dragstart: block('drag'),
          contextmenu: block('menu'),
        }),
        EditorView.updateListener.of((u) => {
          if (u.docChanged && u.transactions.some((tr) => tr.isUserEvent('input.type') || tr.isUserEvent('delete'))) {
            const now = Date.now();
            if (now - lastKey > 45) {
              lastKey = now;
              sfx.key();
            }
          }
        }),
        EditorView.contentAttributes.of({ spellcheck: 'false', autocorrect: 'off', autocapitalize: 'off', 'aria-label': 'Editor de consultas SQL' }),
        EditorView.lineWrapping,
      ],
    });
    view.current = new EditorView({ state, parent: host.current });
    return () => {
      view.current?.destroy();
      view.current = null;
    };
    // El esquema del caso no cambia durante la investigación.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div className="editor-wrap" ref={host} />;
});
