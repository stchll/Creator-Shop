require("dotenv").config();

const express = require("express");
const path = require("path");
const cors = require("cors");
const fs = require("fs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const multer = require("multer");
const dns = require("dns");
const { Telegraf } = require("telegraf");

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN, {});
bot.launch();

const PORT = process.env.PORT || 3000;

const app = express();

const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(uploadDir));

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir)
    },

    filename: function (req, file, cb) {
        cb(null, file.originalname)
    }
});

const upload = multer({ storage: storage });

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
    rating: Number,
    categories: { type: [String], default: [] },
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

app.post("/product", upload.single("image"), async (req, res) => {
    const data = req.body;
    const imagePath = req.file ? `/uploads/${req.file.filename}` : "";

    const newProduct = new Product({
        title: data.title,
        description: data.description,
        price: Number(data.price),
        rating: Number(data.rating),
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