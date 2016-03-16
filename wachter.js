var mysql = require('mysql'),
    yaml = require('js-yaml'),
    fs = require('fs'),
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

function doSomethingWithRow (row) {
  console.log('');
  console.dir(row);
  console.log('');
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
    doSomethingWithRow(rows[i]);

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

function Worker (config) {
  this.name = config.name;
  this.last_update = config.last_update;
  this.updated_at_column = config.updated_at_column;
  this.query = config.query;
  this.checkChanges = checkChanges;
};

function initPolling () {
  for (var i in config_file.entities) {
    var worker = new Worker(config_file.entities[i]);
    worker.checkChanges();
  }
};

initPolling();
