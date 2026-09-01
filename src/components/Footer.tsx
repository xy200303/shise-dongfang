export default function Footer() {
  return (
    <footer className="footer">
      <div className="wrap footer-inner">
        <p>© {new Date().getFullYear()} 拾色 · 东方</p>
        <p>基于 OKLCH 色阶引擎</p>
      </div>
    </footer>
  );
}
