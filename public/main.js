const API_URL = "https://creator-shop.onrender.com/";

class BlurController {
    constructor() {
        this.section = document.querySelector(".blurLayer");
        this.active = false;
    }

    set(flag) {
        if (flag === true) {
            this.section.style.opacity = 1;
            this.section.style.pointerEvents = "auto";
        } else {
            this.section.style.opacity = 0;
            this.section.style.pointerEvents = "none";
        }
        this.active = flag;
    }
}

class Cart {
    constructor(storageKey = "CART") {
        this.storageKey = storageKey;
        this.items = this.load();
    }

    load() {
        return JSON.parse(
            localStorage.getItem(this.storageKey) || "[]"
        );
    }

    save() {
        localStorage.setItem(
            this.storageKey,
            JSON.stringify(this.items)
        );
    }

    add(product) {
        const productId = product._id || product.id;
        const existingProduct = this.items.find(
            item => (item._id || item.id) === productId
        );

        if (existingProduct) {
            existingProduct.quantity++;
        } else {
            this.items.push({
                ...product,
                _id: productId,
                quantity: 1
            });
        }

        this.save();
    }

    remove(id) {
        this.items = this.items.filter(
            item => (item._id || item.id) !== id
        );

        this.save();
    }

    setQuantity(id, quantity) {
        const product = this.items.find(
            item => (item._id || item.id) === id
        );

        if (!product) return;

        quantity = Number(quantity);

        if (quantity <= 0 || Number.isNaN(quantity)) {
            this.remove(id);
            return;
        }

        product.quantity = quantity;
        this.save();
    }

    getTotal() {
        return this.items.reduce(
            (total, product) => {
                return total + product.price * product.quantity;
            },
            0
        );
    }

    getItems() {
        return this.items;
    }

    clear() {
        this.items = [];
        this.save();
    }
}

class ProductAPI {
    constructor(url) {
        this.url = url;
    }

    async getProducts() {
        const response = await fetch(
            `${this.url}/products`
        );

        if (!response.ok) {
            throw new Error("Failed to fetch products");
        }

        return await response.json();
    }
}

class CartUI {
    constructor(cart) {
        this.cart = cart;
        this.quantityLabel = document.getElementById("cartQuantityLabel");
        this.productsList = document.getElementById("cartProductsList");
        this.billLabel = document.getElementById("cartBillLabel");
    }

    render() {
        this.productsList.innerHTML = "";

        for (const product of this.cart.getItems()) {
            this.renderProduct(product);
        }

        this.updateBill();
    }

    renderProduct(product) {
        const card = document.createElement("div");
        card.className = "card";

        const imageURL = product.image || "";
        const productId = product._id || product.id;

        card.innerHTML = `
            <img src="${imageURL}" alt="Photo" class="productImg">

            <div class="productInfo">
                <h3>${product.title}</h3>
                <p>${product.price}₴</p>
            </div>

            <div class="quantityPart">
                <button class="quantityMinus"><i class="fa-solid fa-minus"></i></button>
                <input class="quantityInput" type="number" min="1" value="${product.quantity}">
                <button class="quantityAdd"><i class="fa-solid fa-plus"></i></button>
            </div>

            <div class="controlPart">
                <button class="deleteBtn">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
        `;

        const deleteBtn = card.querySelector(".deleteBtn");
        const quantityInput = card.querySelector(".quantityInput");
        const quantityMinus = card.querySelector(".quantityMinus");
        const quantityAdd = card.querySelector(".quantityAdd");

        deleteBtn.addEventListener("click", () => {
            this.cart.remove(productId);
            this.render();
        });

        quantityInput.addEventListener("change", () => {
            this.cart.setQuantity(productId, quantityInput.value);
            this.render();
        });

        quantityMinus.addEventListener("click", () => {
            this.cart.setQuantity(productId, Number(quantityInput.value) - 1);
            this.render();
        });

        quantityAdd.addEventListener("click", () => {
            this.cart.setQuantity(productId, Number(quantityInput.value) + 1);
            this.render();
        });

        this.productsList.appendChild(card);
    }

    updateBill() {
        const total = this.cart.getTotal();
        this.billLabel.textContent = `Bill: ${total}₴`;

        const totalQuantity = this.cart.getItems().reduce(
            (sum, product) => sum + product.quantity,
            0
        );

        if (totalQuantity < 100) {
            this.quantityLabel.textContent = totalQuantity;
        } else {
            this.quantityLabel.textContent = "99+";
        }
    }
}

class ProductUI {
    constructor(api, cart, cartUI) {
        this.api = api;
        this.cart = cart;
        this.cartUI = cartUI;
        this.container = document.querySelector(".productsPart");
    }

    async render() {
        try {
            const products = await this.api.getProducts();
            this.container.innerHTML = "";

            for (const product of products) {
                this.renderProduct(product);
            }
        } catch (error) {
            console.error(error);
        }
    }

    renderProduct(product) {
        const card = document.createElement("div");
        card.className = "card";
        card.style.display = "flex";

        const imageURL = product.image || "";

        card.innerHTML = `
            <div class="imagePart">
                <img src="${imageURL}" alt="Photo">
            </div>

            <div class="dataPart">
                <h3>${product.title}</h3>
                <p>${product.price}₴</p>
            </div>

            <div class="buttonsPart">
                <button class="addToCart">
                    <i class="fa-solid fa-basket-shopping"></i> 
                    Add To Cart
                </button>
            </div>
        `;

        const button = card.querySelector(".addToCart");
        button.addEventListener("click", () => {
            this.cart.add(product);
            this.cartUI.render();
        });

        this.container.appendChild(card);
    }
}

class CartModal {
    constructor(orderForm) {
        this.orderForm = orderForm;
        this.section = document.querySelector(".cart");
        this.openBtn = document.getElementById("cartOpenBtn");
        this.closeBtn = document.getElementById("cartClose");

        this.openBtn.addEventListener("click", () => {
            this.orderForm.close();
            this.open();
        });

        this.closeBtn.addEventListener("click", () => this.close());
    }

    open() {
        this.section.style.right = "0";
        Blru.set(true);
    }

    close() {
        this.section.style.right = "-100%";
        Blru.set(false);
    }
}

class OrderForm {
    constructor(cart, cartUI) {
        this.form = document.getElementById("orderForm");
        this.page = document.querySelector(".orderForm");
        this.closeBtn = document.getElementById("closeOrderForm");
        this.cart = cart;
        this.cartUI = cartUI;

        this.orderPages = document.querySelectorAll(".orderPage");
        this.completePage = document.getElementById("complateOrderForm");
        this.processPage = document.getElementById("processOrderForm");
        this.failPage = document.getElementById("failOrderForm");

        this.form.addEventListener("submit", (e) => {
            e.preventDefault();
            this.order();
        });

        this.closeBtn.addEventListener("click", () => {
            this.close();
        });
    }

    async order() {
        const formData = Object.fromEntries(
            new FormData(this.form)
        );

        formData.products = this.cart.getItems();

        this.form.style.display = "none";
        this.processPage.style.display = "flex";

        try {
            const response = await fetch(`${API_URL}/order`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Failed to create order");
            }

            this.processPage.style.display = "none";
            this.completePage.style.display = "flex";
            this.cart.clear();
            this.cartUI.render();
        } catch (error) {
            console.error(error);
            this.processPage.style.display = "none";
            this.failPage.style.display = "flex";
        }
    }

    open() {
        this.page.style.left = "50%";
        Blru.set(true);
    }

    close() {
        this.page.style.left = "-200%";
        Blru.set(false);

        this.orderPages.forEach(el => {
            el.style.display = "none";
        });

        this.form.style.display = "flex";
    }
}

class Header {
    constructor() {
        this.opened = false;
        this.menuBtn = document.getElementById("menu-btn");
        this.menuPage = document.getElementById("menuPage");

        this.menuBtn.addEventListener("click", (e) => {
            e.preventDefault();
            this.toggle();
        });
    }

    toggle() {
        if (this.opened == false) {
            this.menuPage.style.left = "0";
            this.menuBtn.innerHTML = `<i class="fa-solid fa-xmark"></i>`;
            this.opened = true;
        } else {
            this.menuPage.style.left = "100%";
            this.menuBtn.innerHTML = `<i class="fa-solid fa-bars"></i>`;
            this.opened = false;
        }
    }
}

class SearchBar {
    constructor(api, cart, cartUI) {
        this.bar = document.getElementById("searchInput");
        this.resultBox = document.getElementById("searchResultBox");
        this.api = api;
        this.cart = cart;
        this.cartUI = cartUI;

        if (this.bar) {
            this.bar.addEventListener("input", (e) => {
                e.preventDefault();
                this.reload(this.bar.value);
            });
        }
    }

    async reload(query = "") {
        if (!query.trim()) {
            this.resultBox.innerHTML = "";
            this.resultBox.style.display = "none";
            return;
        }

        try {
            const data = await this.api.getProducts();
            const q = query.trim().toLowerCase();
            const result = data.filter(product =>
                product.title.trim().toLowerCase().includes(q)
            );

            this.resultBox.innerHTML = "";
            this.resultBox.style.display = "block";

            for (const res of result) {
                const card = document.createElement("div");
                card.className = "card";

                card.innerHTML = `
                    <div class="imagePart">
                        <img src="${res.image || ''}" alt="">
                    </div>
                    <div class="dataPart">
                        <h3>${res.title}</h3>
                        <p>${res.price}₴</p>
                    </div>
                    <div class="contolPart">
                        <button class="addSearchBtn">
                            <i class="fa-solid fa-basket-shopping"></i>
                        </button>
                    </div>
                `;

                card.querySelector(".addSearchBtn").addEventListener("click", (e) => {
                    e.stopPropagation();
                    this.cart.add(res);
                    this.cartUI.render();
                });

                this.resultBox.appendChild(card);
            }
        } catch (error) {
            console.error(error);
        }
    }
}

class Navigation {
    constructor() {
        this.navs = document.querySelectorAll(".navhref");

        this.navs.forEach(nav => {
            nav.addEventListener("click", (e) => {
                e.preventDefault();

                if (!nav.dataset.page || nav.dataset.page === "") return;

                if (header.opened == true) {
                    header.toggle();
                }

                const targetPage = document.querySelector(`.${nav.dataset.page}`);
                if (targetPage) {
                    targetPage.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });
                }
            });
        });
    }
}

const Blru = new BlurController();
const Nav = new Navigation();
const header = new Header();
const cart = new Cart();
const cartUI = new CartUI(cart);
const productAPI = new ProductAPI(API_URL);
const searchBar = new SearchBar(productAPI, cart, cartUI);
const productUI = new ProductUI(productAPI, cart, cartUI);
const orderForm = new OrderForm(cart, cartUI);
const cartModal = new CartModal(orderForm);

const checkoutCartBtn = document.getElementById("checkoutCart");
const clearCartBtn = document.getElementById("clearCart");

cartUI.render();
productUI.render();

checkoutCartBtn.addEventListener("click", (e) => {
    e.preventDefault();
    cartModal.close();
    orderForm.open();
});

clearCartBtn.addEventListener("click", (e) => {
    e.preventDefault();
    cart.clear();
    cartUI.render();
});