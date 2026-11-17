// Service worker do app de follow-up: guarda o app no aparelho e serve os vídeos do cache (com pedido por pedaço, que o player de vídeo usa).
const CACHE = "nl-followup-77d5ef6393";
const APP = ["./", "index.html", "manifest.webmanifest", "icone-192.png", "icone-512.png", "icone-180.png", "capas/logo.png", "capas/logop.png", "capas/sulpais.jpg", "capas/sulpais_independente.jpg", "capas/historia_sc.jpg", "capas/povos_sc.jpg", "capas/presidente_eua_sc.jpg", "capas/5cidades_alfabetizacao_eleicao.jpg", "capas/sc_paises.jpg", "capas/tunelbancomundialitapema.jpg", "capas/brasileirosfloridaitapema.jpg", "capas/guindastesportonave.jpg", "capas/itapema6praias.jpg", "capas/itapemanatal18.jpg", "capas/turistaitapema7noites.jpg", "capas/brasileirosvoltando.jpg", "capas/brennomatheusitapema.jpg", "capas/tunelraizesvivas.jpg", "capas/helipontomeiapraia.jpg", "capas/passarelapereque.jpg", "capas/verao_guardasois_itapema.jpg", "capas/molhestijucas.jpg", "capas/yachthousenuvenssenna.jpg", "capas/br101rankingcnt.jpg", "capas/shoppingportobelo.jpg", "capas/sc_contra_o_mundo.jpg", "capas/mundoescolheulitoralnorte.jpg", "capas/beto_carrero_duas_lonas.jpg", "capas/acoritapema.jpg", "capas/antesdeassinar_ep1_frentequadravistamar.jpg", "capas/volei_mundial_meia_praia.jpg", "capas/portobelo_2_5_bilhoes.jpg", "capas/carro_voador_litoral_sc.jpg", "capas/temporadanavios_bc.jpg", "capas/ferias_melhor_cidade_itapema.jpg", "capas/recordes_sc_itapema.jpg", "capas/cidade_so_litoral_norte.jpg", "capas/sul_desemprego_eua.jpg", "capas/roda_gigante_itapema.jpg", "capas/frente_mar_itapema.jpg", "capas/buraco_japao_itapema.jpg", "capas/namorado_gringo_itapema.jpg", "capas/raio_4h_itapema.jpg", "capas/santa_catarina_mineiros_lisiane.jpg", "capas/eleicao_exterior.jpg", "capas/assinatura_de_carro.jpg", "capas/transbordou_bc_itapema.jpg", "capas/diamaisfrio_cacador.jpg", "capas/famosos.jpg", "capas/porto_belo_194_anos.jpg", "capas/investir_itapema.jpg", "capas/dubai_itapema.jpg", "capas/serra_friosc.jpg", "capas/sennatower.jpg", "capas/santacatarina.jpg", "capas/balneariocamboriu.jpg", "capas/itapema.jpg", "capas/portobelo.jpg", "capas/bombinhas.jpg"];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(APP)));
});
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const velhos = (await caches.keys()).filter((k) => k.startsWith("nl-followup-") && k !== CACHE);
    // vídeos já baixados passam pra versão nova (não precisa baixar tudo de novo)
    const novo = await caches.open(CACHE);
    for (const k of velhos) {
      const c = await caches.open(k);
      for (const r of await c.keys()) if (r.url.includes("/videos/") && !(await novo.match(r))) await novo.put(r, await c.match(r));
      await caches.delete(k);
    }
    await self.clients.claim();
  })());
});
async function servirComRange(req, resp) {
  const range = req.headers.get("range");
  if (!range) return resp;
  const blob = await resp.blob();
  const m = /bytes=(\d*)-(\d*)/.exec(range) || [];
  const ini = m[1] ? parseInt(m[1], 10) : 0;
  const fim = m[2] ? parseInt(m[2], 10) : blob.size - 1;
  return new Response(blob.slice(ini, fim + 1), {
    status: 206,
    headers: { "Content-Type": "video/mp4", "Content-Range": `bytes ${ini}-${fim}/${blob.size}`, "Content-Length": String(fim - ini + 1), "Accept-Ranges": "bytes" }
  });
}
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const url = new URL(req.url); url.search = "";
    // listas que mudam todo dia: rede primeiro, cache se estiver sem internet
    if (/\/(noticias|dados)\.json$/.test(url.pathname)) {
      try { const r = await fetch(req, {cache: "no-store"}); if (r.ok) c.put(url.href, r.clone()); return r; }
      catch (err) { return (await c.match(url.href)) || Response.error(); }
    }
    const achado = await c.match(url.href);
    if (achado) return url.pathname.includes("/videos/") ? servirComRange(req, achado) : achado;
    try {
      const r = await fetch(req);
      if (r.ok && !url.pathname.includes("/videos/") && r.status === 200) c.put(url.href, r.clone());
      return r;
    } catch (err) {
      return (await c.match("index.html")) || Response.error();
    }
  })());
});
