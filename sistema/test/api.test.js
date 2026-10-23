const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');

const BASE_URL = 'http://localhost:4000';

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function proximoDiaUtil(offset = 0) {
  const hoje = new Date();
  hoje.setDate(hoje.getDate() + offset + 1);
  while (hoje.getDay() === 0 || hoje.getDay() === 6) {
    hoje.setDate(hoje.getDate() + 1);
  }
  return formatDate(hoje);
}

async function esperarServidor() {
  const ate = Date.now() + 10000;
  while (Date.now() < ate) {
    try {
      const resposta = await fetch(`${BASE_URL}/api/laboratorios`, {
        headers: { Authorization: 'Bearer tk-instrutor1@senac.br' }
      });
      if (resposta.status === 200) return;
    } catch (error) {
      // espera até o servidor ficar disponível
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error('Servidor não respondeu em até 10s');
}

async function login(email = 'instrutor1@senac.br', senha = '123456') {
  const resposta = await fetch(`${BASE_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha })
  });
  return { status: resposta.status, body: await resposta.json() };
}

async function criarReserva(token, payload) {
  const resposta = await fetch(`${BASE_URL}/api/reservas`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
  return { status: resposta.status, body: await resposta.json() };
}

let server;

before(async () => {
  server = spawn(process.execPath, ['server.js'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'ignore'
  });
  await esperarServidor();
});

after(() => {
  if (server && !server.killed) {
    server.kill('SIGTERM');
  }
});

describe('LabReserva API', () => {
  test('login com credenciais válidas retorna token', async () => {
    const resultado = await login();

    assert.equal(resultado.status, 200);
    assert.equal(resultado.body.email, 'instrutor1@senac.br');
    assert.match(resultado.body.token, /^tk-/);
    assert.equal(resultado.body.nome, 'Ana Instrutora');
  });

  test('login com senha incorreta retorna 401 e mensagem em português', async () => {
    const resultado = await login('instrutor1@senac.br', 'errada');

    assert.equal(resultado.status, 401);
    assert.equal(resultado.body.erro, 'E-mail ou senha incorretos');
  });

  test('reserva válida retorna 201 e confirma o cadastro', async () => {
    const loginOk = await login();
    const data = proximoDiaUtil(2);
    const resultado = await criarReserva(loginOk.body.token, {
      labId: 1,
      data,
      inicio: '11:00',
      fim: '13:00',
      turma: '2025.08.200',
      alunos: 15
    });

    assert.equal(resultado.status, 201);
    assert.equal(resultado.body.labId, 1);
    assert.equal(resultado.body.data, data);
    assert.equal(resultado.body.turma, '2025.08.200');
    assert.ok(resultado.body.id);
  });

  test('conflito de horários retorna 409', async () => {
    const loginOk = await login();
    const data = proximoDiaUtil(0);
    const resultado = await criarReserva(loginOk.body.token, {
      labId: 1,
      data,
      inicio: '09:00',
      fim: '11:00',
      turma: '2025.08.205',
      alunos: 12
    });

    assert.equal(resultado.status, 409);
    assert.match(resultado.body.erro, /CONFLICT|conflito|sobrep/i);
  });

  test('alunos acima da capacidade devem ser rejeitados', async () => {
    const loginOk = await login();
    const data = proximoDiaUtil(3);
    const resultado = await criarReserva(loginOk.body.token, {
      labId: 1,
      data,
      inicio: '08:00',
      fim: '10:00',
      turma: '2025.08.210',
      alunos: 21
    });

    assert.equal(resultado.status, 400);
    assert.match(resultado.body.erro, /máximo 20|capacidade|comporta/i);
  });
});
