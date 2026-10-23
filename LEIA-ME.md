# Aula 17 · Avaliação prática · Missão QA

Sua equipe foi contratada para testar o **LabReserva v1.4** antes de ele entrar em produção.
A missão é planejar, executar e registrar os testes, e entregar uma conclusão: **o sistema pode ou não pode ser liberado?**

Siga o **guia da avaliação** (link enviado pela professora). As respostas ficam no guia e a entrega é feita pelo botão **Copiar entrega**.

## O que tem aqui

| Pasta / arquivo | Para que serve |
|---|---|
| `REQUISITOS.md` | O que o sistema **deve** fazer. É daqui que sai o resultado esperado de cada teste. |
| `sistema/` | O LabReserva: tela e API. Feito só com Node.js. |
| `modelos/casos-de-teste.csv` | Modelo da planilha de casos de teste. Abre no Excel ou no Google Planilhas. |
| `modelos/registro-execucao.csv` | Modelo para registrar a execução e as evidências. |

## Ligar o sistema

1. Abra a pasta `aula17-missao-qa` no VS Code.
2. No terminal: `cd sistema` e depois `node server.js`
3. Abra **http://localhost:4000** no navegador.
4. Deixe esse terminal aberto. Para voltar os dados ao início, pare (`Ctrl + C`) e ligue de novo.

## Ferramentas permitidas

Tudo o que vimos na UC 10: navegador e DevTools, Postman, Lighthouse, VS Code, Cypress e JMeter.
Pode consultar os slides e as práticas das aulas anteriores.

## Regras da avaliação

- Trabalho em equipe. Cada integrante executa pelo menos um bloco de testes.
- **Não altere o código do sistema.** Vocês são a equipe de testes, não a de desenvolvimento.
- Todo defeito precisa de **evidência**: print, resposta do Postman ou relatório.
- Guardem tudo numa pasta `evidencias/` com nomes que digam o que é, como `CT03-login-senha-errada.png`.
- As evidências serão usadas de novo nas Aulas 18, 19 e 20.

## Datas de teste

O sistema não aceita datas passadas. Use datas **dos próximos dias**. A agenda já tem reservas de exemplo nos próximos dois dias úteis.
