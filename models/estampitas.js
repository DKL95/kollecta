/* ==========================================================================
   Catálogo de estampitas coleccionables (arte original, sin fotos ni logos).
   Aquí solo van id, serie y rareza: el nombre, la descripción y el dibujo
   están en frontend/src/utils/estampitas.js y components/EstampitaArte.jsx
   (las claves deben coincidir, lo revisa tests/frontend.test.mjs).
   ========================================================================== */

const SERIES = ["lightsticks", "albumes", "escenario", "fandom", "snacks", "seul"];

// Probabilidad de cada rareza al abrir un sobre.
const RAREZAS = {
    comun: 60,
    rara: 28,
    epica: 10,
    legendaria: 2
};

const ORDEN_RAREZAS = Object.keys(RAREZAS);

// Cada serie tiene 2 comunes, 2 raras, 1 épica y 1 legendaria.
const serie = (id, ids) => {
    const rarezas = ["comun", "comun", "rara", "rara", "epica", "legendaria"];
    return ids.map((estampita, i) => ({ id: estampita, serie: id, rareza: rarezas[i] }));
};

const ESTAMPITAS = [
    ...serie("lightsticks", ["ls_estrella", "ls_corazon", "ls_luna", "ls_diamante", "ls_corona", "ls_arcoiris"]),
    ...serie("albumes", ["al_debut", "al_verano", "al_invierno", "al_retro", "al_holo", "al_firmado"]),
    ...serie("escenario", ["es_micro", "es_inear", "es_reflector", "es_confeti", "es_setlist", "es_trofeo"]),
    ...serie("fandom", ["fa_photocard", "fa_boleto", "fa_pancarta", "fa_binder", "fa_megafono", "fa_firma"]),
    ...serie("snacks", ["sn_tteokbokki", "sn_ramyeon", "sn_bungeoppang", "sn_kimbap", "sn_bingsu", "sn_pollo"]),
    ...serie("seul", ["se_torre", "se_hanok", "se_rio", "se_metro", "se_palacio", "se_cerezos"])
];

const IDS_ESTAMPITAS = ESTAMPITAS.map((e) => e.id);

module.exports = { SERIES, RAREZAS, ORDEN_RAREZAS, ESTAMPITAS, IDS_ESTAMPITAS };
