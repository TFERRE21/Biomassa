# Biomassa DF

Landing page comercial para prospecção de clientes industriais de lenha de eucalipto/biomassa no DF e Goiás.

## Estrutura

- `site/` — site estático
- `site/assets/` — imagens e ilustrações
- `icp.yaml` — configuração de hospedagem no Internet Computer

## Antes de publicar

1. O WhatsApp comercial configurado para cotação é `5561998036248` (Brasil, sem símbolos).
2. O site usa `https://biomassaflorestal.com.br`; confirme que o domínio está apontado para esta implantação.
3. Fazer o deploy no ICP.
4. Configurar o domínio personalizado no ICP.
5. Criar/verificar a propriedade no Google Search Console e enviar `/sitemap.xml`.

## ICP

Instale o CLI atual conforme a documentação oficial e, no diretório do projeto, execute:

```bash
npm install -g @icp-sdk/icp-cli @icp-sdk/ic-wasm
icp --version
icp deploy -e ic
```

## Google

Depois que o domínio estiver funcionando:

- verificar o domínio no Google Search Console;
- enviar `https://biomassaflorestal.com.br/sitemap.xml`;
- solicitar indexação da página inicial.
