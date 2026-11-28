import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import * as THREE from "three";
import { distribuirPiezas, hexCss, luzGaleria, marcoGaleria, temaGaleria } from "../../utils/galeria";

/**
 * Sala 3D con la colección en las paredes y la pieza destacada en un pedestal.
 * - Arrastrar: mirar alrededor. WASD / flechas / rueda: caminar.
 * - Tocar un cuadro: la cámara va hacia él y se avisa con onSeleccion(indice).
 * - ref.irA(indice) recorre la sala desde los botones de la página (-1 = pedestal, null = entrada).
 * - ref.mover(direccion) para los botones del celular (1 adelante, -1 atrás).
 * Si el navegador no tiene WebGL se llama onError y la página muestra la lista.
 */
const ALTURA_OJOS = 1.6;
const ALTURA_CUADRO = 1.75;
const DISTANCIA_CUADRO = 2.6;

const GaleriaEscena = forwardRef(function GaleriaEscena({ piezas, destacada, config, onSeleccion, onError }, ref) {
  const contenedor = useRef(null);
  const api = useRef({});
  const alSeleccionar = useRef(onSeleccion);
  alSeleccionar.current = onSeleccion;

  useImperativeHandle(ref, () => ({
    irA: (i) => api.current.irA?.(i),
    mover: (d) => api.current.mover?.(d),
  }));

  useEffect(() => {
    const raiz = contenedor.current;
    if (!raiz) return undefined;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    } catch {
      onError?.();
      return undefined;
    }

    const reducir = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const tema = temaGaleria(config.tema);
    const marco = marcoGaleria(config.marco);
    const luz = luzGaleria(config.luz);
    const { lado, lugares } = distribuirPiezas(piezas.length);
    const mitad = lado / 2;
    const alto = 4.2;
    const desechables = [];
    const guardar = (x) => (desechables.push(x), x);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    raiz.appendChild(renderer.domElement);
    renderer.domElement.setAttribute("aria-hidden", "true");

    const escena = new THREE.Scene();
    escena.background = new THREE.Color(tema.niebla);
    escena.fog = new THREE.Fog(tema.niebla, lado * 0.9, lado * 2.2);

    const camara = new THREE.PerspectiveCamera(65, 1, 0.1, 200);
    const inicio = { pos: new THREE.Vector3(0, ALTURA_OJOS, mitad - 2), yaw: 0, pitch: -0.04 };
    camara.position.copy(inicio.pos);
    let yaw = inicio.yaw;
    let pitch = inicio.pitch;

    /* ------------------------------- Sala ------------------------------- */
    const matPared = guardar(new THREE.MeshStandardMaterial({ color: tema.pared, roughness: 0.92 }));
    const matPiso = guardar(new THREE.MeshStandardMaterial({ color: tema.piso, roughness: 1 - tema.pisoBrillo, metalness: 0.05 }));
    const matTecho = guardar(new THREE.MeshStandardMaterial({ color: tema.techo, roughness: 1 }));

    const piso = new THREE.Mesh(guardar(new THREE.PlaneGeometry(lado, lado)), matPiso);
    piso.rotation.x = -Math.PI / 2;
    escena.add(piso);

    const techo = new THREE.Mesh(guardar(new THREE.PlaneGeometry(lado, lado)), matTecho);
    techo.rotation.x = Math.PI / 2;
    techo.position.y = alto;
    escena.add(techo);

    const geoPared = guardar(new THREE.PlaneGeometry(lado, alto));
    [
      [0, -mitad, 0],
      [mitad, 0, -Math.PI / 2],
      [0, mitad, Math.PI],
      [-mitad, 0, Math.PI / 2],
    ].forEach(([x, z, angulo]) => {
      const pared = new THREE.Mesh(geoPared, matPared);
      pared.position.set(x, alto / 2, z);
      pared.rotation.y = angulo;
      escena.add(pared);

      // Zoclo / tiras de luz en la base y arriba de cada pared
      const matTira = guardar(
        tema.tiras
          ? new THREE.MeshBasicMaterial({ color: tema.acento })
          : new THREE.MeshStandardMaterial({ color: tema.acento, roughness: 0.6 })
      );
      [0.06, tema.tiras ? alto - 0.08 : null].forEach((y) => {
        if (y === null) return;
        const tira = new THREE.Mesh(guardar(new THREE.BoxGeometry(lado, tema.tiras ? 0.05 : 0.12, 0.04)), matTira);
        tira.position.set(x, y, z);
        tira.rotation.y = angulo;
        tira.translateZ(0.02);
        escena.add(tira);
      });
    });

    // Cielo de estrellas en el techo
    if (tema.cielo) {
      const puntos = new Float32Array(600 * 3);
      for (let i = 0; i < 600; i++) {
        puntos[i * 3] = (Math.random() - 0.5) * lado;
        puntos[i * 3 + 1] = alto - 0.02;
        puntos[i * 3 + 2] = (Math.random() - 0.5) * lado;
      }
      const geo = guardar(new THREE.BufferGeometry());
      geo.setAttribute("position", new THREE.BufferAttribute(puntos, 3));
      escena.add(new THREE.Points(geo, guardar(new THREE.PointsMaterial({ color: 0xfff6d8, size: 0.05 }))));
    }

    /* ------------------------------- Luces ------------------------------ */
    escena.add(new THREE.AmbientLight(luz.color, luz.ambiente));
    escena.add(new THREE.HemisphereLight(luz.color, tema.piso, 0.35));
    const focos = [];
    const coloresFoco = luz.colores || [luz.color];
    const totalFocos = Math.min(6, Math.max(3, Math.ceil(lado / 6)));
    for (let i = 0; i < totalFocos; i++) {
      const angulo = (i / totalFocos) * Math.PI * 2;
      const foco = new THREE.PointLight(coloresFoco[i % coloresFoco.length], luz.foco * 9, lado * 0.9, 1.6);
      foco.position.set(Math.cos(angulo) * mitad * 0.55, alto - 0.4, Math.sin(angulo) * mitad * 0.55);
      foco.userData.angulo = angulo;
      escena.add(foco);
      focos.push(foco);
    }

    /* ------------------------------ Cuadros ----------------------------- */
    const cargador = new THREE.TextureLoader();
    const clicables = [];
    const matMarco = guardar(
      new THREE.MeshStandardMaterial({
        color: marco.color,
        metalness: marco.metal,
        roughness: marco.rugosidad,
        emissive: marco.brillo ? marco.color : 0x000000,
        emissiveIntensity: marco.brillo ? 0.9 : 0,
      })
    );
    const matPlaca = guardar(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 }));

    function texturaRespaldo(pieza) {
      const lienzo = document.createElement("canvas");
      lienzo.width = 384;
      lienzo.height = 512;
      const g = lienzo.getContext("2d");
      const degradado = g.createLinearGradient(0, 0, 384, 512);
      degradado.addColorStop(0, "#ff4fa3");
      degradado.addColorStop(0.55, "#9b5cff");
      degradado.addColorStop(1, "#4fd8ff");
      g.fillStyle = degradado;
      g.fillRect(0, 0, 384, 512);
      g.fillStyle = "rgba(255,255,255,0.92)";
      g.textAlign = "center";
      g.font = "800 34px 'Segoe UI', sans-serif";
      g.fillText(pieza.categoria.toUpperCase(), 192, 220);
      g.font = "600 26px 'Segoe UI', sans-serif";
      partirTexto(g, pieza.titulo, 320).slice(0, 3).forEach((linea, i) => g.fillText(linea, 192, 280 + i * 34));
      g.font = "700 22px 'Segoe UI', sans-serif";
      g.fillText(pieza.grupo, 192, 440);
      const textura = new THREE.CanvasTexture(lienzo);
      textura.colorSpace = THREE.SRGBColorSpace;
      return guardar(textura);
    }

    function texturaPlaca(pieza) {
      const lienzo = document.createElement("canvas");
      lienzo.width = 512;
      lienzo.height = 128;
      const g = lienzo.getContext("2d");
      g.fillStyle = "#fbfaf7";
      g.fillRect(0, 0, 512, 128);
      g.fillStyle = "#1c1533";
      g.textAlign = "center";
      g.font = "700 34px 'Segoe UI', sans-serif";
      g.fillText(recortar(g, pieza.titulo, 480), 256, 56);
      g.fillStyle = "#6b5f86";
      g.font = "500 26px 'Segoe UI', sans-serif";
      g.fillText(`${pieza.grupo} · ${pieza.categoria}`, 256, 98);
      const textura = new THREE.CanvasTexture(lienzo);
      textura.colorSpace = THREE.SRGBColorSpace;
      textura.anisotropy = 4;
      return guardar(textura);
    }

    // Crea un cuadro (lienzo + marco + placa). Regresa el grupo.
    function crearCuadro(pieza, indice, anchoMax = 1.5, altoMax = 1.7) {
      const grupo = new THREE.Group();
      const matLienzo = guardar(new THREE.MeshBasicMaterial({ color: 0xffffff, map: texturaRespaldo(pieza), side: THREE.DoubleSide }));
      const lienzo = new THREE.Mesh(guardar(new THREE.PlaneGeometry(1, 1)), matLienzo);
      lienzo.position.z = 0.03;
      lienzo.userData.indice = indice;
      grupo.add(lienzo);
      clicables.push(lienzo);

      // La pieza del pedestal gira: también lleva la imagen por detrás.
      const reverso = indice === -1 ? lienzo.clone() : null;
      if (reverso) {
        reverso.position.z = -0.03;
        reverso.rotation.y = Math.PI;
        grupo.add(reverso);
        clicables.push(reverso);
      }

      const marcoMesh = new THREE.Mesh(guardar(new THREE.BoxGeometry(1, 1, 0.05)), matMarco);
      marcoMesh.visible = !marco.sinMarco;
      marcoMesh.userData.indice = indice;
      grupo.add(marcoMesh);
      clicables.push(marcoMesh);

      const ajustar = (proporcion) => {
        let ancho = anchoMax;
        let altoCuadro = ancho / proporcion;
        if (altoCuadro > altoMax) {
          altoCuadro = altoMax;
          ancho = altoCuadro * proporcion;
        }
        lienzo.scale.set(ancho, altoCuadro, 1);
        reverso?.scale.set(ancho, altoCuadro, 1);
        marcoMesh.scale.set(ancho + 0.16, altoCuadro + 0.16, 1);
        return altoCuadro;
      };
      const altoInicial = ajustar(3 / 4);

      const placa = new THREE.Mesh(guardar(new THREE.PlaneGeometry(0.9, 0.225)), guardar(new THREE.MeshStandardMaterial({ map: texturaPlaca(pieza), roughness: 0.8 })));
      placa.position.set(0, -altoInicial / 2 - 0.32, 0.02);
      grupo.add(placa);
      grupo.userData.placa = placa;

      if (pieza.imagen) {
        cargador.load(
          pieza.imagen,
          (textura) => {
            textura.colorSpace = THREE.SRGBColorSpace;
            textura.anisotropy = renderer.capabilities.getMaxAnisotropy();
            guardar(textura);
            matLienzo.map = textura;
            matLienzo.needsUpdate = true;
            const nuevoAlto = ajustar(textura.image.width / textura.image.height || 3 / 4);
            placa.position.y = -nuevoAlto / 2 - 0.32;
          },
          undefined,
          () => {} // sin foto: se queda la tarjeta de respaldo
        );
      }
      return grupo;
    }

    piezas.forEach((pieza, i) => {
      const lugar = lugares[i];
      const cuadro = crearCuadro(pieza, i);
      cuadro.position.set(lugar.x, ALTURA_CUADRO, lugar.z);
      cuadro.rotation.y = lugar.angulo;
      escena.add(cuadro);
    });

    /* ------------------------------ Pedestal ---------------------------- */
    let giratorio = null;
    if (destacada) {
      const base = new THREE.Mesh(
        guardar(new THREE.CylinderGeometry(0.55, 0.65, 1.0, 40)),
        guardar(new THREE.MeshStandardMaterial({ color: tema.acento, metalness: 0.4, roughness: 0.35 }))
      );
      base.position.y = 0.5;
      escena.add(base);
      const aro = new THREE.Mesh(guardar(new THREE.TorusGeometry(0.62, 0.025, 12, 60)), guardar(new THREE.MeshBasicMaterial({ color: 0xffd166 })));
      aro.rotation.x = Math.PI / 2;
      aro.position.y = 1.01;
      escena.add(aro);

      giratorio = crearCuadro(destacada, -1, 0.9, 1.1);
      giratorio.userData.placa.visible = false;
      giratorio.position.set(0, 1.75, 0);
      escena.add(giratorio);
      const foco = new THREE.SpotLight(0xffffff, 30, 6, Math.PI / 7, 0.4, 1.2);
      foco.position.set(0, alto - 0.1, 0);
      foco.target = base;
      escena.add(foco);
    }

    /* ----------------------------- Partículas --------------------------- */
    let particulas = null;
    if (config.particulas && config.particulas !== "ninguna") {
      const cantidad = 160;
      const posiciones = new Float32Array(cantidad * 3);
      const colores = new Float32Array(cantidad * 3);
      const paleta = config.particulas === "corazones" ? [0xff4fa3, 0xff8fd0] : config.particulas === "estrellas" ? [0xffd166, 0xfff6d8] : [0xff4fa3, 0x4fd8ff, 0xffd166, 0x3ddc97, 0x9b5cff];
      const color = new THREE.Color();
      for (let i = 0; i < cantidad; i++) {
        posiciones[i * 3] = (Math.random() - 0.5) * lado * 0.9;
        posiciones[i * 3 + 1] = Math.random() * alto;
        posiciones[i * 3 + 2] = (Math.random() - 0.5) * lado * 0.9;
        color.setHex(paleta[i % paleta.length]);
        colores.set([color.r, color.g, color.b], i * 3);
      }
      const geo = guardar(new THREE.BufferGeometry());
      geo.setAttribute("position", new THREE.BufferAttribute(posiciones, 3));
      geo.setAttribute("color", new THREE.BufferAttribute(colores, 3));
      const mat = guardar(
        new THREE.PointsMaterial({ size: config.particulas === "confeti" ? 0.09 : 0.16, map: texturaParticula(config.particulas), vertexColors: true, transparent: true, depthWrite: false, alphaTest: 0.1 })
      );
      guardar(mat.map);
      particulas = new THREE.Points(geo, mat);
      escena.add(particulas);
    }

    /* ------------------------------ Controles --------------------------- */
    const teclas = new Set();
    let destino = null; // { pos, yaw, pitch } animación hacia un cuadro
    let arrastre = null;

    function limitar(pos) {
      const borde = mitad - 0.8;
      pos.x = Math.max(-borde, Math.min(borde, pos.x));
      pos.z = Math.max(-borde, Math.min(borde, pos.z));
      // No atravesar el pedestal
      if (destacada) {
        const d = Math.hypot(pos.x, pos.z);
        if (d < 1.1) {
          const f = 1.1 / (d || 1);
          pos.x = (pos.x || 0.001) * f;
          pos.z *= f;
        }
      }
    }

    function mirarHacia(desde, hacia) {
      const dx = hacia.x - desde.x;
      const dz = hacia.z - desde.z;
      return { yaw: Math.atan2(-dx, -dz), pitch: Math.atan2(hacia.y - desde.y, Math.hypot(dx, dz)) };
    }

    function irA(indice) {
      let pos;
      let objetivo;
      if (indice === null || indice === undefined) {
        pos = inicio.pos.clone();
        destino = { pos, yaw: inicio.yaw, pitch: inicio.pitch };
        return;
      }
      if (indice === -1) {
        if (!giratorio) return;
        objetivo = new THREE.Vector3(0, 1.6, 0);
        const desde = camara.position.clone().setY(ALTURA_OJOS);
        const dir = desde.sub(objetivo).setY(0).normalize();
        if (!Number.isFinite(dir.x) || dir.lengthSq() === 0) dir.set(0, 0, 1);
        pos = new THREE.Vector3(dir.x * 2.4, ALTURA_OJOS, dir.z * 2.4);
      } else {
        const lugar = lugares[indice];
        if (!lugar) return;
        objetivo = new THREE.Vector3(lugar.x, ALTURA_CUADRO - 0.1, lugar.z);
        pos = new THREE.Vector3(lugar.x + Math.sin(lugar.angulo) * DISTANCIA_CUADRO, ALTURA_OJOS, lugar.z + Math.cos(lugar.angulo) * DISTANCIA_CUADRO);
      }
      limitar(pos);
      destino = { pos, ...mirarHacia(pos, objetivo) };
      // Girar por el camino más corto
      while (destino.yaw - yaw > Math.PI) destino.yaw -= Math.PI * 2;
      while (destino.yaw - yaw < -Math.PI) destino.yaw += Math.PI * 2;
    }

    const empuje = { valor: 0 };
    function mover(direccion) {
      empuje.valor = direccion;
    }
    api.current = { irA, mover };

    const lienzoDom = renderer.domElement;
    lienzoDom.style.touchAction = "none";

    function alBajar(e) {
      arrastre = { x: e.clientX, y: e.clientY, inicioX: e.clientX, inicioY: e.clientY, movido: false };
      lienzoDom.setPointerCapture?.(e.pointerId);
    }
    function alMover(e) {
      if (!arrastre) return;
      const dx = e.clientX - arrastre.x;
      const dy = e.clientY - arrastre.y;
      arrastre.x = e.clientX;
      arrastre.y = e.clientY;
      if (Math.hypot(e.clientX - arrastre.inicioX, e.clientY - arrastre.inicioY) > 6) arrastre.movido = true;
      if (!arrastre.movido) return;
      destino = null;
      yaw += dx * 0.005;
      pitch = Math.max(-0.7, Math.min(0.7, pitch + dy * 0.004));
    }
    const raycaster = new THREE.Raycaster();
    function alSoltar(e) {
      const fueClic = arrastre && !arrastre.movido;
      arrastre = null;
      if (!fueClic) return;
      const caja = lienzoDom.getBoundingClientRect();
      const punto = new THREE.Vector2(((e.clientX - caja.left) / caja.width) * 2 - 1, -((e.clientY - caja.top) / caja.height) * 2 + 1);
      raycaster.setFromCamera(punto, camara);
      const golpe = raycaster.intersectObjects(clicables, false)[0];
      if (golpe && golpe.distance < 14) {
        const indice = golpe.object.userData.indice;
        irA(indice);
        alSeleccionar.current?.(indice);
      }
    }
    function alRueda(e) {
      e.preventDefault();
      destino = null;
      const paso = Math.max(-1.2, Math.min(1.2, -e.deltaY * 0.004));
      camara.position.x -= Math.sin(yaw) * paso;
      camara.position.z -= Math.cos(yaw) * paso;
      limitar(camara.position);
    }
    function alTecla(e, abajo) {
      if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)) return;
      const k = e.key.toLowerCase();
      if (!["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", "q", "e"].includes(k)) return;
      e.preventDefault();
      if (abajo) {
        destino = null;
        teclas.add(k);
      } else teclas.delete(k);
    }
    const teclaAbajo = (e) => alTecla(e, true);
    const teclaArriba = (e) => alTecla(e, false);

    lienzoDom.addEventListener("pointerdown", alBajar);
    lienzoDom.addEventListener("pointermove", alMover);
    lienzoDom.addEventListener("pointerup", alSoltar);
    lienzoDom.addEventListener("pointercancel", () => (arrastre = null));
    lienzoDom.addEventListener("wheel", alRueda, { passive: false });
    window.addEventListener("keydown", teclaAbajo);
    window.addEventListener("keyup", teclaArriba);

    /* ------------------------------- Bucle ------------------------------ */
    function redimensionar() {
      const { clientWidth: ancho, clientHeight: altoVista } = raiz;
      if (!ancho || !altoVista) return;
      renderer.setSize(ancho, altoVista, false);
      camara.aspect = ancho / altoVista;
      camara.updateProjectionMatrix();
    }
    const observador = new ResizeObserver(redimensionar);
    observador.observe(raiz);
    redimensionar();

    const reloj = new THREE.Clock();
    let cuadro = 0;
    function animar() {
      cuadro = requestAnimationFrame(animar);
      if (document.hidden) return;
      const dt = Math.min(0.05, reloj.getDelta());
      const t = reloj.elapsedTime;

      // Caminar con teclado o con los botones del celular
      const adelante = (teclas.has("w") || teclas.has("arrowup") ? 1 : 0) - (teclas.has("s") || teclas.has("arrowdown") ? 1 : 0) + empuje.valor;
      const lateral = (teclas.has("d") ? 1 : 0) - (teclas.has("a") ? 1 : 0);
      const giro = (teclas.has("arrowleft") || teclas.has("q") ? 1 : 0) - (teclas.has("arrowright") || teclas.has("e") ? 1 : 0);
      if (adelante || lateral || giro) {
        destino = null;
        yaw += giro * dt * 1.8;
        const velocidad = 3.2 * dt;
        camara.position.x += (-Math.sin(yaw) * adelante + Math.cos(yaw) * lateral) * velocidad;
        camara.position.z += (-Math.cos(yaw) * adelante - Math.sin(yaw) * lateral) * velocidad;
        limitar(camara.position);
      }

      // Animación suave hacia un cuadro
      if (destino) {
        const f = reducir ? 1 : 1 - Math.pow(0.0015, dt);
        camara.position.lerp(destino.pos, f);
        yaw += (destino.yaw - yaw) * f;
        pitch += (destino.pitch - pitch) * f;
        if (camara.position.distanceTo(destino.pos) < 0.01 && Math.abs(destino.yaw - yaw) < 0.002) destino = null;
      }

      camara.rotation.set(pitch, yaw, 0, "YXZ");

      if (giratorio && !reducir) giratorio.rotation.y = t * 0.6;
      if (luz.colores && !reducir) {
        focos.forEach((foco, i) => {
          const a = foco.userData.angulo + t * 0.35;
          foco.position.x = Math.cos(a) * mitad * 0.55;
          foco.position.z = Math.sin(a) * mitad * 0.55;
          foco.intensity = luz.foco * 9 * (0.75 + 0.25 * Math.sin(t * 2 + i));
        });
      }
      if (particulas && !reducir) {
        const pos = particulas.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          let y = pos.getY(i) - dt * (config.particulas === "confeti" ? 0.55 : 0.25);
          if (y < 0) y = alto;
          pos.setY(i, y);
          pos.setX(i, pos.getX(i) + Math.sin(t + i) * dt * 0.08);
        }
        pos.needsUpdate = true;
      }

      renderer.render(escena, camara);
    }
    animar();

    return () => {
      cancelAnimationFrame(cuadro);
      observador.disconnect();
      window.removeEventListener("keydown", teclaAbajo);
      window.removeEventListener("keyup", teclaArriba);
      desechables.forEach((x) => x.dispose?.());
      renderer.dispose();
      renderer.forceContextLoss?.();
      lienzoDom.remove();
      api.current = {};
    };
    // La escena se arma de nuevo si cambian las piezas o la decoración.
  }, [piezas, destacada, config, onError]);

  return <div ref={contenedor} className="galeria-lienzo" style={{ "--galeria-fondo": hexCss(temaGaleria(config.tema).niebla) }} />;
});

export default GaleriaEscena;

function partirTexto(g, texto, ancho) {
  const palabras = String(texto || "").split(/\s+/);
  const lineas = [];
  let actual = "";
  for (const palabra of palabras) {
    const prueba = actual ? `${actual} ${palabra}` : palabra;
    if (g.measureText(prueba).width > ancho && actual) {
      lineas.push(actual);
      actual = palabra;
    } else actual = prueba;
  }
  if (actual) lineas.push(actual);
  return lineas;
}

function recortar(g, texto, ancho) {
  let t = String(texto || "");
  if (g.measureText(t).width <= ancho) return t;
  while (t.length > 1 && g.measureText(`${t}…`).width > ancho) t = t.slice(0, -1);
  return `${t}…`;
}

function texturaParticula(tipo) {
  const lienzo = document.createElement("canvas");
  lienzo.width = lienzo.height = 64;
  const g = lienzo.getContext("2d");
  g.fillStyle = "#fff";
  g.translate(32, 32);
  if (tipo === "corazones") {
    g.beginPath();
    g.moveTo(0, 18);
    g.bezierCurveTo(-30, -2, -14, -26, 0, -10);
    g.bezierCurveTo(14, -26, 30, -2, 0, 18);
    g.fill();
  } else if (tipo === "estrellas") {
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 11 : 26;
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    g.closePath();
    g.fill();
  } else {
    g.fillRect(-14, -22, 28, 44);
  }
  return new THREE.CanvasTexture(lienzo);
}
