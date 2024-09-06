import axios from 'axios';
import cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

// TODO - cualquier error que se guarde en un log - si el archivo es webm no guarda el id

const urlsIniciales = []
let carpetaId = "";
let board = "";
let directorio = "";
let enlaces = [];
let nombres1 = [];
let nombres2 = [];
let indiceActual = 0;
let indice = 0;

const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'Referer': 'https://boards.4chan.org/'
};

while (indice < urlsIniciales.length) {
    console.log("Descargando hilo: " + (indice + 1) + "/" + urlsIniciales.length)
    let urlInicial = urlsIniciales[indice];
    carpetaId = urlInicial.substring(urlInicial.lastIndexOf('/') + 1);
    board = urlInicial.split('/')[3];
    enlaces = [];
    nombres1 = [];
    nombres2 = [];
    await obtenerImagenes(urlInicial);
    indice++;
}

async function obtenerImagenes(urlInicial) {
    try {
        const response = await axios.get(urlInicial, { headers });
        const $ = cheerio.load(response.data);
        $('.fileText a').each((index, element) => {
            const hrefImagen = $(element).attr('href');
            const nombre = $(element).attr('title');
            const nombre2 = $(element).text();
            nombres1.push(nombre);
            nombres2.push(nombre2);
            enlaces.push(hrefImagen);
        });

        const nombreThread = $(".postInfo .subject").text();
        const nombreThreadLimpio = nombreThread.replace(/\//g, '-');
        const oP = $(".op blockquote").text();
        console.log("Op: " + oP);
        if (nombreThread !== "") { 
            directorio = "./descargas/4chan/" + board + "/" + carpetaId + " " + nombreThreadLimpio + "/";
        } else {
            directorio = "./descargas/4chan/" + board + "/" + carpetaId + "/";
        }

        await procesarArrayEnlaces();
    } catch (error) {
        console.error('Error xd: ', error);
    }
}

async function procesarArrayEnlaces() {
    if (enlaces.length === 0) {
        console.log("No hay Ids para descargar");
        return;
    }

    for (indiceActual = 0; indiceActual < enlaces.length; indiceActual++) {
        const enlaceActual = enlaces[indiceActual];
        const nombreActual1 = nombres1[indiceActual];
        const nombreActual2 = nombres2[indiceActual];

        const extensionMasId = enlaceActual.substring(enlaceActual.lastIndexOf('/') + 1);
        const extension = extensionMasId.split('.')[1];
        const id = extensionMasId.split('.')[0];
        const nombreArchivo = id + "." + extension;

        if (nombreActual1 !== undefined) {
            const nombreActualDefinitivo = id + " " + nombreActual1;
            await descarga(enlaceActual, nombreActualDefinitivo, indiceActual + 1);
        } else {
            if (nombreActual2 == nombreArchivo) {
                await descarga(enlaceActual, nombreArchivo, indiceActual + 1);
            } else {
                const nombreActualDefinitivo = id + " " + nombreActual2;
                await descarga(enlaceActual, nombreActualDefinitivo, indiceActual + 1);
            }
        }

        // if (nombreActual1 !== undefined) {
        //     const nombreActualSinExtension = nombreActual1.split('.')[0];
        //     const nombreActualDefinitivo = id + " " + nombreActualSinExtension + "." + extension;
        //     await descarga(enlaceActual, nombreActualDefinitivo, indiceActual + 1);
        // } else {
        //     await descarga(enlaceActual, nombreArchivo, indiceActual + 1);
        // }
    }
    console.log("Todas las imágenes descargadas");
};


async function descarga(imagenURL, nombre, indiceActual) {
    try {
        const respuestaImagen = await axios.get(imagenURL, { 
            responseType: 'stream',
            headers: headers
        });

        if (respuestaImagen.status === 200) {
            if (!fs.existsSync(directorio)) {
                fs.mkdirSync(directorio, { recursive: true });
            }

            const rutaCompleta = path.join(directorio, `${nombre}`);
            const flujo = fs.createWriteStream(rutaCompleta);
            respuestaImagen.data.pipe(flujo);

            return new Promise((resolve, reject) => {
                flujo.on('finish', () => resolve(console.log("Imagen descargada " + nombre + " " + indiceActual + "/" + enlaces.length)));
                flujo.on('error', (error) => reject(console.error("Error guardando la imagen: " + error)));
            });
        } else {
            console.error(`Error descargando la imagen: ${imagenURL} (estado: ${respuestaImagen.status})`);
        }
    } catch (error) {
        console.error('Error haciendo fetch a la imagen:', error);
    }
};

