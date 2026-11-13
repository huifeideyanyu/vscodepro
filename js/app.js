
import { supabase } from "./supabase.js";

import {
    getAlbums,
    addAlbum,
    updateAlbum,
    deleteAlbum,
    uploadCover,
    migrateLocalAlbums
} from "./storage.js";

// ===================================
// 1. 页面元素
// ===================================

const $ = id => document.getElementById(id);

const albumGrid = $("albumGrid");
const searchInput = $("searchInput");
const genreFilter = $("genreFilter");
const sortSelect = $("sortSelect");

const albumModal = $("albumModal");
const albumForm = $("albumForm");

const addAlbumBtn = $("addAlbumBtn");
const closeModal = $("closeModal");

const authArea = $("authArea");

let currentPage = "home";
let albumsCache = [];
let currentUser = null;
let isSaving = false;

// ===================================
// 2. 工具函数
// ===================================

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[char]);
}

function generateId() {
    return crypto.randomUUID();
}

function showError(error) {
    console.error(error);
    alert(error.message || "操作失败，请稍后重试");
}

// ===================================
// 3. 加载云端专辑
// ===================================

async function refreshAlbums() {
    albumsCache = await getAlbums();

    renderAlbums();
    updateStatistics();
}

// ===================================
// 4. 筛选专辑
// ===================================

function getFilteredAlbums() {
    let albums = [...albumsCache];

    if (currentPage === "favorites") {
        albums = albums.filter(album => album.favorite);
    }

    const keyword = (searchInput?.value || "")
        .trim()
        .toLowerCase();

    if (keyword) {
        albums = albums.filter(album =>
            album.name.toLowerCase().includes(keyword) ||
            album.artist.toLowerCase().includes(keyword)
        );
    }

    const genre = genreFilter?.value || "all";

    if (genre !== "all") {
        albums = albums.filter(album => album.genre === genre);
    }

    const sortType = sortSelect?.value || "newest";

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
// 5. 渲染专辑
// ===================================

function renderAlbums() {
    if (!albumGrid) return;

    const albums = getFilteredAlbums();

    $("resultCount").textContent = `${albums.length} RESULTS`;

    $("collectionTitle").textContent =
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
                ${album.cover ? `
                    <img
                        class="album-cover"
                        src="${escapeHTML(album.cover)}"
                        alt="${escapeHTML(album.name)}"
                        loading="lazy"
                        onerror="this.style.visibility='hidden'"
                    >
                ` : ""}
            </div>

            <div class="album-info">

                <h3>${escapeHTML(album.name)}</h3>

                <p>${escapeHTML(album.artist)}</p>

                <div class="album-meta">
                    <span>${escapeHTML(album.year || "年份未知")}</span>
                    <span class="album-rating">
                        ★ ${Number(album.rating || 0).toFixed(1)}
                    </span>
                </div>

                <div class="album-actions">

                    <button
                        class="favorite-btn"
                        data-action="favorite"
                        data-id="${escapeHTML(album.id)}">
                        ${album.favorite ? "♥ 已收藏" : "♡ 收藏"}
                    </button>

                    <button
                        data-action="edit"
                        data-id="${escapeHTML(album.id)}">
                        编辑
                    </button>

                    <button
                        class="delete-btn"
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
// 6. 统计数据
// ===================================

function updateStatistics() {
    const total = albumsCache.length;

    const favorites = albumsCache.filter(
        album => album.favorite
    ).length;

    const average = total
        ? albumsCache.reduce(
            (sum, album) => sum + Number(album.rating || 0), 0
        ) / total
        : 0;

    $("totalCount").textContent = total;

    $("albumCount").textContent =
        String(total).padStart(2, "0");

    $("favoriteCount").textContent = favorites;

    $("averageRating").textContent = average.toFixed(1);
}

// ===================================
// 7. 添加专辑弹窗
// ===================================

function openAddModal() {
    albumForm.reset();

    $("albumId").value = "";
    $("albumRating").value = 8.0;

    $("modalTitle").textContent = "添加新专辑";

    albumModal.classList.add("show");
}

// ===================================
// 8. 编辑专辑弹窗
// ===================================

function openEditModal(id) {
    const album = albumsCache.find(item => item.id === id);

    if (!album) return;

    albumForm.reset();

    $("albumId").value = album.id;
    $("albumName").value = album.name;
    $("artistName").value = album.artist;
    $("releaseYear").value = album.year || "";
    $("albumGenre").value = album.genre || "Other";
    $("albumRating").value = album.rating;
    $("albumReview").value = album.review || "";
    $("albumFavorite").checked = album.favorite;

    $("albumCover").value = "";

    $("modalTitle").textContent = "编辑专辑";

    albumModal.classList.add("show");
}

function hideModal() {
    albumModal.classList.remove("show");
}

// ===================================
// 9. 保存专辑
// ===================================

albumForm?.addEventListener("submit", async event => {
    event.preventDefault();

    if (isSaving) return;

    const id = $("albumId").value;

    const name = $("albumName").value.trim();
    const artist = $("artistName").value.trim();

    const yearValue = $("releaseYear").value;
    const year = yearValue ? Number(yearValue) : null;

    const rating = Number($("albumRating").value);

    const genre = $("albumGenre").value;
    const review = $("albumReview").value.trim();

    const favorite = $("albumFavorite").checked;

    const file = $("albumCover").files[0];

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

    isSaving = true;

    const submitButton = albumForm.querySelector(
        'button[type="submit"]'
    );

    submitButton.disabled = true;
    submitButton.textContent = "正在保存...";

    try {
        const oldAlbum = id
            ? albumsCache.find(album => album.id === id)
            : null;

        let cover = oldAlbum?.cover || "";

        // 上传新封面
        if (file) {
            cover = await uploadCover(file, currentUser.id);
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
            createdAt: oldAlbum?.createdAt || new Date().toISOString()
        };

        if (id) {
            await updateAlbum(id, albumData);
        } else {
            await addAlbum(albumData);
        }

        hideModal();
        albumForm.reset();

        await refreshAlbums();

        alert(id ? "专辑修改成功！" : "专辑添加成功！");

    } catch (error) {
        showError(error);

    } finally {
        isSaving = false;
        submitButton.disabled = false;
        submitButton.textContent = "保存专辑";
    }
});

// ===================================
// 10. 专辑卡片操作
// ===================================

albumGrid?.addEventListener("click", async event => {
    const button = event.target.closest("button[data-action]");

    if (!button) return;

    const id = button.dataset.id;
    const action = button.dataset.action;

    if (action === "edit") {
        openEditModal(id);
        return;
    }

    if (action === "delete") {
        if (!confirm("确定删除这张专辑吗？")) return;

        try {
            await deleteAlbum(id);
            await refreshAlbums();
        } catch (error) {
            showError(error);
        }

        return;
    }

    if (action === "favorite") {
        const album = albumsCache.find(item => item.id === id);

        if (!album) return;

        button.disabled = true;

        try {
            await updateAlbum(id, {
                favorite: !album.favorite
            });

            await refreshAlbums();

        } catch (error) {
            showError(error);
        } finally {
            button.disabled = false;
        }
    }
});

// ===================================
// 11. 搜索、筛选、排序
// ===================================

searchInput?.addEventListener("input", renderAlbums);

genreFilter?.addEventListener("change", renderAlbums);

sortSelect?.addEventListener("change", renderAlbums);

// ===================================
// 12. 页面导航
// ===================================

document.querySelectorAll(".nav-item").forEach(item => {
    item.addEventListener("click", event => {
        event.preventDefault();

        document.querySelectorAll(".nav-item").forEach(nav => {
            nav.classList.remove("active");
        });

        item.classList.add("active");

        currentPage = item.dataset.page;

        renderAlbums();
    });
});

// ===================================
// 13. 弹窗事件
// ===================================

addAlbumBtn?.addEventListener("click", openAddModal);

closeModal?.addEventListener("click", hideModal);

albumModal?.addEventListener("click", event => {
    if (event.target === albumModal) {
        hideModal();
    }
});

// ===================================
// 14. 顶部用户信息和退出登录
// ===================================

function renderUserInfo() {
    if (!authArea) return;

    authArea.innerHTML = `
        <span class="museum-user-email">
            ${escapeHTML(currentUser.email || "已登录")}
        </span>

        <button
            type="button"
            class="museum-topbar-auth-link"
            id="logoutBtn">
            退出登录
        </button>

        <button class="add-button" id="addCloudAlbumBtn">
            + 添加专辑
        </button>
    `;

    $("addCloudAlbumBtn")?.addEventListener(
        "click",
        openAddModal
    );

    $("logoutBtn")?.addEventListener("click", async () => {
        if (!confirm("确定退出登录吗？")) return;

        try {
            const { error } = await supabase.auth.signOut();

            if (error) throw error;

            window.location.replace("./login.html");

        } catch (error) {
            showError(error);
        }
    });
}

// ===================================
// 15. 程序初始化
// ===================================

async function initApp() {
    try {
        // 检查登录状态
        const { data, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (!data.session) {
            window.location.replace("./login.html");
            return;
        }

        currentUser = data.session.user;

        // 迁移旧数据
        const migrated = await migrateLocalAlbums(
            window.INITIAL_ALBUMS || []
        );

        if (migrated > 0) {
            console.log(`成功迁移 ${migrated} 张旧专辑`);
        }

        // 加载云端数据
        await refreshAlbums();

        // 显示账号
        renderUserInfo();

        console.log("MUSEUM 云端版本启动成功！");

    } catch (error) {
        console.error("MUSEUM 初始化失败：", error);

        alert(
            "网站初始化失败：" +
            (error.message || "未知错误") +
            "\n请检查 Supabase 配置和数据库。"
        );
    }
}

initApp();
