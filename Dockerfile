FROM zenika/alpine-chrome:77-with-node
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
RUN npm install puppeteer@1.20.0 puppeteer-core@1.20.0 
COPY index.js /usr/src/app/
CMD ["node","index.js"]