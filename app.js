require("dotenv").config();

const express = require("express");
const cloudinary = require("cloudinary").v2;
const path = require("path");
const cors = require("cors");
const mongoose = require("mongoose");
const multer = require("multer");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const cookieParser = require('cookie-parser');
const rateLimit = require("express-rate-limit");
const { Telegraf } = require("telegraf");
const { create } = require("domain");

const COOKIE_NAME = "token";

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN, {});

bot.launch().catch((error) => {
    console.error("TELEGRAM LAUNCH ERROR:", error);
});

const orderStatuses = [
    "Pending",
    "Processing",
    "Shipped",
    "Delivered"
];

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
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;

const cookieOptions = {
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 10 * 60 * 1000,
};

mongoose.connect(process.env.DATABASE_URL)
    .then(() => {
        console.log("Mongo Has Already Connected!");
    })
    .catch((error) => {
        console.error(error);
    });

const adminSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
    },

    passwordHash: {
        type: String,
        required: true,
    }
})

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
        required: true
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
                required: true
            },
            title: {
                type: String,
                required: true
            },
            price: {
                type: Number,
                required: true
            },
            quantity: {
                type: Number,
                required: true,
                min: 1
            }
        }
    ],
    total: {
        type: Number,
        required: true,
        min: 0
    },
    status: {
        type: String,
        enum: orderStatuses,
        default: "Pending"
    }
}, { timestamps: true });

const Order = mongoose.model("Order", orderSchema);
const Product = mongoose.model("Product", productSchema);
const Admin = mongoose.model("Admin",adminSchema);

function createToken(user) {
    return jwt.sign(
        {id: user.id,username: user.username},
        process.env.JWT_SECRET,
        {expiresIn: '5m'},
    );
};

function requireAuth(req,res,next) {
    const token = req.cookies[COOKIE_NAME];

    if (!token) {
        return res.status(401).json({error: 'Needs auth!'});
    }

    try {
        req.user = jwt.verify(token,process.env.JWT_SECRET);
        next();
    } catch {
        res.clearCookie(COOKIE_NAME);
        res.status(401).json({error: "Session is over!"})
    };
};

const uploadToCloudinary = (fileBuffer) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder: "creator-shop" },
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

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get('/api/me', requireAuth, (req,res) => {
    res.json({username: req.user.username});
});

app.post('/api/logout', (req,res) => {
    res.clearCookie(COOKIE_NAME);
    res.json({ok : true});
})

app.get("/admin", requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, "public", "admin", "index.html"));
});

app.get("/orderStatuses", (req, res) => {
    res.status(200).json(orderStatuses);
});

app.get("/products", async (req, res) => {
    try {
        const products = await Product.find();
        res.status(200).json(products);
    } catch (error) {
        console.error("PRODUCTS GET ERROR:", error);
        res.status(500).json({ message: "Failed to load products" });
    }
});

app.get("/orders", requireAuth, async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        res.status(200).json(orders);
    } catch (error) {
        console.error("ORDERS GET ERROR:", error);
        res.status(500).json({ message: "Failed to load orders" });
    }
});

app.post("/order", requireAuth, async (req, res) => {
    try {
        const data = req.body;

        if (!data.name || !data.email || !data.adress) {
            return res.status(400).json({ message: "Name, email and address are required" });
        }

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

        try {
            await bot.telegram.sendMessage(process.env.TELEGRAM_CHAT_ID, message);
        } catch (telegramError) {
            console.error("TELEGRAM SEND ERROR:", telegramError);
        }

        return res.status(201).json({
            message: "Successful!",
            order: newOrder
        });
    } catch (error) {
        console.error("ORDER ERROR:", error);
        return res.status(500).json({ message: "Failed to create order" });
    }
});

app.put("/order/:id", requireAuth, async (req, res) => {
    try {
        const { status } = req.body;

        if (!orderStatuses.includes(status)) {
            return res.status(400).json({ message: "Invalid order status" });
        }

        const order = await Order.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true, runValidators: true }
        );

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        res.status(200).json(order);
    } catch (error) {
        console.error("ORDER UPDATE ERROR:", error);
        res.status(500).json({ message: "Failed to update order" });
    }
});

app.delete("/order/:id", requireAuth, async (req, res) => {
    try {
        const order = await Order.findByIdAndDelete(req.params.id);

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        res.status(200).json({ message: "Order was deleted!" });
    } catch (error) {
        console.error("ORDER DELETE ERROR:", error);
        res.status(500).json({ message: "Failed to delete order!" });
    }
});

app.post("/product", requireAuth, upload.single("image"), async (req, res) => {
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

        const savedProduct = await newProduct.save();

        res.status(200).json(savedProduct);
    } catch (error) {
        console.error("PRODUCT CREATE ERROR:", error);
        res.status(500).json({ message: "Server error with publishing product!" });
    }
});

app.delete("/product/:id", requireAuth, async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);

        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        if (product.imagePublicID) {
            await cloudinary.uploader.destroy(product.imagePublicID);
        }

        res.status(200).json({ message: "Product deleted!" });
    } catch (error) {
        console.error("PRODUCT DELETE ERROR:", error);
        res.status(500).json({ message: "Failed to delete product" });
    }
});

app.post('/api/login', async (req,res) => {
    try {
        const { username,password } = req.body;

        const user = await Admin.findOne({ username });

        console.log(password,username);
        

        if (!user || !await bcrypt.compare(password,user.passwordHash)) {
            return res.status(401).json({error: "Wrong login or password!"})
        }

        res.cookie(COOKIE_NAME,createToken({
            id: user._id.toString(),
            username: user.username
        }), cookieOptions);

        res.json({username: user.username});
    } catch (error) {
        res.status(500).json({error: "Server error!"});
    };
});

app.post('/api/register', async (req,res) => {
    try {
        const { username,password } = req.body;

        if (!username || !password || password.length < 6) {
            return res.status(400).json({
                error: "Username & password required! Password must be more than 6 chars!"
            });
        };

        const existingUser = await Admin.findOne({ username });

        if (existingUser) {
            return res.status(409).json({
                error: "Username already taken!"
            });
        };

        const passwordHash = await bcrypt.hash(password,10);

        console.log(passwordHash);


        const user = await Admin.create({
            username,
            passwordHash
        });

        res.cookie(COOKIE_NAME,createToken({
            id: user._id.toString(),
            username: user.username,

        }), cookieOptions);

        res.status(201).json({username: user.username});
    } catch (error) {
        res.status(500).json({error: "Server error!"});
    }
});

app.listen(PORT, () => {
    console.log(`Server start on ${PORT}`);
});