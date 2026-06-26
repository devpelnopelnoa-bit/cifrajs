/* ============================================================
   Cifra.js — lógica do ofuscador (100% client-side)
   engine global: window.JavaScriptObfuscator
   ============================================================ */
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const input      = $("input");
  const output     = $("output");
  const runBtn      = $("run");
  const copyBtn     = $("copyBtn");
  const downloadBtn = $("downloadBtn");
  const clearBtn    = $("clearBtn");
  const fileInput   = $("fileInput");
  const sampleBtn   = $("sampleBtn");
  const inMeta      = $("inMeta");
  const outMeta     = $("outMeta");
  const ratio       = $("ratio");
  const statusEl    = $("status");
  const presetHint  = $("presetHint");
  const strEncoding = $("strEncoding");
  const presetBtns  = Array.from(document.querySelectorAll(".preset"));
  const optInputs   = Array.from(document.querySelectorAll("[data-opt]"));

  let currentFileName = "codigo.js";

  /* ---- repo link: descobre o usuário se estiver no github.io ---- */
  (function wireRepoLink() {
    const link = $("repoLink");
    if (!link) return;
    const host = location.hostname;
    if (host.endsWith("github.io")) {
      const user = host.split(".")[0];
      const repo = location.pathname.split("/").filter(Boolean)[0] || "";
      link.href = repo ? `https://github.com/${user}/${repo}` : `https://github.com/${user}`;
      link.hidden = false;
    }
  })();

  /* ---- presets ---- */
  const PRESETS = {
    leve: {
      hint: "Renomeia e compacta. Rápido, arquivo pequeno, proteção básica.",
      opts: { compact: true, simplify: true, stringArray: false, controlFlowFlattening: false,
              deadCodeInjection: false, numbersToExpressions: false, transformObjectKeys: false,
              renameGlobals: false, selfDefending: false, disableConsoleOutput: false },
      enc: "none",
    },
    medio: {
      hint: "Equilíbrio entre proteção e tamanho do arquivo.",
      opts: { compact: true, simplify: true, stringArray: true, controlFlowFlattening: false,
              deadCodeInjection: false, numbersToExpressions: false, transformObjectKeys: true,
              renameGlobals: false, selfDefending: false, disableConsoleOutput: false },
      enc: "base64",
    },
    pesado: {
      hint: "Máxima proteção. Gera arquivo maior e roda um pouco mais devagar.",
      opts: { compact: true, simplify: true, stringArray: true, controlFlowFlattening: true,
              deadCodeInjection: true, numbersToExpressions: true, transformObjectKeys: true,
              renameGlobals: true, selfDefending: true, disableConsoleOutput: false },
      enc: "rc4",
    },
  };

  function applyPreset(name) {
    const p = PRESETS[name];
    if (!p) return;
    optInputs.forEach((el) => { el.checked = !!p.opts[el.dataset.opt]; });
    strEncoding.value = p.enc;
    presetHint.textContent = p.hint;
    presetBtns.forEach((b) => {
      const active = b.dataset.preset === name;
      b.classList.toggle("is-active", active);
      b.setAttribute("aria-checked", String(active));
    });
  }

  presetBtns.forEach((b) => b.addEventListener("click", () => applyPreset(b.dataset.preset)));
  // mexer numa opção manualmente desmarca o preset visualmente
  optInputs.forEach((el) => el.addEventListener("change", clearPresetSelection));
  strEncoding.addEventListener("change", clearPresetSelection);
  function clearPresetSelection() {
    presetBtns.forEach((b) => { b.classList.remove("is-active"); b.setAttribute("aria-checked", "false"); });
    presetHint.textContent = "Configuração personalizada.";
  }

  /* ---- monta as opções da engine a partir da UI ---- */
  function buildOptions() {
    const get = (k) => {
      const el = optInputs.find((e) => e.dataset.opt === k);
      return el ? el.checked : false;
    };
    const enc = strEncoding.value;
    const stringArray = get("stringArray");

    return {
      compact: get("compact"),
      simplify: get("simplify"),
      stringArray,
      stringArrayThreshold: stringArray ? 0.75 : 0,
      stringArrayEncoding: stringArray && enc !== "none" ? [enc] : [],
      stringArrayRotate: stringArray,
      stringArrayShuffle: stringArray,
      controlFlowFlattening: get("controlFlowFlattening"),
      controlFlowFlatteningThreshold: get("controlFlowFlattening") ? 0.75 : 0,
      deadCodeInjection: get("deadCodeInjection"),
      deadCodeInjectionThreshold: get("deadCodeInjection") ? 0.4 : 0,
      numbersToExpressions: get("numbersToExpressions"),
      transformObjectKeys: get("transformObjectKeys"),
      renameGlobals: get("renameGlobals"),
      selfDefending: get("selfDefending"),
      disableConsoleOutput: get("disableConsoleOutput"),
      identifierNamesGenerator: "hexadecimal",
      target: "browser",
    };
  }

  /* ---- ofuscar ---- */
  function setBusy(on) {
    runBtn.classList.toggle("is-busy", on);
    runBtn.disabled = on;
    runBtn.querySelector(".cifrar-label").textContent = on ? "Cifrando…" : "Cifrar";
  }

  function setStatus(msg, kind) {
    statusEl.textContent = msg || "";
    statusEl.className = "status" + (kind ? " " + kind : "");
  }

  async function obfuscate() {
    const code = input.value.trim();
    if (!code) { setStatus("Cole algum código antes de cifrar.", "err"); input.focus(); return; }
    if (typeof window.JavaScriptObfuscator === "undefined") {
      setStatus("A engine não carregou. Verifique sua conexão e recarregue.", "err");
      return;
    }

    setBusy(true);
    setStatus("Processando…");
    output.value = "";
    // dá um respiro pro navegador pintar o estado "cifrando"
    await new Promise((r) => setTimeout(r, 30));

    try {
      const result = window.JavaScriptObfuscator.obfuscate(code, buildOptions());
      const obf = result.getObfuscatedCode();
      output.value = obf;

      updateMeta(outMeta, obf);
      showRatio(code.length, obf.length);
      copyBtn.disabled = false;
      downloadBtn.disabled = false;
      setStatus("Pronto. Código cifrado com sucesso.", "ok");
    } catch (err) {
      const msg = (err && err.message ? err.message : String(err));
      setStatus("Não consegui ofuscar: o código tem um erro de sintaxe. (" + shorten(msg) + ")", "err");
      copyBtn.disabled = true;
      downloadBtn.disabled = true;
      ratio.textContent = "";
    } finally {
      setBusy(false);
    }
  }

  function shorten(s) { return s.length > 80 ? s.slice(0, 80) + "…" : s; }

  /* ---- metadados ---- */
  function updateMeta(el, text) {
    const chars = text.length;
    const kb = (new Blob([text]).size / 1024).toFixed(1);
    el.textContent = `${chars.toLocaleString("pt-BR")} caracteres · ${kb} KB`;
  }
  function showRatio(before, after) {
    if (!before) { ratio.textContent = ""; return; }
    const pct = Math.round((after / before) * 100);
    ratio.textContent = `${pct}% do tamanho original`;
  }

  /* ---- ações auxiliares ---- */
  input.addEventListener("input", () => updateMeta(inMeta, input.value));

  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(output.value);
      copyBtn.textContent = "Copiado!";
      setTimeout(() => (copyBtn.textContent = "Copiar"), 1400);
    } catch {
      output.select(); document.execCommand("copy");
      copyBtn.textContent = "Copiado!";
      setTimeout(() => (copyBtn.textContent = "Copiar"), 1400);
    }
  });

  downloadBtn.addEventListener("click", () => {
    const blob = new Blob([output.value], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const base = currentFileName.replace(/\.(js|mjs|cjs)$/i, "");
    a.href = url; a.download = `${base}.cifrado.js`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  });

  clearBtn.addEventListener("click", () => {
    input.value = ""; output.value = "";
    updateMeta(inMeta, ""); outMeta.textContent = "0 caracteres";
    ratio.textContent = ""; setStatus("");
    copyBtn.disabled = true; downloadBtn.disabled = true;
    currentFileName = "codigo.js"; input.focus();
  });

  fileInput.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    currentFileName = file.name;
    const reader = new FileReader();
    reader.onload = () => {
      input.value = reader.result;
      updateMeta(inMeta, input.value);
      setStatus(`Arquivo "${file.name}" carregado.`, "ok");
    };
    reader.readAsText(file);
    fileInput.value = "";
  });

  const SAMPLE = `// exemplo: pequeno carrinho de compras
const carrinho = [];

function adicionar(produto, preco) {
  carrinho.push({ produto, preco });
  console.log(\`Adicionado: \${produto} (R$ \${preco})\`);
}

function total() {
  return carrinho.reduce((soma, item) => soma + item.preco, 0);
}

adicionar("Teclado", 199.9);
adicionar("Mouse", 89.5);
console.log("Total: R$ " + total().toFixed(2));`;

  sampleBtn.addEventListener("click", () => {
    input.value = SAMPLE;
    currentFileName = "exemplo.js";
    updateMeta(inMeta, input.value);
    setStatus("Exemplo carregado. É só cifrar.", "ok");
    document.getElementById("oficina").scrollIntoView({ behavior: "smooth" });
  });

  runBtn.addEventListener("click", obfuscate);
  // Ctrl/Cmd + Enter para cifrar
  input.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); obfuscate(); }
  });

  /* ============================================================
     hero: demo de transformação (assinatura visual)
     ============================================================ */
  (function cipherDemo() {
    const cleanEl = $("demoClean");
    const obfEl = $("demoObf");
    if (!cleanEl || !obfEl) return;

    const clean =
`function saudar(nome) {
  const msg = "olá, " + nome;
  return msg.toUpperCase();
}`;

    const obf =
`var _0x3f1a=['\\x6f\\x6c','\\x55\\x70'];
(function(_0x2b,_0x4d){var _0x1c=
_0x5e;while(!![]){try{var _0xa9=
parseInt(_0x1c(0x1f))*0x2;}}}())`;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { cleanEl.textContent = clean; obfEl.textContent = obf; return; }

    const glyphs = "ABCDEF0123456789x\\_{}[]()$;=+/*<>!";
    const rnd = () => glyphs[(Math.random() * glyphs.length) | 0];

    function scrambleTo(el, target, done) {
      let frame = 0;
      const total = 26;
      const tick = () => {
        let out = "";
        for (let i = 0; i < target.length; i++) {
          const ch = target[i];
          if (ch === "\n") { out += "\n"; continue; }
          const settle = (i / target.length) * total;
          out += frame > settle ? ch : (Math.random() < 0.5 ? rnd() : ch);
        }
        el.textContent = out;
        frame++;
        if (frame <= total) {
          setTimeout(tick, 38);
        } else { el.textContent = target; done && done(); }
      };
      tick();
    }

    function loop() {
      cleanEl.textContent = clean;
      scrambleTo(obfEl, obf, () => {
        setTimeout(loop, 3200);
      });
    }
    // primeira pintura estática + começa o ciclo
    cleanEl.textContent = clean;
    obfEl.textContent = obf;
    setTimeout(loop, 900);
  })();

  // estado inicial
  applyPreset("medio");
  updateMeta(inMeta, "");
})();
