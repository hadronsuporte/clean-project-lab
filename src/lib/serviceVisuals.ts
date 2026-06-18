import barbeariaCorte from "@/assets/services/barbearia-corte.png";
import barbeariaBarba from "@/assets/services/barbearia-barba.png";
import barbeariaCorteBarba from "@/assets/services/barbearia-corte-barba.png";
import barbeariaInfantil from "@/assets/services/barbearia-infantil.png";
import barbeariaPigmentacao from "@/assets/services/barbearia-pigmentacao.png";
import cabelosCorteFem from "@/assets/services/cabelos-corte-feminino.png";
import cabelosEscova from "@/assets/services/cabelos-escova.png";
import cabelosColoracao from "@/assets/services/cabelos-coloracao.png";
import cabelosHidratacao from "@/assets/services/cabelos-hidratacao.png";
import cabelosPenteados from "@/assets/services/cabelos-penteados.png";
import unhasManicure from "@/assets/services/unhas-manicure.png";
import unhasPedicure from "@/assets/services/unhas-pedicure.png";
import unhasAlongamento from "@/assets/services/unhas-alongamento.png";
import unhasGel from "@/assets/services/unhas-gel.png";
import unhasNailArt from "@/assets/services/unhas-nail-art.png";
import esteticaLimpeza from "@/assets/services/estetica-limpeza-pele.png";
import esteticaFacial from "@/assets/services/estetica-facial.png";
import esteticaCorporal from "@/assets/services/estetica-corporal.png";
import esteticaDrenagem from "@/assets/services/estetica-drenagem.png";
import esteticaHarmonizacao from "@/assets/services/estetica-harmonizacao.png";

import catBarbearias from "@/assets/categories/barbearias.png";
import catCabelos from "@/assets/categories/cabelos.png";
import catUnhas from "@/assets/categories/unhas.png";
import catEstetica from "@/assets/categories/estetica.png";
import catMassagem from "@/assets/categories/massagem.png";
import catSobrancelhas from "@/assets/categories/sobrancelhas.png";
import catMaquiagem from "@/assets/categories/maquiagem.png";
import catDepilacao from "@/assets/categories/depilacao.png";
import catPodologia from "@/assets/categories/podologia.png";
import catVerMais from "@/assets/categories/ver-mais.png";

export type ServiceVisual = { image: string; matched: boolean };

const CATEGORY_FALLBACK: Record<string, string> = {
  barbearias: catBarbearias,
  cabelos: catCabelos,
  unhas: catUnhas,
  estetica: catEstetica,
  massoterapia: catMassagem,
  sobrancelhas: catSobrancelhas,
  maquiagem: catMaquiagem,
  depilacao: catDepilacao,
  podologia: catPodologia,
  todos: catVerMais,
};

// Each rule: list of required keyword groups (all groups must match). Inside a group, any token matches.
type Rule = { image: string; all: string[][] };

const RULES: Rule[] = [
  // Barbearia
  { image: barbeariaCorteBarba, all: [["corte"], ["barba"]] },
  { image: barbeariaInfantil, all: [["infantil", "kids", "crianca"]] },
  { image: barbeariaPigmentacao, all: [["pigmenta"]] },
  { image: barbeariaBarba, all: [["barba"]] },
  { image: barbeariaCorte, all: [["pezinho"]] },
  { image: barbeariaCorte, all: [["corte", "masculino"]] },
  { image: barbeariaCorte, all: [["corte"]] },
  // Cabelos
  { image: cabelosEscova, all: [["escova"]] },
  { image: cabelosColoracao, all: [["colora", "tintura", "color"]] },
  { image: cabelosHidratacao, all: [["hidrata"]] },
  { image: cabelosPenteados, all: [["penteado"]] },
  { image: cabelosPenteados, all: [["progressiva", "prancha"]] },
  { image: cabelosColoracao, all: [["luzes", "mechas"]] },
  { image: cabelosCorteFem, all: [["corte", "feminino"]] },
  { image: cabelosCorteFem, all: [["cabelo"]] },
  // Unhas
  { image: unhasManicure, all: [["manicure"]] },
  { image: unhasPedicure, all: [["pedicure"]] },
  { image: unhasAlongamento, all: [["alongamento"]] },
  { image: unhasGel, all: [["gel"]] },
  { image: unhasNailArt, all: [["nail", "art"]] },
  { image: unhasNailArt, all: [["decora"]] },
  { image: unhasManicure, all: [["unha"]] },
  // Estetica
  { image: esteticaLimpeza, all: [["limpeza"]] },
  { image: esteticaHarmonizacao, all: [["harmoniza"]] },
  { image: esteticaHarmonizacao, all: [["botox", "preenchimento"]] },
  { image: esteticaDrenagem, all: [["drenagem"]] },
  { image: esteticaCorporal, all: [["corporal"]] },
  { image: esteticaFacial, all: [["facial"]] },
];

export function normalizeName(input: string): string {
  return (input || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[+&/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getServiceVisual(name: string, categoryId?: string): ServiceVisual {
  const n = normalizeName(name);
  if (n) {
    for (const rule of RULES) {
      const ok = rule.all.every((group) => group.some((token) => n.includes(token)));
      if (ok) return { image: rule.image, matched: true };
    }
  }
  const fallback = (categoryId && CATEGORY_FALLBACK[categoryId]) || catVerMais;
  return { image: fallback, matched: false };
}