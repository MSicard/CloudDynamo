# CloudDynamo

Este proyecto consiste en la primera práctica de Cloud. Se tiene un buscador de urls que son almacenadas en DynamoDb. Para esto, fue necesario considerar la siguiente arquitectura dentro de las tablas.

## Tabla de Labels
| label     | sort | value             |
|---------|------|-------------------|
| america | 18   | category_america       |
| america | 19   | category_north_america |
| golf    | 21   | category_golf          |

## Tabla de Images

| category  | value             |
|---------|--------------|
| category_america | url_america       |
| category_north_america | url_north_america |
| category_golf    | url_golf          |

Como se puede notar en las tablas, labels consiste en un primary key con un partition key (label) y un sort key de un número. La segunda tabla hace la relación de la categoría con la url de la imagen. 

Se tiene un servidor en node js donde podremos hacer las peticiones a través de la api. También contamos con un contenedor que nos presenta los resultados. Se usaron diferentes componentes pero los principales que se modificaron fueron los siguientes:

## keyvaluestore.js
Este documento tiene la interacción con  DynamoDb. Para esto, se creó una función de inicialización para verificar la existencia de las tablas. Se usó el método de describeTable para verificar que es correcto el nombre y la existencia. En caso de que no, se regresa el error para ser presentado al usuario. 

```javascript
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
```

También, cuenta con dos funciones de búsqueda. Uno para utilizar la función de `query`de DynamoDb y otro para usar el `getItem`. Se usa el query para la búsqueda de la categoría de la tabla de labels, ya que no podemos usar get porque no se tienen ambos valores del primary key. El `getItem`es usado para obtener las imágenes una vez que se tenga la categoría. 

### query
```javascript
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
            console.log(item);
            items.push({ "inx": item.inx.N, "value": item.value.S, "key": item.keyword });
          });
          self.cache.set(search, items)
        }
      }
      callback(err, items)
    });
  }
}
```

### get
```javascript
keyvaluestore.prototype.get = function (search, inx, callback) {
  var self = this;

  if (self.cache.get(search))
    callback(null, self.cache.get(search));
  else {

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
        items.push({"inx": inx, "value": data.Item.value.S, "key": data.Item.keyword});
        self.cache.set(search, items)
      }       
      callback(err, items)
    });
  }
};
```

## app.js

Se modificó la búsqueda de `/search/:word` para que se usaran las dos funciones creadas de búsqueda. Al final queda de la siguiente manera el `processData`function. Se puede notar que terms usa el `.query`y images el `.get`.

```javascript
var processData = function (callback) {
    terms.query(stemmedword, function (err, data) {
      if (err) {
        console.log("getAttributes() failed: " + err);
        callback(err.toString(), imageurls);
      } else if (data == null) {
        console.log("getAttributes() returned no results");
        callback(undefined, imageurls);
      } else {
        async.forEach(data, function (attribute, callback) {
          images.get(attribute.value, attribute.inx, function (err, data) {
            if (err) {
              console.log(err);
            }
            imageurls.push(data[0].value);
            callback(undefined, imageurls);
          });
        }, function () {
          callback(undefined, imageurls);
        });
      }
    });
  };
```

## public/js/app.js

Este documento es el que interactua con la página web y se encarga de modificar el html para mostrar las imágenes. Cuenta con las siguientes funciones

### createImg
Esta función se encarga de modificar una columna y su fila, la cual se identifica a través de su id, y se agrega un html de `img` con su respectivo valor. 

```javascript
function createImg(tag, value) {
  $('#' + tag).html(`<img src=${value}" height="100" width="100">`)
}
``` 

### removeImg
Esta función es la encargada de limpiar la columna y su fila para eliminar la información que contiene. 

```javascript
function removeImg(tag) {
  $('#' + tag).html('');
}
``` 

### disabledPrevious
Esta función es encarga de identificar cuando ya no hay imágenes previas a las que se están mostrando y bloquear o desbloquear el botón de previous según corresponda.

```javascript
let disabled = false;
  if (myPage == 1) {
    disabled = true;
  } 
  $("#previous").prop('disabled', disabled);
``` 

### disabledNext
Esta función es encarga de identificar cuando ya no hay imágenes siguientes a las que se están mostrando y bloquear o desbloquear el botón de next según corresponda.

```javascript
function disabledNext() {
  let disabled = true;
  if ((myPage * 4) < myResult.length) {
    disabled = false;
  }
  $("#next").prop('disabled', disabled);
}
``` 

### renderQueryResults
Esta función es la encargada de dibujar por primera vez las imágenes en el contenedor. Llama a la función de createImg para lograr esto. También, nos almacena los resultados en una variable llamada `myResult`para ser usada por otras funciones o eventos. Se encarga de mostrar los botones de previous y next y llama a las funciones de disabled que les corresponde. 

```javascript
function renderQueryResults(data) {
    
    if (data.error != undefined) {
      $("#status").html("Error: "+data.error);
    } else {
      $("#status").html(""+data.num_results+" result(s)");
      
      myResult = data.results;
      let maxNumber = myResult.length > 4 ? 4 : myResult.length;
      for (let i = 0; i < maxNumber; i++) {
        createImg(`photo${i}`, myResult[i] );
      }
      
      $("#next").show();
      $("#previous").show();
      disabledNext();
      disabledPrevious();
     }
   }
``` 

### next.click()
Cuando el botón de next es presionada se llama a este evento. Lo que hará será identificar en que valor de la lista de `myResult`se encuentra para empezar a dibujar las imágenes siguientes. En caso de que no se tengan suficiente imágenes, se llama al método de `removeImg` para que no se quedan las imágenes pasadas. Se llama a las funciones de disabled de los botones de next y previous, esto es para identificar si se tiene más interacción de siguiente o de regresar. 

```javascript
$("#next").click( function(e) {
    let i = myPage * 4;
      
    for (let j = 0; j < 4; j++) {
      if (myResult[j + i]) 
        createImg(`photo${j}`, myResult[j + i] );
      else 
        removeImg(`photo${j}`);
    }
    myPage += 1;
    disabledNext();
    disabledPrevious();
  });
``` 

### previous.click()
Cuando el botón de previous es presionado se llama a este evento. Lo que hará será identificar en que valor de la lista de `myResult`se encuentra para empezar a dibujar las imágenes anteriores con el método de `createImg`. Se llama a las funciones de disabled de los botones de next y previous, esto es para identificar si se tiene más interacción de siguiente o de regresar. 

```javascript
$("#previous").click( function(e) {
    let i = (myPage * 4) - 8;
    for (let j = 0; j < 4; j++) {
      if (myResult[j + i]) 
        createImg(`photo${j}`, myResult[j + i] );
    }
    myPage -= 1;
    disabledNext();
    disabledPrevious();
  });
``` 
### myClose.click()
El evento que interactua cuando los botones de close son presionados son para limpiar las imágenes que tiene el contenedor actual. Esto nos ayuda a que si se tiene nuevas búsquedas, no se vean las imágenes de la búsqueda anterior.

```javascript
  $('.myClose').click( function (e) {
    for(let i = 0; i < 4; i++) {
      removeImg(`photo${i}`);
    }
  });
```   
