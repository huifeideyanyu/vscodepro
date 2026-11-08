
// ===================================
// MUSEUM 主程序
// ===================================

// 页面元素
const albumGrid = document.getElementById("albumGrid");
const searchInput = document.getElementById("searchInput");
const genreFilter = document.getElementById("genreFilter");
const sortSelect = document.getElementById("sortSelect");

const albumModal = document.getElementById("albumModal");
const albumForm = document.getElementById("albumForm");

const addAlbumBtn = document.getElementById("addAlbumBtn");
const closeModal = document.getElementById("closeModal");

let currentPage = "home";

// 防止用户输入的文字破坏 HTML
function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[char]);
}

// 生成唯一 ID
function generateId() {
    return "album_" + Date.now() + "_" +
        Math.random().toString(36).slice(2, 8);
}

// ===================================
// 1. 页面初始化
// ===================================

function initApp() {
    initializeStorage();

    renderAlbums();
    updateStatistics();

    console.log("MUSEUM 已启动！");
}

// ===================================
// 2. 获取当前筛选后的专辑
// ===================================

function getFilteredAlbums() {
    let albums = getAlbums();

    // 最爱页面
    if (currentPage === "favorites") {
        albums = albums.filter(album => album.favorite);
    }

    // 搜索
    const keyword = searchInput.value
        .trim()
        .toLowerCase();

    if (keyword) {
        albums = albums.filter(album =>
            album.name.toLowerCase().includes(keyword) ||
            album.artist.toLowerCase().includes(keyword)
        );
    }

    // 风格筛选
    const genre = genreFilter.value;

    if (genre !== "all") {
        albums = albums.filter(
            album => album.genre === genre
        );
    }

    // 排序
    const sortType = sortSelect.value;

    if (sortType === "rating") {
        albums.sort((a, b) => b.rating - a.rating);
    } else if (sortType === "name") {
        albums.sort((a, b) =>
            a.name.localeCompare(b.name)
        );
    } else {
        albums.sort((a, b) =>
            new Date(b.createdAt) - new Date(a.createdAt)
        );
    }

    return albums;
}

// ===================================
// 3. 渲染专辑
// ===================================

function renderAlbums() {
    const albums = getFilteredAlbums();

    document.getElementById("resultCount").textContent =
        `${albums.length} RESULTS`;

    document.getElementById("collectionTitle").textContent =
        currentPage === "favorites" ? "最爱专辑" : "全部专辑";

    if (albums.length === 0) {
        albumGrid.innerHTML = `
            <div class="empty-state">
                <h3>这里还没有专辑</h3>
                <p>试试其他搜索条件，或者添加一张新专辑。</p>
            </div>
        `;
        return;
    }

    albumGrid.innerHTML = albums.map(album => `
        <article class="album-card" data-id="${escapeHTML(album.id)}">

            <div class="album-cover-wrap">
                <img
                    class="album-cover"
                    src="${escapeHTML(album.cover || "")}"
                    alt="${escapeHTML(album.name)}"
                    loading="lazy"
                    onerror="this.style.visibility='hidden'"
                >
            </div>

            <div class="album-info">
                <h3>${escapeHTML(album.name)}</h3>

                <p>${escapeHTML(album.artist)}</p>

                <div class="album-meta">
                    <span>${escapeHTML(album.year || "年份未知")}</span>

                    <span class="album-rating">
                        ★ ${Number(album.rating).toFixed(1)}
                    </span>
                </div>

                <div class="album-actions">
                    <button class="favorite-btn"
                        data-action="favorite"
                        data-id="${escapeHTML(album.id)}">
                        ${album.favorite ? "♥ 已收藏" : "♡ 收藏"}
                    </button>

                    <button data-action="edit"
                        data-id="${escapeHTML(album.id)}">
                        编辑
                    </button>

                    <button class="delete-btn"
                        data-action="delete"
                        data-id="${escapeHTML(album.id)}">
                        删除
                    </button>
                </div>
            </div>

        </article>
    `).join("");
}

// ===================================
// 4. 更新统计数据
// ===================================

function updateStatistics() {
    const albums = getAlbums();

    const total = albums.length;

    const favorites = albums.filter(
        album => album.favorite
    ).length;

    const average = total
        ? albums.reduce((sum, album) =>
            sum + Number(album.rating), 0) / total
        : 0;

    document.getElementById("totalCount").textContent = total;

    document.getElementById("albumCount").textContent =
        String(total).padStart(2, "0");

    document.getElementById("favoriteCount").textContent =
        favorites;

    document.getElementById("averageRating").textContent =
        average.toFixed(1);
}

// ===================================
// 5. 打开添加专辑弹窗
// ===================================

function openAddModal() {
    albumForm.reset();

    document.getElementById("albumId").value = "";

    document.getElementById("modalTitle").textContent =
        "添加新专辑";

    document.getElementById("albumRating").value = 8.0;

    albumModal.classList.add("show");
}

// ===================================
// 6. 打开编辑专辑弹窗
// ===================================

function openEditModal(id) {
    const album = getAlbums().find(
        item => item.id === id
    );

    if (!album) return;

    albumForm.reset();

    document.getElementById("albumId").value = album.id;
    document.getElementById("albumName").value = album.name;
    document.getElementById("artistName").value = album.artist;
    document.getElementById("releaseYear").value = album.year || "";
    document.getElementById("albumGenre").value = album.genre;
    document.getElementById("albumRating").value = album.rating;
    document.getElementById("albumReview").value = album.review || "";
    document.getElementById("albumFavorite").checked = album.favorite;

    document.getElementById("modalTitle").textContent =
        "编辑专辑";

    albumModal.classList.add("show");
}

// 关闭弹窗
function hideModal() {
    albumModal.classList.remove("show");
}

// ===================================
// 7. 保存专辑
// ===================================

albumForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const id = document.getElementById("albumId").value;

    const name = document.getElementById("albumName").value.trim();
    const artist = document.getElementById("artistName").value.trim();

    const yearValue = document.getElementById("releaseYear").value;
    const year = yearValue ? Number(yearValue) : null;

    const rating = Number(
        document.getElementById("albumRating").value
    );

    const genre = document.getElementById("albumGenre").value;
    const review = document.getElementById("albumReview").value.trim();
    const favorite = document.getElementById("albumFavorite").checked;

    const file = document.getElementById("albumCover").files[0];

    if (!name || !artist) {
        alert("请填写专辑名称和艺术家！");
        return;
    }

    if (!Number.isFinite(rating) || rating < 0 || rating > 10) {
        alert("评分必须在 0 到 10 之间！");
        return;
    }

    if (year !== null &&
        (!Number.isInteger(year) || year < 1900 || year > 2100)) {
        alert("请输入有效的发行年份！");
        return;
    }

    // 读取上传的封面图片
    let cover = "";

    const oldAlbum = id
        ? getAlbums().find(album => album.id === id)
        : null;

    cover = oldAlbum ? oldAlbum.cover : "";

    if (file) {
        if (!file.type.startsWith("image/")) {
            alert("请选择图片文件！");
            return;
        }

        if (file.size > 1024 * 1024) {
            alert("图片不能超过 1MB，请压缩后再上传！");
            return;
        }

        try {
            cover = await new Promise((resolve, reject) => {
                const reader = new FileReader();

                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject(reader.error);

                reader.readAsDataURL(file);
            });
        } catch (error) {
            alert("图片读取失败！");
            return;
        }
    }

    const albumData = {
        id: id || generateId(),
        name,
        artist,
        year,
        genre,
        rating,
        favorite,
        review,
        cover,
        createdAt: oldAlbum
            ? oldAlbum.createdAt
            : new Date().toISOString()
    };

    let success;

    if (id) {
        success = updateAlbum(id, albumData);
    } else {
        success = addAlbum(albumData);
    }

    if (!success) return;

    hideModal();
    albumForm.reset();

    renderAlbums();
    updateStatistics();

    alert(id ? "专辑修改成功！" : "专辑添加成功！");
});

// ===================================
// 8. 专辑卡片操作
// ===================================

albumGrid.addEventListener("click", function(event) {
    const button = event.target.closest("button[data-action]");

    if (!button) return;

    const id = button.dataset.id;
    const action = button.dataset.action;

    if (action === "edit") {
        openEditModal(id);
    }

    if (action === "delete") {
        const confirmed = confirm("确定删除这张专辑吗？");

        if (!confirmed) return;

        if (deleteAlbum(id)) {
            renderAlbums();
            updateStatistics();
        }
    }

    if (action === "favorite") {
        const album = getAlbums().find(
            item => item.id === id
        );

        if (!album) return;

        if (updateAlbum(id, {
            favorite: !album.favorite
        })) {
            renderAlbums();
            updateStatistics();
        }
    }
});

// ===================================
// 9. 搜索、筛选、排序
// ===================================

searchInput.addEventListener("input", renderAlbums);

genreFilter.addEventListener("change", renderAlbums);

sortSelect.addEventListener("change", renderAlbums);

// ===================================
// 10. 页面导航
// ===================================

document.querySelectorAll(".nav-item").forEach(item => {
    item.addEventListener("click", function(event) {
        event.preventDefault();

        document.querySelectorAll(".nav-item").forEach(nav => {
            nav.classList.remove("active");
        });

        this.classList.add("active");

        currentPage = this.dataset.page;

        renderAlbums();
    });
});

// ===================================
// 11. 弹窗按钮
// ===================================

addAlbumBtn.addEventListener("click", openAddModal);

closeModal.addEventListener("click", hideModal);

albumModal.addEventListener("click", function(event) {
    if (event.target === albumModal) {
        hideModal();
    }
});

// ===================================
// 12. 启动程序
// ===================================

initApp();
