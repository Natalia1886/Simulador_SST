const fs = require('fs');

// 1. Landing Navigation
let l = fs.readFileSync('./stitch_screens/01_landing_selector.html', 'utf8');
l = l.replace(/onclick="irALoginDocente\(\)"/g, 'onclick="window.location.href=\'02_login_docente.html\'"');
l = l.replace(/onclick="conectarSimulador\('Ministerio del Trabajo \(SGRL\)'\)"/g, 'onclick="window.location.href=\'03_login_mintrabajo.html\'"');
l = l.replace(/onclick="conectarSimulador\('Autoevaluaci[oó]n ARL SURA'\)"/g, 'onclick="window.location.href=\'04_login_arl_sura.html\'"');
fs.writeFileSync('./stitch_screens/01_landing_selector.html', l);

// 2. Login Docente Navigation
let ld = fs.readFileSync('./stitch_screens/02_login_docente.html', 'utf8');
ld = ld.replace(/onsubmit="event\.preventDefault\(\);"/g, 'onsubmit="event.preventDefault(); window.location.href=\'05_docente_dashboard.html\';"');
ld = ld.replace(/href="#" class="back-role-link"/g, 'href="01_landing_selector.html" class="back-role-link"');
fs.writeFileSync('./stitch_screens/02_login_docente.html', ld);

// 3. Login MinTrabajo Navigation
let lm = fs.readFileSync('./stitch_screens/03_login_mintrabajo.html', 'utf8');
lm = lm.replace(/onsubmit="event\.preventDefault\(\);"/g, 'onsubmit="event.preventDefault(); window.location.href=\'07_mintrabajo_estudiante.html\';"');
lm = lm.replace(/href="#" class="back-role-link"/g, 'href="01_landing_selector.html" class="back-role-link"');
fs.writeFileSync('./stitch_screens/03_login_mintrabajo.html', lm);

// 4. Login ARL SURA Navigation
let la = fs.readFileSync('./stitch_screens/04_login_arl_sura.html', 'utf8');
la = la.replace(/onsubmit="event\.preventDefault\(\);"/g, 'onsubmit="event.preventDefault(); window.location.href=\'06_arl_sura_evaluacion.html\';"');
la = la.replace(/href="#" class="back-role-link"/g, 'href="01_landing_selector.html" class="back-role-link"');
fs.writeFileSync('./stitch_screens/04_login_arl_sura.html', la);

// 5. Docente Dashboard back link / logout
let dd = fs.readFileSync('./stitch_screens/05_docente_dashboard.html', 'utf8');
dd = dd.replace(/href="#"/g, 'href="javascript:void(0)"');
fs.writeFileSync('./stitch_screens/05_docente_dashboard.html', dd);

// 6. ARL SURA Evaluation back link / logout
let se = fs.readFileSync('./stitch_screens/06_arl_sura_evaluacion.html', 'utf8');
se = se.replace(/href="#"/g, 'href="javascript:void(0)"');
fs.writeFileSync('./stitch_screens/06_arl_sura_evaluacion.html', se);

// 7. MinTrabajo Estudiante back link / logout
let me = fs.readFileSync('./stitch_screens/07_mintrabajo_estudiante.html', 'utf8');
me = me.replace(/href="#"/g, 'href="javascript:void(0)"');
fs.writeFileSync('./stitch_screens/07_mintrabajo_estudiante.html', me);

console.log('Successfully wired all prototype screens navigation!');
