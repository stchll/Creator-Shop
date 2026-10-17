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
const { message } = require("telegraf/filters");

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
    "1.1.1.1",
    "8.8.8.8"
]);

mongoose.connect(process.env.DATABASE_URL)
    .then(() => {
        console.log("Mongo Has Already Connected!");
    })
    .catch((error) => {
        console.error(error);
    });

const productSchema = new mongoose.Schema({
    title: String,
    description: String,
    price: Number,
    image: String,
    imagePublicID: String
});

const orderSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true
    },
    adress: {
        type: String,
        required: true
    },
    products: [
        {
            id: {
                type: mongoose.Schema.Types.ObjectId,
                required: true,
            },
            title: {
                type: String,
                required: true,
            },
            price: {
                type: Number,
                required: true,
            },
            quantity: {
                type: Number,
                required: true,
                min: 1,
            }
        }
    ],
    total: {
        type: Number,
        required: true,
        min: 0,
    },
    status: {
        type: String,
        enum: ["Pending", "Processing", "Shipped", "Delivered"],
        default: "Pending"
    },
},
    { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);
const Product = mongoose.model("Product", productSchema);

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/admin", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "admin", "index.html"));
});

app.get("/products", async (req, res) => {
    const products = await Product.find(req.query);
    res.status(200).json(products);
});

app.get("/orders", async (req, res) => {
    const orders = await Order.find(req.query).sort({ createdAt: -1 });
    res.status(200).json(orders);
});

app.post("/order", async (req, res) => {
    try {
        const data = req.body;

        if (!Array.isArray(data.products) || data.products.length === 0) {
            return res.status(400).json({ message: "Cart is empty or products are invalid" });
        }

        const products = data.products.map(product => ({
            id: product._id || product.id,
            title: product.title,
            price: Number(product.price),
            quantity: Number(product.quantity)
        }));

        const total = products.reduce(
            (sum, product) => sum + product.price * product.quantity,
            0
        );

        const newOrder = await Order.create({
            name: data.name,
            email: data.email,
            adress: data.adress,
            products,
            total
        });

        const productsMessage = products.map((product, index) => `
${index + 1}. ${product.title}
Price: ${product.price}$
Quantity: ${product.quantity}
`).join("\n");

        const message = `New Order:
Name: ${data.name}
Email: ${data.email}
Address: ${data.adress}

PRODUCTS:
${productsMessage}

TOTAL: ${total}$`;

        await bot.telegram.sendMessage(process.env.TELEGRAM_CHAT_ID, message);

        return res.status(201).json({
            message: "Successful!",
            order: newOrder
        });
    } catch (error) {
        console.error("ORDER ERROR:", error);
        return res.status(500).json({
            message: "Failed to create order"
        });
    }
});

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
    try {
        const data = req.body;
        let imagePath = "";
        let publicID = null;

        if (req.file) {
            const result = await uploadToCloudinary(req.file.buffer);
            imagePath = result.secure_url;
            publicID = result.public_id;
        }

        const newProduct = new Product({
            title: data.title,
            description: data.description,
            price: Number(data.price),
            image: imagePath,
            imagePublicID: publicID
        });

        const savedProducts = await newProduct.save();

        res.status(200).json(savedProducts);
    } catch (error) {
        console.error("PRODUCT CREATE ERROR:", error);
        res.status(500).json({ message: "Server error with publishing product!" });
    }
});

app.delete("/order/:id", async (req,res) => {
    try {
        const order = await Order.findByIdAndDelete(req.params.id);

        res.status(200).json({message: "Order was deleted!"})
    } catch(error) {
        res.status(500).json({message: "Failed to delete order!"})
    }
})

app.delete("/product/:id", async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);

        if (product && product.imagePublicID) {
            await cloudinary.uploader.destroy(product.imagePublicID);
        }

        res.status(200).json({ message: "Product deleted!" });
    } catch (error) {
        res.status(500).json({ message: "Failed to delete product" });
    }
});

app.listen(PORT, () => {
    console.log(`Server start on ${PORT}`);
});