import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const loadAdsense = () => {
  if (typeof window === "undefined") return;
  if (document.querySelector("script[data-adsbygoogle]") != null) return;
  const script = document.createElement("script");
  script.async = true;
  script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5170334485305985";
  script.setAttribute("data-adsbygoogle", "true");
  script.crossOrigin = "anonymous";
  document.head.appendChild(script);
};

loadAdsense();

createRoot(document.getElementById("root")!).render(<App />);
