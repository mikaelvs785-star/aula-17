// =============================================================
// LabReserva · Sistema de reserva de laboratórios
// Versão 1.4 (homologação) · UC 10 · Aula 17 · Missão QA
// -------------------------------------------------------------
// Para rodar:   node server.js
// Depois abra:  http://localhost:4000
// Não precisa instalar nada: só Node.js 18 ou mais recente.
// =============================================================

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORTA = process.env.PORTA || 4000;
const PASTA_PUBLICA = path.join(__dirname, 'public');

// ---------- dados em memória (reiniciar o servidor volta ao início) ----------
const usuarios = [
  { email: 'instrutor1@senac.br', senha: '123456', nome: 'Ana Instrutora', perfil: 'instrutor' },
  { email: 'instrutor2@senac.br', senha: '123456', nome: 'Bruno Instrutor', perfil: 'instrutor' },
  { email: 'coordenacao@senac.br', senha: '123456', nome: 'Carla Coordenadora', perfil: 'coordenador' }
];

const laboratorios = [
  { id: 1, nome: 'Laboratório 1', capacidade: 20, recursos: '20 computadores, projetor' },
  { id: 2, nome: 'Laboratório 2', capacidade: 30, recursos: '30 computadores, projetor, lousa digital' },
  { id: 3, nome: 'Laboratório de Redes', capacidade: 16, recursos: '16 computadores, racks e switches' }
];

// Próximos dias úteis a partir de amanhã, para criar reservas de exemplo
function proximosDiasUteis(qtd) {
  const dias = []; const d = new Date();
  while (dias.length < qtd) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) dias.push(paraISO(d));
  }
  return dias;
}
function paraISO(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

const [dia1, dia2] = proximosDiasUteis(2);
let proximoId = 1;
const reservas = [
  { id: proximoId++, labId: 1, data: dia1, inicio: '08:00', fim: '10:00', turma: '2025.08.177', alunos: 18, dono: 'instrutor2@senac.br' },
  { id: proximoId++, labId: 1, data: dia1, inicio: '14:00', fim: '16:00', turma: '2025.08.179', alunos: 20, dono: 'instrutor1@senac.br' },
  { id: proximoId++, labId: 2, data: dia1, inicio: '19:00', fim: '22:00', turma: '2025.08.180', alunos: 25, dono: 'instrutor2@senac.br' },
  { id: proximoId++, labId: 3, data: dia2, inicio: '09:00', fim: '11:00', turma: '2025.08.178', alunos: 12, dono: 'instrutor2@senac.br' }
];

// ---------- monitoramento simples ----------
let ativas = 0;

// ---------- apoio ----------
const esperar = ms => new Promise(r => setTimeout(r, ms));
function json(res, status, dados) {
  const corpo = JSON.stringify(dados);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(corpo) });
  res.end(corpo);
}
function lerCorpo(req) {
  return new Promise(resolve => {
    let d = ''; req.on('data', p => (d += p));
    req.on('end', () => { try { resolve(d ? JSON.parse(d) : {}); } catch (e) { resolve(null); } });
  });
}
function usuarioDoToken(req) {
  const h = req.headers['authorization'] || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  const email = token.startsWith('tk-') ? token.slice(3) : '';
  return usuarios.find(u => u.email === email) || null;
}
const minutos = h => { const [a, b] = h.split(':').map(Number); return a * 60 + b; };
const horaValida = h => /^\d{2}:\d{2}$/.test(h || '');
const dataValida = d => /^\d{4}-\d{2}-\d{2}$/.test(d || '');
function diaDaSemana(data) { const [y, m, d] = data.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); }

function validarReserva(r) {
  const lab = laboratorios.find(l => l.id === Number(r.labId));
  if (!lab) return { status: 400, erro: 'Escolha um laboratório' };
  if (!dataValida(r.data)) return { status: 400, erro: 'Informe a data da reserva' };
  if (r.data < paraISO(new Date())) return { status: 400, erro: 'A data não pode estar no passado' };
  if (diaDaSemana(r.data) === 0) return { status: 400, erro: 'Reservas só de segunda a sexta-feira' };
  if (!horaValida(r.inicio) || !horaValida(r.fim)) return { status: 400, erro: 'Informe o horário de início e de fim' };
  const ini = minutos(r.inicio), fim = minutos(r.fim);
  if (ini < 7 * 60 || fim > 22 * 60) return { status: 400, erro: 'O horário deve ficar entre 07:00 e 22:00' };
  if (fim < ini) return { status: 400, erro: 'O horário de fim deve ser depois do início' };
  if (fim - ini > 240) return { status: 400, erro: 'A reserva pode ter no máximo 4 horas' };
  if (r.turma.trim() === '') return { status: 400, erro: 'Informe a turma' };
  const alunos = Number(r.alunos);
  if (!Number.isInteger(alunos) || alunos < 1) return { status: 400, erro: 'Informe o número de alunos' };
  if (alunos > lab.capacidade + 1) return { status: 400, erro: `O ${lab.nome} comporta no máximo ${lab.capacidade} alunos` };
  const conflito = reservas.find(x => x.labId === lab.id && x.data === r.data &&
    ((ini >= minutos(x.inicio) && ini < minutos(x.fim)) || (fim > minutos(x.inicio) && fim <= minutos(x.fim))));
  if (conflito) return { status: 409, erro: 'Erro 409: CONFLICT_OVERLAP' };
  return null;
}

// ---------- rotas da API ----------
async function api(req, res, url) {
  if (req.method === 'POST' && url === '/api/login') {
    const c = await lerCorpo(req);
    if (!c || !c.email || !c.senha) return json(res, 400, { erro: 'Informe o e-mail e a senha' });
    const u = usuarios.find(x => x.email === String(c.email).trim().toLowerCase() && x.senha === c.senha);
    if (!u) return json(res, 401, { erro: 'E-mail ou senha incorretos' });
    return json(res, 200, { token: 'tk-' + u.email, nome: u.nome, perfil: u.perfil, email: u.email });
  }

  const u = usuarioDoToken(req);
  if (!u) return json(res, 401, { erro: 'Faça login para continuar' });

  if (req.method === 'GET' && url === '/api/laboratorios') {
    await esperar(15);
    return json(res, 200, laboratorios);
  }

  if (req.method === 'GET' && url === '/api/reservas') {
    const q = new URL(req.url, 'http://x').searchParams;
    await esperar(30 + 40 * ativas);
    const lista = reservas
      .filter(r => (!q.get('lab') || r.labId === Number(q.get('lab'))) && (!q.get('data') || r.data === q.get('data')))
      .sort((a, b) => (a.data + a.inicio).localeCompare(b.data + b.inicio))
      .map(r => ({ ...r, donoNome: (usuarios.find(x => x.email === r.dono) || {}).nome }));
    return json(res, 200, lista);
  }

  if (req.method === 'GET' && url === '/api/minhas-reservas') {
    const lista = reservas.filter(r => r.dono === u.email)
      .sort((a, b) => (a.data + a.inicio).localeCompare(b.data + b.inicio))
      .map(r => ({ ...r, labNome: laboratorios.find(l => l.id === r.labId).nome }));
    return json(res, 200, lista);
  }

  if (req.method === 'POST' && url === '/api/reservas') {
    const c = await lerCorpo(req);
    if (!c) return json(res, 400, { erro: 'Dados em formato inválido' });
    const problema = validarReserva(c);
    if (problema) return json(res, problema.status, { erro: problema.erro });
    const nova = { id: proximoId++, labId: Number(c.labId), data: c.data, inicio: c.inicio, fim: c.fim, turma: c.turma.trim(), alunos: Number(c.alunos), dono: u.email };
    reservas.push(nova);
    return json(res, 201, nova);
  }

  const m = url.match(/^\/api\/reservas\/(\d+)$/);
  if (req.method === 'DELETE' && m) {
    const i = reservas.findIndex(r => r.id === Number(m[1]));
    if (i < 0) return json(res, 404, { erro: 'Reserva não encontrada' });
    reservas.splice(i, 1);
    return json(res, 200, { mensagem: 'Reserva cancelada' });
  }

  return json(res, 404, { erro: 'Rota não encontrada' });
}

// ---------- arquivos da tela ----------
const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
function estatico(req, res, url) {
  const arquivo = path.join(PASTA_PUBLICA, url === '/' ? 'index.html' : path.normalize(url).replace(/^([/\\])+/, ''));
  if (!arquivo.startsWith(PASTA_PUBLICA)) { res.writeHead(403); return res.end(); }
  fs.readFile(arquivo, (err, dados) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Página não encontrada'); }
    res.writeHead(200, { 'Content-Type': TIPOS[path.extname(arquivo)] || 'application/octet-stream' });
    res.end(dados);
  });
}

http.createServer(async (req, res) => {
  const url = req.url.split('?')[0];
  ativas++; res.on('finish', () => ativas--); res.on('close', () => { if (!res.writableFinished) ativas--; });
  try {
    if (url.startsWith('/api/')) await api(req, res, url);
    else estatico(req, res, url);
  } catch (e) {
    console.error('[erro]', e.message);
    if (!res.headersSent) json(res, 500, { erro: 'Erro interno do servidor' });
  }
}).listen(PORTA, () => {
  console.log('==============================================');
  console.log(` LabReserva v1.4 rodando: http://localhost:${PORTA}`);
  console.log(' Para parar: Ctrl + C');
  console.log('==============================================');
});
