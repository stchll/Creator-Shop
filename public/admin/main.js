const url = "https://creator-shop.onrender.com";

const tabBtns = document.querySelectorAll(".tabBtn");
const pages = document.querySelectorAll(".page");

const productCreateModal = document.querySelector(".productChangeModal");
const createProductForm = document.getElementById("productChangeModal");

const createModalOpen = document.getElementById("createModalOpen");
const createModalClose = document.getElementById("changeProductModalClose")

const productsList = document.getElementById("productsList");

const createProductBtn = document.getElementById("createProductBtn");

const deleteProductModal = document.getElementById("deleteProdcutModal")

const deleteProductAccept = document.getElementById("deleteModalAccept");
const deleteProductCancel = document.getElementById("deleteModalCancel");


let produnctToDelte = null;

class BlurContoller {
    constructor() {
        this.section = document.querySelector(".blurLayer");

        this.active = false;
    }

    toggle() {
        if (this.active == true) {
            this.section.style.opacity = 1;
        } else {
            this.section.style.opacity = 0;
        }

        this.active = !this.active;
    }

    set(flag) {
        if (flag == true) {
            this.section.style.opacity = 1;
        } else {
            this.section.style.opacity = 0;
        }
    }
}

const Blur = new BlurContoller();

async function reloadProducts() {
    const data = await getProducts()

    if (!data) {

        return
    }

    productsList.innerHTML = "";

    for (let product of data) {
        const tr = document.createElement("tr");

        const imageSrc = product.image || "";

        console.log(data);


        tr.innerHTML = `
            <td><img src="${imageSrc}"></td>
            <td>${product.title}</td>
            <td>${product.description}</td>
            <td>
                <button onclick="deleteRequest('${product._id}')" class="deleteBtn">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `

        productsList.appendChild(tr);
    }

}

reloadProducts()

async function getProducts() {
    const response = await fetch(`${url}/products`, {
        method: "GET",
    });

    if (!response.ok) {
        return
    }

    const data = await response.json()

    return data
}

function deleteRequest(prodcutId) {
    deleteProductModal.style.display = "flex";

    Blur.set(true);

    produnctToDelte = prodcutId
}

deleteProductAccept.addEventListener("click" , async (e) => {
    e.preventDefault();

    if (produnctToDelte != null) {
        const response = await fetch(`${url}/product/${produnctToDelte}`,{
            method: "DELETE",
        });

        if (!response.ok) {
            return
        }

        const answer = await response.json();

        if (answer) {
            reloadProducts()
            
            deleteProductModal.style.display = "none";
            Blur.set(false);
        }
    }
})

deleteProductCancel.addEventListener("click",() => {
    deleteProductModal.style.display = "none";
    Blur.set(false);
    produnctToDelte = null
})



tabBtns.forEach(button => {
    button.addEventListener("click", () => {
        const pageName = button.dataset.page;

        tabBtns.forEach(btn => btn.classList.remove("active"));

        pages.forEach(page => page.classList.remove("active"));

        button.classList.add("active");

        document.querySelector(`.${pageName}`).classList.add("active");
    })
});

createProductForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(createProductForm);

    if (formData) {
        try {
            const response = await fetch(`${url}/product`, {
                method: "POST",
                body: formData
            });

            if (!response.ok) {
                return
            }

            const answer = await response.json();

            if (answer) {
                reloadProducts();

                productCreateModal.style.left = "150%";
                Blur.set(false);
            }

        } catch (error) {
            console.error(error);
        }
    }
})

createModalOpen.addEventListener("click", () => {
    productCreateModal.style.left = "50%";

    Blur.set(true);
})

createModalClose.addEventListener("click", () => {
    productCreateModal.style.left = "150%"
    Blur.set(false);
})