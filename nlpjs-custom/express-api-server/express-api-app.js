const path = require('path');
const express = require('express');

const nlpjs = require('@nlpjs/express-api-server')

class ExpressApiApp extends nlpjs.ExpressApiApp {

  initialize() {
    this.app = express();
    this.app.use(express.urlencoded({ extended: false }));
    // INFO: required for Facebook-connector
    this.app.use(express.json({
      verify: (req, res, buf) => {
        req.rawBody = buf;
      }
    }));

    this.loadComplements();

    return this.app;
  }
  
  loadComplements() {
    const logger = this.settings.container.get('logger');
    for (let i = 0; i < this.plugins.length; i += 1) {
      const plugin = this.plugins[i];
      logger.debug(`Loading plugin: ${plugin.name}`);
      this.app.use(plugin);
    }
    if (this.settings.serveBot) {
      const clientPath = this.settings.clientPath || path.join(__dirname, '..', '..', '..', 'public');
      logger.debug(`Serving bot client (path: ${clientPath}`);
      this.app.use(express.static(clientPath));
    }
    for (let i = 0; i < this.routers.length; i += 1) {
      const router = this.routers[i];
      const routes = router.stack.map((layer) => layer.route.path);
      logger.debug(`Loading custom router: ${JSON.stringify(routes, null, 2)}`);
      this.app.use(this.settings.apiRoot, router);
    }
  }
}

module.exports = ExpressApiApp;
