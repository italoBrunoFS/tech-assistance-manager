# Checklist de Requisitos

Documento de referência: `D:\Downloads\Projeto_Eng_de_Software (1).pdf`

| Requisito | Status | Evidência no código | Observação |
| --- | --- | --- | --- |
| Cadastro de clientes | Implementado | `backend/routes/clientsRoute.js`, `backend/controllers/clientsController.js` | CRUD disponível. |
| Cadastro de equipamentos | Implementado | `backend/routes/equipmentRoute.js`, `backend/controllers/equipmentController.js` | CRUD disponível. |
| Criação de ordem de serviço | Implementado | `backend/routes/osRoute.js`, `backend/controllers/osController.js` | Criação básica disponível. |
| Status básico da OS (Aberto, Em Análise, Concluído) | Parcial | `backend/controllers/osController.js`, `backend/models/osModel.js` | Há criação e alteração de status, mas não existe validação explícita dos estados permitidos. |
| Busca rápida por telefone | Implementado | `backend/routes/clientsRoute.js`, `backend/controllers/clientsController.js` | Busca por `telefone` disponível via query string. |
| Busca rápida por nome | Não implementado | `backend/routes/clientsRoute.js` | Só há busca por email e telefone. |
| Comunicação automática ao cliente em mudança de status | Não implementado | `backend/controllers/notificationController.js`, `backend/models/notificationModel.js` | Existe apenas cadastro manual de notificações; não há disparo automático no patch de status. |
| Integração com WhatsApp/SMS | Não implementado | `backend/package.json`, `backend/routes/notificationRoute.js` | Não há SDK, serviço externo ou integração real com provedor. |
| Página pública para consulta de status | Parcial | `backend/routes/osRoute.js`, `backend/models/osModel.js` | Há endpoint JSON público para status, mas não existe página pública renderizada. |
| Consulta pública via QR Code ou link | Parcial | `backend/routes/osRoute.js` | O link pode ser inferido pelo endpoint, mas não existe geração de QR Code. |
| Histórico completo por aparelho | Parcial | `backend/routes/equipmentRoute.js`, `backend/models/equipmentModel.js` | Há histórico por `id_equipamento`, mas não por identificadores como serial/IMEI. |
| Histórico por serial/IMEI | Não implementado | `backend/models/equipmentModel.js` | O modelo atual de equipamento não possui campos de serial ou IMEI. |
| Geração de orçamento/PDF | Implementado | `backend/controllers/osController.js`, `backend/routes/osRoute.js` | PDF da OS disponível. |
| Relatórios básicos de faturamento | Implementado | `backend/controllers/reportsController.js`, `backend/models/reportsModel.js` | Há receita total, mensal, por período e ticket médio. |
| Registro fotográfico do aparelho na entrada | Parcial | `backend/routes/photoRoute.js`, `backend/models/photoModel.js` | Há registro de URL de foto, mas não existe fluxo de upload/captura na entrada do aparelho. |
| Transparência no acompanhamento do serviço | Parcial | `backend/routes/osRoute.js` | Existe consulta de status, mas faltam comunicação automática, página pública completa e QR Code. |
| Aplicação web SaaS acessível por navegador | Parcial | `backend/public/index.html`, `backend/server.js` | Existe apenas HTML estático de mockup; o servidor não publica esse frontend com `express.static`. |
| Interface simples e intuitiva | Parcial | `backend/public/index.html`, `backend/public/styles.css` | Só há protótipo estático; não dá para considerar a interface funcional implementada. |
| Responsividade para celular | Parcial | `backend/public/styles.css` | O CSS tem media queries, mas o frontend real não está integrado ao backend. |
| Compatibilidade com navegadores antigos/hardware limitado | Não verificado | `backend/public/styles.css` | Requisito não funcional difícil de comprovar pelo código atual; sem testes ou estratégia específica. |
| Privacidade/LGPD com acesso apenas autenticado | Não implementado | `backend/server.js`, `backend/models/employeesModel.js` | Não há autenticação nem controle de acesso; além disso, `senha_hash` é exposto em consultas. |
| Armazenamento centralizado na nuvem | Parcial | `backend/db/db.js` | Usa PostgreSQL por `DATABASE_URL`, sugerindo banco remoto, mas isso depende do ambiente configurado. |
| Disponibilidade no horário comercial | Não verificado | `backend/server.js` | Não há monitoramento, healthcheck, deploy ou mecanismo que comprove disponibilidade. |

## Resumo

- Implementados: 8
- Parciais: 10
- Não implementados: 6
- Não verificados: 2

## Principais lacunas

1. Autenticação e controle de acesso.
2. Busca por nome.
3. Notificações automáticas por WhatsApp/SMS.
4. Página pública completa com QR Code.
5. Histórico por serial/IMEI. 
6. Fluxo real de registro fotográfico na entrada do aparelho.
