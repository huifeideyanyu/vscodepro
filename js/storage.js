
// MUSEUM 数据存储模块

const STORAGE_KEY = "museum_albums_v1";

// 读取专辑
function getAlbums() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error("读取数据失败：", error);
        return [];
    }
}

// 保存全部专辑
function saveAlbums(albums) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(albums));
        return true;
    } catch (error) {
        console.error("保存数据失败：", error);
        alert("保存失败，可能是浏览器存储空间不足。");
        return false;
    }
}

// 添加专辑
function addAlbum(album) {
    const albums = getAlbums();
    albums.push(album);
    return saveAlbums(albums);
}

// 更新专辑
function updateAlbum(id, newData) {
    const albums = getAlbums();

    const index = albums.findIndex(
        album => album.id === id
    );

    if (index === -1) return false;

    albums[index] = {
        ...albums[index],
        ...newData
    };

    return saveAlbums(albums);
}

// 删除专辑
function deleteAlbum(id) {
    const albums = getAlbums();

    const newAlbums = albums.filter(
        album => album.id !== id
    );

    return saveAlbums(newAlbums);
}

// 初始化数据
function initializeStorage() {
    const existingData = localStorage.getItem(STORAGE_KEY);

    if (existingData === null) {
        saveAlbums(window.INITIAL_ALBUMS);
    }
}
