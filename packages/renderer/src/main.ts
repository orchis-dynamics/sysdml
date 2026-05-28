import { createApp } from "vue";
import App from "./App.vue";
import { installTrustedTypesPolicy } from "./security/trusted-types.js";
import "./style.css";

installTrustedTypesPolicy();
createApp(App).mount("#app");
