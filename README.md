# Assistência Técnica SaaS - Guia de Execução Local

Bem-vindo(a) ao projeto **Assistência Técnica SaaS**! Siga rigorosamente este guia passo a passo completo para executar a aplicação na sua máquina (ambiente Windows/PowerShell).

---

## 1. Requisitos Prévios

Antes de tudo, confira se possui os requisitos listados:
- **Node.js** instalado (versão 18 ou superior. Recomendado: Node.js 20 LTS)
- **Um Banco de Dados PostgreSQL** (Ex: Neon, Supabase, ou local)
- Porta `5000` (Backend) e `5173` (Frontend) liberadas na sua máquina.

### Instalação do Node.js (via PowerShell)
Se você não possui o Node.js instalado:
1. Abra o **PowerShell como Administrador**.
2. Rode o comando de instalação:
   ```powershell
   winget install OpenJS.NodeJS.LTS
   ```
3. **Importante:** Feche o PowerShell e abra um novo antes de continuar, para o Windows reconhecer que o node foi instalado.

---

## 2. Passo a Passo do Backend (Servidor)

1. No seu PowerShell recém-aberto, navegue para a pasta do backend:
   ```powershell
   cd "backend"
   ```
   *(Caso não esteja na pasta raiz, navegue usando o caminho completo ou explore até a pasta do projeto.)*

2. Instale todas as dependências do servidor:
   ```powershell
   npm install
   ```

3. Crie o seu arquivo oculto de variáveis de ambiente(`.env`), duplicando o nosso modelo (`env.example`):
   ```powershell
   Copy-Item -Path .\env.example -Destination .\.env
   ```

4. Abra e edite arquivo `.env`. Para abri-lo usando o Bloco de Notas:
   ```powershell
   notepad .\.env
   ```
   Dentro dele:
   - Defina a sua variável `DATABASE_URL` contendo a string de acesso ao seu banco de dados (ex: link do Neon, Supabase, render, local, etc).
   - Configure opcionalmente os dados para envio de E-mail ou WhatsApp.
   - Pressione `Ctrl + S` para salvar, e feche o bloco de notas.

5. Execute a inicialização do Servidor/Backend:
   ```powershell
   npm run dev
   ```
   > **Atenção:** Mantenha esta janela aberta! Se você a fechar, o backend deixará de funcionar.

---

## 3. Passo a Passo do Frontend (Interface)

1. Abra uma **nova guia / nova janela** de PowerShell (deixe a do Backend rodando isoladamente).

2. Navegue até a pasta frontend:
   ```powershell
   cd "frontend"
   ```

3. Baixe e instale as dependências da interface:
   ```powershell
   npm install
   ```

4. Coloque a interface para rodar executando:
   ```powershell
   npm run dev
   ```
   No seu terminal aparecerá um link local em verde, normalmente sendo `http://localhost:5173/`.
   > **Atenção:** Assim como o backend, mantenha esta janela do frontend aberta o tempo tempo.

---

## 4. Acessando Inicialmente o Sistema

1. Abra o navegador da sua escolha (Google Chrome, Edge, etc).
2. Acesse a URL que o frontend disponibilizou: 
   **`http://localhost:5173`**
3. Na tela de **Login**, você pode acessar utilizando os dados de usuário já pré-cadastrados (se usou um seed de banco completo) ou os dados criados. Abaixo temos um usuário de demonstração:
   - **Email:** `carlos@empresa.com`
   - **Senha:** `123456`

Pronto! Agora o sistema estará rodando de ponta a ponta perfeitamente na sua máquina.
