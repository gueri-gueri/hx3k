# HXtra 3000

App desktop (Electron) que baixa capturas NAM do **TONE3000** e as converte no `.wav` que o bloco
**NAM A2 Lite** do [HXtra](https://github.com/wisemandenny/hxtra) carrega nos slots de User IR do HX Stomp.

<a href="https://www.tone3000.com"><img src="src/renderer/src/assets/brand/tone3000-logo.svg" alt="TONE3000" height="40"></a>

**Powered by [TONE3000](https://www.tone3000.com)**: a biblioteca de capturas Neural Amp Modeler (NAM) e IRs de
equipamentos analógicos reais, criada por uma comunidade global de músicos. Você escolhe o tone no catálogo do
TONE3000, dentro do app, e ele volta pronto para o HX Stomp.

## O que ele faz

- **TONE3000**: um item do menu lateral que abre o catálogo do TONE3000 dentro do app (fluxo *Select*), já filtrado
  para NAM A2. O item fica selecionado enquanto você navega nele.
- **Seus tones**: favoritos, baixados e criados, além de em alta e recentes.
- **Converter**: baixa o modelo escolhido e grava `<nome> NAM.wav` na pasta de saída.
- **Arquivos locais**: converte `.nam` que você já tem, sem conta e sem rede.
- **Créditos**: grava `TONE3000 credits.txt` ao lado dos `.wav`, com criador, licença e link de cada captura.
- Interface em português e inglês, tema escuro e claro.
- Teclado: **F6** alterna entre o menu do app e a página do TONE3000 (Tab sozinho não atravessa de uma para a outra).

A conversão é a do próprio HXtra: [`vendor/hxtra/nam2ir-core.js`](vendor/hxtra/README.md) é o arquivo do HXtra, sem
alterações, e o `.wav` sai byte a byte igual ao da página de instalação dele.

### O que converte

Só o tamanho **A2 Lite** (WaveNet de 3 canais, 1.871 pesos) treinado a **48 kHz**: é o único que o DSP do HX Stomp
roda. No TONE3000 isso é arquitetura A2, tamanho Lite. Um `.nam` com vários tamanhos também serve; o modelo A2 Lite
dele é usado. O `.wav` não é um som: carrega os números da captura e só serve no bloco NAM A2 Lite.

O HX Stomp precisa estar com o HXtra instalado: <https://wisemandenny.github.io/hxtra/web/>.

## Rodar

Requer Node.js 22 ou mais novo.

```bash
npm install
```

O npm 11 não roda o script que baixa o binário do Electron. Se `npm run dev` reclamar que o Electron não está
instalado:

```bash
node node_modules/electron/install.js
```

```bash
npm run dev
```

### Chave do TONE3000

O app pede a **publishable key** (`t3k_pub_…`) na primeira execução. Crie em
[tone3000.com](https://www.tone3000.com/settings) → Settings → API Keys. Nenhuma redirect URI precisa ser
registrada: o app usa `http://127.0.0.1:38300/callback`, e o TONE3000 sempre aceita loopback.

Para embutir a chave no build, copie `.env.example` para `.env` e preencha `MAIN_VITE_T3K_PUBLISHABLE_KEY`.
Nunca use a secret key (`t3k_cs_…`) neste projeto.

### Sem chave: modo de exemplo

```bash
HX3000_MOCK=1 npm run dev
```

Troca o TONE3000 por tones inventados e por um catálogo de exemplo na mesma área embutida, para trabalhar na
interface sem chave nem rede. Só funciona fora do app empacotado.

## Testes e build

| Comando | O que faz |
|---|---|
| `npm test` | Testes unitários: conversão, cliente da API, OAuth/PKCE, biblioteca |
| `npm run typecheck` | Tipos do processo principal e da interface |
| `npm run build` | Compila para `out/` |
| `npm run test:e2e` | Dirige o app compilado, em modo de exemplo, da tela inicial aos `.wav` em disco |
| `npm run dist` | Empacota com electron-builder em `release/` (dmg/zip, NSIS, AppImage/deb) |
| `npm run icon` | Regera `build/icon.png` a partir de `build/icon.svg` |

## Como é feito

| Caminho | Papel |
|---|---|
| `src/main/oauth.ts` | OAuth 2.0 com PKCE numa `WebContentsView` embutida; intercepta o redirect |
| `src/renderer/src/views/Tone3000.tsx` | A tela do TONE3000: a área onde a página embutida é posicionada |
| `src/main/t3k.ts` | Cliente da API: listas, tone, modelos, download; renovação de token |
| `src/main/convert.ts` | Chama o conversor do HXtra |
| `src/main/library.ts` | Grava os `.wav`, o histórico e o arquivo de créditos |
| `src/main/tokenStore.ts` | Tokens cifrados com `safeStorage` (Keychain, DPAPI, libsecret) |
| `src/preload/index.ts` | A ponte `window.hx`; a interface não tem Node nem rede |
| `src/renderer/src/styles/tokens.css` | Os tokens `--t3k-*` do TONE3000 |
| `src/renderer/src/i18n/` | Textos em inglês e português |

Os tokens do TONE3000 ficam só no processo principal, e o token só é enviado para `www.tone3000.com`.

## TONE3000: o que este app segue

O acesso é o de **desenvolvedor independente** dos [termos da API](https://www.tone3000.com/api/terms): fluxos OAuth
(*Select* e *Load Tone*) e as listas limitadas (favoritos, baixados, criados, em alta, recentes). Não há busca
própria; a busca é a do catálogo do TONE3000.

- Tela de apresentação antes do login, com o logo completo do TONE3000.
- Listas com imagem, título, tipo de equipamento, formato e criador (avatar e usuário), e o usuário conectado à vista.
- O catálogo completo sempre a um clique: o TONE3000 é um item fixo do menu lateral, com o logo completo.
- Tela do tone com seletor de modelos e a descrição do criador.
- Logo completo nas entradas; marca T3K só em lugares compactos, depois do logo completo.
- Só baixa um modelo quando você pede. Não guarda os `.nam`, só o `.wav` convertido.
- Nome do criador e licença acompanham cada captura.

## Licença

[GPL-3.0-or-later](LICENSE). Avisos de terceiros em [NOTICE](NOTICE).

Os logos do TONE3000 são marcas do TONE3000 e não entram na licença deste programa. Line 6, Helix, HX Stomp e
HX Edit são marcas do Yamaha Guitar Group, Inc. Este é um projeto independente, sem vínculo, endosso ou suporte do
TONE3000, do HXtra, da Line 6 ou do Yamaha Guitar Group.
