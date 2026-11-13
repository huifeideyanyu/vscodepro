
import { supabase } from "./supabase.js";

// ===================================
// 1. 获取页面元素
// ===================================

const authForm = document.getElementById("authForm");
const authEmail = document.getElementById("email");
const authPassword = document.getElementById("password");
const authMessage = document.getElementById("authMessage");

const authSubmitBtn = document.getElementById("submitBtn");
const loginTab = document.getElementById("loginTab");
const registerTab = document.getElementById("registerTab");

const authTitle = document.getElementById("authTitle");
const authSubtitle = document.getElementById("authSubtitle");

let currentMode = "login";
let isSubmitting = false;

// ===================================
// 2. 提示信息
// ===================================

function showMessage(message, type = "info") {
    if (!authMessage) return;

    authMessage.className = "ma-auth-message";
    authMessage.classList.add(type);
    authMessage.textContent = message;
}

// ===================================
// 3. 切换登录注册
// ===================================

function setMode(mode) {
    if (isSubmitting) return;

    currentMode = mode;

    loginTab?.classList.toggle("active", mode === "login");
    registerTab?.classList.toggle("active", mode === "register");

    loginTab?.setAttribute(
        "aria-selected",
        String(mode === "login")
    );

    registerTab?.setAttribute(
        "aria-selected",
        String(mode === "register")
    );

    if (authSubmitBtn) {
        authSubmitBtn.textContent =
            mode === "login" ? "登录" : "注册";
    }

    if (authTitle) {
        authTitle.textContent =
            mode === "login" ? "欢迎回来" : "创建账号";
    }

    if (authSubtitle) {
        authSubtitle.textContent =
            mode === "login"
                ? "登录你的音乐档案馆"
                : "开启你的私人音乐收藏";
    }

    if (authPassword) {
        authPassword.autocomplete =
            mode === "login" ? "current-password" : "new-password";
    }

    showMessage("");
}

// ===================================
// 4. 提交状态
// ===================================

function setSubmitting(status) {
    isSubmitting = status;

    if (!authSubmitBtn) return;

    authSubmitBtn.disabled = status;

    authSubmitBtn.textContent = status
        ? "请稍候..."
        : currentMode === "login" ? "登录" : "注册";
}

// ===================================
// 5. 检查登录状态
// ===================================

async function checkSession() {
    try {
        const { data, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (data.session) {
            window.location.replace("./index.html");
        }
    } catch (error) {
        console.error("检查登录状态失败：", error);
    }
}

// ===================================
// 6. 登录
// ===================================

async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) throw error;

    if (!data.session) {
        throw new Error("登录成功，但没有获得有效会话");
    }

    return data;
}

// ===================================
// 7. 注册
// ===================================

async function register(email, password) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: window.location.origin + "/index.html"
        }
    });

    if (error) throw error;

    return data;
}

// ===================================
// 8. 错误处理
// ===================================

function getErrorMessage(error) {
    const message = error.message || "";

    if (message.includes("Invalid login credentials")) {
        return "邮箱或密码错误";
    }

    if (message.includes("User already registered")) {
        return "这个邮箱已经注册，请直接登录";
    }

    if (message.includes("Email not confirmed")) {
        return "邮箱还没有验证，请先检查邮箱";
    }

    if (message.toLowerCase().includes("rate limit")) {
        return "操作过于频繁，请稍后再试";
    }

    if (message.includes("Password should be")) {
        return "密码不符合要求";
    }

    return message || "操作失败，请稍后重试";
}

// ===================================
// 9. 表单提交
// ===================================

authForm?.addEventListener("submit", async event => {
    event.preventDefault();

    if (isSubmitting) return;

    const email = authEmail.value.trim();
    const password = authPassword.value;

    if (!email || !password) {
        showMessage("请填写邮箱和密码", "error");
        return;
    }

    if (password.length < 6) {
        showMessage("密码至少需要 6 位", "error");
        return;
    }

    setSubmitting(true);

    showMessage("正在验证，请稍候...", "info");

    try {
        if (currentMode === "login") {

            await login(email, password);

            showMessage("登录成功，正在进入档案馆...", "success");

            window.location.replace("./index.html");

        } else {

            const data = await register(email, password);

            if (data.session) {

                showMessage("注册成功，正在进入档案馆...", "success");

                window.location.replace("./index.html");

            } else {

                showMessage(
                    "注册成功！请检查邮箱，完成验证后再登录。",
                    "success"
                );

                setSubmitting(false);
            }
        }

    } catch (error) {

        console.error("登录注册失败：", error);

        showMessage(getErrorMessage(error), "error");

        setSubmitting(false);
    }
});

// ===================================
// 10. 标签按钮
// ===================================

loginTab?.addEventListener("click", () => {
    setMode("login");
});

registerTab?.addEventListener("click", () => {
    setMode("register");
});

// ===================================
// 11. 初始化
// ===================================

setMode("login");

checkSession();
