import { useEffect, useRef, useState } from "react";
import { Bold, Italic, Quote, Heading2, Link2, List, Undo2, Eraser } from "lucide-react";
import { limparHtml, temMarcacao, textoParaHtml } from "@/lib/texto";

/**
 * Editor de texto da matéria.
 *
 * A redação escreve como escreveria no Word: Enter cria parágrafo, os botões
 * põem negrito, itálico, citação e intertítulo. Nenhum código aparece na tela.
 * O que sai daqui é HTML simples, peneirado antes de virar conteúdo.
 */
export function EditorTexto({
  valor,
  onChange,
  minAltura = 380,
}: {
  valor: string;
  onChange: (html: string) => void;
  minAltura?: number;
}) {
  const caixa = useRef<HTMLDivElement>(null);
  const [focado, setFocado] = useState(false);

  // Só escreve no editor quando o texto vem de fora (abrir a matéria).
  // Sem isso, o cursor pularia para o começo a cada letra digitada.
  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const desejado = temMarcacao(valor) ? valor : textoParaHtml(valor);
    if (el.innerHTML !== desejado && document.activeElement !== el) {
      el.innerHTML = desejado;
    }
  }, [valor]);

  function avisar() {
    const el = caixa.current;
    if (!el) return;
    onChange(limparHtml(el.innerHTML));
  }

  function comando(nome: string, argumento?: string) {
    caixa.current?.focus();
    document.execCommand(nome, false, argumento);
    avisar();
  }

  /** Envolve o parágrafo do cursor numa citação, ou desfaz se já for uma. */
  function citacao() {
    const el = caixa.current;
    if (!el) return;
    el.focus();

    const alvo = blocoDoCursor();
    if (alvo?.tagName === "BLOCKQUOTE") {
      alvo.replaceWith(...Array.from(alvo.childNodes));
    } else {
      document.execCommand("formatBlock", false, "blockquote");
    }
    avisar();
  }

  function inserirLink() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) {
      alert("Selecione primeiro o trecho do texto que vai virar link.");
      return;
    }
    const url = prompt("Endereço do link (comece com https://)");
    if (!url) return;
    comando("createLink", url);
  }

  /** Qual bloco de primeiro nível contém o cursor. */
  function blocoDoCursor(): Element | null {
    const el = caixa.current;
    const no = window.getSelection()?.anchorNode;
    let alvo = (no?.nodeType === 1 ? (no as Element) : no?.parentElement) ?? null;
    while (alvo && alvo.parentElement !== el) alvo = alvo.parentElement;
    return alvo;
  }

  // Dentro de uma citação, Enter continuaria escrevendo dentro dela para
  // sempre. Aqui um Enter numa linha vazia da citação sai dela e começa um
  // parágrafo normal — igual ao que o Word faz com listas.
  function aoTeclar(e: React.KeyboardEvent) {
    if (e.key !== "Enter" || e.shiftKey) return;

    const bloco = blocoDoCursor();
    if (bloco?.tagName !== "BLOCKQUOTE") return;

    const sel = window.getSelection();
    if (!sel || !sel.isCollapsed) return;

    // Só sai quando a última linha da citação já está vazia
    const texto = bloco.textContent ?? "";
    if (!/\n\s*$|^\s*$/.test(texto) && !texto.endsWith("\n")) {
      const ultimaLinha = texto.split("\n").pop() ?? "";
      if (ultimaLinha.trim() !== "") return;
    }

    e.preventDefault();
    const p = document.createElement("p");
    p.appendChild(document.createElement("br"));
    bloco.after(p);

    // A linha vazia que sobrou dentro da citação não deve virar um espaço
    // solto na matéria publicada.
    if (!(bloco.textContent ?? "").trim()) {
      bloco.remove();
    } else {
      const ultimo = bloco.lastChild;
      if (ultimo?.nodeName === "BR") ultimo.remove();
    }

    const r = document.createRange();
    r.setStart(p, 0);
    r.collapse(true);
    sel.removeAllRanges();
    sel.addRange(r);
    avisar();
  }

  // Colar traz lixo do Word e de outros sites: entra só o texto,
  // já quebrado em parágrafos.
  function aoColar(e: React.ClipboardEvent) {
    e.preventDefault();
    const texto = e.clipboardData.getData("text/plain");
    document.execCommand("insertHTML", false, textoParaHtml(texto) || texto);
    avisar();
  }

  const vazio = !valor || valor === "<p></p>";

  return (
    <div className="flex flex-col gap-0">
      <div
        className={`flex flex-wrap items-center gap-1 rounded-t-lg border border-b-0 px-2 py-1.5 ${
          focado ? "border-gray-400 bg-gray-50" : "border-[color:var(--border)] bg-gray-50"
        }`}
      >
        <Botao titulo="Negrito (Ctrl+B)" onClick={() => comando("bold")}>
          <Bold size={15} />
        </Botao>
        <Botao titulo="Itálico (Ctrl+I)" onClick={() => comando("italic")}>
          <Italic size={15} />
        </Botao>

        <Divisor />

        <Botao titulo="Intertítulo" onClick={() => comando("formatBlock", "h2")}>
          <Heading2 size={15} />
        </Botao>
        <Botao titulo="Frase em destaque" onClick={citacao}>
          <Quote size={15} />
        </Botao>
        <Botao titulo="Lista" onClick={() => comando("insertUnorderedList")}>
          <List size={15} />
        </Botao>

        <Divisor />

        <Botao titulo="Link" onClick={inserirLink}>
          <Link2 size={15} />
        </Botao>
        <Botao titulo="Tirar formatação do trecho" onClick={() => comando("removeFormat")}>
          <Eraser size={15} />
        </Botao>
        <Botao titulo="Desfazer (Ctrl+Z)" onClick={() => comando("undo")}>
          <Undo2 size={15} />
        </Botao>

        <span className="ml-auto text-[11px] text-gray-400 pr-1 hidden sm:block">
          Enter cria parágrafo
        </span>
      </div>

      <div className="relative">
        <div
          ref={caixa}
          contentEditable
          suppressContentEditableWarning
          onInput={avisar}
          onBlur={() => { setFocado(false); avisar(); }}
          onFocus={() => setFocado(true)}
          onPaste={aoColar}
          onKeyDown={aoTeclar}
          role="textbox"
          aria-multiline="true"
          aria-label="Conteúdo da matéria"
          className={`editor-corpo prose max-w-none rounded-b-lg border bg-white px-4 py-3 outline-none overflow-y-auto ${
            focado ? "border-gray-400" : "border-[color:var(--border)]"
          }`}
          style={{ minHeight: minAltura, maxHeight: 620 }}
        />

        {vazio && (
          <p className="pointer-events-none absolute left-4 top-3 text-gray-400">
            Escreva a matéria aqui. Selecione um trecho e use os botões acima para
            destacar.
          </p>
        )}
      </div>
    </div>
  );
}

function Botao({
  titulo,
  onClick,
  children,
}: {
  titulo: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={titulo}
      aria-label={titulo}
      // onMouseDown em vez de onClick: o clique não pode tirar o foco do
      // texto, senão a seleção some antes do comando rodar.
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className="w-8 h-8 flex items-center justify-center rounded text-gray-600 hover:bg-white hover:text-brand-primary hover:shadow-sm transition"
    >
      {children}
    </button>
  );
}

function Divisor() {
  return <span className="w-px h-5 bg-gray-300 mx-1" />;
}
