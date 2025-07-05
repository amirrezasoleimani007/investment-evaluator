import streamlit as st
from PIL import Image
import pandas as pd
import plotly.graph_objects as go
import io

# ===== تنظیمات اولیه صفحه =====
st.set_page_config(
    page_title="سامانه هوشمند سنجش و ارزیابی طرح‌های سرمایه‌گذاری",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ===== استایل و فونت حرفه‌ای =====
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;500;700&display=swap&subset=arabic');
html, body, [data-testid="stAppViewContainer"] {
    font-family: 'Vazirmatn', sans-serif;
    direction: rtl;
    background-color: #eef2f7;
    color: #003366;
    margin: 0; padding: 0;
}
.header-container {
    display: flex; align-items: center; gap: 1rem; padding: 1rem 0;
}
.header-container img { width: 100px; }
.header-container .title { font-size: 2.2rem; font-weight: 700; color: #0055aa; margin: 0; }
.header-container .subtitle { font-size: 1rem; margin: 0; color: #334155; }
.section { background: #fff; padding: 1.5rem; margin: 1rem 0; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.05); }
.section h2 { color: #0055aa; font-weight: 500; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.5rem; margin-bottom: 1rem; }
input, select {
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    padding: 0.8rem;
    background: #f8fafc;
    font-size: 1rem;
    color: #003366;
    width: 100%;
    box-sizing: border-box;
}
.stButton button {
    background-color: #0055aa !important;
    color: #fff !important;
    border-radius: 8px !important;
    padding: 0.6rem 1.2rem !important;
    font-weight: 500 !important;
}
.table-container h3 { margin-bottom: 0.5rem; color: #334155; font-weight: 500; }
.plotly-graph-div {
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 16px rgba(0,0,0,0.05);
}
</style>
""", unsafe_allow_html=True)

# ===== امتیازدهی =====
def score_thresh(x, table):
    for s, (lo, hi) in table.items():
        if lo <= x < hi:
            return s
    return max(table.keys())

TN = {0:(-999,0),1:(0,0.1),2:(0.1,0.3),3:(0.3,0.5),4:(0.5,1),5:(1,9999)}
TB = {0:(-999,1),1:(1,1.1),2:(1.1,1.3),3:(1.3,1.5),4:(1.5,1.75),5:(1.75,9999)}
TM = {0:(-999,5),1:(5,10),2:(10,15),3:(15,25),4:(25,40),5:(40,9999)}
TI = {0:(-999,25),1:(25,30),2:(30,35),3:(35,40),4:(40,50),5:(50,9999)}
TO = {0:(-999,5),1:(5,10),2:(10,15),3:(15,20),4:(20,30),5:(30,9999)}
TA = {0:(-999,0.3),1:(0.3,0.6),2:(0.6,1),3:(1,1.5),4:(1.5,2),5:(2,9999)}

# ===== سربرگ =====
logo = Image.open('6760ee1f-07bf-4bd9-9d35-057c03f6b542.png')
def show_header(intro=False):
    col1, col2 = st.columns([1,4], gap='small')
    with col1:
        st.image(logo, use_container_width=True)
    with col2:
        st.markdown(f"<div class='header-container'><h1 class='title'>سامانه هوشمند سنجش و ارزیابی طرح‌های سرمایه‌گذاری</h1></div>", unsafe_allow_html=True)
        if intro:
            st.markdown("<p class='subtitle'>به سامانه خوش‌آمدید! لطفاً نام طرح را وارد کنید.</p>", unsafe_allow_html=True)
        elif 'name' in st.session_state:
            st.markdown(f"<p class='subtitle'>طرح: <strong>{st.session_state.name}</strong></p>", unsafe_allow_html=True)

# ===== منو =====
pages = ["معرفی","اطلاعات مالی","مطالعات بازار","فنی/نهادی","نتایج نهایی"]
page = st.sidebar.radio("📋 منو", pages)

# ===== معرفی =====
if page == "معرفی":
    show_header(intro=True)
    st.markdown("<div class='section'><h2>معرفی طرح</h2></div>", unsafe_allow_html=True)
    name = st.text_input("نام طرح سرمایه‌گذاری:", key="name_input", placeholder="مثال: طرح توسعه فولادسازی")
    if st.button("ثبت طرح"):
        if name:
            st.session_state.name = name
            st.success("نام طرح ثبت شد.")
        else:
            st.error("لطفاً نام طرح را وارد کنید.")

# ===== اطلاعات مالی =====
elif page == "اطلاعات مالی":
    show_header()
    st.markdown("<div class='section'><h2>اطلاعات مالی طرح</h2></div>", unsafe_allow_html=True)
    if 'name' not in st.session_state:
        st.error("ابتدا نام طرح را ثبت کنید (صفحه معرفی).")
    else:
        with st.form("fin_form"):
            npv_in = st.text_input("NPV (میلیون ریال)", help="ارزش فعلی خالص حاصل تفریق سرمایه اولیه از مجموع جریانات نقدی تنزیل‌شده است.")
            inv_in = st.text_input("سرمایه‌گذاری ثابت (میلیون ریال)", help="کل هزینه خرید، نصب و راه‌اندازی دارایی‌های بلندمدت پروژه.")
            eq_in = st.text_input("آورده نقدی سهامداران (میلیون ریال)", help="مجموع وجوه نقدی که سهامداران برای تأمین مالی پروژه واریز می‌کنند.")
            bcr_in = st.text_input("BCR", help="نسبت ارزش فعلی مزایای پروژه به ارزش فعلی هزینه‌های آن است.")
            mrg_in = st.text_input("میانگین حاشیه سود ۵ سال اول (%)", help="میانگین نسبت سود خالص به درآمد در پنج سال نخست بهره‌برداری.")
            irr_in = st.text_input("IRR (%)", help="نرخ تنزیلی که در آن NPV پروژه برابر صفر می‌شود.")
            ocm_in = st.text_input("OCM میانگین ۵ سال (%)", help="نسبت NPV به سرمایه اولیه؛ معیاری برای سنجش بازده نسبی.")
            submit = st.form_submit_button("ذخیره اطلاعات مالی")
        if submit:
            def to_f(x):
                try: return float(x.replace(',',''))
                except: return 0
            vals = { 'npv': to_f(npv_in), 'inv': to_f(inv_in), 'equity': to_f(eq_in), 'bcr': to_f(bcr_in), 'margin': to_f(mrg_in), 'irr': to_f(irr_in), 'ocm': to_f(ocm_in) }
            vals['r_npvi'] = vals['npv'] / (vals['inv'] or 1)
            vals['r_acli'] = vals['npv'] / (vals['equity'] or 1)
            st.session_state.update(vals)
            st.success("اطلاعات مالی ذخیره شد.")

# ===== مطالعات بازار =====
elif page == "مطالعات بازار":
    show_header()
    st.markdown("<div class='section'><h2>مطالعات بازار</h2></div>", unsafe_allow_html=True)
    m_opts = [
        "بازار بسیار کوچک یا در حال افول",
        "بازار کوچک و راکد",
        "بازار متوسط با رشد محدود",
        "بازار بزرگ و باثبات",
        "بازار بزرگ با رشد محسوس",
        "بازار در حال انفجار / صادراتی / در مگاترند جهانی"
    ]
    c_opts = [
        "بازار اشباع با رقابت شدید و برندهای تثبیت‌شده",
        "رقابت بالا و ورود دشوار",
        "رقابت بالا با امکان تمایز نسبی",
        "رقابت متوسط با فضای جایگاه‌یابی واقعی",
        "فضای رقابتی قابل کنترل با مزیت واضح",
        "رقابت کم یا بازار کشف‌نشده"
    ]
    a_opts = [
        "مسیر فروش نامشخص یا موانع جدی توزیع",
        "مسیر فروش پرهزینه و غیرمستقیم",
        "امکان ورود محدود با هزینه بالا",
        "دسترسی معمولی از طریق شبکه‌های عمومی",
        "مسیر توزیع نیمه‌اختصاصی یا با روابط موجود",
        "مسیر فروش از قبل مهیا یا انحصاری"
    ]
    m = st.selectbox("وضعیت بازار", m_opts, help="ارزیابی اندازه، پویایی و روند رشد بازار هدف پروژه یا محصول.")
    c = st.selectbox("وضعیت رقابتی بازار", c_opts, help="بررسی میزان رقابت، سطح اشباع و امکان سهم‌گیری در بازار.")
    a = st.selectbox("وضعیت دسترسی به بازار", a_opts, help="ارزیابی امکان و سهولت ورود به بازار و دسترسی به مشتریان.")
    if st.button("ذخیره شاخص‌های بازار"):
        st.session_state.market_score = m_opts.index(m)
        st.session_state.competitive_score = c_opts.index(c)
        st.session_state.access_score = a_opts.index(a)
        st.success("شاخص‌های بازار ذخیره شد.")

# ===== فنی/نهادی =====
elif page == "فنی/نهادی":
    show_header()
    st.markdown("<div class='section'><h2>شاخص‌های فنی و نهادی طرح</h2></div>", unsafe_allow_html=True)
    imp_opts = [
        "اثر منفی جدی بر محیط زیست یا فاقد هرگونه ارزش اجتماعی",
        "اثرگذاری محدود و بدون مسئولیت اجتماعی مشخص",
        "اثرگذاری جزئی یا متوسط در اشتغال یا منطقه هدف",
        "ایجاد اشتغال معنادار یا تأثیر مثبت منطقه‌ای محدود",
        "اثرگذاری اجتماعی بالا یا انطباق نسبی با اصول ESG",
        "انطباق کامل با استانداردهای ESG، اشتغال‌زایی، توسعه منطقه‌ای"
    ]
    al_opts = [
        "هیچ ارتباطی با اهداف و زنجیره ارزش هلدینگ ندارد",
        "ارتباط ضعیف یا حاشیه‌ای با مسیر توسعه شرکت دارد",
        "پوشش محدود نیازهای استراتژیک شرکت",
        "پروژه در راستای یکی از محورهای راهبردی شرکت است",
        "پروژه مکمل زنجیره ارزش یا طرح‌های توسعه‌ای موجود است",
        "پروژه دارای هم‌راستایی کامل و نقش راهبردی در چشم‌انداز شرکت است"
    ]
    lg_opts = [
        "بدون مجوز، مالکیت مبهم، فاقد ساختار نهادی مشخص",
        "برخی مجوزها اخذ شده ولی مالکیت یا قراردادها مشکل دارد",
        "وضعیت حقوقی در حال پیشرفت، ولی هنوز نهایی نشده",
        "ساختار نهادی مشخص و نیمی از مجوزها یا قراردادها نهایی شده‌اند",
        "وضعیت حقوقی و نهادی قابل اتکا و رسمی‌شده در سطح قابل قبول",
        "تمام مجوزها، مالکیت، و قراردادهای حقوقی نهایی‌شده و پایدار هستند"
    ]
    th_opts = [
        "فاقد فناوری مشخص یا غیرقابل اجرا، منابع فنی در دسترس نیست",
        "فناوری مشخص شده ولی دسترسی به تجهیزات یا اجرا پرریسک است",
        "پروژه از نظر فنی اجراپذیر است ولی زیرساخت یا تجربه کافی ندارد",
        "شرایط فنی قابل اجرا با زیرساخت محدود ولی مدیریت‌پذیر",
        "آماده اجرا از نظر فنی و منابع، نیاز به هماهنگی محدود دارد",
        "کاملاً آماده اجرا؛ فناوری اثبات‌شده، زیرساخت موجود، تیم اجرایی مجرب"
    ]
    imp = st.selectbox("اثرگذاری توسعه‌ای و زیست‌محیطی پروژه", imp_opts)
    al  = st.selectbox("میزان هم‌راستایی پروژه با استراتژی سازمان", al_opts)
    lg  = st.selectbox("وضعیت حقوقی و نهادی پروژه", lg_opts)
    th  = st.selectbox("وضعیت پروژه از نظر فنی و اجرایی", th_opts)
    if st.button("ذخیره شاخص‌های فنی/نهادی"):
        st.session_state.impact_score    = imp_opts.index(imp)
        st.session_state.alignment_score = al_opts.index(al)
        st.session_state.legal_score     = lg_opts.index(lg)
        st.session_state.technical_score= th_opts.index(th)
        st.success("شاخص‌های فنی و نهادی ذخیره شدند.")

# ===== نتایج نهایی =====
else:
    show_header()
    st.markdown("<div class='section'><h2>نتایج نهایی ارزیابی</h2></div>", unsafe_allow_html=True)
    required_keys = ['npv','inv','equity','bcr','margin','irr','ocm','r_npvi','r_acli',
                     'market_score','competitive_score','access_score',
                     'impact_score','alignment_score','legal_score','technical_score']
    if not all(k in st.session_state for k in required_keys):
        st.error("لطفاً تمام مراحل را تکمیل کنید.")
    else:
        # محاسبه امتیازات بخش مالی
        p   = score_thresh(st.session_state.r_npvi, TN)
        b   = score_thresh(st.session_state.bcr, TB)
        mrg = score_thresh(st.session_state.margin, TM)
        ir  = score_thresh(st.session_state.irr, TI)
        profit_score = (p + b + mrg + ir) / 4
        liq_score    = score_thresh(st.session_state.ocm, TO)
        fin_score    = score_thresh(st.session_state.r_acli, TA)
        total_fin     = profit_score*0.4 + liq_score*0.3 + fin_score*0.3

        # نمایش جدول مالی
        df_fin = pd.DataFrame({'شاخص':['سودآوری','نقدینگی','تأمین مالی','کل مالی'], 'امتیاز':[round(profit_score,2), liq_score, fin_score, round(total_fin,2)]}).set_index('شاخص')
        st.markdown("<div class='table-container'><h3>امتیازات بخش مالی</h3></div>", unsafe_allow_html=True)
        st.table(df_fin)

        # نمایش بخش بازار و فنی
        market_avg = round((st.session_state.market_score + st.session_state.competitive_score + st.session_state.access_score)/3,2)
        st.metric("امتیاز بخش بازار", market_avg)

        tech_avg = round((st.session_state.impact_score + st.session_state.alignment_score + st.session_state.legal_score + st.session_state.technical_score)/4,2)
        st.metric("امتیاز بخش فنی و نهادی", tech_avg)

        # نمودار امتیاز کلی
        overall = round(total_fin*0.4 + market_avg*0.4 + tech_avg*0.2,2)
        fig = go.Figure(go.Indicator(mode="gauge+number", value=overall, title={'text':'امتیاز کلی طرح'}, gauge={'axis':{'range':[0,5]}, 'bar':{'color':'#0055aa'}, 'steps':[{'range':[0,1],'color':'#ff4d4f'},{'range':[1,2],'color':'#faad14'},{'range':[2,3],'color':'#ffc069'},{'range':[3,4],'color':'#52c41a'},{'range':[4,5],'color':'#1890ff'}]}))
        st.plotly_chart(fig, use_container_width=True)
        try:
            buf = io.BytesIO(); fig.write_image(buf, format='png')
            st.download_button("📥 دانلود گزارش تصویری", buf.getvalue(), "report.png", "image/png")
        except Exception:
            st.warning("برای دانلود گزارش تصویری لطفاً بسته kaleido را نصب کنید.")

        # تفسیر کامل نهایی
        if overall < 1:
            full_desc = (
                "طرح از نظر مالی، بازاری و فنی/ نهادی فاقد توجیه اقتصادی است و پیشنهاد رد کامل می‌شود."
            )
        elif overall < 2:
            full_desc = (
                "طرح عملکرد بسیار ضعیفی داشته و نیازمند بازنگری اساسی در ساختار هزینه‌ها و استراتژی ورود به بازار است."
            )
        elif overall < 3:
            full_desc = (
                "طرح در محدوده ضعیف تا متوسط قرار دارد؛ برای دستیابی به توجیه‌پذیری مالی نیاز به اصلاحات توصیه می‌شود."
            )
        elif overall < 3.5:
            full_desc = (
                "طرح قابل قبول است اما برای سرمایه‌گذاری مطمئن نیاز به تقویت ابعاد مالی و بازار دارد."
            )
        elif overall < 4.1:
            full_desc = (
                "طرح عملکرد خوبی از خود نشان داده و می‌تواند گزینه مناسبی برای سرمایه‌گذاری باشد."
            )
        elif overall < 4.6:
            full_desc = (
                "طرح بسیار خوب و جذاب است و با توازن مناسب بین ریسک و بازده توصیه می‌شود."
            )
        else:
            full_desc = (
                "طرح در بهترین وضعیت راهبردی و مالی قرار دارد؛ بازده بالا و ریسک پایین آن را به گزینه‌ای ایده‌آل تبدیل کرده است."
            )
        st.markdown(f"**تفسیر نهایی کامل:** {full_desc}")
