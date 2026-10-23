// LabReserva · tela (front-end)
const $ = id => document.getElementById(id);
let sessao = null;          // { token, nome, perfil, email }
let laboratorios = [];

// ---------- chamadas à API ----------
async function chamar(metodo, caminho, corpo) {
  const opcoes = { method: metodo, headers: {} };
  if (sessao) opcoes.headers['Authorization'] = 'Bearer ' + sessao.token;
  if (corpo) { opcoes.headers['Content-Type'] = 'application/json'; opcoes.body = JSON.stringify(corpo); }
  const resp = await fetch(caminho, opcoes);
  let dados = {}; try { dados = await resp.json(); } catch (e) {}
  return { status: resp.status, dados };
}
function mensagem(id, texto, tipo) { const el = $(id); el.textContent = texto; el.className = 'msg ' + (tipo || ''); }
const dataBR = iso => iso.split('-').reverse().join('/');

// ---------- login ----------
$('form-login').addEventListener('submit', async e => {
  e.preventDefault();
  const r = await chamar('POST', '/api/login', { email: $('email').value.trim(), senha: $('senha').value });
  if (r.status !== 200) return mensagem('msg-login', r.dados.erro || 'Não foi possível entrar', 'erro');
  sessao = r.dados;
  $('nome-usuario').textContent = sessao.nome;
  $('perfil-usuario').textContent = sessao.perfil === 'coordenador' ? 'Coordenação' : 'Instrutor';
  $('tela-login').hidden = true; $('tela-sistema').hidden = false;
  mensagem('msg-login', '');
  await carregarLaboratorios();
  abrirAba('reservar');
});

$('btn-sair').addEventListener('click', () => {
  sessao = null; $('form-login').reset();
  $('tela-sistema').hidden = true; $('tela-login').hidden = false; $('email').focus();
});

// ---------- abas ----------
document.querySelectorAll('.aba').forEach(b => b.addEventListener('click', () => abrirAba(b.dataset.aba)));
function abrirAba(nome) {
  document.querySelectorAll('.aba').forEach(b => { const on = b.dataset.aba === nome; b.classList.toggle('ativa', on); b.setAttribute('aria-selected', on); });
  ['reservar', 'agenda', 'minhas'].forEach(p => ($('painel-' + p).hidden = p !== nome));
  if (nome === 'minhas') carregarMinhas();
}

// ---------- laboratórios ----------
async function carregarLaboratorios() {
  const r = await chamar('GET', '/api/laboratorios');
  laboratorios = r.dados;
  const opts = laboratorios.map(l => `<option value="${l.id}">${l.nome}</option>`).join('');
  $('r-lab').innerHTML = '<option value="">Selecione</option>' + opts;
  $('a-lab').innerHTML = opts;
}
$('r-lab').addEventListener('change', () => {
  const l = laboratorios.find(x => x.id === Number($('r-lab').value));
  $('info-lab').textContent = l ? `Capacidade: ${l.capacidade} alunos · ${l.recursos}` : '';
});

// ---------- nova reserva ----------
$('form-reserva').addEventListener('submit', async e => {
  e.preventDefault();
  const corpo = { labId: $('r-lab').value, data: $('r-data').value, inicio: $('r-inicio').value, fim: $('r-fim').value, turma: $('r-turma').value, alunos: $('r-alunos').value };
  const r = await chamar('POST', '/api/reservas', corpo);
  if (r.status === 201) {
    mensagem('msg-reserva', `Reserva #${r.dados.id} confirmada para ${dataBR(r.dados.data)}, das ${r.dados.inicio} às ${r.dados.fim}.`, 'ok');
    $('form-reserva').reset(); $('info-lab').textContent = '';
  } else {
    mensagem('msg-reserva', r.dados.erro || 'Não foi possível reservar', 'erro');
  }
});

// ---------- agenda ----------
$('btn-buscar').addEventListener('click', carregarAgenda);
async function carregarAgenda() {
  if (!$('a-data').value) return mensagem('msg-agenda', 'Escolha a data', 'erro');
  mensagem('msg-agenda', 'Carregando…');
  const r = await chamar('GET', `/api/reservas?lab=${$('a-lab').value}&data=${$('a-data').value}`);
  const corpo = $('agenda-corpo');
  if (!r.dados.length) { corpo.innerHTML = '<tr><td colspan="6" class="vazio">Nenhuma reserva neste dia.</td></tr>'; mensagem('msg-agenda', ''); return; }
  corpo.innerHTML = r.dados.map(x => `<tr data-cy="agenda-item">
    <td>${x.inicio}</td><td>${x.fim}</td><td>${x.turma}</td><td>${x.alunos}</td><td>${x.donoNome}</td>
    <td><button class="btn-x" data-id="${x.id}" aria-label="Cancelar reserva da turma ${x.turma}" data-cy="agenda-cancelar">✕</button></td></tr>`).join('');
  mensagem('msg-agenda', `${r.dados.length} reserva(s) encontrada(s).`);
}
$('agenda-corpo').addEventListener('click', async e => {
  const b = e.target.closest('.btn-x'); if (!b) return;
  const r = await chamar('DELETE', '/api/reservas/' + b.dataset.id);
  if (r.status === 200) { await carregarAgenda(); mensagem('msg-agenda', 'Reserva cancelada.', 'ok'); }
  else mensagem('msg-agenda', r.dados.erro || 'Não foi possível cancelar', 'erro');
});

// ---------- minhas reservas ----------
async function carregarMinhas() {
  const r = await chamar('GET', '/api/minhas-reservas');
  const lista = $('lista-minhas');
  if (!r.dados.length) { lista.innerHTML = ''; mensagem('msg-minhas', 'Você não tem reservas.'); return; }
  mensagem('msg-minhas', '');
  lista.innerHTML = r.dados.map(x => `<li data-cy="minhas-item"><span><strong>${dataBR(x.data)} · ${x.inicio} às ${x.fim}</strong><br>${x.labNome} · Turma ${x.turma} · ${x.alunos} alunos</span>
    <button class="sec" data-id="${x.id}" data-cy="minhas-cancelar">Cancelar</button></li>`).join('');
}
$('lista-minhas').addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b) return;
  const r = await chamar('DELETE', '/api/reservas/' + b.dataset.id);
  if (r.status === 200) mensagem('msg-minhas', 'Reserva cancelada.', 'ok');
  else mensagem('msg-minhas', r.dados.erro || 'Não foi possível cancelar', 'erro');
});
