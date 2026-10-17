const tabBtns = document.querySelectorAll(".tabBtn");
const pages = document.querySelectorAll(".page");
const productsList = document.getElementById("productsList");
const ordersList = document.getElementById("ordersList");

const createModalOpen = document.getElementById("createModalOpen");
const productModal = document.getElementById("productModal");
const changeProductModalClose = document.getElementById("changeProductModalClose");
const blurLayer = document.querySelector(".blurLayer");
const productForm = document.getElementById("productForm");

const deleteProductModal = document.getElementById("deleteProductModal");
const deleteModalAccept = document.getElementById("deleteModalAccept");
const deleteModalCancel = document.getElementById("deleteModalCancel");

let productIdToDelete = null;

tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        tabBtns.forEach(b => b.classList.remove("active"));
        pages.forEach(p => p.classList.remove("active"));

        btn.classList.add("active");
        const pageId = btn.getAttribute("data-page");
        document.querySelector(`.${pageId}`).classList.add("active");
    });
});

createModalOpen.addEventListener("click", () => {
    productModal.classList.add("active");
    blurLayer.classList.add("active");
});

const closeModal = () => {
    productModal.classList.remove("active");
    deleteProductModal.classList.remove("active");
    blurLayer.classList.remove("active");
    productForm.reset();
};

changeProductModalClose.addEventListener("click", closeModal);
blurLayer.addEventListener("click", closeModal);

async function fetchProducts() {
    try {
        const response = await fetch("/products");
        const products = await response.json();
        productsList.innerHTML = "";

        products.forEach(product => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><img src="${product.image || ''}" alt=""></td>
                <td>${product.title}</td>
                <td>${product.description}</td>
                <td>${product.price}$</td>
                <td><button class="deleteBtn" data-id="${product._id}"><i class="fa-solid fa-trash"></i></button></td>
            `;
            productsList.appendChild(tr);
        });

        document.querySelectorAll(".deleteBtn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                productIdToDelete = e.currentTarget.getAttribute("data-id");
                deleteProductModal.classList.add("active");
                blurLayer.classList.add("active");
            });
        });
    } catch (error) {
        console.error("Failed to fetch products", error);
    }
}

async function fetchOrders() {
    try {
        const response = await fetch("/orders");
        const orders = await response.json();
        ordersList.innerHTML = "";

        orders.forEach(order => {
            const productsHtml = order.products.map(p => `<div>${p.title} (${p.quantity}x)</div>`).join("");
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${order.name}</td>
                <td>${order.email}</td>
                <td>${order.adress}</td>
                <td>${productsHtml}</td>
                <td>${order.total}$</td>
                <td>${order.status}</td>
                <td>
                    <button class="deleteBtn"><i class="fa-solid fa-trash"></i></button>
                    <button class="editBtn"><i class="fa-solid fa-pen"></i></button>
                </td>
            `;
            ordersList.appendChild(tr);
        });
    } catch (error) {
        console.error("Failed to fetch orders", error);
    }
}

productForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(productForm);

    try {
        const response = await fetch("/product", {
            method: "POST",
            body: formData
        });

        if (response.ok) {
            closeModal();
            fetchProducts();
        }
    } catch (error) {
        console.error("Failed to create product", error);
    }
});

deleteModalAccept.addEventListener("click", async () => {
    if (!productIdToDelete) return;

    try {
        const response = await fetch(`/product/${productIdToDelete}`, {
            method: "DELETE"
        });

        if (response.ok) {
            closeModal();
            fetchProducts();
        }
    } catch (error) {
        console.error("Failed to delete product", error);
    }
});

deleteModalCancel.addEventListener("click", closeModal);

fetchProducts();
fetchOrders();