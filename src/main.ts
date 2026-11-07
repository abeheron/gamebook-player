import { mount } from "svelte";
import App from "./ui/App.svelte";
import { registerServiceWorker } from "./platform/web";
import "./ui/app.css";

const target = document.getElementById("app");
if (!target) throw new Error("Missing #app");

const app = mount(App, { target });
registerServiceWorker();

export default app;
