export default function AboutPage() {
  const inkbleed = `${import.meta.env.BASE_URL}logo-inkbleed.png`;
  return (
    <main className="wrap about">
      {/* 页面头 */}
      <header className="about-head">
        <h1 className="about-title">关于 拾色 · 东方</h1>
        <img className="about-inkbleed" src={inkbleed} alt="" aria-hidden />
      </header>

      <hr className="hairline" />

      {/* 设计理念 */}
      <section className="about-section">
        <h2 className="about-section-title">设计理念</h2>
        <div className="about-columns">
          <div className="about-col">
            <h3 className="about-col-title">墨分五色</h3>
            <p>
              焦、浓、重、淡、清，一墨可成画。全站文字与底色的层次不取纯色，
              而由引擎生成的十四级墨阶逐级承担，深浅之间自有呼吸。
            </p>
          </div>
          <div className="about-col">
            <h3 className="about-col-title">随类赋彩</h3>
            <p>
              谢赫六法之一，赋彩当随其类。选定任何一色为全站主题，
              按钮、hairline、底色都随之换装，色不离类，类不离色。
            </p>
          </div>
          <div className="about-col">
            <h3 className="about-col-title">宋式极简</h3>
            <p>
              留白为纸，hairline 为界。不做卡片堆叠，不加多余装饰，
              动效止于 150–250ms 的轻微浮沉，让颜色自己说话。
            </p>
          </div>
        </div>
      </section>

      <hr className="hairline" />

      {/* 色阶引擎 */}
      <section className="about-section">
        <h2 className="about-section-title">色阶引擎</h2>
        <p className="about-p">
          全站色阶由 @palette-studio/core 在 OKLCH 色彩空间实时生成：明度感知均匀，
          过渡不生硬；暗色模式的色阶与墨阶并非简单反转，而是按暗底观感重新生成；
          文字可用级同时经 WCAG 对比度与 APCA Lc 双轨校验，宁缺毋滥。
        </p>
        <p className="about-p">
          <a
            className="about-link"
            href="https://tdesign-demo.xyun.dev"
            target="_blank"
            rel="noreferrer"
          >
            访问拾色引擎演示站 ↗
          </a>
        </p>
      </section>

      <hr className="hairline" />

      {/* 数据与致谢 */}
      <section className="about-section">
        <h2 className="about-section-title">数据与致谢</h2>
        <p className="about-p">
          本站收录中国传统色 537 色，色值全部取自公开流传的传统色色值表，可溯源至：
          郭浩、李健明《中国传统色：故宫里的色彩美学》384 色体系、
          经典「中国古典色」161 色表、中国色官网 zhongguose.com 色谱，
          以及 2023 央视春晚《满庭芳 · 国色》官方色卡。
        </p>
        <p className="about-p">
          各条目所配诗词及出处归属原作者与古籍原典；同名不同值的色值分歧，
          以数据集 sources 清单记录的取舍为准。
        </p>
      </section>

      <hr className="hairline" />

      {/* 可访问性 */}
      <section className="about-section">
        <h2 className="about-section-title">可访问性</h2>
        <p className="about-p">
          深浅模式切换后，文字色随 token 自动反色，无需逐页调整；
          品牌色上的文字会自动下沉为黑或白（APCA 对比度取优）；
          详情抽屉中以 usageHint 标注每色在宣纸底 / 玄底上的合适用途，
          哪些色能做正文、哪些只宜装饰，一目了然。
        </p>
      </section>
    </main>
  );
}
