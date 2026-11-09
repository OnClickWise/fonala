export const digitos = (v: string) => (v ?? "").replace(/\D/g, "");

export function mascaraCpf(v: string) {
  return digitos(v)
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function mascaraTelefone(v: string) {
  const d = digitos(v).slice(0, 11);
  if (d.length <= 2) return d.replace(/(\d{1,2})/, "($1");
  if (d.length <= 6) return d.replace(/(\d{2})(\d+)/, "($1) $2");
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d+)/, "($1) $2-$3");
  return d.replace(/(\d{2})(\d{5})(\d+)/, "($1) $2-$3");
}

export function mascaraData(v: string) {
  return digitos(v)
    .slice(0, 8)
    .replace(/(\d{2})(\d)/, "$1/$2")
    .replace(/(\d{2})(\d)/, "$1/$2");
}

/** DD/MM/AAAA -> AAAA-MM-DD (ou null se inválida) */
export function dataParaIso(br: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(br);
  if (!m) return null;
  const [, dd, mm, aaaa] = m;
  const d = new Date(Number(aaaa), Number(mm) - 1, Number(dd));
  const valida =
    d.getFullYear() === Number(aaaa) &&
    d.getMonth() === Number(mm) - 1 &&
    d.getDate() === Number(dd);
  return valida ? `${aaaa}-${mm}-${dd}` : null;
}

/** AAAA-MM-DD -> DD/MM/AAAA */
export function isoParaData(iso: string) {
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

function idadeEmMeses(iso: string) {
  const [a, m, d] = iso.split("-").map(Number);
  const hoje = new Date();
  let meses = (hoje.getFullYear() - a) * 12 + (hoje.getMonth() - (m - 1));
  if (hoje.getDate() < d) meses--;
  return meses;
}

export const idadeEmAnos = (iso: string) => Math.floor(idadeEmMeses(iso) / 12);

export function calcularIdade(iso: string | null): string {
  if (!iso) return "";
  const meses = idadeEmMeses(iso);
  if (meses < 0) return "";
  if (meses < 12) return meses === 1 ? "1 mês" : `${meses} meses`;
  const anos = Math.floor(meses / 12);
  return anos === 1 ? "1 ano" : `${anos} anos`;
}

export function cpfValido(valor: string) {
  const cpf = digitos(valor);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const dv = (base: string, peso: number) => {
    const soma = [...base].reduce((s, n, i) => s + Number(n) * (peso - i), 0);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return (
    dv(cpf.slice(0, 9), 10) === Number(cpf[9]) &&
    dv(cpf.slice(0, 10), 11) === Number(cpf[10])
  );
}
