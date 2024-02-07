FROM ghcr.io/puppeteer/puppeteer:latest
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Use a imagem base que suporta a instalação do Chromium Browser
# FROM <sua_imagem_base>

# Atualize o sistema e instale as dependências necessárias
RUN apt-get update && \
    apt-get install -y chromium-browser && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Defina o caminho do Chromium Browser para garantir que o Puppeteer possa encontrá-lo
ENV CHROME_BIN=/usr/bin/chromium-browser

# Defina o diretório de trabalho
WORKDIR /usr/src/app

# Copie seu código-fonte para o contêiner
COPY . .

# Instale as dependências do seu aplicativo
RUN npm install

# Comando padrão para iniciar seu aplicativo
CMD ["node","index.js"]
