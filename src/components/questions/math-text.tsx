'use client'

import type { ReactNode } from 'react'

/**
 * MathText — lightweight math notation for Persian question texts.
 *
 * Supported syntax (works inside any question title/description/choice):
 *   x^2        → x² (single-character power)
 *   x^{n+1}    → xⁿ⁺¹ (braced power)
 *   H_2O       → H₂O (single-character subscript)
 *   H_{2}O     → H₂O (braced subscript)
 *   sqrt{x}    → √x
 *   sqrt{x^2}  → √x² (nested)
 *
 * No LaTeX dependency, no eval, fully RTL-safe — just sup/sub nodes.
 */

type Node =
  | { kind: 'text'; value: string }
  | { kind: 'sup'; children: Node[] }
  | { kind: 'sub'; children: Node[] }
  | { kind: 'sqrt'; children: Node[] }

function parseSegment(src: string, i: number, stopAtBrace: boolean): { nodes: Node[]; i: number } {
  const nodes: Node[] = []
  let buf = ''
  const flush = () => {
    if (buf) {
      nodes.push({ kind: 'text', value: buf })
      buf = ''
    }
  }
  while (i < src.length) {
    const ch = src[i]
    if (stopAtBrace && ch === '}') {
      i++ // consume the closing brace
      break
    }
    if (ch === '\\') {
      // escape: next char is literal
      buf += src[i + 1] ?? ''
      i += 2
      continue
    }
    if (ch === '^' || ch === '_') {
      flush()
      const kind: 'sup' | 'sub' = ch === '^' ? 'sup' : 'sub'
      i++
      let inner: Node[] = []
      if (src[i] === '{') {
        const parsed = parseSegment(src, i + 1, true)
        inner = parsed.nodes
        i = parsed.i
      } else if (i < src.length) {
        inner = [{ kind: 'text', value: src[i] }]
        i++
      }
      nodes.push({ kind, children: inner })
      continue
    }
    if (src.startsWith('sqrt{', i)) {
      flush()
      const parsed = parseSegment(src, i + 5, true)
      nodes.push({ kind: 'sqrt', children: parsed.nodes })
      i = parsed.i
      continue
    }
    buf += ch
    i++
  }
  flush()
  return { nodes, i }
}

function renderNodes(nodes: Node[], keyPrefix: string): ReactNode[] {
  return nodes.map((n, idx) => {
    const key = `${keyPrefix}-${idx}`
    switch (n.kind) {
      case 'text':
        return <span key={key}>{n.value}</span>
      case 'sup':
        return <sup key={key} className="text-[0.72em]">{renderNodes(n.children, key)}</sup>
      case 'sub':
        return <sub key={key} className="text-[0.72em]">{renderNodes(n.children, key)}</sub>
      case 'sqrt':
        return (
          <span key={key} className="inline-flex items-baseline whitespace-nowrap" dir="ltr">
            <span aria-hidden>√</span>
            <span className="border-t border-current px-0.5">{renderNodes(n.children, key)}</span>
          </span>
        )
    }
  })
}

export function MathText({ text, className }: { text: string | null | undefined; className?: string }) {
  if (!text) return null
  const { nodes } = parseSegment(text, 0, false)
  return <span className={className}>{renderNodes(nodes, 'mt')}</span>
}
