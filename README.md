# firebase-webhook-bitbucket-chat

Webhook de integração entre Bitbucket e Google Chat utilizando Firebase.

A maneira que o código foi idealizado permite que ele seja utilizado para direcionar as mensagens para vários webhooks do Google Chat sem a necessidade de possuir uma instância específica do serviço para cada bot.

## Parâmetros

### chat

Identificador da sala do Google Chat que irá receber as notificações.

- **Obrigatório:** Sim
- **Tipo:** alfanumérico
- **Exemplo:** chat=AAAA0AA0A0A

### key

Chave de permissão do bot que irá publicar na sala do Google Chat.

- **Obrigatório:** Sim
- **Tipo:** alfanumérico
- **Exemplo:** key=AaaaAaAaI0hCZtE6vySjMm-AAaAa0AAaaAqqsHI

### token

Hash que valida a permissão para publicar na sala do Google Chat.

- **Obrigatório:** Sim
- **Tipo:** alfanumérico
- **Exemplo:** token=aAAAAAaa0aAAaaAaa00AAVuOvuMVbC1AAyoCrdkPfAA%3D

### onlymaster

Flag para habilitar notificações do tipo Repository que tenham como branch destino a nomenclatura iniciando com develop. O valor 0 indica que todas as execuções de pipeline efetuadas no repositório serão notificados no chat.

- **Obrigatório:** Não
- **Tipo:** booleano (0 e 1)
- **Padrão:** 1
- **Exemplo:** onlymaster=0 

## Passos de deploy

- Realizar download do repositório.
- Conforme exemplo, alterar os scripts do arquivo package.json para o path da function que irá criar.

```json
"scripts": {
    "serve": "firebase serve --only functions:NOME_DA_FUNCTION",
    "deploy": "firebase deploy --only functions:NOME_DA_FUNCTION",
    "logs": "firebase functions:log"
}
```

- Instale o Firebase CLI.

```bash
npm install -g firebase-tools
```

- Efetue login no Firebase.

```bash
firebase login
```

- Posicione o terminal na pasta principal do repositório e conecte-o ao projeto Firebase.
  - Selecione as opções "Database" e "Functions".

```bash
firebase init
```

- Efetue o deploy do projeto no Firebase. 

```bash
firebase deploy --only functions:NOME_DA_FUNCTION
```

- Conforme exemplo, o serviço estará disponível através do path configurado.
  -  https://us-central1-SUA-WORKSAPCE.cloudfunctions.net/NOME_DA_FUNCTION

## Passos de configuração

### Google Chat

- Criar uma sala no Google Chat configurada para agrupar as repostas de mensagens enviadas na sala.
- Criar um webhook de entrada na sala que foi criada. Conforme exemplo, será gerado um link com as informações necessárias para compor a URL final do webhook.
  - **Link:** https://chat.googleapis.com/v1/spaces/AAAA0AA0A0A/messages?key=AaaaAaAaI0hCZtE6vySjMm-AAaAa0AAaaAqqsHI&token=aAAAAAaa0aAAaaAaa00AAVuOvuMVbC1AAyoCrdkPfAA%3D
  - **Chat:** AAAA0AA0A0A
  - **Key:** AaaaAaAaI0hCZtE6vySjMm-AAaAa0AAaaAqqsHI
  - **Token:** aAAAAAaa0aAAaaAaa00AAVuOvuMVbC1AAyoCrdkPfAA%3D

### Bitbucket

- Com os dados da URL do Chat Google gere a URL do serviço.

  - **?chat=**AAAA0AA0A0A
  - **&key=**AaaaAaAaI0hCZtE6vySjMm-AAaAa0AAaaAqqsHI
  - **&token=**aAAAAAaa0aAAaaAaa00AAVuOvuMVbC1AAyoCrdkPfAA%3D

  - **URL final:** https://us-central1-SUA-WORKSAPCE.cloudfunctions.net/NOME_DA_FUNCTION?chat=AAAA0AA0A0A&key=AaaaAaAaI0hCZtE6vySjMm-AAaAa0AAaaAqqsHI&token=aAAAAAaa0aAAaaAaa00AAVuOvuMVbC1AAyoCrdkPfAA%3D

- Acesse a área de Webhooks dentro das configurações do repositório.

  - Repository details > Webhooks

- Clique em "Add webhook".

- Preencha o campo "Title" com o nome identificador do webhook.

- Preencha o campo "URL" com a URL gerada (com parâmetros).

- Marque a opção "Choose from a full list of triggers" e selecione o tipos de evento que deseja receber notificação.

  - Habilitado para eventos "Repository" e "Pull Request".
