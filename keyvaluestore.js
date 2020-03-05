var AWS = require('aws-sdk');
AWS.config.loadFromPath('./config.json');

var db = new AWS.DynamoDB();

function keyvaluestore(table) {
  this.LRU = require("lru-cache");
  this.cache = this.LRU({ max: 500 });
  this.tableName = table;
};

/**
 * Initialize the tables
 * 
 */
keyvaluestore.prototype.init = function (whendone) {
  var tableName = this.tableName;
  var self = this;
  db.describeTable({
    TableName: this.tableName
  }, function (error, data) {
    if (error) {
      throw new Error(`Table Not Found`);
    }
    else {
      console.log('Table Found')
      whendone();
    }
  });
  whendone(); //Call Callback function.
};

keyvaluestore.prototype.query = function (search, callback) {
  var self = this;
  if (self.cache.get(search))
    callback(null, self.cache.get(search));
  else {
    let params = {
      KeyConditions: {
        "keyword": {
          AttributeValueList: [
            {
              S: search
            }],
          ComparisonOperator: 'EQ'
        }
      },
      TableName: this.tableName
    };

    db.query(params, function (err, data) {
      let items = [];
      if (err) console.log(err, err.stack);
      else {
        if (data['Count'] > 0) {
          data['Items'].forEach(item => {
            items.push({ "inx": item.inx.N, "value": item.category.S, "key": item.keyword });
          });
          self.cache.set(search, items)
        }
      }
      callback(err, items)
    });
  }
}


/**
 * Get result(s) by key
 * 
 * @param search
 * 
 * Callback returns a list of objects with keys "inx" and "value"
 */

keyvaluestore.prototype.get = function (search, inx, callback) {
  var self = this;

  if (self.cache.get(search))
    callback(null, self.cache.get(search));
  else {

    /*
     * 
     * La función QUERY debe generar un arreglo de objetos JSON son cada
     * una de los resultados obtenidos. (inx, value, key).
     * Al final este arreglo debe ser insertado al cache. Y llamar a callback
     * 
     * Ejemplo:
     *    var items = [];
     *    items.push({"inx": data.Items[0].inx.N, "value": data.Items[0].value.S, "key": data.Items[0].key});
     *    self.cache.set(search, items)
     *    callback(err, items);
     */
    let params = {
      Key: {
        "keyword": {
          S: search
        }
      },
      TableName: this.tableName
    };

    db.getItem(params, function (err, data) {
      let items = [];
      if (err) console.log(err, err.stack); // an error occurred
      else {
        items.push({"inx": inx, "value": data.Item.url.S, "key": data.Item.keyword});
        self.cache.set(search, items)
      }       
      callback(err, items)
    });
  }
};


module.exports = keyvaluestore;
