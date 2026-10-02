const API_URL = "https://creator-shop.onrender.com";

class BlurController {
    constructor() {
        this.section = document.querySelector(".blurLayer");

        this.active = false;
    }

    set(flag) {
        if (flag == true) {
            this.section.style.opacity = 1;
        } else {
            this.section.style.opacity = 0;
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
        const existingProduct = this.items.find(
            item => item._id === product._id
        );

        if (existingProduct) {
            existingProduct.quantity++;
        } else {
            this.items.push({
                ...product,
                quantity: 1
            });
        }

        this.save();
    }

    remove(id) {
        this.items = this.items.filter(
            item => item._id !== id
        );

        this.save();
    }

    setQuantity(id, quantity) {
        const product = this.items.find(
            item => item._id === id
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

        this.productsList =
            document.getElementById("cartProductsList");

        this.billLabel =
            document.getElementById("cartBillLabel");
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

        const imageURL = product.image
            ? `${API_URL}${product.image}`
            : "";

        card.innerHTML = `
            <img src="${imageURL}" alt="Photo" class="productImg">

            <div class="productInfo">
                <h3>${product.title}</h3>
                <p>${product.price}$</p>
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

        const deleteBtn =
            card.querySelector(".deleteBtn");

        const quantityInput =
            card.querySelector(".quantityInput");

        deleteBtn.addEventListener("click", () => {
            this.cart.remove(product._id);
            this.render();
        });

        quantityInput.addEventListener("change", () => {
            this.cart.setQuantity(
                product._id,
                quantityInput.value
            );

            this.render();
        });

        this.productsList.appendChild(card);
    }

    updateBill() {
        const total = this.cart.getTotal();

        this.billLabel.textContent = `${total}$`;
    }
}


class ProductUI {
    constructor(api, cart, cartUI) {
        this.api = api;
        this.cart = cart;
        this.cartUI = cartUI;

        this.container =
            document.querySelector(".productsPart");
    }

    async render() {
        try {
            const products =
                await this.api.getProducts();

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

        const imageURL = product.image
            ? `${API_URL}${product.image}`
            : "";

        card.innerHTML = `
            <div class="imagePart">
                <img src="${imageURL}" alt="Photo">
            </div>

            <div class="dataPart">
                <h3>${product.title}</h3>
                <p>${product.price}$</p>
            </div>

            <div class="buttonsPart">
                <button class="addToCart">
                    <i class="fa-solid fa-basket-shopping"></i> Add To Cart
                </button>
            </div>
        `;

        const button =
            card.querySelector(".addToCart");

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

        this.section =
            document.querySelector(".cart");

        this.openBtn =
            document.getElementById("cartOpenBtn");

        this.closeBtn =
            document.getElementById("cartClose");

        this.openBtn.addEventListener("click", () => {
            this.orderForm.close()

            this.open();
        }
        );

        this.closeBtn.addEventListener(
            "click",
            () => this.close()
        );
    }

    open() {
        this.section.style.left = "50%"
        
        Blru.set(true);
    }

    close() {
        this.section.style.left = "150%"
        
        Blru.set(false);
    }
}

class OrderForm {
    constructor(cart) {
        this.form = document.getElementById("orderForm");
        this.page = document.querySelector(".orderForm");
        this.closeBtn = document.getElementById("closeOrderForm");
        this.cart = cart;

        this.orderPages = document.querySelectorAll(".orderPage");

        this.completePage = document.getElementById("complateOrderForm");

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
            new FormData(this.form),
        );

        formData.products = this.cart.getItems();

        try {
            const response = await fetch(`${API_URL}/order`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error("Failed to create order");
            }

            if (response.status == 200) {
                this.onComplete();
            }
        } catch (error) {
            console.error(error);
        }
    }

    onComplete() {
        this.form.style.display = "none";
        this.completePage.style.display = "flex";
    }

    open() {
        this.page.style.left = "50%"
        
        Blru.set(true);
    }

    close() {
        this.page.style.left = "-50%"
        
        Blru.set(false);

        this.orderPages.forEach(el => {
            el.style.display = "none"
        });

        this.form.style.display = "flex";
    }
}

class Header {
    constructor() {
        this.opened = false

        this.menuBtn = document.getElementById("menu-btn");

        this.menuPage = document.getElementById("menuPage");

        this.menuBtn.addEventListener("click", (e) => {
            e.preventDefault();

            this.toggle();
        })
    }

    toggle() {
        if (this.opened == false) {
            this.menuPage.style.left = "50%";
            this.menuBtn.innerHTML = `<i class="fa-solid fa-xmark"></i>`;
            this.opened = true;
        } else {
            this.menuPage.style.left = "150%";
            this.menuBtn.innerHTML = `<i class="fa-solid fa-bars"></i>`;
            this.opened = false;
        }
    }
}

class SearchBar {
    constructor(api) {
        this.bar = document.getElementById("searchInput");
        this.resultBox = document.getElementById("searchResultBox");

        this.api = api;

        this.bar.addEventListener("input", (e) => {
            e.preventDefault();

            if (e.data == "") {
                return
            }

            this.reload(this.bar.value)
        })
    }

    async reload(query = "") {
        if (query == "") {
            this.resultBox.innerHTML = ``;

            return
        }

        const data = await this.api.getProducts();

        if (data) {
            for (const el of data) {
                const q = query.trim().toLowerCase();

                const result = data.filter(product =>
                    product.title.trim().toLowerCase().includes(q)
                );

                this.resultBox.innerHTML = ``;

                for (const res of result) {
                    const card = document.createElement("div");
                    card.className = "card";

                    card.innerHTML = `
                        <div class="imagePart">
                            <img src="${res.image}">
                        </div>

                        <div class="dataPart">
                            <h3>${res.title}</h3>
                        </div>

                        <div class="contolPart">
                            <button>
                                <i class="fa-solid fa-basket-shopping"></i>
                            </button>
                        </div>
                        
                    `
                    card.addEventListener("click", (e) => {
                        cart.add(res)

                        cartUI.render();
                    })

                    this.resultBox.appendChild(card)
                }
            }
        }
    }
}

class Navigation {
    constructor() {
        this.navs = document.querySelectorAll(".navhref");

        this.hrefKey = "page-";

        this.navs.forEach(nav => {
            nav.addEventListener("click",async(e)=> {
                e.preventDefault();
                
                if (!nav.dataset.page || nav.dataset.page == "") return

                if (header.opened == true) {
                    header.toggle()
                }

                const targetPage = document.querySelector(`.${nav.dataset.page}`)
                
                targetPage.scrollIntoView({
                    behavior: "smooth",
                })
            })
        })
    }


}

const Blru = new BlurController();

const Nav = new Navigation();

const checkoutCartBtn = document.getElementById("checkoutCart");
const clearCartBtn = document.getElementById("clearCart");

const header = new Header();

const cart = new Cart();

const cartUI = new CartUI(cart);

const productAPI = new ProductAPI(API_URL);

const searchBar = new SearchBar(productAPI);

const productUI = new ProductUI(
    productAPI,
    cart,
    cartUI
);

const orderForm = new OrderForm(cart);

const cartModal = new CartModal(orderForm, cart);



cartUI.render();
productUI.render();

checkoutCartBtn.addEventListener("click", (e) => {
    e.preventDefault()

    cartModal.close();

    orderForm.open();
})

clearCartBtn.addEventListener("click", (e) => {
    e.preventDefault();

    cart.clear();

    cart.save();

    cartUI.render();
})