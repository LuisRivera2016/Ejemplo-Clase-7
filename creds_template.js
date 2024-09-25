let aws_keys = {
    dynamodb: {
        region: 'us-east-1',
        credentials:{
            accessKeyId: "",
            secretAccessKey: ""
        }    
    },
    s3: {
        region: 'us-east-2',
        credentials:{
            accessKeyId: "",
            secretAccessKey: ""
        }
        
        //apiVersion: '2006-03-01',
    },
    rekognition: {
        region: 'us-east-1',
        accessKeyId: "",
        secretAccessKey: "" 
        
        
    },
    translate: {
        region: 'us-east-1',
        credentials:{
            accessKeyId: "",
            secretAccessKey: "" 
        }
        
    },
    cognito:{
        UserPoolId: '',
        ClientId: ''
    }
}
module.exports = aws_keys