# LabReserva v1.4 · Documento de requisitos

O **LabReserva** é usado pelos instrutores do SENAC-DF para reservar os laboratórios da unidade.
A coordenação acompanha as reservas e pode cancelar qualquer uma.

Este documento é o **oráculo** da avaliação: o resultado esperado de cada teste vem daqui, nunca do que a tela mostra.

## Perfis e usuários de teste

| Perfil | E-mail | Senha | Nome |
|---|---|---|---|
| Instrutor | instrutor1@senac.br | 123456 | Ana Instrutora |
| Instrutor | instrutor2@senac.br | 123456 | Bruno Instrutor |
| Coordenação | coordenacao@senac.br | 123456 | Carla Coordenadora |

## Laboratórios

| Id | Laboratório | Capacidade |
|---|---|---|
| 1 | Laboratório 1 | 20 alunos |
| 2 | Laboratório 2 | 30 alunos |
| 3 | Laboratório de Redes | 16 alunos |

## Requisitos funcionais (RF)

- **RF01 · Login.** O usuário entra com e-mail e senha. Os dois campos são obrigatórios. Dados incorretos mostram "E-mail ou senha incorretos".
- **RF02 · Sair.** O botão Sair encerra a sessão e volta para a tela de login com os campos vazios.
- **RF03 · Nova reserva.** O usuário informa laboratório, data, horário de início, horário de fim, turma e número de alunos. Todos os campos são obrigatórios. Ao confirmar, o sistema mostra o número da reserva, a data e o horário.
- **RF04 · Agenda do laboratório.** Mostra as reservas de um laboratório em uma data, com início, fim, turma, número de alunos e responsável.
- **RF05 · Minhas reservas.** Lista as reservas do usuário logado, em ordem de data e horário, e permite cancelar cada uma. Depois de cancelar, a reserva sai da lista na hora.
- **RF06 · Cancelamento.** Cancelar remove a reserva da agenda e libera o horário.

## Regras de negócio (RN)

- **RN01 · Capacidade.** O número de alunos deve ser de 1 até a capacidade do laboratório.
- **RN02 · Datas.** Não é possível reservar datas no passado. Reservas só de **segunda a sexta-feira**.
- **RN03 · Horários.** Início e fim entre **07:00 e 22:00**. O fim deve ser **depois** do início. Duração máxima de **4 horas**.
- **RN04 · Conflito.** Duas reservas do mesmo laboratório no mesmo dia **não podem se sobrepor**. Reservas que só encostam são permitidas (08:00–10:00 e 10:00–12:00).
- **RN05 · Permissão.** O instrutor só pode cancelar **as próprias** reservas. A coordenação pode cancelar **qualquer** reserva.

## Requisitos da API (para testes com Postman)

Endereço: `http://localhost:4000`. Depois do login, envie o cabeçalho `Authorization: Bearer <token>`.

| Método | Rota | Corpo (JSON) | Sucesso |
|---|---|---|---|
| POST | /api/login | `{"email":"...","senha":"..."}` | 200 com `token` |
| GET | /api/laboratorios | — | 200 |
| GET | /api/reservas?lab=1&data=AAAA-MM-DD | — | 200 |
| GET | /api/minhas-reservas | — | 200 |
| POST | /api/reservas | `{"labId":1,"data":"AAAA-MM-DD","inicio":"08:00","fim":"10:00","turma":"2025.08.179","alunos":20}` | 201 |
| DELETE | /api/reservas/{id} | — | 200 |

- **RF07 · Códigos de resposta.** A API deve responder **400** para dados inválidos ou faltando, **401** sem login, **403** sem permissão, **404** para o que não existe e **409** para conflito de horário. A API **nunca** deve responder 500 por causa de dados enviados pelo usuário.

## Requisitos não funcionais (RNF)

- **RNF01 · Usabilidade.** Toda mensagem de erro deve estar em português claro e dizer o que o usuário precisa corrigir. Sem códigos técnicos.
- **RNF02 · Acessibilidade.** Todo campo de formulário tem rótulo visível ligado a ele. Todo botão tem nome acessível. Texto com contraste mínimo de 4,5:1 (WCAG AA).
- **RNF03 · Responsividade.** As telas funcionam a partir de 360 px de largura, sem rolagem horizontal.
- **RNF04 · Desempenho.** Com 20 usuários simultâneos, `GET /api/laboratorios` e `GET /api/reservas` devem ter percentil 90 de no máximo 500 ms e taxa de erro de no máximo 1%.
