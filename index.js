var express = require('express');
var bodyParser = require('body-parser');
var app = express();

const cors = require('cors');


var corsOptions = { origin: true, optionsSuccessStatus: 200 };
app.use(cors(corsOptions));
app.use(bodyParser.json({ limit: '10mb', extended: true }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }))

const {
  DynamoDB
} = require('@aws-sdk/client-dynamodb');

var AWS = require('aws-sdk');
//Nuevo 
const mysql = require('mysql');  //<- para importar la base de datos 
const aws_keys = require('./creds_template'); // <-- se agrega la clase en donde estan las credenciales 

var port = 9000;
app.listen(port);
console.log("Escuchando en el puerto", port)


// se manda a llamar las credenciales de Mysql 
const db_credentials = require('./db_creds'); //<-- Se importa las credenciales de la base de datos 
var conn = mysql.createPool(db_credentials); // <- Se crea un pool para realizar la conexion a la base de datos 

// Se instancian todos los objetos de aws 
const s3 = new AWS.S3(aws_keys.s3);  //--------> Alamacenamiento S3
const ddb = new DynamoDB(aws_keys.dynamodb); //------> Base de datos - Dynamo
const rek = new AWS.Rekognition(aws_keys.rekognition); //----> Inteligencia Artificial

const AmazonCognitoIdentity = require('amazon-cognito-identity-js');//<------Cognito
const translate = new AWS.Translate(aws_keys.translate); //---------> Translate
const cognito = new AmazonCognitoIdentity.CognitoUserPool(aws_keys.cognito); //------> Cognito

//---------------------------------Ejemplo S3----------------------------------
app.post('/subirfoto', function (req, res) {

  var id = req.body.id;
  var foto = req.body.foto;
  //carpeta y nombre que quieran darle a la imagen

  var nombrei = "fotos/" + id + ".jpg"; // fotos -> se llama la carpeta 
  //se convierte la base64 a bytes
  let buff = new Buffer.from(foto, 'base64');



  AWS.config.update({
    region: 'us-east-1', // se coloca la region del bucket 
    accessKeyId: '',
    secretAccessKey: ''
  });

  var s3 = new AWS.S3(); // se crea una variable que pueda tener acceso a las caracteristicas de S3
  // metodo 1
  const params = {
    Bucket: "",
    Key: nombrei,
    Body: buff,
    ContentType: "image"
  };
  const putResult = s3.putObject(params).promise();
  res.json({ mensaje: putResult })

});

app.post('/obtenerfoto', function (req, res) {
  var id = req.body.id;
  var nombrei = "fotos/" + id + ".jpg";

  AWS.config.update({
    region: 'us-east-1', // se coloca la region del bucket 
    accessKeyId: '',
    secretAccessKey: ''
  });

  var S3 = new AWS.S3();

  var getParams =
  {
    Bucket: "",
    Key: nombrei
  }

  S3.getObject(getParams, function (err, data) {
    if (err) {
      res.json(err)
    } else {
      var dataBase64 = Buffer.from(data.Body).toString('base64'); //resgresar de byte a base
      res.json({ mensaje: dataBase64 })
    }

  })

});

//---------------------------------Ejemplo DB ------------------------------------


///DYNAMO 
//subir foto y guardar en dynamo
app.post('/saveImageInfoDDB', (req, res) => {
  let body = req.body;

  let name = body.name;
  let base64String = body.base64;
  let extension = body.extension;

  //Decodificar imagen
  let encodedImage = base64String;
  let decodedImage = Buffer.from(encodedImage, 'base64');
  let filename = `${name}.${extension}`;

  ddb.putItem({
    TableName: "", // el nombre de la tabla de dynamoDB 
    Item: {
      "id": { S: name },
      "foto": { S: base64String }
    }
  }, function (err, data) {
    if (err) {
      console.log('Error saving data:', err);
      res.send({ 'message': 'ddb failed' });
    } else {
      console.log('Save success:', data);
      res.send({ 'message': 'ddb success' });
    }
  });

})


/******************************RDS *************/
//obtener datos de la BD
app.get("/getdata", async (req, res) => {
  conn.query(`SELECT * FROM ejemplo`, function (err, result) {
    if (err) throw err;
    res.send(result);
  });
});

//insertar datos
app.post("/insertdata", async (req, res) => {
  let body = req.body;
  conn.query('INSERT INTO ejemplo VALUES(?,?)', [body.id, body.nombre], function (err, result) {
    if (err) throw err;
    res.send(result);
  });
});



//-----------------------------------------------Ejemplo Reko-------------------------

// Analizar Emociones Cara
app.post('/detectarcara', function (req, res) {
  var imagen = req.body.imagen;
  var params = {
    /* S3Object: {
      Bucket: "mybucket", 
      Name: "mysourceimage"
    }*/
    Image: {
      Bytes: Buffer.from(imagen, 'base64')
    },
    Attributes: ['ALL']
  };
  rek.detectFaces(params, function (err, data) {
    if (err) { res.json({ mensaje: "Error" }) }
    else {
      res.json({ Deteccion: data });
    }
  });
});

// Analizar texto
app.post('/detectartexto', function (req, res) {
  var imagen = req.body.imagen;
  var params = {
    /* S3Object: {
      Bucket: "mybucket", 
      Name: "mysourceimage"
    }*/
    Image: {
      Bytes: Buffer.from(imagen, 'base64')
    }
  };
  rek.detectText(params, function (err, data) {
    if (err) { res.json({ mensaje: "Error" }) }
    else {
      res.json({ texto: data.TextDetections });
    }
  });
});
// Analizar Famoso
app.post('/detectarfamoso', function (req, res) {
  var imagen = req.body.imagen;
  var params = {
    /* S3Object: {
      Bucket: "mybucket", 
      Name: "mysourceimage"
    }*/
    Image: {
      Bytes: Buffer.from(imagen, 'base64')
    }
  };
  rek.recognizeCelebrities(params, function (err, data) {
    if (err) {
      console.log(err);
      res.json({ mensaje: "Error al reconocer" })
    }
    else {
      res.json({ artistas: data.CelebrityFaces });
    }
  });
});
// Obtener Etiquetas
app.post('/detectaretiquetas', function (req, res) {
  var imagen = req.body.imagen;
  var params = {
    /* S3Object: {
      Bucket: "mybucket", 
      Name: "mysourceimage"
    }*/
    Image: {
      Bytes: Buffer.from(imagen, 'base64')
    },
    MaxLabels: 123
  };
  rek.detectLabels(params, function (err, data) {
    if (err) { res.json({ mensaje: "Error" }) }
    else {
      res.json({ texto: data.Labels });
    }
  });
});
// Comparar Fotos
app.post('/compararfotos', function (req, res) {
  var imagen1 = req.body.imagen1;
  var imagen2 = req.body.imagen2;
  var params = {

    SourceImage: {
      Bytes: Buffer.from(imagen1, 'base64')
    },
    TargetImage: {
      Bytes: Buffer.from(imagen2, 'base64')
    },
    SimilarityThreshold: '10'


  };
  rek.compareFaces(params, function (err, data) {
    if (err) { res.json({ mensaje: err }) }
    else {
      res.json({ Comparacion: data.FaceMatches });
    }
  });
});


//-----------------Translate---------------------

app.post('/translate', (req, res) => {
  let body = req.body

  let text = body.text

  let params = {
    SourceLanguageCode: 'auto',
    TargetLanguageCode: 'es',
    Text: text || 'Hello there'
  };
  
  translate.translateText(params, function (err, data) {
    if (err) {
      console.log(err, err.stack);
      res.send({ error: err })
    } else {
      console.log(data);
      res.send({ message: data })
    }
  });
});

//-------------------------Amazon Cognito---------------------

app.post("/api/login", async (req, res) => {
  var crypto = require('crypto');
  var hash = crypto.createHash('sha256').update(req.body.password).digest('hex');
  var authenticationData = {
    Username: req.body.username,
    Password: hash + "D**"
  };
  var authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails(
    authenticationData
  );
  var userData = {
    Username: req.body.username,
    Pool: cognito,
  };
  var cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
  cognitoUser.setAuthenticationFlowType('USER_PASSWORD_AUTH');

  cognitoUser.authenticateUser(authenticationDetails, {
    onSuccess: function (result) {
      // User authentication was successful
      res.json(result); //
    },
    onFailure: function (err) {
      // User authentication was not successful
      res.json(err);
    },
    mfaRequired: function (codeDeliveryDetails) {
      // MFA is required to complete user authentication.
      // Get the code from user and call
      cognitoUser.sendMFACode(verificationCode, this);
    },
  });
});

app.post("/api/signup", async (req, res) => {
  var attributelist = [];

  var dataname = {
    Name: 'name',
    Value: req.body.name,
  };
  var attributename = new AmazonCognitoIdentity.CognitoUserAttribute(dataname);

  attributelist.push(attributename);

  var dataemail = {
    Name: 'email',
    Value: req.body.email,
  };
  var attributeemail = new AmazonCognitoIdentity.CognitoUserAttribute(dataemail);

  attributelist.push(attributeemail);

  var datacarnet = {
    Name: 'custom:carnet',
    Value: req.body.carnet + "",
  };
  var attributecarnet = new AmazonCognitoIdentity.CognitoUserAttribute(datacarnet);

  attributelist.push(attributecarnet);

  var crypto = require('crypto');
  var hash = crypto.createHash('sha256').update(req.body.password).digest('hex');
  console.log(attributelist);

  cognito.signUp(req.body.username, hash + "D**", attributelist, null, async (err, data) => {

    if (err) {
      console.log(err);

      res.json(err.message || err);
      return;
    }
    console.log(data);
    res.json(req.body.username + ' registrado');
  });
});

