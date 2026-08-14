const partNames = [
  "index-v24.part-00",
  "index-v24.part-01",
  "index-v24.part-02",
  "index-v24.part-03",
];

async function loadDashboard() {
  const baseUrl = new URL(".", import.meta.url);
  const responses = await Promise.all(partNames.map((name) => fetch(new URL(name, baseUrl))));
  const failed = responses.find((response) => !response.ok);
  if (failed) throw new Error(`بارگذاری بخشی از برنامه ناموفق بود: ${failed.status}`);

  const buffers = await Promise.all(responses.map((response) => response.arrayBuffer()));
  const totalLength = buffers.reduce((sum, buffer) => sum + buffer.byteLength, 0);
  const joined = new Uint8Array(totalLength);
  let offset = 0;
  for (const buffer of buffers) {
    joined.set(new Uint8Array(buffer), offset);
    offset += buffer.byteLength;
  }

  const code = new TextDecoder("utf-8").decode(joined);
  const moduleUrl = URL.createObjectURL(new Blob([code], { type: "text/javascript" }));
  try {
    await import(moduleUrl);
  } finally {
    URL.revokeObjectURL(moduleUrl);
  }
}

loadDashboard().catch((error) => {
  console.error("IPS dashboard bootstrap failed", error);
  const root = document.getElementById("root");
  if (root) {
    root.innerHTML = `<main dir="rtl" style="font-family:Vazirmatn,Tahoma,sans-serif;max-width:680px;margin:12vh auto;padding:32px;border:1px solid #dbe4ee;border-radius:24px;background:#fff;box-shadow:0 18px 50px #0f274012"><h1 style="font-size:22px;color:#17324a">بارگذاری داشبورد کامل نشد</h1><p style="color:#5b6b7a;line-height:2">لطفاً صفحه را یک‌بار تازه‌سازی کنید. اگر مشکل ادامه داشت، پیام خطا را به پشتیبانی اعلام کنید.</p></main>`;
  }
});
