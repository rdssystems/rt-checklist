/**
 * Normalização de texto para evitar cadastros em CAIXA ALTA.
 * Nomes ficam em "Primeira Maiúscula" e frases com a primeira letra maiúscula.
 */

// Conectivos que ficam minúsculos no meio de nomes (padrão pt-BR)
const MINOR_WORDS = new Set([
  "de", "da", "do", "das", "dos", "e", "em", "a", "o", "as", "os",
  "no", "na", "nos", "nas", "para", "com", "por",
]);

/**
 * "RAZÃO SOCIAL LTDA" -> "Razão Social Ltda"
 * Para nomes próprios, empresas, endereços, títulos.
 */
export const toTitleCase = (text: string | null | undefined): string => {
  if (!text) return "";
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";

  return trimmed
    .split(" ")
    .map((word, index) => {
      const lower = word.toLocaleLowerCase("pt-BR");
      if (index > 0 && MINOR_WORDS.has(lower)) return lower;
      return lower.charAt(0).toLocaleUpperCase("pt-BR") + lower.slice(1);
    })
    .join(" ");
};

/**
 * Primeira letra maiúscula. Se o texto estiver todo em CAIXA ALTA,
 * converte o restante para minúsculas; caso contrário preserva o que foi digitado.
 * Para perguntas, observações e textos livres.
 */
export const toSentenceCase = (text: string | null | undefined): string => {
  if (!text) return "";
  const trimmed = text.trim();
  if (!trimmed) return "";

  const letters = trimmed.replace(/[^a-zA-ZÀ-ÖØ-öø-ÿ]/g, "");
  const isAllCaps = letters.length >= 3 && letters === letters.toLocaleUpperCase("pt-BR");

  const base = isAllCaps ? trimmed.toLocaleLowerCase("pt-BR") : trimmed;
  return base.charAt(0).toLocaleUpperCase("pt-BR") + base.slice(1);
};
