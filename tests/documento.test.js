const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const { construirHtml, comprobarCatalogo } = require("../scripts/documento/generarDocumento");
const catalogo = require("../scripts/documento/endpoints");

// docs/KollectA-documento-tecnico.pdf: el catálogo de endpoints debe seguir al código.
describe("Documento técnico", () => {
    it("el catálogo de endpoints coincide con routes/*.js", () => {
        const total = comprobarCatalogo(catalogo);
        assert.ok(total > 50);
    });

    it("arma el HTML con las 19 colecciones, el diagrama y el manual", () => {
        const html = construirHtml();
        assert.match(html, /<svg[^>]+class="er"/);
        assert.match(html, /<b>19<\/b><span>colecciones/);
        assert.match(html, /src="manual\/img\/01-login\.jpg"/);
        assert.doesNotMatch(html, /## Contenido/);
    });
});
