import axios from 'axios';
import cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

const urlsIniciales = [];
let carpetaId = "";
let board = "";
let directorio = "";
let enlaces = [];
let nombres1 = [];
let nombres2 = [];
let indiceActual = 0;
let indice = 0;
let urlSimple = "https://boards.4chan.org/v/thread/";
let ids4chanDallE = [];
let contadorEnlacesTotales = 0;
const caracteresInvalidos = /[<>:"/\\|?*]/g;

try {
    ids4chanDallE = JSON.parse(fs.readFileSync(path.join("./ids/", 'ids4chanDallE.json')));
} catch (error) {
    console.error('Error al leer el archivo Json, sera creado uno nuevo al final de la ejecución');
}

Main();

async function Main() {
    const response = await axios.get("https://boards.4chan.org/v/archive");
    const $ = cheerio.load(response.data);

    $('td').each((i, elem) => {
        if ($(elem).text().toLowerCase().includes('dall')) {
            const id = $(elem).prev().text();
            console.log(id);

            if (!ids4chanDallE.includes(urlSimple + id)) {
                urlsIniciales.push(urlSimple + id);
                ids4chanDallE.push(urlSimple + id);
                contadorEnlacesTotales++;
            }
        }
    });

    console.log("Enlaces totales a iterar: " + contadorEnlacesTotales + "\n");
    await iterarEnlaces();
    fs.writeFileSync(path.join("./ids", 'ids4chanDallE.json'), JSON.stringify(ids4chanDallE));
}

async function iterarEnlaces() {
    while (indice < urlsIniciales.length) {
        console.log("Descargando hilo: " + (indice + 1) + "/" + urlsIniciales.length)
        let urlInicial = urlsIniciales[indice];

        carpetaId = urlInicial.substring(urlInicial.lastIndexOf('/') + 1).replace(caracteresInvalidos, '');
        console.log(urlInicial);
        console.log(carpetaId);

        board = urlInicial.split('/')[3];
        enlaces = [];
        nombres1 = [];
        nombres2 = [];

        await obtenerImagenes(urlInicial);
        indice++;
    }
}

async function obtenerImagenes(urlInicial) {
    try {
        const response = await axios.get(urlInicial);
        const $ = cheerio.load(response.data);

        $('.fileText a').each((index, element) => {
            let hrefImagen = $(element).attr('href');
            const nombre = $(element).attr('title');
            const nombre2 = $(element).text();
            hrefImagen = hrefImagen.replace('//is2.4chan.org/', 'https://i.4cdn.org/');
            // console.log("href: " + hrefImagen);
            // console.log("nombre: " + nombre);
            // console.log("nombre2: " + nombre2);        


            nombres1.push(nombre);
            nombres2.push(nombre2);
            enlaces.push(hrefImagen);
        });

        // console.log("hola");
        // $('.fileText .file-info a').each((index, element) => {
        //     const hrefImagen = $(element).attr('href');
        //     const nombre = $(element).attr('download');
        //     console.log("href: " + hrefImagen);

        //     nombres1.push(nombre);
        //     enlaces.push(hrefImagen);
        // });

        const nombreThread = $(".postInfo .subject").text();
        const nombreThreadLimpio = nombreThread.replace(caracteresInvalidos, '-');
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
        // console.log("Nombre archivo: " + nombreArchivo);
        // console.log("id: " + id);
        // console.log("extension: " + extension);

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
    }
    console.log("Todas las imágenes descargadas");
};


async function descarga(imagenURL, nombre, indiceActual) {
    try {
        const respuestaImagen = await axios.get(imagenURL, {
            responseType: 'stream',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
                'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8'
            }
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
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}