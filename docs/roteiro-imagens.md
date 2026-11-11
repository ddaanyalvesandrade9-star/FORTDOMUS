# Roteiro de imagens da vitrine Fort Domus

Hoje as 6 imagens dos produtos são **ilustrativas** (geradas por IA, 1136 × 1408 px) e aparecem com o aviso
"Imagem ilustrativa". Este roteiro lista as **fotos reais** que faltam para substituí-las.

Regras para todas as fotos:
- Proporção **4:5** (retrato). Tamanho recomendado: **1500 × 1875 px** ou maior (o site aceita as de 1136 × 1408 px).
- Fundo cinza claro liso, luz suave e sem reflexos, produto inteiro e centralizado, sem texto sobreposto.
- **Sem arma de fogo e sem bandeira** em nenhuma imagem. Coldres e acessórios, somente vazios.
- Formato PNG ou JPG de alta qualidade (o site gera as versões WebP/AVIF responsivas).

## Fotos reais que faltam, por versão

| Versão | Frente | Detalhe dos ganchos | Detalhe da base | Cofre aberto |
|---|---|---|---|---|
| Organizador Tático, base de aço | organizador-aco-frente | organizador-aco-ganchos | organizador-aco-base | não se aplica |
| Organizador Tático, base de madeira | organizador-madeira-frente | organizador-madeira-ganchos | organizador-madeira-base | não se aplica |
| Cofre Simples, base de aço | organizador-cofre-simples-aco-frente | organizador-cofre-simples-aco-ganchos | organizador-cofre-simples-aco-base | organizador-cofre-simples-aco-cofre-aberto |
| Cofre Simples, base de madeira | organizador-cofre-simples-madeira-frente | organizador-cofre-simples-madeira-ganchos | organizador-cofre-simples-madeira-base | organizador-cofre-simples-madeira-cofre-aberto |
| Cofre Premium, base de aço | organizador-cofre-premium-aco-frente | organizador-cofre-premium-aco-ganchos | organizador-cofre-premium-aco-base | organizador-cofre-premium-aco-cofre-aberto |
| Cofre Premium, base de madeira | organizador-cofre-premium-madeira-frente | organizador-cofre-premium-madeira-ganchos | organizador-cofre-premium-madeira-base | organizador-cofre-premium-madeira-cofre-aberto |

Ângulos:
- **Frente**: produto inteiro, de frente, levemente de cima (como nas imagens atuais).
- **Detalhe dos ganchos**: aproximação dos ganchos sob medida, com a farda, o cinto e o boné acomodados.
- **Detalhe da base**: bandeja superior e prateleira inferior (grade de aço ou madeira tratada), mostrando o acabamento.
- **Cofre aberto**: cofre com a tampa ou a gaveta aberta, mostrando o interior vazio (no Premium, o interior forrado com espuma).

## Como trocar uma imagem
1. Salve o arquivo em `assets/produtos/` com o nome indicado no cadastro (`assets/products-data.js`, campo `fotos[].src`).
2. Gere os tamanhos responsivos `-360`, `-540`, `-720` e `-1136` em `.webp` e `.avif`, e o `-og.jpg` (compartilhamento).
3. Se for **foto real**, mude `ilustrativa: true` para `ilustrativa: false` na versão: o aviso "Imagem ilustrativa" some do card e da galeria.
4. Hoje cada versão usa uma foto só (a primeira de `fotos`). Para exibir as fotos extras (ganchos, base, cofre aberto) será preciso
   ampliar a galeria da página de produto e a troca de foto no hover da vitrine: é uma etapa à parte.

Os originais `.png` ficam no repositório, mas não são publicados (`.vercelignore`).
