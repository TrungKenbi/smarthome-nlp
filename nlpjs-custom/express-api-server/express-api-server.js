const nlpjs = require('@nlpjs/express-api-server');

const ExpressApiApp = require('./express-api-app');

class ExpressApiServer extends nlpjs.ExpressApiServer {
  async start(input = {}) {
    this.server = null;
    const port = input.port || this.settings.port;
    const expressApp = new ExpressApiApp(this.settings, this.plugins, this.routers);
    this.app = expressApp.initialize();

    if (port && port > 0) {
      this.server = this.app.listen(port, () => {
        const logger = this.container.get('logger');
        logger.info(`${this.settings.tag} listening on port ${port}!`);
      });
    }
    return this.server !== null;
  }
}

module.exports = ExpressApiServer;
