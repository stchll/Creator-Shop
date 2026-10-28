const tabBtns = document.querySelectorAll(".tabBtn");
const pages = document.querySelectorAll(".page");
const blurLayer = document.querySelector(".blurLayer");

const authView = document.getElementById('auth-view');
const userView = document.getElementById('user-view');
const form = document.getElementById('auth-form');
const message = document.getElementById('message');
const submitBtn = document.getElementById('submit-btn');
const logoutBtn = document.getElementById('logout-btn');

const mode = 'login';

async function api(url, method = 'GET', body) {
    const res = await fetch(url, {
        credentials: "same-origin",
        method,
        headers: {"Content-Type": "application/json"},
        body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
}

function getClassEl(c) {
    return document.querySelector(`.${c}`);
}

function getIdEl(id) {
    return document.getElementById(id);
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[char]));
}

async function getAPI(path) {
    const response = await fetch(path, { method: "GET" });

    if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
    }

    return response.json();
}

const deleteModal = getIdEl("deleteProductModal");
const deleteTitle = deleteModal.querySelector("h3");
const deleteAccept = getIdEl("deleteModalAccept");
const deleteCancel = getIdEl("deleteModalCancel");

let deleteTarget = null;

function openDeleteModal(target) {
    deleteTarget = target;
    deleteTitle.textContent = target.type === "order"
        ? "Do you want to delete this order?"
        : "Do you want to delete this product?";
    deleteModal.classList.add("active");
    blurLayer.classList.add("active");
}

class Product {
    constructor() {
        this.api = "/products";
        this.list = getIdEl("productsList");

        this.modal = getIdEl("productModal");
        this.form = getIdEl("productForm");
        this.openBtn = getIdEl("createModalOpen");
        this.closeBtn = getIdEl("changeProductModalClose");

        this.openBtn.addEventListener("click", () => {
            this.modal.classList.add("active");
            blurLayer.classList.add("active");
        });

        this.closeBtn.addEventListener("click", closeAll);

        this.form.addEventListener("submit", async (e) => {
            e.preventDefault();

            try {
                const response = await fetch("/product", {
                    method: "POST",
                    body: new FormData(this.form)
                });

                if (response.ok) {
                    closeAll();
                    this.reload();
                }
            } catch (error) {
                console.error("Failed to create product", error);
            }
        });

        this.list.addEventListener("click", (e) => {
            const btn = e.target.closest(".deleteBtn");

            if (!btn) return;

            openDeleteModal({ type: "product", id: btn.dataset.id });
        });

        this.reload();
    }

    async reload() {
        try {
            const products = await getAPI(this.api);

            this.list.innerHTML = "";

            products.forEach((product) => {
                this.list.appendChild(this.createRow(product));
            });
        } catch (error) {
            console.error("Failed to fetch products", error);
        }
    }

    createRow(product) {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td><img src="${escapeHtml(product.image)}" alt=""></td>
            <td>${escapeHtml(product.title)}</td>
            <td>${escapeHtml(product.description)}</td>
            <td>${escapeHtml(product.price)}$</td>
            <td>
                <button class="deleteBtn" data-id="${escapeHtml(product._id)}">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;

        return tr;
    }
}

class Order {
    constructor() {
        this.api = "/orders";
        this.toUpdateId = null;

        this.ordersList = getIdEl("ordersList");
        this.modal = getClassEl("orderUpdateModal");
        this.closeBtn = getIdEl("orderUpdateClose");
        this.select = getIdEl("orderUpdateSelect");
        this.updateBtn = getIdEl("orederUpdateBtn");

        this.closeBtn.addEventListener("click", closeAll);

        this.updateBtn.addEventListener("click", async (e) => {
            e.preventDefault();

            if (!this.toUpdateId) return;

            try {
                const response = await fetch(`${this.api.slice(0, -1)}/${this.toUpdateId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: this.select.value })
                });

                if (response.ok) {
                    closeAll();
                    this.reload();
                }
            } catch (error) {
                console.error("Failed to update order", error);
            }
        });

        this.ordersList.addEventListener("click", (e) => {
            const deleteBtn = e.target.closest(".deleteBtn");
            const editBtn = e.target.closest(".editBtn");

            if (deleteBtn) {
                openDeleteModal({ type: "order", id: deleteBtn.dataset.id });
            }

            if (editBtn) {
                this.openUpdateModal(editBtn.dataset.id, editBtn.dataset.status);
            }
        });

        this.reload();
    }

    async openUpdateModal(id, currentStatus) {
        try {
            const statuses = await getAPI("/orderStatuses");

            this.select.innerHTML = "";

            statuses.forEach((status) => {
                const opt = document.createElement("option");
                opt.textContent = status;
                opt.value = status;
                opt.selected = status === currentStatus;
                this.select.appendChild(opt);
            });

            this.toUpdateId = id;
            this.modal.classList.add("active");
            blurLayer.classList.add("active");
        } catch (error) {
            console.error("Failed to load statuses", error);
        }
    }

    async reload() {
        try {
            const orders = await getAPI(this.api);

            this.ordersList.innerHTML = "";

            orders.forEach((order) => {
                this.ordersList.appendChild(this.createRow(order));
            });
        } catch (error) {
            console.error("Failed to fetch orders", error);
        }
    }

    createRow(order) {
        const productsHtml = order.products
            .map((p) => `<div>${escapeHtml(p.title)} (${escapeHtml(p.quantity)}x)</div>`)
            .join("");

        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${escapeHtml(order.name)}</td>
            <td>${escapeHtml(order.email)}</td>
            <td>${escapeHtml(order.adress)}</td>
            <td>${productsHtml}</td>
            <td>${escapeHtml(order.total)}$</td>
            <td><span class="status status-${escapeHtml(order.status).toLowerCase()}">${escapeHtml(order.status)}</span></td>
            <td>
                <button class="deleteBtn" data-id="${escapeHtml(order._id)}">
                    <i class="fa-solid fa-trash"></i>
                </button>

                <button class="editBtn" data-id="${escapeHtml(order._id)}" data-status="${escapeHtml(order.status)}">
                    <i class="fa-solid fa-pen"></i>
                </button>
            </td>
        `;

        return tr;
    }
}

const productManager = new Product();
const orderManager = new Order();

function closeAll() {
    getIdEl("productModal").classList.remove("active");
    deleteModal.classList.remove("active");
    getClassEl("orderUpdateModal").classList.remove("active");
    blurLayer.classList.remove("active");
    getIdEl("productForm").reset();
    deleteTarget = null;
    orderManager.toUpdateId = null;
}

blurLayer.addEventListener("click", closeAll);
deleteCancel.addEventListener("click", closeAll);

deleteAccept.addEventListener("click", async () => {
    if (!deleteTarget) return;

    const { type, id } = deleteTarget;

    try {
        const response = await fetch(`/${type}/${id}`, { method: "DELETE" });

        if (response.ok) {
            closeAll();

            if (type === "order") {
                orderManager.reload();
            } else {
                productManager.reload();
            }
        }
    } catch (error) {
        console.error(`Failed to delete ${type}`, error);
    }
});

tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
        tabBtns.forEach((b) => b.classList.remove("active"));
        pages.forEach((p) => p.classList.remove("active"));

        btn.classList.add("active");
        document.querySelector(`.${btn.dataset.page}`).classList.add("active");
    });
});

function showAuth() {
    userView.style.display = "none";
    authView.style.display = "flex";
    form.reset();
}

async function showUser() {
    const me = await api('/api/me');
    document.getElementById('username').textContent = me.username;
    authView.style.display = "none";
    userView.style.display = "flex";
}

form.onsubmit = async (e) => {
    e.preventDefault();
    const username = form.username.value.trim();
    const password = form.password.value;

    try {
        await api('/api/' + mode, 'POST', { username,password });
        message.textContent = '';
        await showUser();
    } catch (err) {
        message.textContent = err.message;
    }
}

// document.addEventListener("DOMContentLoaded", async () => {
//     try {
//         await showUser();
//     } catch (error) {
//         showAuth();
//     }
// });

logoutBtn.onclick = async (e) => {
    e.preventDefault();

    try {
        await api('/api/logout', 'POST');

        showAuth();
    } catch (error) {
        message.textContent = error
    }
}

class Loader {
    constructor() {
        this.section = document.getElementById("loadingScreen");
        this.gretting = document.getElementById("gretting");
        this.title = document.getElementById("loadingTitle");

        this.play();
        this.setGretting();
    }

    play() {
        this.section.style.top = "0";

        setTimeout(() => {
            this.title.style.transform = "translateY(0)";
            this.title.style.opacity = 1;
        }, 1000);

        this.setGretting();

        setTimeout(() => {
            this.gretting.style.opacity = "1";

            this.finish()
        }, 2000);
    }

    setGretting() {
        const hour = new Date().getHours();

        if (hour >= 5 && hour < 12) {
            this.gretting.textContent = "Доброго ранку ☀️";
        } else if (hour >= 12 && hour < 18) {
            this.gretting.textContent = "Добрий день 🌤️";
        } else {
            this.gretting.textContent = "Доброго вечора 🌙";
        }
    }

    finish() {
        setTimeout(() => {
            this.section.style.top = "-200%";
        }, 1000);
}
}

const loader = new Loader();