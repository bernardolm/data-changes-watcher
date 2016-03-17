var mysql = require('mysql'),
    yaml = require('js-yaml'),
    fs = require('fs'),
    extend = require('extend'),
    logger = require('winston'),
    polling_timer,
    config = [],
    config_file = yaml.safeLoad(fs.readFileSync('config.yml', 'utf8')),
    POLLING_INTERVAL = config_file.polling_interval;

logger.add(require('winston-graylog2'), {});
logger.level = 'debug';

var connection = mysql.createConnection(config_file.database);

connection.connect(function (err) {
  if (err) {
    logger.error('connection error', err);
    throw err;
  }
});

function entityRowHandler (row, worker) {
  var payload = {};

  for (var p in worker.message_elements) {
    if (worker.message_elements.hasOwnProperty(p)) {
      payload[p] = worker.message_elements[p].replace('{id}', row[p]);
    }
  }

  logger.debug('message payload', payload);
};

function queryHandler (err, rows, fields) {
  if (err) {
    logger.error('query error', err);
    return;
  }

  if (rows.length === 0) {
    logger.info('no results for %s', this.name);
    setTimeout(this.checkChanges.bind(this), POLLING_INTERVAL);
    return;
  }

  logger.info('%d rows updated of %s', rows.length, this.name);

  for (var i = 0; i < rows.length; i++) {
    entityRowHandler(rows[i], this);

    if (i + 1 === rows.length) {
      logger.info('end of rows of %s', this.name);
      this.last_update = rows[i][this.updated_at_column].toLocaleString();
      setTimeout(this.checkChanges.bind(this), POLLING_INTERVAL);
      return;
    }
  };
};

function checkChanges () {
  logger.info('quering %s for updateds later than %s', this.name, this.last_update);

  connection.query(
    this.query,
    [this.last_update],
    queryHandler.bind(this)
  );
};

function Worker () {
  this.checkChanges = checkChanges;
};

function initPolling () {
  for (var i in config_file.entities) {
    var worker = new Worker();
    extend(worker, config_file.entities[i]);
    worker.checkChanges();
  }
};

initPolling();
