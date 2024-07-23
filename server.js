const express = require('express')
const fs = require('fs')
const ejs = require('ejs')
const path = require('path')
const { spawn } = require('child_process')
const cron = require('node-cron');
const bodyParser = require('body-parser')
const multer = require('multer')
const axios = require('axios')
const { url } = require('inspector')

const app = express();

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/IMG');
    },
    filename: function(req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({storage: storage});
let imgs = []

const uploadDir = path.join(__dirname, 'public', 'IMG');
if(!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

app.get('/', function (req, res) {
    res.render("index", { images : imgs});
});

app.post('/', upload.array('images', 10), async function (req, res) {
    let filePaths = [];
    if (req.files && req.files.length > 0) {
        filePaths = req.files.map(file => path.join('IMG', file.filename));
    }

    const imageUrls = req.body.imageUrls ? req.body.imageUrls.split(',') : [];
    const downloadedPaths = await Promise.all(imageUrls.map(async (url) => {
        try {
            const response = await axios({
                url,
                responseType: 'stream'
            });
            const filename = path.join('public/IMG', Date.now() + path.extname(url));
            const writer = fs.createWriteStream(filename);
            response.data.pipe(writer);
            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });
            return path.join('IMG', path.basename(filename));
        } catch (error) {
            console.error('Error downloading image:', error);
            return null;
        }
    }));
    filePaths = filePaths.concat(downloadedPaths.filter(Boolean));

    if (filePaths.length === 0) {
        return res.status(400).send('No valid files or URLs were uploaded');
    }

    console.log('Uploaded file paths: ', filePaths);
    const pythonProcess = spawn('python', ['./models/ImageCaption.py', ...filePaths]);

    let captions = '';

    pythonProcess.stdout.on('data', (data) => {
        console.log(`Python Script Output: ${data}`);
        captions += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
        console.error(`Python script error: ${data}`);
    });

    pythonProcess.on('close', (code) => {
        if (code !== 0) {
            return res.status(500).send('Error occurred in the Python script');
        }

        console.log('Generated Captions:', captions);
        captions = captions.replace(/[\[\]\r\n]|^"|"$/g, '');
        const pattern = /(?<=[\'"]),/;
        const captionArray = captions.split(pattern).map(caption => caption.replace(/^["']|["']$/g, '').trim());

        imgs = filePaths.map((filePath, index) => ({
            path: filePath,
            caption: captionArray[index] || ''
        }));

        res.render("index", { images: imgs });
    });
});

cron.schedule('0 * * * *', () => {
    const now = Date.now();
    const oneHour = 36;

    fs.readdir(uploadDir, (err, files) => {
        if (err) {
            console.error('Error reading upload directory:', err);
            return;
        }

        files.forEach(file => {
            const filePath = path.join(uploadDir, file);
            fs.stat(filePath, (err, stats) => {
                if (err) {
                    console.error('Error getting file stats:', err);
                    return;
                }

                if (now - stats.mtimeMs > oneHour) {
                    fs.unlink(filePath, err => {
                        if (err) {
                            console.error(`Error deleting file ${file}:`, err);
                        } else {
                            console.log(`Deleted file ${file}`);
                        }
                    });
                }
            });
        });
    });
});

app.listen(3000, function () {
    console.log("Server is running on port 3000");
});