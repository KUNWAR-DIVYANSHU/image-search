const express = require('express');
const axios = require('axios');
const archiver = require('archiver');
const fs = require('fs');
const path = require('path');
const imageApi = require('duckduckgo-images-api');
const cors = require('cors');
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(cors());

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/search', async (req, res) => {
    const { keyword } = req.body;
    try {
        const results = await imageApi.image_search({ query: keyword, max_results: 10 });
        res.send({ results });
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
});

app.post('/download', async (req, res) => {
    const selectedImages = req.body.selectedImages;

    if (!selectedImages || selectedImages.length === 0) {
        return res.status(400).send({ error: 'No images selected for download' });
    }

    const outputFilePath = 'downloaded_images';

    const downloadImg = async (url, index) => {
        try {
            const response = await axios.get(url, {
                responseType: 'stream',
            });

            await response.data.pipe(fs.createWriteStream(`${outputFilePath}/downloaded_image${index}.jpg`));
            return new Promise((resolve) => {
                response.data.on('end', () => {
                    console.log(`Image ${index} downloaded successfully.`);
                    resolve();
                });
            });
        } catch (error) {
            console.error('Error downloading the image:', error);
            throw error;
        }
    };

    try {
        // Use Promise.all to wait for all image downloads to complete
        await Promise.all(selectedImages.map(async (url, index) => {
            console.log(index);
            await downloadImg(url, index);
        }));

        const sourceFolder = 'downloaded_images';
        const zipFileName = 'myFolder.zip';
        const output = fs.createWriteStream(zipFileName);
        const archive = archiver('zip', {
            zlib: { level: 9 },
        });

        archive.pipe(output);
        archive.directory(sourceFolder, false);
        archive.on('error', (err) => {
            console.error(err);
        });

        output.on('close', () => {
            console.log(`Successfully created ${zipFileName}`);
            res.redirect('/download-zip');
        });

        archive.finalize();
    } catch (error) {
        console.error('Error creating the zip file:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
});

// Replace with the desired name for the downloaded file
app.get('/download-zip', (req, res) => {
    const zipFileName = 'myFolder.zip';
    const zipFilePath = 'myFolder.zip';
    res.download(path.resolve(__dirname, zipFilePath), zipFileName);
});

app.listen(3000, () => {
    console.log('Server running at http://localhost:3000');
});
