export function Header() {
  return (
    <header className="masthead">
      <div className="shell masthead-inner">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="2" width="20" height="20" rx="6" fill="currentColor" />
              <path
                d="M7.5 16.5V9a2.5 2.5 0 0 1 2.5-2.5h4A2.5 2.5 0 0 1 16.5 9v7.5M7.5 12h9M9.75 14.6h.01M14.25 14.6h.01M9.2 18l-1.4 1.4M14.8 18l1.4 1.4"
                stroke="#ffffff"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div className="brand-copy">
            <div className="brand-title-row">
              <h1>上海地铁票价计算器</h1>
              <span className="tag">12 月 1 日起调价</span>
            </div>
          </div>
        </div>
        <div className="masthead-note">
          <span>3 元起步里程</span>
          <s>6 公里</s>
          <span className="note-arrow" aria-hidden="true">→</span>
          <b>4 公里</b>
        </div>
      </div>
    </header>
  )
}
