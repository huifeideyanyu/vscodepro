
import { supabase } from "./supabase.js";

const STORAGE_KEY = "museum_albums_v1";

// ===================================
// 1. 获取云端专辑
// ===================================

export async function getAlbums() {
    const { data, error } = await supabase
        .from("albums")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) throw error;

    return (data || []).map(album => ({
        ...album,
        createdAt: album.created_at
    }));
}

// ===================================
// 2. 添加专辑
// ===================================

export async function addAlbum(album) {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("请先登录");

    const { error } = await supabase
        .from("albums")
        .insert({
            id: album.id,
            user_id: user.id,
            name: album.name,
            artist: album.artist,
            year: album.year,
            genre: album.genre,
            rating: album.rating,
            favorite: album.favorite,
            review: album.review,
            cover: album.cover,
            created_at: album.createdAt || new Date().toISOString()
        });

    if (error) throw error;

    return true;
}

// ===================================
// 3. 更新专辑
// ===================================

export async function updateAlbum(id, newData) {
    const allowed = [
        "name", "artist", "year", "genre",
        "rating", "favorite", "review", "cover"
    ];

    const payload = {};

    for (const key of allowed) {
        if (Object.prototype.hasOwnProperty.call(newData, key)) {
            payload[key] = newData[key];
        }
    }

    const { data, error } = await supabase
        .from("albums")
        .update(payload)
        .eq("id", id)
        .select("id");

    if (error) throw error;
    if (!data || data.length === 0) {
        throw new Error("专辑不存在或没有修改权限");
    }

    return true;
}

// ===================================
// 4. 删除专辑
// ===================================

export async function deleteAlbum(id) {
    const { data, error } = await supabase
        .from("albums")
        .delete()
        .eq("id", id)
        .select("id");

    if (error) throw error;
    if (!data || data.length === 0) {
        throw new Error("专辑不存在或没有删除权限");
    }

    return true;
}

// ===================================
// 5. 上传封面
// ===================================

export async function uploadCover(file, userId) {
    if (!file || !file.type.startsWith("image/")) {
        throw new Error("请选择有效的图片");
    }

    if (file.size > 1024 * 1024) {
        throw new Error("图片不能超过 1MB");
    }

    const extensions = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "image/gif": "gif"
    };

    const extension = extensions[file.type];

    if (!extension) {
        throw new Error("仅支持 JPG、PNG、WEBP 和 GIF");
    }

    const path = `${userId}/${Date.now()}_${Math.random().toString(36).substring(2, 10)}.${extension}`;

    const { error } = await supabase.storage
        .from("museum-covers")
        .upload(path, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type
        });

    if (error) throw error;

    const { data } = supabase.storage
        .from("museum-covers")
        .getPublicUrl(path);

    return data.publicUrl;
}

// ===================================
// 6. 迁移旧本地专辑
// ===================================

export async function migrateLocalAlbums(initialAlbums = []) {
    const { data: { user }, error: userError } =
        await supabase.auth.getUser();

    if (userError) throw userError;
    if (!user) throw new Error("请先登录");

    // 云端已有数据，不重复迁移
    const { data: cloudAlbums, error } = await supabase
        .from("albums")
        .select("id")
        .limit(1);

    if (error) throw error;

    const migrationKey = "museum_migration_completed_v1";

    if (localStorage.getItem(migrationKey) === "true") {
    return 0;
    }

    if (cloudAlbums && cloudAlbums.length > 0) {
    localStorage.setItem(migrationKey, "true");
    return 0;
    }

    // 优先读取旧浏览器数据
    let localAlbums = [];

    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) localAlbums = parsed;
        }
    } catch (error) {
        console.error("读取旧数据失败：", error);
    }

    // 没有旧数据时使用初始专辑
    if (localAlbums.length === 0) {
        localAlbums = Array.isArray(initialAlbums)
            ? initialAlbums
            : [];
    }

    if (localAlbums.length === 0) return 0;

    const migrated = [];

    for (const album of localAlbums) {
        let cover = album.cover || "";

        // 将旧的 Base64 封面上传到 Storage
        if (cover.startsWith("data:image/")) {
            try {
                const response = await fetch(cover);
                const blob = await response.blob();

                const file = new File(
                    [blob],
                    `legacy-cover.${blob.type.split("/")[1] || "jpg"}`,
                    { type: blob.type }
                );

                cover = await uploadCover(file, user.id);
            } catch (error) {
                console.warn("旧封面迁移失败：", error);
                cover = "";
            }
        }

        migrated.push({
            id: 'album_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10),
            user_id: user.id,
            name: album.name || "未命名专辑",
            artist: album.artist || "未知艺术家",
            year: album.year || null,
            genre: album.genre || "Other",
            rating: Number(album.rating) || 8.0,
            favorite: Boolean(album.favorite),
            review: album.review || "",
            cover,
            created_at: album.createdAt || new Date().toISOString()
        });
    }

    const { error: insertError } = await supabase
        .from("albums")
        .insert(migrated);

    if (insertError) throw insertError;

    localStorage.setItem(
    "museum_migration_completed_v1",
    "true"
    );

    // 保留本地数据作为备份，不自动删除
    return migrated.length;
}
