var mysql = require('mysql'),
    yaml = require('js-yaml'),
    fs = require('fs'),
    extend = require('extend'),
    polling_timer,
    config = [],
    config_file = yaml.safeLoad(fs.readFileSync('config.yml', 'utf8')),
    POLLING_INTERVAL = config_file.polling_interval;

var connection = mysql.createConnection(config_file.database);

connection.connect(function (err) {
  if (err) {
    console.log('connection err', err);
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

  console.dir(payload);
};

function queryHandler (err, rows, fields) {
  if (err) {
    console.log('query err', err);
    return;
  }

  if (rows.length === 0) {
    console.log('no results for', this.name);
    setTimeout(this.checkChanges.bind(this), POLLING_INTERVAL);
    return;
  }

  console.log(rows.length, 'rows updated of', this.name);

  for (var i = 0; i < rows.length; i++) {
    entityRowHandler(rows[i], this);

    if (i + 1 === rows.length) {
      console.log('end of rows of', this.name);
      this.last_update = rows[i][this.updated_at_column].toLocaleString();
      setTimeout(this.checkChanges.bind(this), POLLING_INTERVAL);
      return;
    }
  };
};

function checkChanges () {
  console.log('quering', this.name, 'for updateds later than', this.last_update);

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
