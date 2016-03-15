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
  }
});

var polling = function () {

  var now = new Date();

  console.log('quering', config_file.entities[0].query.replace('?', config_file.entities[0].last_update));

  connection.query(
    config_file.entities[0].query,
    [config_file.entities[0].last_update],
    function(err, rows, fields) {

      if (err) {
        console.log('query err', err);
        return;
      }

      if (rows.length === 0) {
        console.log('no results. last update', now.toLocaleString(), '\n');
        config_file.entities[0].last_update = now.toLocaleString();
        polling_timer = setTimeout(polling, POLLING_INTERVAL);
        return;
      }

      console.log(rows.length, 'rows updated');

      for (var i = 0; i < rows.length; i++) {
        doSomethingWithRow(rows[i]);

        if (i + 1 === rows.length) {
          console.log('end of rows\n');
          config_file.entities[0].last_update = rows[i][config_file.entities[0].updated_at_column].toLocaleString();
          polling_timer = setTimeout(polling, POLLING_INTERVAL);
        }
      }

    });
};

var doSomethingWithRow = function (row) {
  console.dir(row);
};

polling();
