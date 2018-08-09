var mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/Reciepts');

var db=mongoose.connection;

var imageTextSchema = mongoose.Schema({
    PlaceName: {
        type: String,
        index: true
    },
    Dateuploaded: {
        type: Date,
        default: Date.now
    },
    Cost: {
        type: Number
    },
    UserID: {
        type: String
    }

});

var imgText = module.exports = mongoose.model('imgText', imageTextSchema);

module.exports.addImgText = function(newImgText, callback){
            
            newImgText.save(callback);
           
    }  

module.exports.getData = function(userID,callback){
    imgText.find({UserID: userID},'PlaceName Dateuploaded Cost',function(err, data){
        if (err)
        {
            console.log(err);
        }
    });
}

module.exports.deleteReciepts = function(userID, callback){
    imgText.deleteMany({UserID: userID},function(err){
        if (err){
            console.log(err);
        }
    });
}