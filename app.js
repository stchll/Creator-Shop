require("dotenv").config();

const express = require("express");
const cloudinary = require("cloudinary").v2;
const path = require("path");
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const multer = require("multer");
const dns = require("dns");
const { Telegraf } = require("telegraf");

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN, {});
bot.launch();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const upload = multer({
    storage: multer.memoryStorage()
});

const PORT = process.env.PORT || 3000;

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

dns.setServers([
    `1.1.1.1`,
    `8.8.8.8`
])

mongoose.connect(process.env.DATABASE_URL)
    .then(() => {
        console.log("Mongo Has Already Connected!");
    })
    .catch((eroor) => {
        console.error(error);
    });

const productSchema = new mongoose.Schema({
    title: String,
    description: String,
    price: Number,
    image: String
});

const Product = mongoose.model("Product", productSchema);

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"))
});

app.get("/admin", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "admin", "index.html"))
});

app.get("/products", async (req, res) => {
    const products = await Product.find(req.query);

    res.status(200).json(products)
});

app.post("/order", async (req, res) => {
    const data = req.body;

    const products = data.products.map((product, index) => {
        return `

        ${index + 1}. ${product.title}
        Price: ${product.price}$
        Quantity: ${product.quantity}`; }).join("\n\n");

        const total = data.products.reduce((sum, product) => {
            return sum + product.price * product.quantity; }, 0);

        const message = `New Order: 

        Name: ${data.name}
        Email: ${data.email} 
        Address: ${data.adress}

        PRODUCTS: ${products} 

        TOTALðŸ“¦: ${total}$`;

    await bot.telegram.sendMessage(
        process.env.TELEGRAM_CHAT_ID,
        message
    );

    res.status(200).json({ message: "Sucsessfull!" })
})

const uploadToCloudinary = (fileBuffer) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: "creator-shop"
            },
            (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            }
        );

        stream.end(fileBuffer);
    });
};

app.post("/product", upload.single("image"), async (req, res) => {
    const data = req.body;

    const imagePath = "";

    if (req.file) {
        const result = await uploadToCloudinary(req.file.buffer);
        imagePath = result.secure_url
    }

    const newProduct = new Product({
        title: data.title,
        description: data.description,
        price: Number(data.price),
        image: imagePath,
    });

    const savedProducts = await newProduct.save();

    res.status(200).json(savedProducts);
});

app.delete("/product/:id", async (req, res) => {
    await Product.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Product deleted!" });
})

app.listen(PORT, () => {
    console.log(`Server start on ${PORT}`);
})