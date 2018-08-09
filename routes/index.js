var express = require('express');
var upload = require('express-fileupload');
var fs = require('fs');
var url = require('url');
var path = require('path');
var router = express.Router();
var textract = require('textract');
var User = require('../models/user');
var imgText = require('../models/imageToText');
var pdfDocument = require('pdfkit');
var doc = new pdfDocument;
/* GET home page. */

router.get('/', ensureAuthenticated, function (req, res, next) {
    res.render('index', { title: 'Members' });
    console.log(req.sessionID);
    console.log(req.user.id);
});

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/users/login');
}

router.post('/uploads', function (req, res) {

    if (req.files.uploadfile) {
        var file = req.files.uploadfile,
            name = file.name,
            type = file.mimetype;
        var uploadpath = './public/images/' + req.user.id + '/' + name;
        file.mv(uploadpath, function (err) {
            if (err) {
                console.log("File Upload Failed", name, err);
                res.send("Error Occured!");
                res.redirect('/')
            }
            else {
                console.log("File Uploaded", name);

                res.redirect('/');
            }
        });
    }
    else {
        res.send("No File selected !");
        res.end();
    };
    imagetoText(uploadpath, req.user.id);
});

router.post('/delete', function (req, res) {
    var fileDir = "./public/images/" + req.user.id;
    getPdfs(fileDir, function (err, files) {
        for (var i = 0; i < files.length; i++) {

            fs.unlinkSync(fileDir + '/' + files[i]);

        }
    });
    getImages(fileDir, function (err, files) {
        for (var i = 0; i < files.length; i++) {

            fs.unlinkSync(fileDir + '/' + files[i]);

        }
    });
    imgText.deleteReciepts(req.user.id, function (err, imgtext) {
        if (err) throw err;
        console.log(imgtext);
    });
    res.redirect('/');
});

router.get('/pdfs', function (req, res) {

    var pdfDir = "./public/images/" + req.user.id;
    var pdf;
    var userID = req.user.id;

    createPDF(req, res);

    if (typeof pdf === 'undefined') {
        getPdfs(pdfDir, function (err, files) {
            var pdfLists = '<ul>';
            for (var i = 0; i < files.length; i++) {
                pdfLists += '<li><a href="images/' + req.user.id + '/' + files[i] + '">' + files[i] + '</li>';
            }
            pdfLists += '</ul>';
            res.writeHead(200, { 'Content-type': 'text/html' });
            res.end(pdfLists);
        });
    } else {
        fs.readFile(pdfDir + pdf, function (err, content) {
            if (err) {
                res.writeHead(400, { 'Content-type': 'text/html' })
                console.log(err);
                res.end("No such pdf");
            } else {
                //specify the content type in the response will be an image
                res.writeHead(200, { 'Content-type': 'application/pdf' });
                res.end(content);
                console.log("tests");
            }
        });
    }

});

router.get('/imgs', function (req, res) {

    var query = url.parse(req.url, true).query;
    var pic = query.image;
    var imageDir = './public/images/' + req.user.id;

    if (typeof pic === 'undefined') {
        getImages(imageDir, function (err, files) {
            var imageLists = '<ul>';
            for (var i = 0; i < files.length; i++) {
                imageLists += '<li><a href="images/' + req.user.id + '/' + files[i] + '">' + files[i] + '</li>';
            }
            imageLists += '</ul>';
            res.writeHead(200, { 'Content-type': 'text/html' });
            res.end(imageLists);
        });
    } else {
        //read the image using fs and send the image content back in the response
        fs.readFile(imageDir + pic, function (err, content) {
            if (err) {
                res.writeHead(400, { 'Content-type': 'text/html' })
                console.log(err);
                res.end("No such image");
            } else {
                //specify the content type in the response will be an image
                res.writeHead(200, { 'Content-type': 'image/jpg' });
                res.end(content);
                console.log("tests");
            }
        });
    }

});

function getImages(imageDir, callback) {
    var fileType = '.pdf',
        files = [], i;
    fs.readdir(imageDir, function (err, list) {
        for (i = 0; i < list.length; i++) {
            if (path.extname(list[i]) != fileType) {
                files.push(list[i]); //store the file name into the array files
            }
        }
        callback(err, files);
    });
}


function getPdfs(pdfDir, callback) {
    var fileType = '.pdf',
        files = [], i;
    fs.readdir(pdfDir, function (err, list) {
        for (i = 0; i < list.length; i++) {
            if (path.extname(list[i]) === fileType) {
                files.push(list[i]); //store the file name into the array files
            }
        }
        callback(err, files);
    });
}

function createPDF(req, res) {

    var userID = req.user.id;
    if (fs.existsSync('./public/images/' + req.user.id + '/recieptReview.pdf')) {
        fs.unlinkSync('./public/images/' + req.user.id + '/recieptReview.pdf');
    }

    doc.pipe(fs.createWriteStream('./public/images/' + req.user.id + '/recieptReview.pdf'));

    doc.font('Times-Roman')
        .fontSize(40)
        .text('Receipt Review', {
            width: 410,
            align: 'center'
        })
        .moveDown();

    doc.font('Times-Roman')
        .fontSize(14)
        .text('Location Name                              Date Uploaded                              Cost', {
            width: 410,
            align: 'left'
        })
        .moveDown();

    imgText.find({ UserID: userID }, 'PlaceName Dateuploaded Cost', function (err, data) {
        if (err) {
            console.log(err);
        }
        console.log(data[0].PlaceName);
        for (var i = 0; i < data.length; i++) {
            var date = data[i].Dateuploaded;
            var datestr = JSON.stringify(date);

            doc.font('Times-Roman')
                .fontSize(12)
                .text(data[i].PlaceName + '                    ' + datestr.slice(1, 11) + '                    ' + data[i].Cost, {
                    width: 410,
                    align: 'left'
                })
                .moveDown();
        }
        imgText.find({ UserID: userID }, 'Cost', function (err, data) {
            if (err) {
                console.log(err);
            }
            var convert;
            var convert2;
            var total =0;
            for (var i = 0; i < data.length; i++) {
                convert = JSON.stringify(data[i].Cost);
                convert2 = parseFloat(convert)
                total += convert2;
            }
            doc.font('Times-Roman')
            .moveDown(20)
            .fontSize(24)
            .text('Total Spent is ' + total,{align:'center'});

            doc.end();
            doc = new pdfDocument;
        });

    });

}

function imagetoText(path_to_file, userID) {

    var imagetext;

    textract.fromFileWithPath(path_to_file, function (error, text) {
        console.log('inside function');
        while (text === undefined) {
            require('deasync').runLoopOnce();
        }
        imagetext = text;
        console.log('text');

    });

    while (imagetext === undefined) {
        require('deasync').runLoopOnce();
    }

    console.log(imagetext);
    var PlaceName = imagetext.slice(0, 20);
    var arr = imagetext.split(" ");
    var i = 0;
    var cost = 0;
    while (arr[i]) {
        var floatnum = parseFloat(arr[i]);
        if (floatnum >= 0) {
            if (floatnum % 1 != 0) {
                if (i === 0) {
                    cost = floatnum;
                    console.log(cost);
                }
                else {
                    if (cost < floatnum) {
                        cost = floatnum;
                        console.log(cost);
                    }
                }
            }
        }
        i++;
    }

    var newImgText = new imgText({

        PlaceName: PlaceName,
        Cost: cost,
        UserID: userID

    });

    imgText.addImgText(newImgText, function (err, imgtext) {
        if (err) throw err;
        console.log(imgtext);
    });

}

module.exports = router;
