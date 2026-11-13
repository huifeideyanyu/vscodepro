
import { supabase } from "./supabase.js";

// 获取页面元素
const authForm = document.getElementById("authForm");
const loginTab = document.getElementById("loginTab");
const registerTab = document.getElementById("registerTab");

const authTitle = document.getElementById("authTitle");
const authSubtitle = document.getElementById("authSubtitle");

const submitBtn = document.getElementById("submitBtn");
const authMessage = document.getElementById("authMessage");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

// 当前模式：login 或 register
let currentMode = "login";

// 显示提示信息
function showMessage(message, type = "info") {
    authMessage.textContent = message;
    authMessage.className = `auth-message ${type}`;
}

// 切换登录和注册
function switchMode(mode) {
    currentMode = mode;

    authMessage.textContent = "";

    if (mode === "login") {
        loginTab.classList.add("active");
        registerTab.classList.remove("active");

        authTitle.textContent = "欢迎回来";
        authSubtitle.textContent = "登录你的音乐档案馆";

        submitBtn.textContent = "登录";
        passwordInput.autocomplete = "current-password";

    } else {
        registerTab.classList.add("active");
        loginTab.classList.remove("active");

        authTitle.textContent = "创建账号";
        authSubtitle.textContent = "加入音乐档案馆";

        submitBtn.textContent = "注册";
        passwordInput.autocomplete = "new-password";
    }
}

// 点击切换按钮
loginTab.addEventListener("click", () => {
    switchMode("login");
});

registerTab.addEventListener("click", () => {
    switchMode("register");
});

// 提交表单
authForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        showMessage("请填写完整信息", "error");
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "处理中...";

    try {

        if (currentMode === "register") {

            // 用户注册
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    emailRedirectTo: window.location.origin + "/index.html"
                }
            });

            if (error) throw error;

            if (data.session) {
                showMessage("注册成功！正在进入网站...", "success");

                setTimeout(() => {
                    window.location.href = "./index.html";
                }, 1200);

            } else {
                showMessage(
                    "注册成功！请前往邮箱点击验证链接，然后再登录。",
                    "success"
                );
            }

        } else {

            // 用户登录
            const { data, error } =
                await supabase.auth.signInWithPassword({
                    email: email,
                    password: password
                });

            if (error) throw error;

            showMessage("登录成功！正在进入网站...", "success");

            setTimeout(() => {
                window.location.href = "./index.html";
            }, 1000);
        }

    } catch (error) {

        showMessage(error.message, "error");

    } finally {

        submitBtn.disabled = false;

        submitBtn.textContent =
            currentMode === "login" ? "登录" : "注册";
    }
});

// 检查是否已经登录
async function checkSession() {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
        showMessage("无法获取登录状态，请重试。", "error");
        return;
    }

    if (data.session) {
        window.location.href = "./index.html";
    }
}

checkSession();
