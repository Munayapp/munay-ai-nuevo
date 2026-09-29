/**
 * MOTOR P1: INTELLIGENCE CORE + DOCUMENTOS DEL CASO + CONTEXTO = ANÁLISIS MUNAY.
 *
 * Garantías:
 *   - Sin evidencia no hay afirmación: lo no respaldado va a `sinRespaldo` (J1) o `faltantes` (J2).
 *   - Solo unidades y tablas ACTIVAS; la norma debe estar jurídicamente vigente en `asOf`
 *     y la sección citada debe pertenecer a la versión aplicable.
 *   - La ventana de verificación vencida baja la confianza y crea una tarea; nunca cambia la vigencia.
 *   - Toda afirmación lleva tipo epistémico, confianza y evidencia trazable.
 */
import { enAlcanceP1, DISTRITOS_P1 } from './alcance.ts';
import type { Caso, Ocurrencia, Senal } from './caso.ts';
import { conflictosConAgente, contradicciones, NOMBRE_DOCUMENTO, ocurrencias } from './caso.ts';
import { CONSULTAS_P1, REGLAS_P1, type EvalCtx, type Regla } from './consultas.ts';
import type { Afirmacion, Confianza, CoreStore, Evidencia, Faltante, Respuesta, SinRespaldo, UnidadConocimiento, ValorTabla } from './types.ts';
import { estadoJuridico, estadoVerificacion, hoyISO } from './vigencia.ts';

// ───────────── confianza ─────────────

const ORDEN: Confianza[] = ['SIN_RESPALDO', 'BAJA', 'MEDIA', 'ALTA'];
const menor = (xs: Confianza[]): Confianza => (xs.length ? xs.reduce((a, b) => (ORDEN.indexOf(a) <= ORDEN.indexOf(b) ? a : b)) : 'BAJA');
const porAutoridad = (nivel: number): Confianza => (nivel <= 2 ? 'ALTA' : nivel <= 4 ? 'MEDIA' : 'BAJA');

// ───────────── lenguaje (A4) ─────────────

const OBLIGACION = /\b(exige|exigen|exigido|exigida|obligatori[oa]s?|la ley|requisito legal|debe|deben)\b/i;

/** Una práctica o recomendación nunca puede redactarse como obligación legal. */
export function violacionesDeLenguaje(afirmaciones: Afirmacion[]): string[] {
  return afirmaciones
    .filter((a) => a.tipo === 'PRACTICA' || a.tipo === 'RECOMENDACION' || a.grupo === 'requisito_habitual' || a.grupo === 'recomendacion')
    .filter((a) => OBLIGACION.test(a.texto))
    .map((a) => `Lenguaje de obligación en ${a.tipo}: "${a.texto}"`);
}

// ───────────── profesionales (J8) ─────────────

const DERIVACION: Record<Senal, { motivo: string; pregunta: string }> = {
  litigio_o_embargo: { motivo: 'Hay un litigio, embargo o medida inscrita.', pregunta: '¿La medida inscrita impide o condiciona la transferencia y cómo se levanta?' },
  sucesion_no_inscrita: { motivo: 'La sucesión no consta inscrita.', pregunta: '¿Qué debe inscribirse para que los herederos puedan disponer del inmueble?' },
  sucesion_intestada_o_masa_indivisa: { motivo: 'Sucesión intestada o masa hereditaria indivisa.', pregunta: '¿Quiénes son los herederos con derecho, consta inscrita la sucesión y cómo deben intervenir en la venta?' },
  prescripcion_adquisitiva: { motivo: 'Se plantea una prescripción adquisitiva.', pregunta: '¿Procede la prescripción en este caso y por qué vía?' },
  poder_otorgado_en_extranjero: { motivo: 'El poder se otorga en el extranjero.', pregunta: '¿El poder otorgado en el extranjero cumple la formalidad y la inscripción necesarias para disponer del inmueble en el Perú?' },
  observacion_o_tacha_registral: { motivo: 'Hay una observación o tacha registral.', pregunta: '¿Cómo se subsana la observación y en qué plazo?' },
  exoneracion_tributaria: { motivo: 'Se plantea una exoneración o excepción tributaria.', pregunta: '¿Aplica alguna exoneración o excepción tributaria a esta operación?' },
  clausula_fuera_de_estandar: { motivo: 'El contrato tiene cláusulas fuera de lo estándar.', pregunta: '¿Las cláusulas señaladas son válidas y equilibradas para mi cliente?' },
  posible_operacion_sospechosa: { motivo: 'Evaluación de cumplimiento LA/FT (oficial de cumplimiento).', pregunta: '¿Qué debo registrar o evaluar como sujeto obligado antes de continuar con esta operación?' },
};

function senalesDelCaso(caso: Caso): Senal[] {
  const s = new Set<Senal>(caso.contexto.senales ?? []);
  if (ocurrencias(caso, 'embargo').some((o) => o.hecho.valor === true)) s.add('litigio_o_embargo');
  if (ocurrencias(caso, 'sucesion_inscrita').some((o) => o.hecho.valor === false)) s.add('sucesion_no_inscrita');
  if (ocurrencias(caso, 'otorgado_en_extranjero').some((o) => o.hecho.valor === true)) s.add('poder_otorgado_en_extranjero');
  return [...s];
}

// ───────────── evidencia del caso ─────────────

const ETIQUETA: Record<string, string> = {
  hipoteca_vigente: 'Hipoteca inscrita', fecha_emision: 'Fecha de emisión de la copia literal', titulares: 'Titulares registrados',
  sucesion_inscrita: 'Sucesión inscrita', firmantes: 'Firmantes de la autorización', precio_m2_promedio_usd: 'Promedio US$/m² de comparables',
  precio_usd: 'Precio', area_m2: 'Área (m²)', fecha_reporte: 'Fecha del reporte', costo_adquisicion_pen: 'Costo de adquisición',
  tipo_arras: 'Tipo de arras', penalidad_comprador: 'Penalidad del comprador', penalidad_vendedor: 'Penalidad del vendedor',
  texto_poder: 'Texto del poder', forma_contrato: 'Forma del contrato', clausula_allanamiento: 'Cláusula de allanamiento', zonificacion: 'Zonificación del certificado',
};

function confianzaDelHecho(o: Ocurrencia): Confianza {
  if (o.doc.valia) return 'MEDIA';
  if (o.hecho.confirmadoPorAgente) return 'ALTA';
  return o.hecho.pagina !== null && o.hecho.extracto ? 'MEDIA' : 'BAJA';
}

// ───────────── motor ─────────────

interface ResultadoUnidad {
  ok: boolean;
  unidad?: UnidadConocimiento;
  evidencia?: Evidencia;
  confianza?: Confianza;
  nota?: string;
  sinRespaldo?: SinRespaldo;
  incertidumbre?: Afirmacion;
  versionId?: string;
}

export function analizar(consultaId: string, caso: Caso, core: CoreStore, asOf: string = hoyISO()): Respuesta {
  const consulta = CONSULTAS_P1.find((q) => q.id === consultaId);
  if (!consulta) throw new Error(`Consulta desconocida: ${consultaId}`);

  const r: Respuesta = {
    consultaId, asOf, titular: '', afirmaciones: [], faltantes: [], sinRespaldo: [], preguntasAlAgente: [],
    requiereProfesional: null, siguienteAccion: null, accionesEpistemicas: [], paraProfundizar: [], tareasReverificacion: [], fueraDeAlcance: false, violacionesLenguaje: [],
    auditoria: { unidades: [], versiones: [], tablas: [], documentos: [] },
  };
  const aud = { unidades: new Set<string>(), versiones: new Set<string>(), tablas: new Set<string>(), documentos: new Set<string>() };

  // Alcance municipal P1 (decisión D3): solo limita las consultas que usan la capa municipal.
  if (consulta.alcanceMunicipal && !enAlcanceP1(caso.contexto.distrito)) {
    r.fueraDeAlcance = true;
    r.sinRespaldo.push({ tema: `Zona: ${caso.contexto.distrito}`, motivo: 'zona_fuera_de_P1', referencias: [...DISTRITOS_P1] });
    r.titular = `${caso.contexto.distrito} está fuera del alcance municipal verificado de MUNAY (P1: ${DISTRITOS_P1.join(', ')}). No encuentro respaldo suficiente para responder.`;
    return r;
  }

  const fuente = (id: string) => core.fuentes.find((f) => f.id === id);
  const sinRespaldo = (s: SinRespaldo) => {
    if (!r.sinRespaldo.some((x) => x.tema === s.tema && x.motivo === s.motivo)) r.sinRespaldo.push(s);
  };
  const faltante = (f: Faltante) => {
    if (!r.faltantes.some((x) => x.que === f.que)) r.faltantes.push(f);
  };
  const relevancia = (tipo?: keyof typeof NOMBRE_DOCUMENTO) => (tipo ? consulta.documentos[tipo] : undefined);
  const presente = (tipo: keyof typeof NOMBRE_DOCUMENTO) => caso.documentos.some((d) => d.tipo === tipo);
  /** Documento OPCIONAL ausente: se ofrece para profundizar, sin exigirlo ni bloquear la respuesta. */
  const profundizar = (tipo: keyof typeof NOMBRE_DOCUMENTO, para: string) => {
    const documento = NOMBRE_DOCUMENTO[tipo];
    const previo = r.paraProfundizar.find((x) => x.documento === documento);
    if (!previo) r.paraProfundizar.push({ documento, para });
    else if (!previo.para.includes(para)) previo.para += `; ${para}`;
  };
  /** Documento REQUERIDO que no existe en el caso: una sola petición explícita, con para qué se necesita. */
  const documentoAusente = (tipo: keyof typeof NOMBRE_DOCUMENTO, para: string, porque: string, quien: string) => {
    const que = NOMBRE_DOCUMENTO[tipo];
    const motivo = `${para}: ${porque}`;
    const previo = r.faltantes.find((x) => x.que === que);
    if (!previo) r.faltantes.push({ que, porque: `No tengo este documento; sin él no puedo analizar ${motivo}.`, quien, documentoTipo: tipo });
    else if (!previo.porque.includes(motivo)) previo.porque = previo.porque.replace(/\.$/, `; ${motivo}.`);
  };

  // J5 — contradicciones entre documentos: se muestran ambas versiones y no se elige.
  const contras = contradicciones(caso);
  const enConflicto = new Set(contras.map((c) => c.campo));
  for (const c of contras) {
    r.afirmaciones.push({
      texto: `Los documentos no coinciden en «${ETIQUETA[c.campo] ?? c.campo}»: ${c.ocurrencias.map((o) => `${o.hecho.valor} (${o.doc.nombre}${o.hecho.pagina ? `, p. ${o.hecho.pagina}` : ''})`).join(' vs. ')}.`,
      tipo: 'INCERTIDUMBRE', confianza: 'BAJA', grupo: 'informacion',
      evidencias: c.ocurrencias.map((o) => ({ tipo: 'documento_caso' as const, documentoId: o.doc.id, campo: c.campo, pagina: o.hecho.pagina, extracto: o.hecho.extracto })),
    });
    c.ocurrencias.forEach((o) => aud.documentos.add(o.doc.id));
  }

  // J6 — dato del agente vs. documento: prevalece el documento y se pregunta.
  for (const k of conflictosConAgente(caso)) {
    r.preguntasAlAgente.push(`Me indicaste «${k.agente.valor}» para ${ETIQUETA[k.campo] ?? k.campo}, pero ${k.documento.doc.nombre}${k.documento.hecho.pagina ? ` (p. ${k.documento.hecho.pagina})` : ''} indica «${k.documento.hecho.valor}». Uso el documento. ¿Cuál es el correcto?`);
  }

  // Resolución de unidades con todas las compuertas.
  const resolverUnidad = (id: string): ResultadoUnidad => {
    const u = core.unidades.find((x) => x.id === id);
    if (!u || u.estado !== 'ACTIVO' || !u.afirmacion) {
      return { ok: false, sinRespaldo: { tema: u?.tema ?? id, motivo: 'unidad_no_activa', referencias: [id] } };
    }
    const f = fuente(u.fuenteId);
    const ver = estadoVerificacion(u.verificacion, f?.ventanaVerificacionDias ?? 0, asOf);
    if (ver === 'SIN_VERIFICAR') return { ok: false, sinRespaldo: { tema: u.tema, motivo: 'unidad_no_activa', referencias: [id] } };

    let evidencia: Evidencia = { tipo: 'unidad', unidadId: u.id, fuenteId: u.fuenteId };
    let versionId: string | undefined;
    if (u.tipo !== 'PRACTICA') {
      const norma = core.normas.find((n) => n.id === u.normaId);
      const seccion = core.secciones.find((s) => s.id === u.seccionId);
      if (!norma || !seccion) return { ok: false, sinRespaldo: { tema: u.tema, motivo: 'vigencia_desconocida', referencias: [id] } };
      const ej = estadoJuridico(norma, asOf);
      if (ej.estado === 'DEROGADA' || ej.estado === 'SUSTITUIDA') {
        return { ok: false, sinRespaldo: { tema: `${u.tema} (${norma.numero} ${ej.estado.toLowerCase()})`, motivo: 'norma_no_vigente', referencias: [id, norma.id] } };
      }
      if (ej.estado === 'DESCONOCIDO' || !ej.version) {
        return {
          ok: false,
          sinRespaldo: { tema: u.tema, motivo: 'vigencia_desconocida', referencias: [id, norma.id] },
          incertidumbre: { texto: `No puedo determinar qué texto de ${norma.numero} aplica al ${asOf}.`, tipo: 'INCERTIDUMBRE', confianza: 'BAJA', grupo: 'informacion', evidencias: [{ tipo: 'unidad', unidadId: u.id, fuenteId: u.fuenteId }] },
        };
      }
      if (seccion.versionId !== ej.version.id) {
        return { ok: false, sinRespaldo: { tema: `${u.tema}: la sección citada no corresponde a la versión aplicable`, motivo: 'norma_no_vigente', referencias: [id, seccion.id] } };
      }
      evidencia = { tipo: 'norma', unidadId: u.id, fuenteId: u.fuenteId, normaId: norma.id, versionId: ej.version.id, referencia: seccion.referencia, extracto: seccion.extracto };
      versionId = ej.version.id;
    }

    let confianza: Confianza = u.tipo === 'PRACTICA' ? 'MEDIA' : porAutoridad(f?.nivelAutoridad ?? 5);
    let nota: string | undefined;
    if (ver === 'VENCIDA') {
      confianza = menor([confianza, 'MEDIA']);
      nota = `Vigente según la verificación del ${u.verificacion.ultimaFecha}; conviene volver a comprobarla.`;
      if (!r.tareasReverificacion.includes(u.id)) r.tareasReverificacion.push(u.id);
    }
    return { ok: true, unidad: u, evidencia, confianza, nota, versionId };
  };

  const resolverTabla = (tablaId: string, clave: string, tema: string): { ok: boolean; valor?: ValorTabla; evidencia?: Evidencia; confianza?: Confianza; nota?: string } => {
    const t = core.tablas.find((x) => x.tablaId === tablaId && x.clave === clave);
    if (!t || t.estado !== 'ACTIVO') {
      sinRespaldo({ tema: t ? `${tema} (estado ${t.estado})` : tema, motivo: 'tabla_no_activa', referencias: t ? [t.id] : [tablaId] });
      return { ok: false };
    }
    if (t.normaId) {
      const norma = core.normas.find((n) => n.id === t.normaId);
      const ej = norma ? estadoJuridico(norma, asOf) : null;
      if (!ej || !ej.version || ej.version.id !== t.versionId) {
        sinRespaldo({ tema: `${tema}: no vigente al ${asOf}`, motivo: 'norma_no_vigente', referencias: [t.id] });
        return { ok: false };
      }
      aud.versiones.add(ej.version.id);
    }
    const f = fuente(t.fuenteId);
    const ver = estadoVerificacion(t.verificacion, f?.ventanaVerificacionDias ?? 0, asOf);
    let confianza: Confianza = porAutoridad(f?.nivelAutoridad ?? 5);
    let nota: string | undefined;
    if (ver === 'VENCIDA') {
      confianza = menor([confianza, 'MEDIA']);
      nota = `Según la verificación del ${t.verificacion.ultimaFecha}; conviene volver a comprobarla.`;
      if (!r.tareasReverificacion.includes(t.id)) r.tareasReverificacion.push(t.id);
    }
    aud.tablas.add(t.id);
    return {
      ok: true, valor: t, confianza, nota,
      evidencia: { tipo: 'tabla', valorId: t.id, tablaId: t.tablaId, clave: t.clave, periodo: t.periodo, fuenteId: t.fuenteId, normaId: t.normaId, versionId: t.versionId, referencia: t.referencia, extracto: t.verificacion.extracto ?? null },
    };
  };

  const hechoDe = (campo: string): Ocurrencia | undefined => (enConflicto.has(campo) ? undefined : ocurrencias(caso, campo)[0]);
  const unidadesUsadas = new Set<string>();
  const hechosMostrados = new Set<string>();
  const accionesPosibles: { texto: string; responsable: string }[] = [];

  const mostrarHecho = (o: Ocurrencia, campo: string): Evidencia => {
    const ev: Evidencia = { tipo: 'documento_caso', documentoId: o.doc.id, campo, pagina: o.hecho.pagina, extracto: o.hecho.extracto };
    const key = `${o.doc.id}|${campo}`;
    if (!hechosMostrados.has(key)) {
      hechosMostrados.add(key);
      aud.documentos.add(o.doc.id);
      r.afirmaciones.push({
        texto: `${ETIQUETA[campo] ?? campo}: ${o.hecho.valor === true ? 'sí' : o.hecho.valor === false ? 'no' : o.hecho.valor}`,
        tipo: 'DATO_DEL_CASO', confianza: confianzaDelHecho(o), grupo: 'informacion', evidencias: [ev],
        nota: o.doc.valia ? `Fuente: Valia ${o.doc.valia.producto}, ${o.doc.fechaEmision ?? 'fecha no indicada'}, generado por el agente. Precios de oferta; método del proveedor.` : undefined,
      });
    }
    return ev;
  };

  for (const regla of consulta.reglas.map((id) => REGLAS_P1[id]).filter(Boolean) as Regla[]) {
    if (regla.filtro && !regla.filtro(caso)) continue;
    // Campos esperados de un documento presente (informa lo que el documento no trae).
    if (regla.camposEsperados) {
      const doc = caso.documentos.find((d) => d.tipo === regla.camposEsperados!.documentoTipo);
      const rel = relevancia(regla.camposEsperados.documentoTipo);
      if (!doc) {
        if (rel === 'REQUIRED') documentoAusente(regla.camposEsperados.documentoTipo, 'el documento', 'es el documento a revisar', 'agente');
        else if (rel === 'OPTIONAL') profundizar(regla.camposEsperados.documentoTipo, 'revisar sus cláusulas');
      } else {
        for (const c of regla.camposEsperados.campos) {
          if (doc.noEntendido.includes(c.campo)) faltante({ que: `${c.que} (no pude leerlo en ${doc.nombre})`, porque: 'hay que confirmarlo en el documento', quien: 'agente' });
          else if (!doc.hechos.some((h) => h.campo === c.campo)) faltante({ que: `${c.que}: el contrato no lo indica`, porque: 'conviene completarlo antes de firmar', quien: 'partes' });
        }
        aud.documentos.add(doc.id);
      }
    }

    // Respaldo primero (J1): se informa SIEMPRE, aunque también falte un documento. Así el agente no cree
    // que con el documento obtendrá la respuesta cuando la norma misma no está verificada.
    const resol = regla.unidades.map(resolverUnidad);
    const fallidas = resol.filter((x) => !x.ok);
    fallidas.forEach((x) => {
      if (x.sinRespaldo) sinRespaldo(x.sinRespaldo);
      if (x.incertidumbre) r.afirmaciones.push(x.incertidumbre);
    });

    // Requisitos del caso (J2). Los campos en contradicción no se usan (J5).
    // Documento ausente: REQUIRED → se pide el documento completo (bloquea); OPTIONAL → se ofrece para profundizar
    // (la regla que lo necesita no se evalúa, pero la respuesta no se bloquea); no listado → se pide solo el dato.
    const evidCaso: Evidencia[] = [];
    const confCaso: Confianza[] = [];
    let completo = true;
    for (const req of regla.requiere ?? []) {
      const rel = relevancia(req.documentoTipo);
      if (req.documentoTipo && rel && !presente(req.documentoTipo) && !caso.contexto.datosAgente?.some((d) => d.campo === req.campo)) {
        if (rel === 'REQUIRED') documentoAusente(req.documentoTipo, req.que, req.porque, req.quien);
        else profundizar(req.documentoTipo, req.que.replace(/^(el|la|los|las) /, ''));
        completo = false;
        continue;
      }
      if (enConflicto.has(req.campo)) { completo = false; continue; }
      const o = hechoDe(req.campo);
      if (o) {
        evidCaso.push(mostrarHecho(o, req.campo));
        confCaso.push(confianzaDelHecho(o));
        continue;
      }
      const dAgente = caso.contexto.datosAgente?.find((d) => d.campo === req.campo);
      if (dAgente) {
        const ev: Evidencia = { tipo: 'dato_agente', campo: req.campo, dichoEl: dAgente.dichoEl };
        evidCaso.push(ev);
        confCaso.push('BAJA');
        r.afirmaciones.push({ texto: `${ETIQUETA[req.campo] ?? req.campo}: ${dAgente.valor} (según me indicaste)`, tipo: 'DATO_DEL_AGENTE', confianza: 'BAJA', grupo: 'informacion', evidencias: [ev] });
        continue;
      }
      const ilegible = caso.documentos.find((d) => d.noEntendido.includes(req.campo));
      faltante(ilegible
        ? { que: `${ETIQUETA[req.campo] ?? req.campo} (no pude leerlo en ${ilegible.nombre})`, porque: req.porque, quien: 'agente' }
        : { que: req.que, porque: req.porque, quien: req.quien, documentoTipo: req.documentoTipo });
      completo = false;
    }
    if (!completo || fallidas.length) continue;

    const ctx: EvalCtx = {
      caso, asOf, hecho: hechoDe,
      unidad: (id) => core.unidades.find((x) => x.id === id)!,
      tabla: (tablaId, clave) => core.tablas.find((x) => x.tablaId === tablaId && x.clave === clave)!,
    };
    if (regla.aplica && !regla.aplica(ctx)) continue;

    // Tablas.
    const tabs = (regla.tablas?.({ asOf }) ?? []).map((t) => resolverTabla(t.tablaId, t.clave, t.tema));
    if (tabs.some((t) => !t.ok)) continue;

    // Afirmaciones de las unidades (norma, hecho o práctica), sin duplicar.
    const evidUnidades: Evidencia[] = [];
    const confUnidades: Confianza[] = [];
    for (const x of resol) {
      const u = x.unidad!;
      evidUnidades.push(x.evidencia!);
      confUnidades.push(x.confianza!);
      aud.unidades.add(u.id);
      if (x.versionId) aud.versiones.add(x.versionId);
      if (unidadesUsadas.has(u.id)) continue;
      unidadesUsadas.add(u.id);
      r.afirmaciones.push({
        texto: u.afirmacion!,
        tipo: u.tipo,
        confianza: x.confianza!,
        grupo: u.tipo === 'PRACTICA' ? (regla.grupo === 'recomendacion' ? 'recomendacion' : 'requisito_habitual') : regla.grupo,
        evidencias: [x.evidencia!],
        aplicacion: regla.aplicacion?.(ctx),
        nota: x.nota,
      });
    }
    for (const t of tabs) {
      r.afirmaciones.push({
        texto: t.valor!.tablaId === 'TAB-UIT' ? `UIT ${t.valor!.periodo}: S/ ${t.valor!.valor.toLocaleString('en-US')}` : `${t.valor!.tablaId} ${t.valor!.clave} (${t.valor!.periodo}): ${t.valor!.valor}`,
        tipo: 'HECHO', confianza: t.confianza!, grupo: 'informacion', evidencias: [t.evidencia!], nota: t.nota,
      });
    }

    // Interpretación (reglas normativas) o recomendación (práctica/caso).
    // P1.1: el texto lo redacta MUNAY en la regla; que sus unidades estén ACTIVAS no aprueba esa redacción.
    // Sin aprobación explícita: confianza máxima MEDIA, marcada como BORRADOR y nunca como requisito/consecuencia legal.
    const texto = regla.texto?.(ctx) ?? null;
    if (texto) {
      const aprobada = core.aprobacionesRedaccion.some((a) => a.reglaId === regla.id);
      const confianza = menor([...confUnidades, ...tabs.map((t) => t.confianza!), ...confCaso]);
      const esLegal = regla.grupo === 'requisito_legal' || regla.grupo === 'consecuencia_legal';
      r.afirmaciones.push({
        texto,
        tipo: regla.naturaleza === 'NORMATIVA' ? 'INTERPRETACION' : 'RECOMENDACION',
        confianza: aprobada ? confianza : menor([confianza, 'MEDIA']),
        grupo: aprobada || !esLegal ? regla.grupo : 'informacion',
        evidencias: [...evidUnidades, ...tabs.map((t) => t.evidencia!), ...evidCaso],
        aplicacion: regla.aplicacion?.(ctx),
        nota: aprobada ? regla.nota : [regla.nota, 'Redacción de MUNAY pendiente de aprobación: no es una conclusión consolidada.'].filter(Boolean).join(' '),
        redaccion: aprobada ? 'APROBADA' : 'BORRADOR',
      });
    }

    for (const fa of regla.faltantesAlAplicar ?? []) {
      if (presente(fa.documentoTipo)) continue;
      const rel = relevancia(fa.documentoTipo);
      if (rel === 'REQUIRED') faltante({ que: fa.que, porque: fa.porque, quien: fa.quien, documentoTipo: fa.documentoTipo });
      else if (rel === 'OPTIONAL') profundizar(fa.documentoTipo, fa.porque);
    }
    if (regla.accion) accionesPosibles.push(regla.accion);
  }

  // Temas que P1 no cubre (J1 explícito).
  for (const tema of consulta.temasSinCobertura ?? []) sinRespaldo({ tema, motivo: 'tema_fuera_de_P1', referencias: [] });

  // REQUIERE PROFESIONAL (J8).
  const senales = [...new Set([...senalesDelCaso(caso), ...(consulta.senales?.(caso) ?? [])])];
  const motivos = senales.map((s) => DERIVACION[s].motivo);
  const preguntas = senales.map((s) => DERIVACION[s].pregunta);
  if (consulta.derivacionFija) {
    motivos.push(consulta.derivacionFija.motivo);
    preguntas.push(...consulta.derivacionFija.preguntas);
  }
  if (motivos.length) r.requiereProfesional = { motivos, preguntas };

  // Titular: lo importante, sin inventar.
  // Orden: lo respaldado → "sin respaldo" (aunque además falten documentos) → lo que falta.
  const SIN = 'No encuentro respaldo suficiente en el conocimiento disponible.';
  const pedir = (f: Faltante) => `Para determinarlo necesito: ${f.que.charAt(0).toLowerCase()}${f.que.slice(1)}.`;
  const legal = r.afirmaciones.find((a) => a.grupo === 'consecuencia_legal' || a.grupo === 'requisito_legal');
  const conRespaldo = r.afirmaciones.some((a) => !['DATO_DEL_CASO', 'DATO_DEL_AGENTE', 'INCERTIDUMBRE'].includes(a.tipo));
  if (legal) r.titular = legal.texto;
  else if (r.sinRespaldo.length && !conRespaldo) r.titular = r.faltantes.length ? `${SIN} Además, ${pedir(r.faltantes[0]).charAt(0).toLowerCase()}${pedir(r.faltantes[0]).slice(1)}` : SIN;
  else if (r.faltantes.length) r.titular = pedir(r.faltantes[0]);
  else r.titular = r.afirmaciones.find((a) => a.tipo !== 'DATO_DEL_CASO')?.texto ?? SIN;
  if (r.requiereProfesional) r.titular += ' Esto requiere revisión profesional.';

  // Acciones epistemológicas: qué debe verificar el sistema antes de usar una conclusión.
  // No son recomendaciones jurídicas ni tareas del cliente.
  for (const s of r.sinRespaldo) {
    if (s.motivo === 'tema_fuera_de_P1' || s.motivo === 'zona_fuera_de_P1') continue;
    const ref = s.referencias[0] ?? s.tema;
    const u = core.unidades.find((x) => x.id === ref);
    const donde = u ? ` en ${fuente(u.fuenteId)?.nombre ?? u.fuenteId}` : '';
    const verbo = s.motivo === 'tabla_no_activa' ? 'Verificar y aprobar' : s.motivo === 'unidad_no_activa' ? 'Verificar' : 'Revisar la vigencia de';
    const texto = `${verbo} «${u?.tema ?? s.tema}» (${ref})${donde} antes de utilizar esta conclusión.`;
    if (!r.accionesEpistemicas.some((a) => a.referencia === ref)) r.accionesEpistemicas.push({ texto, referencia: ref });
  }

  const operativa = (a: { texto: string; responsable: string }) => ({ ...a, tipo: 'operativa' as const });
  r.siguienteAccion =
    (accionesPosibles[0] ? operativa(accionesPosibles[0]) : null) ??
    (r.faltantes[0] ? operativa({ texto: `Conseguir ${r.faltantes[0].que}.`, responsable: r.faltantes[0].quien }) : null) ??
    (r.requiereProfesional ? operativa({ texto: 'Consultar al profesional con las preguntas preparadas.', responsable: 'agente' }) : null) ??
    (r.accionesEpistemicas[0] ? { texto: r.accionesEpistemicas[0].texto, responsable: 'curación del Core (MUNAY)', tipo: 'epistemica' as const } : null);

  r.violacionesLenguaje = violacionesDeLenguaje(r.afirmaciones);
  r.auditoria = { unidades: [...aud.unidades], versiones: [...aud.versiones], tablas: [...aud.tablas], documentos: [...aud.documentos] };
  return r;
}

/** Reconstruye la respuesta desde sus IDs: toda evidencia debe existir y coincidir con el Core y el caso. */
export function reconstruir(r: Respuesta, core: CoreStore, caso: Caso): { ok: boolean; errores: string[] } {
  const errores: string[] = [];
  for (const a of r.afirmaciones) {
    if (a.tipo !== 'INCERTIDUMBRE' && a.evidencias.length === 0) errores.push(`Afirmación sin evidencia: "${a.texto}"`);
    for (const e of a.evidencias) {
      if (e.tipo === 'norma') {
        const n = core.normas.find((x) => x.id === e.normaId);
        const s = core.secciones.find((x) => x.normaId === e.normaId && x.versionId === e.versionId && x.referencia === e.referencia);
        if (!n || !n.versiones.some((v) => v.id === e.versionId)) errores.push(`Versión inexistente: ${e.normaId}/${e.versionId}`);
        if (!s || s.extracto !== e.extracto) errores.push(`Extracto no coincide: ${e.normaId} ${e.referencia}`);
      } else if (e.tipo === 'tabla') {
        const t = core.tablas.find((x) => x.id === e.valorId);
        if (!t || t.estado !== 'ACTIVO') errores.push(`Tabla inexistente o no activa: ${e.valorId}`);
      } else if (e.tipo === 'unidad') {
        if (!core.unidades.some((x) => x.id === e.unidadId)) errores.push(`Unidad inexistente: ${e.unidadId}`);
      } else if (e.tipo === 'documento_caso') {
        const d = caso.documentos.find((x) => x.id === e.documentoId);
        if (!d || !d.hechos.some((h) => h.campo === e.campo)) errores.push(`Hecho del caso inexistente: ${e.documentoId}/${e.campo}`);
      }
    }
  }
  return { ok: errores.length === 0, errores };
}
